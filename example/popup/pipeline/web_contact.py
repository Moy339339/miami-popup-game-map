"""Capture preview instants into a contact sheet with the shared 01 layout."""

from argparse import ArgumentParser

from .contact import make_sheet
from .frames import PRESETS, write_png
from .timeline import Job, edl_jobs, seconds
from .web_capture import add_scene_args, as_image, capture_session


def main():
    parser = ArgumentParser(description=__doc__)
    add_scene_args(parser)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--style")
    mode.add_argument("--edl")
    parser.add_argument("--times", required=True, help="comma-separated instants; output times when using an EDL")
    parser.add_argument("--cols", type=int, default=3)
    args = parser.parse_args()
    times = [seconds(t) for t in args.times.split(",")]
    if args.cols < 1 or min(times) < 0:
        parser.error("expected positive columns and nonnegative times")
    preset = PRESETS[args.preset]
    if args.edl:
        timeline = edl_jobs(args.edl, preset.fps)
        indices = [round(t * preset.fps) for t in times]
        if max(indices) >= len(timeline):
            parser.error("requested time outside the EDL")
        jobs = [timeline[index] for index in indices]
        times = [seconds(index) / preset.fps for index in indices]
    else:
        jobs = [Job(i, t, args.style) for i, t in enumerate(times)]
    with capture_session(args.scene, [job.style for job in jobs], preset, args.gpu) as capture:
        images = (as_image(capture.frame(job), preset) for job in jobs)
        sheet = make_sheet(images, times, preset, args.cols)
    write_png(sheet, args.out)
    print(f"{args.out} | {sheet.width()} x {sheet.height()} | {len(times)} instants")


if __name__ == "__main__":
    main()
