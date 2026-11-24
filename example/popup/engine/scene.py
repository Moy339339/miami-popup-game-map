"""Definitions authored by a scene and the time-dependent world assembly."""

from collections.abc import Callable
from dataclasses import dataclass, field

import numpy as np
import skia

from .geometry import Camera, DirectionalLight, PointLight, outline_bounds, rect, rotation, transform, translate

PoseTrack = Callable[[float], np.ndarray]
AngleTrack = Callable[[float, float], float]


def _empty_state(_t):
    return {}


@dataclass(frozen=True)
class Card:
    id: str
    outline: skia.Path
    kind: str = "card"
    meta: dict = field(default_factory=dict)
    casts_shadow: bool = True


@dataclass(frozen=True)
class Receiver:
    card: Card
    pose: np.ndarray


@dataclass(frozen=True)
class Book:
    width: float
    height: float
    spine_z: float
    left_meta: dict = field(default_factory=dict)
    right_meta: dict = field(default_factory=dict)
    boards_cast_shadows: bool = False

    def __post_init__(self):
        if self.width <= 0 or self.height <= 0:
            raise ValueError("book dimensions must be positive")

    def boards(self, theta):
        left = Card("board.left", rect(-self.width, -self.height / 2, self.width, self.height),
                    "board", self.left_meta, self.boards_cast_shadows)
        right = Card("board.right", rect(0, -self.height / 2, self.width, self.height),
                     "board", self.right_meta, self.boards_cast_shadows)
        spine = translate(z=self.spine_z)
        return (Receiver(left, spine @ rotation((0, 1, 0), np.pi - np.deg2rad(theta))),
                Receiver(right, spine))


@dataclass(frozen=True)
class Joint:
    id: str
    first: np.ndarray
    second: np.ndarray

    @property
    def error(self):
        return float(np.linalg.norm(self.first - self.second))


@dataclass(frozen=True)
class Page:
    id: str
    width: float
    height: float
    origin: tuple[float, float, float]
    meta: dict = field(default_factory=dict)


@dataclass(frozen=True)
class PageTurn:
    progress: float
    radius: float
    lift: float
    bend_start: float = 0.3
    segments: int = 24


@dataclass(frozen=True)
class Scene:
    book: Book
    theta: Callable[[float], float]
    camera: Callable[[float], Camera]
    light: Callable[[float], PointLight | DirectionalLight]
    mechanisms: tuple = ()
    state: Callable[[float], dict] = _empty_state
    table: Receiver | None = None
    page: Page | None = None
    page_turn: Callable[[float], PageTurn | None] | None = None

    def resolve(self, t):
        theta = float(self.theta(t))
        if not 0 <= theta <= 180:
            raise ValueError(f"theta outside [0, 180] at t={t}: {theta}")
        boards = self.book.boards(theta)
        assembly = Assembly(self.book, theta, t, boards)
        for mechanism in self.mechanisms:
            mechanism.place(assembly)
        return assembly

    def __post_init__(self):
        if (self.page is None) != (self.page_turn is None):
            raise ValueError("a scene must supply the page and its track together")


@dataclass
class Assembly:
    book: Book
    theta: float
    t: float
    boards: tuple[Receiver, Receiver]
    cards: dict[str, Receiver] = field(init=False)
    joints: list[Joint] = field(default_factory=list)

    def __post_init__(self):
        self.cards = {board.card.id: board for board in self.boards}

    def put(self, card, pose):
        if card.id in self.cards:
            raise ValueError(f"duplicate card id: {card.id}")
        outline_bounds(card.outline)
        self.cards[card.id] = Receiver(card, pose)

    def pose(self, card_id):
        return self.cards[card_id].pose

    def join(self, name, parent, parent_point, child, child_point):
        self.joints.append(Joint(name, transform(parent, parent_point), transform(child, child_point)))
