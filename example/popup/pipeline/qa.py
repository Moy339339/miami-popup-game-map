"""Scan adjacent demo or EDL frames for depth flips, pixel jumps and loose joints."""

from argparse import ArgumentParser
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import median

import numpy as np
import skia

from popup.engine.geometry import polygon_path, project, skia_matrix
from popup.engine.ordering import camera_fragments
from popup.engine.render import draw, resolve, rgb_pixels

from .frames import FrameRenderer, PRESETS
from .timeline import direct_jobs, edl_jobs


def _visible_paths(geometry):
    fc = geometry.context
    viewport = skia.Path.Rect(skia.Rect.MakeWH(fc.width, fc.height))
    for part in camera_fragments(geometry.items, fc.world_to_screen, fc.camera.near):
        item = geometry.items[part.index]
        matrix = item.local_to_screen
        try:
            inverse_depth = np.linalg.inv(matrix)[2]
        except np.linalg.LinAlgError:
            continue
        path = skia.Path()
        item.outline.transform(skia_matrix(matrix), path)
        if part.clipped:
            path = skia.Op(path, polygon_path(project(fc.world_to_screen, part.vertices)),
                           skia.PathOp.kIntersect_PathOp)
        bounds = path.computeTightBounds()
        if viewport.getBounds().contains(bounds):
            yield item.id, path, bounds, inverse_depth
        elif skia.Rect.Intersects(bounds, viewport.getBounds()):
            path = skia.Op(path, viewport, skia.PathOp.kIntersect_PathOp)
            yield item.id, path, path.computeTightBounds(), inverse_depth


def depth_orders(geometry):
    """Return signs for projected overlaps, with 0 marking mixed front/back."""
    visible = list(_visible_paths(geometry))
    orders = defaultdict(set)
    for i, (a, path_a, bounds_a, inverse_a) in enumerate(visible):
        for b, path_b, bounds_b, inverse_b in visible[i + 1:]:
            if a == b or not skia.Rect.Intersects(bounds_a, bounds_b):
                continue
            difference = inverse_a - inverse_b
            if np.max(np.abs(difference)) <= 1e-12:
                continue
            overlap = skia.Op(path_a, path_b, skia.PathOp.kIntersect_PathOp)
            bounds = overlap.computeTightBounds()
            if bounds.width() * bounds.height() < 1:
                continue
            values = [x * difference[0] + y * difference[1] + difference[2]
                      for x, y in (tuple(p) for p in overlap.getPoints())]
            if not values:
                continue
            pair = (a, b) if a < b else (b, a)
            sign = 1 if a < b else -1
            if max(values) > 5e-8:
                orders[pair].add(sign)
            if min(values) < -5e-8:
                orders[pair].add(-sign)
    return {pair: next(iter(signs)) if len(signs) == 1 else 0 for pair, signs in orders.items()}


@dataclass
class Audit:
    frame_count: int
    joint_samples: int
    max_error: float
    max_delta: float
    cuts: int
    mixed: int
    flips: list
    jumps: list
    loose: list

    def text(self, fps, tolerance, jump_min, jump_ratio):
        lines = [
            f"Frames: {self.frame_count} @ {fps} fps",
            f"Adjacent stable depth reversals: {len(self.flips)}",
            f"Frames with mixed depth for at least one pair: {self.mixed}",
            f"Pixel jumps: {len(self.jumps)} (RGB MAE >= {jump_min:g} and >= {jump_ratio:g}x local median)",
            f"Highest adjacent RGB MAE outside edits: {self.max_delta:.3f}",
            f"Planned edits or source discontinuities excluded from pixel comparison: {self.cuts}",
            f"Joint samples: {self.joint_samples}; max error: {self.max_error:.8g} mm; "
            f"errors > {tolerance:g} mm: {len(self.loose)}",
        ]
        lines.extend(f"depth | frames {frame - 1}->{frame} | {a} / {b} | sign {before:+d}->{after:+d}"
                     for frame, (a, b), before, after in self.flips)
        lines.extend(f"pixels | frames {frame - 1}->{frame} | MAE {delta:.3f} | median {baseline:.3f}"
                     for frame, delta, baseline in self.jumps)
        lines.extend(f"joint | frame {frame} | {joint} | {error:.8g} mm"
                     for frame, joint, error in self.loose)
        return "\n".join(lines) + "\n"


