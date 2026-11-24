"""Call an exporter function of a scene module inside the page and save the returned PNG data URLs.

The function must return {filename: "data:image/png;base64,..."}; it runs after the scene is built, so it can
reuse everything the scene loaded (fonts, atlases). Used for publishing figures (e.g. raw textures with alpha).
"""

from argparse import ArgumentParser
import base64
from pathlib import Path

from .frames import PRESETS
from .web_capture import add_scene_args, capture_session


def main():
    parser = ArgumentParser(description=__doc__)
    add_scene_args(parser)
    parser.add_argument("--style", required=True)
    parser.add_argument("--module", required=True, help="module URL under web/, e.g. /scenes/leonida/paper_steps.js")
    parser.add_argument("--fn", default="exportPngs")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    with capture_session(args.scene, [args.style], PRESETS[args.preset], args.gpu) as capture:
        files = capture.page.evaluate("async ([m, fn]) => (await import(m))[fn]()", [args.module, args.fn])
        capture.check_errors()
    for name, url in files.items():
        path = out / name
        path.write_bytes(base64.b64decode(url.split(",", 1)[1]))
        print(path)


if __name__ == "__main__":
    main()
