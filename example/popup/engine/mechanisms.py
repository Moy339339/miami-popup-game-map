"""Rigid paper linkages with explicit attachment points."""

from dataclasses import dataclass, field
from math import acos, atan2, cos, exp, hypot, pi, radians, sin, sqrt

import numpy as np

from .geometry import EPS, polygon_path, rotation, transform, translate, unit
from .scene import AngleTrack, Card, PoseTrack


@dataclass(frozen=True)
class Spring:
    start: float
    frequency: float
    damping: float
    amplitude_deg: float
    delay: float = 0

    def __post_init__(self):
        if self.frequency <= 0 or self.damping < 0 or self.delay < 0:
            raise ValueError("spring requires positive frequency and nonnegative damping and delay")

    def offset(self, t):
        elapsed = t - self.start - self.delay
        if elapsed <= 0:
            return 0.
        return self.amplitude_deg * exp(-self.damping * elapsed) * sin(2 * pi * self.frequency * elapsed)


def _angle(track, spring, assembly, limits):
    lo, hi = limits
    if not lo <= 0 <= hi:
        raise ValueError("the permitted range must include the closed angle 0")
    t, theta = assembly.t, assembly.theta
    nominal = track(t, theta)
    if theta == 0:
        if abs(nominal) > EPS:
            raise ValueError("a hinge or tab layer must fold flat at theta = 0")
        return 0.
    offset = spring.offset(t) * sin(radians(theta) / 2) if spring else 0.
    return radians(np.clip(nominal + offset, lo, hi))


def _basis(origin, axis_point, plane_point):
    x = unit(axis_point - origin)
    z = unit(np.cross(x, plane_point - origin))
    pose = translate(*origin)
    pose[:3, :3] = np.column_stack((x, np.cross(z, x), z))
    return pose


@dataclass(frozen=True)
class VFold:
    """Two rigid triangular panels meeting on the spine-to-ridge hinge."""

    left_id: str
    right_id: str
    anchor_x: float
    anchor_y: float
    ridge_length: float
    ridge_projection: float
    spine_y: float = 0
    left_meta: dict = field(default_factory=dict)
    right_meta: dict = field(default_factory=dict)

    def place(self, assembly):
        a, b, r, projection = self.anchor_x, self.anchor_y, self.ridge_length, self.ridge_projection
        if min(a, b, r) <= 0 or not 0 < projection < b:
            raise ValueError("VFold requires positive dimensions and 0 < ridge_projection < anchor_y")
        half = radians(assembly.theta) / 2
        bisector = np.array((cos(half), 0., sin(half)))
        reach = a * cos(half)
        angle = atan2(reach, b) + acos(projection / hypot(reach, b))
        root = np.array((0., self.spine_y, assembly.book.spine_z))
        ridge = root + r * sin(angle) * bisector + np.array((0., r * cos(angle), 0.))
        glue_length = hypot(a, b)
        ridge_x = r * projection / glue_length
        ridge_y = sqrt(r * r - ridge_x * ridge_x)
        if (a > assembly.book.width or r * sin(angle) > assembly.book.width
                or any(abs(y) > assembly.book.height / 2 for y in (root[1], root[1] + b, ridge[1]))):
            raise ValueError("VFold anchors or ridge exceed the book footprint")

        poses = []
        for card_id, board_id, signed_a, meta in (
            (self.left_id, "board.left", -a, self.left_meta),
            (self.right_id, "board.right", a, self.right_meta),
        ):
            board = assembly.pose(board_id)
            root_local = (0., self.spine_y, 0.)
            anchor_local = (signed_a, self.spine_y + b, 0.)
            anchor_world = transform(board, anchor_local)
            side = -1 if signed_a < 0 else 1
            pose = _basis(root, anchor_world, root + side * (ridge - root))
            poses.append(pose)
            outline = polygon_path([(0., 0.), (glue_length, 0.), (ridge_x, side * ridge_y)])
            assembly.put(Card(card_id, outline, "vfold", meta), pose)
            assembly.join(f"{card_id}.glue.spine", board, root_local, pose, (0, 0, 0))
            assembly.join(f"{card_id}.glue.anchor", board, anchor_local, pose, (glue_length, 0, 0))
        assembly.join(f"{self.left_id}/{self.right_id}.ridge", poses[0], (ridge_x, -ridge_y, 0),
                      poses[1], (ridge_x, ridge_y, 0))


