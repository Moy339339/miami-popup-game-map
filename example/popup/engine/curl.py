"""Developable page surface with a cylindrical bend and tangent tails."""

from dataclasses import dataclass
from math import cos, pi, sin

import numpy as np

from .geometry import EPS, rect, translate, unit
from .scene import Card, Page, PageTurn, Receiver


@dataclass(frozen=True)
class Strip:
    receiver: Receiver
    u0: float
    u1: float
    chord: float
    normals: tuple[np.ndarray, np.ndarray]


def _bend(width, turn):
    if (not 0 <= turn.progress <= 1 or turn.radius <= 0 or turn.lift < 0
            or not 0 <= turn.bend_start < 1 or not isinstance(turn.segments, int) or turn.segments < 5):
        raise ValueError("invalid page turn")
    start = width * turn.bend_start
    tail = width - start
    radius = turn.radius

    def tip_lift(angle):
        return radius * (1 - cos(angle)) + (tail - radius * angle) * sin(angle)

    lo, hi = 0., min(pi / 2, tail / radius)
    maximum = tip_lift(hi)
    if turn.lift > maximum + EPS:
        raise ValueError(f"page lift {turn.lift:g} mm exceeds {maximum:g} mm at this radius")
    if turn.lift == 0:
        return start, 0.
    for _ in range(42):
        angle = (lo + hi) / 2
        if tip_lift(angle) < turn.lift:
            lo = angle
        else:
            hi = angle
    return start, (lo + hi) / 2


def centreline(page: Page, turn: PageTurn):
    """Return material u, 3D spine-normal section, and unit surface normals."""
    if page.width <= 0 or page.height <= 0:
        raise ValueError("page dimensions must be positive")
    start, bend = _bend(page.width, turn)
    radius = turn.radius
    end = start + radius * bend
    if bend <= EPS:
        u = np.array([0., page.width])
    else:
        samples = np.linspace(start, end, turn.segments + 1)
        u = np.unique(np.concatenate(([0.], samples, [page.width])))
        u = u[np.r_[True, np.diff(u) > EPS]]
    angle = np.clip((u - start) / radius, 0, bend)
    beyond = np.maximum(u - end, 0.)
    x = np.minimum(u, start) + radius * np.sin(angle) + beyond * np.cos(angle)
    z = radius * (1 - np.cos(angle)) + beyond * np.sin(angle)
    base = pi * turn.progress
    xyz = np.column_stack((x * cos(base) - z * sin(base), np.zeros(len(u)),
                           x * sin(base) + z * cos(base))) + page.origin
    normal = np.column_stack((-np.sin(base + angle), np.zeros(len(u)), np.cos(base + angle)))
    return u, xyz, normal


def page_strips(page, turn):
    u, line, normals = centreline(page, turn)
    for i, (u0, u1) in enumerate(zip(u[:-1], u[1:])):
        edge = line[i + 1] - line[i]
        width = np.linalg.norm(edge)
        if width <= EPS:
            continue
        axis = unit(edge)
        pose = translate(*line[i])
        pose[:3, :3] = np.column_stack((axis, (0., 1., 0.), np.cross(axis, (0., 1., 0.))))
        outline = rect(0, -page.height / 2, width, page.height)
        card = Card(page.id, outline, "page", page.meta)
        yield Strip(Receiver(card, pose), u0, u1, width, (normals[i], normals[i + 1]))
