"""Painter ordering by splitting planar fragments at intersecting planes."""

from dataclasses import dataclass

import numpy as np

from .geometry import EPS, project


def half_polygon(vertices, values, tolerance=EPS):
    """Clip a convex polygon to the positive side of an affine function."""
    inside = values >= -tolerance
    if inside.all():
        return vertices
    if not inside.any():
        return vertices[:0]
    result = []
    for index, point in enumerate(vertices):
        last = index - 1
        if inside[index] != inside[last]:
            fraction = np.clip(values[last] / (values[last] - values[index]), 0, 1)
            result.append(vertices[last] + fraction * (point - vertices[last]))
        if inside[index]:
            result.append(point)
    return np.asarray(result)


@dataclass
class Fragment:
    index: int
    vertices: np.ndarray
    clipped: bool = False

    def split(self, values):
        return (Fragment(self.index, half_polygon(self.vertices, values), True),
                Fragment(self.index, half_polygon(self.vertices, -values), True))


def camera_fragments(items, matrix, near):
    result = []
    for index, item in enumerate(items):
        source = item.world_bounds
        clipped = half_polygon(source, source @ matrix[2, :3] + matrix[2, 3] - near)
        if len(clipped) < 3:
            continue
        projected = project(matrix, clipped)
        area2 = np.linalg.det(np.column_stack((projected[:3], np.ones(3))))
        if abs(area2) <= EPS:
            # A clipped polygon can begin with coincident or collinear vertices.
            x, y = projected.T
            area2 = x @ np.roll(y, -1) - y @ np.roll(x, -1)
            if abs(area2) <= EPS:
                continue
        result.append(Fragment(index, clipped, clipped is not source))
    return result


def back_to_front(items, fragments, eye):
    """BSP traversal. Only the first fragment for each partition supplies its plane."""
    if len(fragments) <= 1:
        yield from fragments
        return
    splitter = items[fragments[len(fragments) // 2].index]
    normal = splitter.front_normal
    origin = splitter.local_to_world[:3, 3]
    same, negative, positive = [], [], []

    for fragment in fragments:
        values = (fragment.vertices - origin) @ normal
        low, high = values.min(), values.max()
        if low < -EPS and high > EPS:
            front, back = fragment.split(values)
            positive.append(front)
            negative.append(back)
        elif low < -EPS:
            negative.append(fragment)
        elif high > EPS:
            positive.append(fragment)
        else:
            same.append(fragment)

    far, near = (negative, positive) if (eye - origin) @ normal >= 0 else (positive, negative)
    yield from back_to_front(items, far, eye)
    yield from sorted(same, key=lambda fragment: fragment.index)
    yield from back_to_front(items, near, eye)