@dataclass(frozen=True)
class Hinge:
    card: Card
    parent: str
    anchor: tuple[float, float]
    axis: tuple[float, float]
    child_pivot: tuple[float, float]
    angle: AngleTrack
    spring: Spring | None = None
    limits: tuple[float, float] = (-180, 180)

    def place(self, assembly):
        parent = assembly.pose(self.parent)
        axis = unit((*self.axis, 0.))
        pivot = (*self.child_pivot, 0.)
        anchor = (*self.anchor, 0.)
        angle = _angle(self.angle, self.spring, assembly, self.limits)
        pose = parent @ translate(*anchor) @ rotation(axis, angle) @ translate(*-np.asarray(pivot))
        assembly.put(self.card, pose)
        assembly.join(f"{self.card.id}.hinge", parent, anchor, pose, pivot)
        assembly.join(f"{self.card.id}.hinge.axis", parent, anchor + axis, pose, pivot + axis)


@dataclass(frozen=True)
class TabLayer:
    """Parallelogram with a pair of equal struts and a parallel top card."""

    first: Card
    second: Card
    top: Card
    parent: str
    first_anchor: tuple[float, float]
    second_anchor: tuple[float, float]
    length: float
    angle: AngleTrack
    spring: Spring | None = None
    limits: tuple[float, float] = (0, 90)

    def place(self, assembly):
        if self.length <= 0 or abs(self.second_anchor[0] - self.first_anchor[0]) <= EPS:
            raise ValueError("tab layer needs positive strut length and distinct parallel hinge lines")
        parent = assembly.pose(self.parent)
        angle = _angle(self.angle, self.spring, assembly, self.limits)
        turn = rotation((0, -1, 0), angle)
        tip = transform(turn, (self.length, 0., 0.))
        top = parent @ translate(*((*self.first_anchor, 0.) + tip))
        assembly.put(self.top, top)

        for card, anchor in ((self.first, self.first_anchor), (self.second, self.second_anchor)):
            strut = parent @ translate(*anchor) @ turn
            assembly.put(card, strut)
            top_xy = np.asarray(anchor) - self.first_anchor
            for dy in (0., 1.):
                assembly.join(f"{card.id}.base.{dy:g}", parent, (anchor[0], anchor[1] + dy, 0),
                              strut, (0, dy, 0))
                assembly.join(f"{card.id}.top.{dy:g}", top, (top_xy[0], top_xy[1] + dy, 0),
                              strut, (self.length, dy, 0))


@dataclass(frozen=True)
class PullTab:
    card: Card
    parent: str
    slot_start: tuple[float, float]
    slot_end: tuple[float, float]
    displacement: AngleTrack
    pin: tuple[float, float] = (0., 0.)

    def place(self, assembly):
        start = np.asarray(self.slot_start)
        slot = np.asarray(self.slot_end) - start
        length = np.linalg.norm(slot)
        distance = self.displacement(assembly.t, assembly.theta)
        if length <= EPS or not 0 <= distance <= length:
            raise ValueError(f"{self.card.id}: pin displacement outside a nonempty slot")
        point = start + slot * (distance / length)
        parent = assembly.pose(self.parent)
        pose = parent @ translate(*(point - self.pin))
        assembly.put(self.card, pose)
        assembly.join(f"{self.card.id}.slot", parent, (*point, 0.), pose, (*self.pin, 0.))


@dataclass(frozen=True)
class FreeCard:
    card: Card
    pose: PoseTrack

    def place(self, assembly):
        pose = np.asarray(self.pose(assembly.t), dtype=float)
        if (pose.shape != (4, 4) or not np.isfinite(pose).all()
                or not np.allclose(pose[3], [0, 0, 0, 1], atol=EPS)
                or not np.allclose(pose[:3, :3].T @ pose[:3, :3], np.eye(3), atol=EPS)
                or not np.isclose(np.linalg.det(pose[:3, :3]), 1, atol=EPS)):
            raise ValueError(f"{self.card.id}: expected a rigid 4x4 transform")
        assembly.put(self.card, pose)
