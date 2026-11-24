"""Resolve and draw a frame through the style callbacks."""

from dataclasses import dataclass
from hashlib import blake2s

import numpy as np
import skia

from .curl import Strip, page_strips
from .geometry import EPS, outline_bounds, plane_map, polygon_path, project, shadow_matrix, skia_matrix, transform
from .ordering import back_to_front, camera_fragments, half_polygon
from .scene import Receiver


@dataclass(frozen=True)
class FrameContext:
    t: float
    frame: int
    fps: int
    width: int
    height: int
    scale: float
    camera: object
    light: object
    state: dict
    world_to_screen: np.ndarray
    seed: int

    def project(self, points):
        return project(self.world_to_screen, points)


@dataclass(frozen=True)
class Item:
    id: str
    kind: str
    side: str
    outline: skia.Path
    meta: dict
    local_to_world: np.ndarray
    world_to_local: np.ndarray
    front_normal: np.ndarray
    normal_world: np.ndarray
    facing: float
    depth: float
    local_to_screen: np.ndarray
    world_bounds: np.ndarray
    casts_shadow: bool
    strip: Strip | None = None


@dataclass(frozen=True)
class Geometry:
    context: FrameContext
    items: tuple[Item, ...]
    receivers: tuple[Item, ...]
    table: Item | None
    joints: tuple


def _item(source: Receiver, fc, strip=None):
    card, pose = source.card, source.pose
    origin, front = pose[:3, 3], pose[:3, 2]
    local_bounds = outline_bounds(card.outline)
    bounds = transform(pose, np.column_stack((local_bounds, np.zeros(len(local_bounds)))))
    center = bounds.mean(axis=0)
    to_camera = np.asarray(fc.camera.position) - center
    facing = float(front @ to_camera / max(np.linalg.norm(to_camera), EPS))
    side, normal = ("front", front) if facing >= -EPS else ("back", -front)
    depth = float(fc.world_to_screen[2, :3] @ center + fc.world_to_screen[2, 3])
    return Item(card.id, card.kind, side, card.outline, card.meta, pose, np.linalg.inv(pose),
                front, normal, facing, depth, fc.world_to_screen @ plane_map(pose),
                bounds, card.casts_shadow, strip)


def resolve(scene, t, frame, fps, width, height):
    camera = scene.camera(t)
    light = scene.light(t)
    matrix = camera.matrix(width, height)
    seed = int.from_bytes(blake2s(float(t).hex().encode("ascii"), digest_size=4).digest(), "little")
    fc = FrameContext(t, frame, fps, width, height, width / 1080, camera,
                      light, scene.state(t), matrix, seed)
    assembly = scene.resolve(t)
    items = [_item(card, fc) for card in assembly.cards.values()]
    boards = tuple(items[:2])
    if assembly.theta == 0:
        left, right = boards
        outer, inner = (left, right) if camera.position[2] >= scene.book.spine_z else (right, left)
        items = [inner, *items[2:], outer]
    table = _item(scene.table, fc) if scene.table is not None else None
    if scene.page is not None:
        turn = scene.page_turn(t)
        if turn is not None:
            items.extend(_item(strip.receiver, fc, strip) for strip in page_strips(scene.page, turn))
    return Geometry(fc, tuple(items), boards, table, tuple(assembly.joints))


def _page_fragment(canvas, style, item, fc, page, textures, shades):
    strip = item.strip
    if item.side not in textures:
        image = style.page_texture(page.id, item.side, fc)
        if not isinstance(image, skia.Image):
            raise TypeError("page_texture must return a skia.Image")
        textures[item.side] = (image, image.makeShader(
            skia.TileMode.kClamp, skia.TileMode.kClamp, skia.SamplingOptions(skia.FilterMode.kLinear)))
    image, shader = textures[item.side]
    u0, u1 = strip.u0 / page.width, strip.u1 / page.width
    if item.side == "back":
        u0, u1 = 1 - u0, 1 - u1
    x0, x1 = u0 * image.width(), u1 * image.width()
    y = page.height / 2
    rgba = []
    for u, normal in zip((strip.u0, strip.u1), strip.normals):
        key = (u, item.side)
        if key not in shades:
            visible = normal if item.side == "front" else -normal
            channels = np.clip(np.asarray(style.curl_shade(visible, fc)), 0, 1)
            if channels.shape != (4,) or not np.isfinite(channels).all():
                raise ValueError("curl_shade must return four finite RGBA multipliers")
            r, g, b, a = np.rint(channels * 255).astype(int).tolist()
            shades[key] = skia.ColorSetARGB(a, r, g, b)
        rgba.append(shades[key])
    vertices = skia.Vertices.MakeCopy(
        skia.Vertices.kTriangleStrip_VertexMode,
        [(0., -y), (0., y), (strip.chord, -y), (strip.chord, y)],
        [(x0, 0.), (x0, image.height()), (x1, 0.), (x1, image.height())],
        [rgba[0], rgba[0], rgba[1], rgba[1]],
    )
    canvas.drawVertices(vertices, skia.Paint(Shader=shader), skia.BlendMode.kModulate)


