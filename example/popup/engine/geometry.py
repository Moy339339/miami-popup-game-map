"""Rigid transforms and pinhole projection. Distances are in millimetres."""

from dataclasses import dataclass

import numpy as np
import skia

EPS = 1e-7


def unit(vector):
    vector = np.asarray(vector, dtype=float)
    length = np.linalg.norm(vector)
    if not np.isfinite(length) or length <= EPS:
        raise ValueError("expected a finite nonzero vector")
    return vector / length


def translate(x=0, y=0, z=0):
    matrix = np.eye(4)
    matrix[:3, 3] = (x, y, z)
    return matrix


def rotation(axis, radians):
    x, y, z = unit(axis)
    cross = np.array([[0, -z, y], [z, 0, -x], [-y, x, 0]])
    matrix = np.eye(4)
    matrix[:3, :3] += np.sin(radians) * cross + (1 - np.cos(radians)) * (cross @ cross)
    return matrix


def transform(matrix, points):
    return np.asarray(points, dtype=float) @ matrix[:3, :3].T + matrix[:3, 3]


def plane_map(pose):
    """Embed homogeneous local xy in homogeneous world xyz."""
    return pose[:, (0, 1, 3)]


def skia_matrix(matrix):
    return skia.Matrix.MakeAll(*np.asarray(matrix).ravel())


def polygon_path(points):
    path = skia.Path()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    return path


def rect(x, y, width, height):
    return skia.Path.Rect(skia.Rect.MakeXYWH(x, y, width, height))


def outline_bounds(path):
    bounds = path.getBounds()
    x0, y0, x1, y1 = bounds.left(), bounds.top(), bounds.right(), bounds.bottom()
    if x0 >= x1 or y0 >= y1:
        raise ValueError("a card outline must have a nonempty bounding box")
    return np.array([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], dtype=float)


@dataclass(frozen=True)
class Camera:
    position: tuple[float, float, float]
    target: tuple[float, float, float]
    up: tuple[float, float, float]
    fov_y_deg: float
    near: float = 0.1

    def matrix(self, width, height):
        if not 0 < self.fov_y_deg < 180 or self.near <= 0:
            raise ValueError("invalid camera field of view or near distance")
        eye = np.asarray(self.position, dtype=float)
        forward = unit(np.asarray(self.target) - eye)
        right = unit(np.cross(forward, self.up))
        down = np.cross(forward, right)
        focal = 0.5 * height / np.tan(np.deg2rad(self.fov_y_deg) / 2)
        axes = np.array([
            focal * right + 0.5 * width * forward,
            focal * down + 0.5 * height * forward,
            forward,
        ])
        return np.column_stack((axes, -axes @ eye))

    def project(self, points, width, height):
        return project(self.matrix(width, height), points)

    def card_matrix(self, pose, width, height):
        return self.matrix(width, height) @ plane_map(pose)


def project(matrix, points):
    homogeneous = np.asarray(points) @ matrix[:, :-1].T + matrix[:, -1]
    return homogeneous[..., :2] / homogeneous[..., 2:3]


@dataclass(frozen=True)
class PointLight:
    position: tuple[float, float, float]

    def homogeneous(self):
        return np.array((*self.position, 1.), dtype=float)


@dataclass(frozen=True)
class DirectionalLight:
    direction: tuple[float, float, float]

    def homogeneous(self):
        return np.array((*-unit(self.direction), 0.))


def shadow_matrix(light, receiver_pose):
    normal = receiver_pose[:3, 2]
    plane = np.array((*normal, -normal @ receiver_pose[:3, 3]))
    light_source = light.homogeneous()
    incidence = plane @ light_source
    if abs(incidence) <= EPS:
        return None
    return np.eye(4) * incidence - np.outer(light_source, plane)
