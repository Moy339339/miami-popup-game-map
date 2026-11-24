"""Acceptance probes using the installed Chrome and a hardware GPU."""

from fractions import Fraction
from subprocess import run

import numpy as np

from popup.pipeline.encode import encode_frames
from popup.pipeline.frames import PRESETS
from popup.pipeline.timeline import Job
from popup.pipeline.web_capture import capture_session

DEMO = "scenes/demo/index.js"
COLORS = "scenes/demo/colors.js"
HEX = ("FF2FA0", "00C8FF", "FFE600", "1B1446", "F4EDE0")


def style(name):
    return f"styles/debug.js:{name}"


def capture_frame(capture, name, t):
    raw = capture.frame(Job(0, Fraction(str(t)), style(name)))
    return np.frombuffer(raw, np.uint8).reshape(capture.preset.height, capture.preset.width, 3)


def delta(a, b):
    difference = np.abs(a.astype(np.int16) - b)
    return int(difference.max()), float(difference.mean())


def test_browser_srgb_swatches_through_bt709_encoding(tmp_path):
    preset = PRESETS["final"]
    with capture_session(COLORS, [style("Swatches"), style("SwatchesShader")], preset) as capture:
        raw = capture_frame(capture, "Swatches", 0)
        swapped = capture_frame(capture, "SwatchesShader", 1)
        assert delta(raw[..., ::-1], swapped)[0] <= 1

    target = tmp_path / "web-swatches.mp4"
    encode_frames([raw.tobytes()], preset, target)
    decoded = run([
        "ffmpeg", "-v", "error", "-i", str(target), "-frames:v", "1",
        "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ], check=True, capture_output=True).stdout
    decoded = np.frombuffer(decoded, np.uint8).reshape(raw.shape)
    width = preset.width // len(HEX)
    for i, hex_color in enumerate(HEX):
        expected = tuple(bytes.fromhex(hex_color))
        cell = np.s_[100:-100, i * width + 32:(i + 1) * width - 32]
        raw_error = np.abs(raw[cell].astype(np.int16) - expected).mean(axis=(0, 1))
        error = np.abs(decoded[cell].astype(np.int16) - expected).mean(axis=(0, 1))
        print(f"#{hex_color} | capture mean RGB error {raw_error.round(4).tolist()} | "
              f"decoded mean RGB error {error.round(4).tolist()}")
        assert np.all(raw_error <= 1)
        assert np.all(error <= 3)


def test_browser_determinism_and_effect_controls():
    t = 7.8
    with capture_session(DEMO, [style("Day"), style("Night")], PRESETS["final"]) as capture:
        night = capture_frame(capture, "Night", t)
        repeated = capture_frame(capture, "Night", t)
        capture_frame(capture, "Day", t)
        switched = capture_frame(capture, "Night", t)
    for label, pixels in (("repeat", repeated), ("after style switch", switched)):
        maximum, mean = delta(night, pixels)
        print(f"final 7.8 Night | {label} | max {maximum} | mean {mean:.8f}")
        assert maximum <= 1 and mean <= 0.01

    names = ("Day", "DayBare", "DayHard", "Night", "NightBare", "NightHard", "NightFocus")
    with capture_session(DEMO, [style(name) for name in names], PRESETS["preview"]) as capture:
        day = capture_frame(capture, "Day", 1.4)
        day_repeat = capture_frame(capture, "Day", 1.4)
        day_soft = capture_frame(capture, "DayBare", 1.4)
        day_hard = capture_frame(capture, "DayHard", 1.4)
        night = capture_frame(capture, "Night", t)
        night_soft = capture_frame(capture, "NightBare", t)
        night_hard = capture_frame(capture, "NightHard", t)
        night_focus = capture_frame(capture, "NightFocus", t)
    maximum, mean = delta(day, day_repeat)
    print(f"preview 1.4 Day | repeat | max {maximum} | mean {mean:.8f}")
    assert maximum <= 1 and mean <= 0.01
    comparisons = [
        ("directional penumbra", day_soft, day_hard), ("point penumbra", night_soft, night_hard),
        ("depth of field", night_soft, night_focus), ("bloom", night_focus, night),
    ]
    for label, before, after in comparisons:
        maximum, mean = delta(before, after)
        print(f"{label} | max {maximum} | mean {mean:.6f}")
        assert maximum >= 3 and mean > 0.01
