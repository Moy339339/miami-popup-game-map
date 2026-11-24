"""Exact source times for direct rendering and JSON edit decisions."""

from dataclasses import dataclass
from decimal import Decimal
from fractions import Fraction
import json
from math import ceil
from pathlib import Path


def seconds(value):
    try:
        return Fraction(str(value))
    except (ValueError, ZeroDivisionError) as exc:
        raise ValueError(f"invalid time: {value!r}") from exc


@dataclass(frozen=True)
class Job:
    number: int
    source: Fraction
    style: str
    segment: int = 0


def direct_jobs(style, t0, t1, fps):
    start, end = seconds(t0), seconds(t1)
    if start < 0 or end <= start:
        raise ValueError("expected 0 <= t0 < t1")
    return [Job(i, start + Fraction(i, fps), style) for i in range(ceil((end - start) * fps))]


def edl_jobs(path, fps):
    data = json.loads(Path(path).read_text(encoding="utf-8"), parse_float=Decimal)
    segments = data["segments"]
    if not segments:
        raise ValueError("an EDL must contain at least one segment")
    jobs = []
    previous_end = Fraction(0)
    for index, segment in enumerate(segments):
        start, end, source = (seconds(segment[k]) for k in ("out_start", "out_end", "source_start"))
        if start != previous_end or end <= start or source < 0:
            raise ValueError("EDL output spans must be contiguous from zero with nonnegative source times")
        previous_end = end
        if ("style" in segment) == ("relay" in segment):
            raise ValueError("each EDL segment needs exactly one of style or relay")
        relay = segment.get("relay")
        if relay is not None:
            styles, every = relay["styles"], seconds(relay["every"])
            if not styles or every <= 0:
                raise ValueError("a relay needs styles and a positive interval")
        for i in range(ceil(start * fps), ceil(end * fps)):
            offset = Fraction(i, fps) - start
            style = styles[(offset // every) % len(styles)] if relay is not None else segment["style"]
            jobs.append(Job(i, source + offset, style, index))
    return jobs


def quantized_time(t, fps, hold):
    if not isinstance(hold, int) or isinstance(hold, bool) or hold < 1:
        raise ValueError("Style.frame_hold must be a positive integer")
    return t if hold == 1 else Fraction((t * fps // hold) * hold, fps)
