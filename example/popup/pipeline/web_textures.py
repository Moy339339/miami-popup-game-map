"""Regenerate the debug page PNG from geometric marks."""

from pathlib import Path

import skia

from .frames import write_png


def main():
    width, height = 512, 768
    surface = skia.Surface(width, height)
    canvas = surface.getCanvas()
    canvas.clear(skia.ColorSetRGB(210, 210, 210))
    paint = skia.Paint(Color=skia.ColorSetRGB(100, 100, 100), StrokeWidth=4, AntiAlias=True)
    for x in range(20, width - 15, 46):
        canvas.drawLine(x, 20, x, height - 20, paint)
    for y in range(20, height - 15, 61):
        canvas.drawLine(20, y, width - 20, y, paint)
    target = Path(__file__).resolve().parents[2] / "web/tex/gen/demo-grid.png"
    write_png(surface, target)
    print(target)


if __name__ == "__main__":
    main()
