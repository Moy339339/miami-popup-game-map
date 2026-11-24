"""Grayscale diagnostic style and its inverted variant."""

import numpy as np
import skia


class Debug:
    name = "debug"
    frame_hold = 1
    background = 226
    stroke = 40
    face_light = 207
    face_dark = 154
    page_light = 237
    page_dark = 181

    def __init__(self):
        face = skia.Typeface.MakeFromName(None, skia.FontStyle.Normal())
        self.card_font = skia.Font(face, 3.5)
        self.page_font = skia.Font(face, 16)

    @staticmethod
    def gray(level, alpha=255):
        return skia.ColorSetARGB(alpha, level, level, level)

    def begin_frame(self, canvas, fc):
        canvas.clear(self.gray(self.background))

    def draw_surface(self, canvas, item, fc):
        tone = self.face_light if item.side == "front" else self.face_dark
        canvas.drawPath(item.outline, skia.Paint(Color=self.gray(tone), AntiAlias=True))
        stroke = skia.Paint(Color=self.gray(self.stroke), AntiAlias=True,
                            Style=skia.Paint.kStroke_Style, StrokeWidth=0.45)
        canvas.drawPath(item.outline, stroke)
        if item.kind == "board":
            label = item.id
        else:
            label = item.id + (" -" if item.side == "back" else " +")
        bounds = item.outline.computeTightBounds()
        x, y = bounds.centerX(), bounds.centerY()
        font = self.card_font
        paint = skia.Paint(Color=self.gray(self.stroke), AntiAlias=True)
        canvas.save()
        canvas.translate(x, y)
        if item.side == "back":
            canvas.scale(-1, 1)
        canvas.drawString(label, -font.measureText(label) / 2, 0, font, paint)
        canvas.restore()

        start = item.local_to_world[:3, 3] + item.local_to_world[:3, :2] @ np.array([x, y])
        points = np.array((start, start + 8 * item.normal_world))
        depths = points @ fc.world_to_screen[2, :3] + fc.world_to_screen[2, 3]
        if min(depths) > fc.camera.near:
            p0, p1 = fc.project(points)
            canvas.save()
            canvas.resetMatrix()
            paint.setStrokeWidth(max(1, 2 * fc.scale))
            canvas.drawLine(*p0, *p1, paint)
            canvas.drawCircle(*p1, max(1, 2.5 * fc.scale), paint)
            canvas.restore()

    def draw_shadow(self, canvas, item, light, receiver, fc):
        canvas.drawPath(item.outline, skia.Paint(Color=self.gray(self.stroke, 36), AntiAlias=True))

    def page_texture(self, page_id, side, fc):
        width, height = 192, 288
        surface = skia.Surface(width, height)
        canvas = surface.getCanvas()
        canvas.clear(self.gray(self.page_light if side == "front" else self.page_dark))
        paint = skia.Paint(Color=self.gray(self.stroke), AntiAlias=True, StrokeWidth=2)
        for x in (8, 36, 72, 108, 144, 183):
            canvas.drawLine(x, 6, x, height - 6, paint)
        for y in range(6, height, 32):
            canvas.drawLine(8, y, width - 9, y, paint)
        canvas.drawString(side, 50, 126, self.page_font, paint)
        return surface.makeImageSnapshot()

    def curl_shade(self, normal_world, fc):
        tone = 0.8 + 0.2 * abs(normal_world[2])
        return (tone, tone, tone, 1)

    def end_frame(self, surface, fc):
        pass


class Inverted(Debug):
    name = "debug-inverted"
    background = 29
    stroke = 215
    face_light = 48
    face_dark = 101
    page_light = 18
    page_dark = 74
