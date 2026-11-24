"""Render a time span or a JSON EDL directly into one MP4."""

from argparse import ArgumentParser
from collections import deque
from concurrent.futures import ProcessPoolExecutor
from multiprocessing import get_context
import os
from time import perf_counter

from .encode import encode_frames
from .frames import FrameRenderer, PRESETS
from .timeline import direct_jobs, edl_jobs

_worker = None


def initialize(scene, preset, samples):
    global _worker
    _worker = FrameRenderer(scene, preset, samples)


def render_job(job):
    return _worker.pixels(job).tobytes()


def frame_bytes(scene, preset, samples, workers, jobs):
    if workers < 1:
        raise ValueError("worker count must be positive")
    if workers == 1:
        renderer = FrameRenderer(scene, preset, samples)
        for job in jobs:
            yield renderer.pixels(job).tobytes()
        return

    pending = deque()
    with ProcessPoolExecutor(max_workers=workers, mp_context=get_context("spawn"),
                             initializer=initialize, initargs=(scene, preset, samples)) as executor:
        try:
            for job in jobs:
                pending.append(executor.submit(render_job, job))
                if len(pending) >= workers * 2:
                    yield pending.popleft().result()
            while pending:
                yield pending.popleft().result()
        finally:
            for task in pending:
                task.cancel()


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
    parser.add_argument("--wav")
    parser.add_argument("--workers", type=int, default=min(6, os.cpu_count() or 1))
    parser.add_argument("--blur-samples", type=int, default=1)
    args = parser.parse_args()
    preset = PRESETS[args.preset]
    if args.edl:
        if args.t0 is not None or args.t1 is not None:
            parser.error("--edl supplies its own time ranges")
        jobs = edl_jobs(args.edl, preset.fps)
    else:
        if args.t0 is None or args.t1 is None:
            parser.error("--style requires --t0 and --t1")
        jobs = direct_jobs(args.style, args.t0, args.t1, preset.fps)
    start = perf_counter()
    frames = frame_bytes(args.scene, preset, args.blur_samples, min(args.workers, len(jobs)), jobs)
    try:
        encode_frames(frames, preset, args.out, args.wav, frame_count=len(jobs))
    finally:
        frames.close()
    elapsed = perf_counter() - start
    print(f"{args.out} | {len(jobs)} frames | {elapsed:.2f} s | {elapsed * 1000 / len(jobs):.1f} ms/frame")


if __name__ == "__main__":
    main()
