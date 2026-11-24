"""Render a single animation instant as a PNG."""

from argparse import ArgumentParser

from .frames import FrameRenderer, PRESETS, write_png
from .timeline import Job, seconds


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--scene", required=True)
    parser.add_argument("--style", required=True)
    parser.add_argument("--preset", choices=PRESETS, default="preview")
    parser.add_argument("--t", required=True)
    parser.add_argument("--blur-samples", type=int, default=1)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    time = seconds(args.t)
    if time < 0:
        parser.error("t must be nonnegative")
    renderer = FrameRenderer(args.scene, PRESETS[args.preset], args.blur_samples)
    write_png(renderer.surface(Job(0, time, args.style)), args.out)


if __name__ == "__main__":
    main()
