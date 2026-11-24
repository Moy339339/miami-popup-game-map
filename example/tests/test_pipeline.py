from fractions import Fraction
from hashlib import sha256
from json import loads
from subprocess import run
import wave

import numpy as np
import pytest
import skia

from popup.engine.render import rgb_pixels
from popup.pipeline.encode import encode_frames
from popup.pipeline.frames import FrameRenderer, PRESETS
from popup.pipeline.render import frame_bytes
from popup.pipeline.timeline import Job, direct_jobs, edl_jobs, quantized_time

SCENE = "popup.scenes.demo"
DEBUG = "popup.styles.debug:Debug"
INVERTED = "popup.styles.debug:Inverted"
RELAY = "popup/scenes/demo/relay.json"


def test_pixels_are_identical_across_independent_workers_and_segments():
    preset = PRESETS["preview"]
    jobs = [Job(11, Fraction(17, 10), DEBUG), Job(22, Fraction(5), DEBUG),
            Job(35, Fraction(17, 10), DEBUG, 4)]
    serial = [sha256(raw).hexdigest() for raw in frame_bytes(SCENE, preset, 1, 1, jobs)]
    parallel = [sha256(raw).hexdigest() for raw in frame_bytes(SCENE, preset, 1, 2, jobs)]
    assert serial == parallel
    assert serial[0] == serial[2] != serial[1]
    print(f"repeat PNG source RGB SHA-256 {serial[0]}")


def test_relay_changes_style_without_restarting_the_source_timeline():
    preset = PRESETS["final"]
    jobs = edl_jobs(RELAY, preset.fps)
    reference = direct_jobs(DEBUG, 4, 7, preset.fps)
    assert len(jobs) == len(reference) == 90
    assert [job.source for job in jobs] == [job.source for job in reference]
    cuts = [i for i in range(1, len(jobs)) if jobs[i].style != jobs[i - 1].style]
    assert cuts == [15, 30, 45, 60, 75]
    assert all(jobs[i].source - jobs[i - 1].source == Fraction(1, 30) for i in cuts)
    assert jobs[0].style == DEBUG and jobs[cuts[0]].style == INVERTED
    print(f"relay cut frame numbers: {cuts}, source step at each cut: 1/30 s")


def test_edl_spans_round_cut_to_next_frame(tmp_path):
    path = tmp_path / "edit.json"
    path.write_text('{"segments": [{"out_start": 0, "out_end": 0.07, "source_start": 3, "style": "a"},'
                    '{"out_start": 0.07, "out_end": 0.2, "source_start": 4.5, "style": "b"}]}')
    jobs = edl_jobs(path, 30)
    assert [job.number for job in jobs] == list(range(6))
    assert [job.style for job in jobs] == ["a", "a", "a", "b", "b", "b"]
    assert jobs[3].source == Fraction("4.53")


def test_frame_hold_uses_the_global_source_grid():
    assert quantized_time(Fraction(31, 30), 30, 2) == 1
    assert quantized_time(Fraction(32, 30), 30, 2) == Fraction(32, 30)
    assert quantized_time(Fraction(31, 30), 30, 1) == Fraction(31, 30)
    with pytest.raises(ValueError):
        quantized_time(Fraction(0), 30, 0)


def test_motion_blur_averages_in_linear_light(monkeypatch):
    preset = PRESETS["preview"]
    renderer = FrameRenderer(SCENE, preset, samples=2)

    def alternating(_job, time):
        surface = skia.Surface(preset.width, preset.height)
        surface.getCanvas().clear(skia.ColorBLACK if time == 0 else skia.ColorWHITE)
        return surface

    monkeypatch.setattr(renderer, "surface_at", alternating)
    rgb = renderer.pixels(Job(0, Fraction(0), DEBUG))
    assert (rgb == 180).all()


def test_bt709_color_roundtrip(tmp_path):
    preset = PRESETS["final"]
    target = tmp_path / "pytest-colors.mp4"
    colors = ("FF2FA0", "00C8FF", "FFE600", "1B1446", "F4EDE0")
    rgb = [tuple(bytes.fromhex(color)) for color in colors]
    surface = skia.Surface(preset.width, preset.height)
    canvas = surface.getCanvas()
    block = preset.width // len(colors)
    for i, (r, g, b) in enumerate(rgb):
        canvas.drawRect(skia.Rect.MakeXYWH(i * block, 0, block, preset.height),
                        skia.Paint(Color=skia.ColorSetARGB(255, r, g, b)))
    encode_frames([rgb_pixels(surface).tobytes()], preset, target)
    metadata = run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(target)],
        check=True, capture_output=True).stdout
    stream = loads(metadata)["streams"][0]
    expected = {
        "codec_name": "h264", "profile": "High", "pix_fmt": "yuv420p", "r_frame_rate": "30/1",
        "color_range": "tv", "color_space": "bt709", "color_transfer": "bt709", "color_primaries": "bt709",
    }
    assert {key: stream[key] for key in expected} == expected
    raw = run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(target), "-frames:v", "1",
        "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ], check=True, capture_output=True).stdout
    decoded = np.frombuffer(raw, np.uint8).reshape(preset.height, preset.width, 3)
    for i, color in enumerate(rgb):
        interior = decoded[100:-100, i * block + 32:(i + 1) * block - 32]
        error = np.abs(interior.astype(np.int16) - color).mean(axis=(0, 1))
        print(f"#{colors[i]} | mean absolute R/G/B error {error.round(4).tolist()}")
        assert np.all(error <= 3)


@pytest.mark.parametrize("audio_seconds", [0.125, 0.6])
def test_wav_is_padded_or_trimmed_to_the_frame_duration(tmp_path, audio_seconds):
    preset = PRESETS["preview"]
    wav = tmp_path / "test.wav"
    target = tmp_path / "pytest-wav.mp4"
    sample_rate = 48000
    with wave.open(str(wav), "wb") as source:
        source.setparams((2, 2, sample_rate, 0, "NONE", "not compressed"))
        source.writeframes(bytes(4 * round(audio_seconds * sample_rate)))
    pixels = bytes(preset.width * preset.height * 3)
    encode_frames([pixels] * 6, preset, target, wav, frame_count=6)
    result = run(
        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(target)],
        check=True, capture_output=True).stdout
    video, audio = loads(result)["streams"]
    assert (video["width"], video["height"], video["avg_frame_rate"]) == (540, 720, "15/1")
    assert audio["codec_name"] == "aac" and audio["channels"] == 2
    assert float(audio["duration"]) == pytest.approx(float(video["duration"]), abs=1 / sample_rate)