def _clip_screen(canvas, fc, world):
    canvas.clipPath(polygon_path(project(fc.world_to_screen, world)))


def _shadows(canvas, style, geometry, receiver):
    fc = geometry.context
    projection = shadow_matrix(fc.light, receiver.local_to_world)
    if projection is None:
        return
    source = fc.light.homogeneous()
    normal = receiver.front_normal
    origin = receiver.local_to_world[:3, 3]
    incidence = normal @ (source[:3] - origin * source[3])
    if (incidence > 0) != (receiver.side == "front"):
        return
    sign = np.sign(incidence)
    screen_projection = fc.world_to_screen @ projection
    canvas.save()
    canvas.concat(skia_matrix(receiver.local_to_screen))
    canvas.clipPath(receiver.outline, doAntiAlias=True)
    canvas.resetMatrix()
    for item in geometry.items:
        if item.id == receiver.id or not item.casts_shadow:
            continue
        bounds = item.world_bounds
        heights = sign * ((bounds - origin) @ normal)
        if max(heights) <= EPS:
            continue
        clipped = half_polygon(bounds, heights)
        if source[3] and len(clipped):
            clipped = half_polygon(clipped, abs(incidence) - EPS * 10 - sign * ((clipped - origin) @ normal))
        if len(clipped) < 3:
            continue
        homogeneous_z = sign * (clipped @ screen_projection[2, :3] + screen_projection[2, 3])
        homogeneous_w = sign * (clipped @ projection[3, :3] + projection[3, 3])
        visible = half_polygon(clipped, homogeneous_z - fc.camera.near * homogeneous_w)
        if len(visible) < 3:
            continue
        matrix = sign * screen_projection @ plane_map(item.local_to_world)
        if abs(np.linalg.det(matrix)) <= EPS:
            continue
        canvas.save()
        if visible is not bounds:
            canvas.clipPath(polygon_path(project(screen_projection, visible)))
        canvas.concat(skia_matrix(matrix))
        style.draw_shadow(canvas, item, fc.light, receiver, fc)
        canvas.restore()
    canvas.restore()


def draw(scene, style, geometry):
    fc = geometry.context
    surface = skia.Surface(fc.width, fc.height)
    canvas = surface.getCanvas()
    canvas.save()
    style.begin_frame(canvas, fc)
    canvas.restore()
    if geometry.table is not None:
        table_parts = camera_fragments((geometry.table,), fc.world_to_screen, fc.camera.near)
        if table_parts:
            canvas.save()
            if table_parts[0].clipped:
                _clip_screen(canvas, fc, table_parts[0].vertices)
            _shadows(canvas, style, geometry, geometry.table)
            canvas.restore()

    textures, shades = {}, {}
    items = geometry.items
    candidates = camera_fragments(items, fc.world_to_screen, fc.camera.near)
    board_ids = {receiver.id for receiver in geometry.receivers}
    for fragment in back_to_front(items, candidates, np.asarray(fc.camera.position)):
        item = items[fragment.index]
        canvas.save()
        if fragment.clipped:
            _clip_screen(canvas, fc, fragment.vertices)
        canvas.save()
        canvas.concat(skia_matrix(item.local_to_screen))
        if item.strip is None:
            style.draw_surface(canvas, item, fc)
        else:
            _page_fragment(canvas, style, item, fc, scene.page, textures, shades)
        canvas.restore()
        if item.id in board_ids:
            _shadows(canvas, style, geometry, item)
        canvas.restore()
    style.end_frame(surface, fc)
    return surface


def render_frame(scene, style, t, frame, fps, width, height):
    return draw(scene, style, resolve(scene, t, frame, fps, width, height))


def rgb_pixels(surface):
    return surface.toarray(colorType=skia.ColorType.kRGB_888x_ColorType)[..., :3].copy()
