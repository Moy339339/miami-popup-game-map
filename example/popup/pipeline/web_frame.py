"""Save one raw Chrome render to PNG."""

from argparse import ArgumentParser

import skia

from .frames import PRESETS, write_png
from .timeline import Job, seconds
from .web_capture import add_scene_args, as_image, capture_session


def main():
    parser = ArgumentParser(description=__doc__)
    add_scene_args(parser)
    parser.add_argument("--style", required=True)
    parser.add_argument("--t", required=True)
    args = parser.parse_args()
    time = seconds(args.t)
    if time < 0:
        parser.error("t must be nonnegative")
    preset = PRESETS[args.preset]
    with capture_session(args.scene, [args.style], preset, args.gpu) as capture:
        image = as_image(capture.frame(Job(0, time, args.style)), preset)
    surface = skia.Surface(preset.width, preset.height)
    surface.getCanvas().drawImage(image, 0, 0)
    write_png(surface, args.out)


if __name__ == "__main__":
    main()
