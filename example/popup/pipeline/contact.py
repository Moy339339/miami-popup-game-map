"""Create a timestamped contact sheet of selected animation instants."""

from argparse import ArgumentParser
from math import ceil

import skia

from .frames import FrameRenderer, PRESETS, write_png
from .timeline import Job, seconds


def make_sheet(images, times, preset, cols):
    if not times or cols < 1:
        raise ValueError("expected at least one time and a positive column count")
    cols = min(len(times), cols)
    rows = ceil(len(times) / cols)
    factor = min(1, 1600 / max(cols * preset.width, rows * preset.height))
    width, height = int(preset.width * factor), int(preset.height * factor)
    if min(width, height) < 1:
        raise ValueError("too many cells to fit in 1600 pixels")
    sheet = skia.Surface(cols * width, rows * height)
    canvas = sheet.getCanvas()
    canvas.clear(skia.ColorWHITE)
    face = skia.Typeface.MakeFromName(None, skia.FontStyle.Normal())
    font = skia.Font(face, min(16, max(6, width / 12)))
    for i, (time, image) in enumerate(zip(times, images, strict=True)):
        x, y = (i % cols) * width, (i // cols) * height
        canvas.drawImageRect(image, skia.Rect.MakeXYWH(x, y, width, height),
                             skia.SamplingOptions(skia.FilterMode.kLinear))
        label = f"{float(time):.3f}".rstrip("0").rstrip(".") + " s"
        canvas.drawRect(skia.Rect.MakeXYWH(x + 3, y + 3, font.measureText(label) + 10, font.getSize() + 5),
                        skia.Paint(Color=skia.ColorBLACK))
        canvas.drawString(label, x + 8, y + font.getSize() + 4, font, skia.Paint(Color=skia.ColorWHITE))
    return sheet


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--scene", required=True)
    parser.add_argument("--style", required=True)
    parser.add_argument("--preset", choices=PRESETS, default="preview")
    parser.add_argument("--times", required=True)
    parser.add_argument("--cols", type=int, default=3)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    times = [seconds(t) for t in args.times.split(",")]
    if args.cols < 1 or min(times) < 0:
        parser.error("expected positive columns and nonnegative times")
    preset = PRESETS[args.preset]
    renderer = FrameRenderer(args.scene, preset)
    images = (renderer.surface(Job(i, time, args.style)).makeImageSnapshot() for i, time in enumerate(times))
    sheet = make_sheet(images, times, preset, args.cols)
    write_png(sheet, args.out)
    print(f"{args.out} | {sheet.width()} x {sheet.height()} | {len(times)} instants")


if __name__ == "__main__":
    main()
