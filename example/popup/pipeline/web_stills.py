"""Save several raw Chrome renders to PNG in one browser session."""

from argparse import ArgumentParser
from pathlib import Path
import time

import skia

from .frames import PRESETS, write_png
from .timeline import Job, seconds
from .web_capture import add_scene_args, as_image, capture_session


def main():
    parser = ArgumentParser(description=__doc__)
    add_scene_args(parser)
    parser.add_argument("--style", required=True)
    parser.add_argument("--times", required=True, help="comma-separated instants")
    args = parser.parse_args()
    times = [seconds(v) for v in args.times.split(",")]
    preset = PRESETS[args.preset]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    with capture_session(args.scene, [args.style], preset, args.gpu) as capture:
        ready = time.perf_counter()
        for t in times:
            image = as_image(capture.frame(Job(0, t, args.style)), preset)
            surface = skia.Surface(preset.width, preset.height)
            surface.getCanvas().drawImage(image, 0, 0)
            name = out / f"t{t:06.2f}.png"
            write_png(surface, str(name))
            print(name)
    print(f"setup {ready - started:.1f}s, {len(times)} frames {time.perf_counter() - ready:.1f}s")


if __name__ == "__main__":
    main()
