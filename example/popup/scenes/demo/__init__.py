"""Ten-second reference scene for the engine and authoring API."""

from math import pi, sin

from popup.engine import (
    Book, Camera, Card, FreeCard, Hinge, Page, PageTurn, PointLight, PullTab, Receiver,
    Scene, Spring, TabLayer, VFold, polygon_path, rect, rotation, translate,
)


def ease(t, start, end):
    u = min(1., max(0., (t - start) / (end - start)))
    return u * u * (3 - 2 * u)


book = Book(width=108, height=166, spine_z=2.)
board_spring = Spring(start=6.1, frequency=2.25, damping=4.3, amplitude_deg=3., delay=0.02)
layer_spring = Spring(start=6.12, frequency=2.8, damping=4.2, amplitude_deg=7., delay=0.03)
flap_spring = Spring(start=6.12, frequency=3.4, damping=4.6, amplitude_deg=9., delay=0.12)


def theta(t):
    return 173 * ease(t, 3.35, 6.1) + board_spring.offset(t)


def camera(t):
    push = ease(t, 7.4, 9.4)
    return Camera((264 - 48 * push, -292 + 48 * push, 292 - 39 * push),
                  (4., 0., 7 + 3 * push), (0., 0., 1.), 49.)


def light(_t):
    return PointLight((-150., -125., 270.))


def page_turn(t):
    progress = ease(t, 0.55, 2.95)
    return PageTurn(progress, radius=32, lift=max(0., 31 * sin(pi * progress)) if progress < 1 else 0.)


def layer_angle(_t, angle):
    return 68 * sin(angle * pi / 360)


def flap_angle(t, angle):
    return 40 * sin(angle * pi / 360) + 13 * ease(t, 6.45, 7.75)


def slide(t, angle):
    return 25 * ease(t, 6.55, 7.7)


def flyer(t):
    travel = ease(t, 6.55, 8.45)
    if travel == 0:
        return translate(84, -23, book.spine_z)
    return translate(84 - 31 * travel, -23 - 9 * sin(pi * travel), book.spine_z + 55 * travel) @ rotation(
        (0, 1, 0), -0.46 * travel + 0.21 * sin(3 * pi * travel))


def state(t):
    return {"travel": ease(t, 6.55, 8.45)}


SCENE = Scene(
    book=book, theta=theta, camera=camera, light=light, state=state,
    table=Receiver(Card("table", rect(-370, -370, 740, 740), "table", casts_shadow=False), translate()),
    page=Page("thin-page", width=103., height=159., origin=(0., 0., book.spine_z)),
    page_turn=page_turn,
    mechanisms=(
        FreeCard(Card("case.left", rect(-book.width, -book.height / 2, book.width, book.height), "cover",
                      casts_shadow=False), lambda _t: translate(z=0.7)),
        VFold("v-left", "v-right", anchor_x=39, anchor_y=60, ridge_length=69,
              ridge_projection=26, spine_y=-41),
        TabLayer(
            Card("strut-a", rect(0, -6, 25, 12), "strut"),
            Card("strut-b", rect(0, -6, 25, 12), "strut"),
            Card("layer", rect(-4, -8, 46, 21), "layer"),
            "board.right", (15., 50.), (50., 50.), 25., layer_angle, layer_spring,
            limits=(0, 80),
        ),
        Hinge(Card("flap", rect(0, 0, 23, 14), "flap"), "layer", (8., -3.), (0., -1.),
              (0., 0.), flap_angle, flap_spring, limits=(0, 75)),
        PullTab(Card("pull", rect(-8, -5, 19, 10), "pull"), "board.right", (61., -62.), (87., -62.), slide),
        FreeCard(Card("flyer", polygon_path([(-14, -8), (14, 0), (-14, 8), (-8, 0)]), "free"), flyer),
    ),
)
