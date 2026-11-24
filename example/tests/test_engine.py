from dataclasses import replace
from itertools import combinations

import numpy as np
import pytest
import skia

from popup.engine import Book, Camera, Card, DirectionalLight, FreeCard, PageTurn, PointLight, Scene, rect, rotation, translate
from popup.engine.curl import centreline
from popup.engine.geometry import project, shadow_matrix, transform
from popup.engine.render import render_frame, rgb_pixels
from popup.scenes.demo import SCENE, layer_spring
from popup.styles.debug import Debug


def vertices(receiver):
    points = np.asarray([(*tuple(point), 0.) for point in receiver.card.outline.getPoints()])
    return transform(receiver.pose, points)


def edge_lengths(points):
    return [np.linalg.norm(a - b) for a, b in combinations(points, 2)]


def test_glue_and_lengths_through_full_opening():
    closed = replace(SCENE, theta=lambda _: 0).resolve(5)
    original = {key: edge_lengths(vertices(card)) for key, card in closed.cards.items()}
    worst = 0.
    for degrees in np.linspace(0, 180, 181):
        assembly = replace(SCENE, theta=lambda _: degrees).resolve(5)
        worst = max(worst, *(joint.error for joint in assembly.joints))
        for key, receiver in assembly.cards.items():
            np.testing.assert_allclose(edge_lengths(vertices(receiver)), original[key], atol=1e-8)
    print(f"181 opening angles | worst joint error {worst:.8g} mm")
    assert worst <= 0.01


def test_closed_fittings_fit_between_the_two_boards():
    assembly = SCENE.resolve(0)
    left, right = (vertices(board) for board in assembly.boards)
    assert np.allclose(np.sort(left, axis=0), np.sort(right, axis=0), atol=1e-8)
    for receiver in assembly.cards.values():
        if receiver.card.kind == "cover":
            continue  # The already open outer case is below the moving spread.
        points = vertices(receiver)
        np.testing.assert_allclose(points[:, 2], SCENE.book.spine_z, atol=1e-8)
        assert points[:, 0].min() >= -1e-8
        assert points[:, 0].max() <= SCENE.book.width
        assert np.abs(points[:, 1]).max() <= SCENE.book.height / 2


def test_spring_moves_on_both_sides_of_nominal_with_all_joints_closed():
    altered = replace(SCENE, mechanisms=tuple(
        replace(m, spring=None) if getattr(m, "spring", None) is not None else m
        for m in SCENE.mechanisms))
    displacement = []
    for time in np.linspace(layer_spring.start, 7.1, 121):
        actual, nominal = SCENE.resolve(time), altered.resolve(time)
        displacement.append(actual.pose("layer")[2, 3] - nominal.pose("layer")[2, 3])
        assert max(joint.error for joint in actual.joints) <= 0.01
        for name in ("strut-a", "strut-b", "layer", "flap", "v-left", "v-right"):
            np.testing.assert_allclose(edge_lengths(vertices(actual.cards[name])),
                                       edge_lengths(vertices(nominal.cards[name])), atol=1e-8)
    assert max(displacement) > 0.5 and min(displacement) < -0.2
    print(f"121 spring samples | layer deviation {min(displacement):.3f} to {max(displacement):.3f} mm")


def test_page_curl_preserves_material_length_and_spine():
    page = SCENE.page
    worst = 0.
    for progress in np.linspace(0, 1, 101):
        turn = PageTurn(progress, 32, 31 * np.sin(np.pi * progress), segments=12)
        u, points, normals = centreline(page, turn)
        np.testing.assert_allclose(points[0], page.origin, atol=1e-9)
        np.testing.assert_allclose(np.linalg.norm(normals, axis=1), 1, atol=1e-9)
        lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
        error = np.max(np.abs(lengths / np.diff(u) - 1))
        worst = max(worst, error)
        assert abs(lengths.sum() - page.width) / page.width <= 0.005
        assert error <= 0.005
    print(f"101 curl samples | worst per-strip length error {100 * worst:.5f}%")


def test_minimum_curl_tessellation_meets_length_budget_at_sharp_bend():
    u, points, _ = centreline(SCENE.page, PageTurn(0.4, 20, 60, segments=5))
    lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
    assert np.max(np.abs(lengths / np.diff(u) - 1)) <= 0.005


def test_camera_and_card_homography_match_across_presets():
    camera = SCENE.camera(5)
    pose = SCENE.resolve(5).pose("v-right")
    local = np.array([(0, 0), (25, 9), (12, 25)])
    world = transform(pose, np.column_stack((local, np.zeros(len(local)))))
    assembled = project(camera.card_matrix(pose, 540, 720), local)
    np.testing.assert_allclose(assembled, camera.project(world, 540, 720), atol=1e-9)
    np.testing.assert_allclose(assembled * 2, camera.project(world, 1080, 1440), atol=1e-9)


@pytest.mark.parametrize("light,expected", [
    (PointLight((0, 0, 10)), (4, 6, 0)),
    (DirectionalLight((2, 0, -5)), (4, 3, 0)),
])
def test_shadow_projection(light, expected):
    matrix = shadow_matrix(light, translate())
    hit = matrix @ np.array((2, 3, 5, 1))
    np.testing.assert_allclose(hit[:3] / hit[3], expected, atol=1e-9)


class Solid(Debug):
    def begin_frame(self, canvas, fc):
        canvas.clear(skia.ColorWHITE)

    def draw_surface(self, canvas, item, fc):
        colors = {"red": skia.ColorRED, "blue": skia.ColorBLUE}
        if item.id in colors:
            canvas.drawPath(item.outline, skia.Paint(Color=colors[item.id]))


def test_intersecting_cards_are_painted_in_both_orders():
    def foundation(_):
        return translate(z=10)

    def crossed(_):
        return translate(z=10) @ rotation((0, 1, 0), np.pi / 6)

    scene = Scene(
        Book(10, 10, 0), lambda _: 180,
        lambda _: Camera((0, 0, 100), (0, 0, 0), (0, 1, 0), 55),
        lambda _: PointLight((0, 0, 200)),
        tuple(FreeCard(Card(color, rect(-32, -32, 64, 64)), track)
              for color, track in (("red", foundation), ("blue", crossed))),
    )
    pixels = rgb_pixels(render_frame(scene, Solid(), 0, 0, 30, 160, 160))
    np.testing.assert_array_equal(pixels[80, 60], [0, 0, 255])
    np.testing.assert_array_equal(pixels[80, 100], [255, 0, 0])
