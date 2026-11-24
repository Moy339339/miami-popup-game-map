"""Render a three.js scene or EDL to H.264 using the installed Chrome."""

from argparse import ArgumentParser
from fractions import Fraction
from math import ceil
import os
from pathlib import Path
import subprocess
import sys
from time import perf_counter

from .encode import encode_frames
from .frames import PRESETS
from .timeline import direct_jobs, edl_jobs, seconds
from .web_capture import add_scene_args, capture_session, lower_priority


def main():
    parser = ArgumentParser(description=__doc__)
    add_scene_args(parser)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--style")
    mode.add_argument("--edl")
    parser.add_argument("--t0")
    parser.add_argument("--t1")
    parser.add_argument("--wav")
    parser.add_argument("--parallel", type=int, default=1,
                        help="Split into at most this many parts rendered at the same time (one Chrome each, maximum 2), then joined losslessly; every frame depends only on its time, so the joins are pixel-identical to serial rendering. "
                             "Before starting, free VRAM is checked: 3 GB must stay free afterwards, otherwise fewer parts are started automatically")
    args = parser.parse_args()
    lower_priority()
    if args.parallel > 1:
        args.parallel = affordable_parts(args.parallel)
    if args.parallel > 1:
        if args.edl or args.wav:
            parser.error("--parallel only supports --style + --t0/--t1, without --wav")
        return render_parallel(args)
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
    with capture_session(args.scene, [job.style for job in jobs], preset, args.gpu) as capture:
        # pipeline: the browser draws back to back and uploads as it goes (Capture.stream); drawing the next frame, uploading the previous one and encoding all happen at the same time
        encode_frames(capture.stream(jobs), preset, args.out, wav=args.wav, frame_count=len(jobs))
    elapsed = perf_counter() - start
    count = len(jobs)
    print(f"{args.out} | {count} frames | {elapsed:.2f} s | {elapsed * 1000 / count:.1f} ms/frame | "
          f"capture {capture.capture_seconds * 1000 / count:.1f} ms/frame")
    print("steps | " + capture.report())



# leave headroom for the computer while rendering: at most 2 parts at once, at least 3 GB of VRAM kept free
MAX_PARTS, VRAM_PER_PART_MB, VRAM_RESERVE_MB = 2, 4300, 3072   # one Chrome part with 2x supersampling measured about 4 GB


def affordable_parts(want):
    want = min(want, MAX_PARTS)
    try:
        used, total = (int(v) for v in subprocess.run(
            ["nvidia-smi", "--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, check=True).stdout.splitlines()[0].split(","))
    except Exception as exc:   # noqa: BLE001 - if VRAM cannot be queried, start only 1 part
        print(f"nvidia-smi unavailable ({exc}), starting only 1 part", flush=True)
        return 1
    free = total - used
    k = want
    while k > 1 and free - k * VRAM_PER_PART_MB < VRAM_RESERVE_MB:
        k -= 1
    print(f"VRAM used {used} / {total} MB: starting {k} part(s) (about {VRAM_PER_PART_MB} MB each, keeping {VRAM_RESERVE_MB} MB free)", flush=True)
    return k


def render_parallel(args):
    """Split the whole video into N runs of consecutive frames, start one subprocess per run (one Chrome each) to render them at the same time, and finally join them losslessly with ffmpeg (-c copy, encoding parameters unchanged).
    Cut points fall on whole frames: part k = frames i0..i1, and the time t0 + i/fps is exactly the same as in serial rendering."""
    preset = PRESETS[args.preset]
    t0, t1 = seconds(args.t0), seconds(args.t1)
    total = ceil((t1 - t0) * preset.fps)
    n = min(args.parallel, total)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    parts, procs = [], []
    start = perf_counter()
    for k in range(n):
        i0, i1 = total * k // n, total * (k + 1) // n
        a, b = t0 + Fraction(i0, preset.fps), t0 + Fraction(i1, preset.fps)
        part = out.parent / f".{out.stem}-part{k}.mp4"
        parts.append(part)
        log = open(out.parent / f".{out.stem}-part{k}.log", "w", encoding="utf-8")
        cmd = [sys.executable, "-m", "popup.pipeline.web_render", "--scene", args.scene, "--style", args.style,
               "--t0", str(a), "--t1", str(b), "--preset", args.preset, "--gpu", args.gpu, "--out", str(part)]
        procs.append((subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, env=os.environ.copy()), log, k, i1 - i0))
    failed = []
    for proc, log, k, count in procs:
        status = proc.wait()
        log.close()
        tail = Path(log.name).read_text(encoding="utf-8").strip().splitlines()[-2:]
        print(f"part {k} | {count} frames | exit {status} | " + " / ".join(tail), flush=True)
        if status != 0:
            failed.append(k)
    if failed:
        raise SystemExit(f"parts failed: {failed} (logs in {out.parent}/.{out.stem}-partK.log)")
    listing = out.parent / f".{out.stem}-parts.txt"
    listing.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
                    "-c", "copy", "-movflags", "+faststart+write_colr", str(out)], check=True)
    for p in [*parts, listing, *(out.parent / f".{out.stem}-part{k}.log" for k in range(n))]:
        p.unlink(missing_ok=True)
    elapsed = perf_counter() - start
    print(f"{out} | {total} frames | {n} parts | {elapsed:.2f} s | {elapsed * 1000 / total:.1f} ms/frame (wall)")


if __name__ == "__main__":
    main()
