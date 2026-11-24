"""Scene and style loading, presets and deterministic frame evaluation."""

from dataclasses import dataclass
from fractions import Fraction
from importlib import import_module
from pathlib import Path

import numpy as np
import skia

from popup.engine.render import render_frame, rgb_pixels
from popup.engine.scene import Scene

from .timeline import quantized_time


@dataclass(frozen=True)
class Preset:
    width: int
    height: int
    fps: int
    ss: int = 1   # supersampling factor: render at ss times the size, then average ss x ss pixels in linear light to scale back down


# final: 2x supersampling (cleaner edges); draft = the old final (fast, for self-checks)
PRESETS = {"preview": Preset(540, 720, 15), "draft": Preset(1080, 1440, 30), "final": Preset(1080, 1440, 30, 2)}
LINEAR_709 = np.where(
    np.arange(256) / 255 < 0.081,
    np.arange(256) / 255 / 4.5,
    ((np.arange(256) / 255 + 0.099) / 1.099) ** (1 / 0.45),
).astype(np.float32)


def load_scene(module_name):
    scene = import_module(module_name).SCENE
    if not isinstance(scene, Scene):
        raise TypeError(f"{module_name}.SCENE must be a popup.engine.Scene")
    return scene


def load_style(spec):
    module, separator, class_name = spec.partition(":")
    if not separator or not module or not class_name:
        raise ValueError("style must be specified as module:Class")
    return getattr(import_module(module), class_name)()


def write_png(surface, target):
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    data = surface.makeImageSnapshot().encodeToData(skia.kPNG, 100)
    if data is None:
        raise RuntimeError("Skia PNG encoding failed")
    target.write_bytes(bytes(data))


class FrameRenderer:
    def __init__(self, scene, preset, samples=1):
        if samples < 1:
            raise ValueError("blur sample count must be positive")
        self.scene = load_scene(scene)
        self.preset = preset
        self.samples = samples
        self.styles = {}

    def style(self, spec):
        if spec not in self.styles:
            self.styles[spec] = load_style(spec)
        return self.styles[spec]

    def source_time(self, job):
        return quantized_time(job.source, self.preset.fps, getattr(self.style(job.style), "frame_hold", 1))

    def surface_at(self, job, time):
        width, height, fps = self.preset.width, self.preset.height, self.preset.fps
        return render_frame(self.scene, self.style(job.style), float(time), time * fps // 1,
                            fps, width, height)

    def surface(self, job):
        t = self.source_time(job)
        if self.samples == 1:
            return self.surface_at(job, t)
        linear = None
        for sample in range(self.samples):
            time = t + Fraction(sample, self.samples * self.preset.fps)
            pixels = rgb_pixels(self.surface_at(job, time))
            if linear is None:
                linear = LINEAR_709[pixels]
            else:
                linear += LINEAR_709[pixels]
        linear /= self.samples
        compressed = np.where(linear < 0.018, linear * 4.5, 1.099 * linear ** 0.45 - 0.099)
        rgb = np.rint(np.clip(compressed, 0, 1) * 255).astype(np.uint8)
        rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
        rgba[..., :3] = rgb
        rgba[..., 3] = 255
        surface = skia.Surface(self.preset.width, self.preset.height)
        surface.getCanvas().drawImage(skia.Image.fromarray(rgba, colorType=skia.kRGBA_8888_ColorType), 0, 0)
        return surface

    def pixels(self, job):
        return rgb_pixels(self.surface(job))