def audit(renderer, jobs, tolerance, jump_min, jump_ratio):
    preset = renderer.preset
    use = Audit(len(jobs), 0, 0., 0., 0, 0, [], [], [])
    previous_pixels = previous_orders = previous_job = None
    deltas = [None] * len(jobs)
    for i, job in enumerate(jobs):
        time = renderer.source_time(job)
        geometry = resolve(renderer.scene, float(time), time * preset.fps // 1,
                           preset.fps, preset.width, preset.height)
        orders = depth_orders(geometry)
        use.mixed += 0 in orders.values()
        pixels = rgb_pixels(draw(renderer.scene, renderer.style(job.style), geometry)).astype(np.int16)
        if previous_job is not None:
            continuous = (job.source - previous_job.source) * preset.fps == 1
            if continuous:
                for pair in sorted(previous_orders.keys() & orders.keys()):
                    before, after = previous_orders[pair], orders[pair]
                    if before * after == -1:
                        use.flips.append((job.number, pair, before, after))
            if continuous and job.style == previous_job.style:
                deltas[i] = float(np.abs(pixels - previous_pixels).mean())
            else:
                use.cuts += 1
        for joint in geometry.joints:
            error = joint.error
            use.joint_samples += 1
            use.max_error = max(use.max_error, error)
            if error > tolerance:
                use.loose.append((job.number, joint.id, error))
        previous_pixels, previous_orders, previous_job = pixels, orders, job

    for i, delta in enumerate(deltas):
        if delta is None:
            continue
        use.max_delta = max(delta, use.max_delta)
        neighbors = [deltas[j] for j in range(max(0, i - 5), min(len(deltas), i + 6))
                     if j != i and deltas[j] is not None]
        baseline = median(neighbors) if neighbors else 0.
        if delta >= jump_min and delta >= jump_ratio * max(baseline, 0.1):
            use.jumps.append((jobs[i].number, delta, baseline))
    return use


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--scene", required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--style")
    mode.add_argument("--edl")
    parser.add_argument("--preset", choices=PRESETS, default="preview")
    parser.add_argument("--t0")
    parser.add_argument("--t1")
    parser.add_argument("--out", required=True)
    parser.add_argument("--joint-tolerance", type=float, default=0.01)
    parser.add_argument("--jump-min", type=float, default=8)
    parser.add_argument("--jump-ratio", type=float, default=4)
    args = parser.parse_args()
    preset = PRESETS[args.preset]
    if min(args.joint_tolerance, args.jump_min, args.jump_ratio) <= 0:
        parser.error("QA thresholds must be positive")
    if args.edl:
        if args.t0 is not None or args.t1 is not None:
            parser.error("--edl supplies its own time ranges")
        jobs = edl_jobs(args.edl, preset.fps)
    else:
        if args.t0 is None or args.t1 is None:
            parser.error("--style requires --t0 and --t1")
        jobs = direct_jobs(args.style, args.t0, args.t1, preset.fps)
    result = audit(FrameRenderer(args.scene, preset), jobs, args.joint_tolerance, args.jump_min, args.jump_ratio)
    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(result.text(preset.fps, args.joint_tolerance, args.jump_min, args.jump_ratio),
                           encoding="utf-8")
    print(f"{destination} | {len(result.flips)} depth reversals | {len(result.jumps)} pixel jumps | "
          f"{len(result.loose)} loose joints")


if __name__ == "__main__":
    main()
