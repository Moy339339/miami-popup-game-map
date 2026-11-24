"""Loopback raw RGB transport for the project-local headless Chrome renderer."""

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
from secrets import token_hex
from tempfile import TemporaryDirectory
from threading import Condition, Thread
from time import perf_counter
from urllib.parse import urlencode

import numpy as np
from playwright.sync_api import sync_playwright
import skia

from .frames import PRESETS
from .timeline import quantized_time

DEFAULT_GPU = ""   # leave empty = any hardware GPU will do; to pin a specific card pass a name fragment such as --gpu "RTX 4070"
ROOT = Path(__file__).resolve().parents[2]
# WebGL backend: Windows uses D3D11 (the configuration the author tested); macOS and Linux let Chrome choose by itself (not tested)
ANGLE = ["--use-angle=d3d11"] if os.name == "nt" else []


class FrameServer(ThreadingHTTPServer):
    """Receives the frames the browser POSTs, stored by X-Frame frame number; few are in flight at any moment (the browser has at most 2),
    once more than LIMIT frames are waiting to be taken the upload waits (backpressure), but the frame whose turn it is does not wait, to avoid a deadlock."""
    LIMIT = 8

    def __init__(self, root, size):
        super().__init__(("127.0.0.1", 0), partial(Handler, directory=str(root)))
        self.token = token_hex(24)
        self.size = size
        self.frames = {}
        self.expected = 0
        self.cond = Condition()
        self.recv_ms = 0.


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, _format, *args):
        pass

    def do_POST(self):
        server = self.server
        if self.path != "/__capture" or self.headers.get("X-Popup-Token") != server.token:
            self.send_error(403)
            return
        if self.headers.get("Content-Length") != str(server.size):
            self.send_error(400)
            return
        index = int(self.headers.get("X-Frame", "0"))
        self.connection.settimeout(60)
        t = perf_counter()
        pixels = self.rfile.read(server.size)
        server.recv_ms += (perf_counter() - t) * 1000
        if len(pixels) != server.size:
            self.send_error(400)
            return
        with server.cond:
            while len(server.frames) >= server.LIMIT and index != server.expected:
                server.cond.wait(1)
            server.frames[index] = pixels
            server.cond.notify_all()
        self.send_response(204)
        self.end_headers()


class Capture:
    def __init__(self, page, server, preset, info, errors, cpu_ss=1):
        self.page, self.server, self.preset = page, server, preset
        self.info, self.errors = info, errors
        self.cpu_ss = cpu_ss   # old flow (POPUP_SS_CPU=1): the canvas itself is ss times larger, and the frame is downscaled here after readback
        self.capture_seconds = 0.
        self.times = {"draw": 0., "read": 0., "post": 0., "rest": 0., "convert": 0.}   # accumulated milliseconds per step (draw/read/post are measured in the browser)
        self.count = 0
        self.next_index = 0

    def check_errors(self):
        if self.errors:
            raise RuntimeError("\n".join(self.errors))

    def frame(self, job):
        """Single frame (for stills and contact sheets): draw one frame and wait for it to arrive."""
        time = quantized_time(job.source, self.preset.fps, self.info["styles"][job.style])
        start = perf_counter()
        index = self.next_index
        self.next_index += 1
        times = self.page.evaluate("params => window.popup.captureAt(params)", {
            "style": job.style, "t": float(time), "token": self.server.token, "index": index,
        })
        self.check_errors()
        pixels = self.take(index, wait=False)
        self.capture_seconds += perf_counter() - start
        self.add_times(times)
        return self.convert(pixels)

    def stream(self, jobs):
        """Pipeline (for the final video): hand the browser the whole list of times at once, drawn back to back and uploaded as it goes; frames are taken out here in frame-number order."""
        start = perf_counter()
        base = self.next_index
        self.next_index += len(jobs)
        frames = [{"style": job.style, "t": float(quantized_time(job.source, self.preset.fps, self.info["styles"][job.style]))}
                  for job in jobs]
        self.page.evaluate("params => window.popup.startRange(params)", {"frames": frames, "token": self.server.token, "start": base, "inflight": int(os.environ.get("POPUP_INFLIGHT", "2"))})
        for i in range(len(jobs)):
            pixels = self.take(base + i, wait=True)
            yield self.convert(pixels)
        status = self.poll()
        while not status["done"]:
            status = self.poll()
        self.add_times(status["times"])
        self.capture_seconds += perf_counter() - start

    def poll(self):
        status = self.page.evaluate("() => window.popup.jobStatus()")
        self.check_errors()
        if status and status.get("error"):
            raise RuntimeError("Chrome render job failed: " + status["error"])
        return status

    def take(self, index, wait):
        server = self.server
        while True:
            with server.cond:
                if index in server.frames:
                    pixels = server.frames.pop(index)
                    server.expected = index + 1
                    server.cond.notify_all()
                    return pixels
                if not wait:
                    raise RuntimeError("Chrome acknowledged capture without providing a frame")
                if server.cond.wait(2):
                    continue
            self.poll()   # nothing after two seconds: check whether the browser side has hit an error

    def add_times(self, times):
        for k, v in (times or {}).items():
            self.times[k] += v

    def convert(self, pixels):
        got = perf_counter()
        ss = self.cpu_ss
        h, w = self.preset.height * ss, self.preset.width * ss
        # the browser reads back the canvas RGBA as is, rows bottom-to-top: flip the rows and drop the alpha channel
        rgb = np.ascontiguousarray(np.frombuffer(pixels, dtype=np.uint8).reshape(h, w, 4)[::-1, :, :3])
        out = downsample(rgb, ss) if ss > 1 else rgb.tobytes()
        self.times["convert"] += (perf_counter() - got) * 1000
        self.count += 1
        return out

    def report(self):
        n = max(1, self.count)
        return " | ".join(f"{k} {v / n:.1f}" for k, v in self.times.items()) + f" | recv(py) {self.server.recv_ms / n:.1f} ms/frame"


_TO_LINEAR = np.where(np.arange(256) / 255 <= 0.04045, np.arange(256) / 255 / 12.92,
                      ((np.arange(256) / 255 + 0.055) / 1.055) ** 2.4).astype(np.float32)


def downsample(rgb, ss):
    """Old flow: an sRGB frame at ss times the size (h*ss x w*ss x 3) -> average ss x ss pixels in linear light -> sRGB bytes at the output size.
    The new flow does the same thing on the GPU (web/engine/post.js DOWNSAMPLE); it is kept here for pixel-by-pixel comparison."""
    H, W = rgb.shape[:2]
    lin = _TO_LINEAR[rgb.reshape(H // ss, ss, W // ss, ss, 3)]
    m = lin.mean(axis=(1, 3))
    out = np.where(m <= 0.0031308, m * 12.92, 1.055 * np.power(m, 1 / 2.4) - 0.055)
    return np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8).tobytes()


def lower_priority():
    """Lower this process to "below normal" priority so the computer stays usable for other things while rendering.
    On Windows, child processes started by a below-normal process inherit that priority by default: the Playwright driver -> headless Chrome (including the GPU process) and ffmpeg all get lowered with it."""
    if os.name == "nt":
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetPriorityClass(kernel32.GetCurrentProcess(), 0x00004000)   # BELOW_NORMAL_PRIORITY_CLASS


@contextmanager
def capture_session(scene, styles, preset, gpu=DEFAULT_GPU):
    lower_priority()
    # supersampling is downscaled on the GPU by default (canvas = output size, so what is read back is the finished frame); POPUP_SS_CPU=1 takes the old flow (canvas at ss times the size, downscaled in Python), used for comparison
    cpu_ss = preset.ss if os.environ.get("POPUP_SS_CPU") == "1" else 1
    rw, rh = preset.width * cpu_ss, preset.height * cpu_ss
    gpu_ss = 1 if cpu_ss > 1 else preset.ss
    profiles = ROOT / "out"
    profiles.mkdir(exist_ok=True)
    with FrameServer(ROOT / "web", rw * rh * 4) as server:
        thread = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
        thread.start()
        port = server.server_port
        print(f"Web capture server | PID {os.getpid()} | 127.0.0.1:{port}", flush=True)
        try:
            with TemporaryDirectory(dir=profiles, prefix="chrome-web-") as profile, sync_playwright() as playwright:
                browser = playwright.chromium.launch_persistent_context(
                    profile, channel="chrome", headless=True, viewport={"width": rw, "height": rh},
                    device_scale_factor=1, args=[
                        "--enable-gpu", *ANGLE, "--disable-software-rasterizer",
                        "--force-color-profile=srgb",
                    ],
                )
                try:
                    page = browser.pages[0]
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("console", lambda message: errors.append(message.text)
                            if message.type == "error" else None)
                    query = [("scene", scene), ("width", rw), ("height", rh), ("ss", gpu_ss), ("gpu", gpu)]
                    query.extend(("style", style) for style in dict.fromkeys(styles))
                    page.goto(f"http://127.0.0.1:{port}/?{urlencode(query)}", wait_until="load")
                    info = page.evaluate("() => window.popup.ready()")
                    capture = Capture(page, server, preset, info, errors, cpu_ss)
                    capture.check_errors()
                    print("WebGL renderer | " + info["gpu"], flush=True)
                    yield capture
                finally:
                    browser.close()
        finally:
            server.shutdown()
            thread.join()
            print(f"Web capture server stopped | PID {os.getpid()}", flush=True)


def add_scene_args(parser):
    parser.add_argument("--scene", required=True, help="scene path relative to web/, e.g. scenes/demo/index.js")
    parser.add_argument("--preset", choices=PRESETS, default="preview")
    parser.add_argument("--gpu", default=DEFAULT_GPU, help="required substring in the WebGL renderer name")
    parser.add_argument("--out", required=True)


def as_image(rgb, preset):
    source = np.frombuffer(rgb, dtype=np.uint8).reshape(preset.height, preset.width, 3)
    rgba = np.empty((preset.height, preset.width, 4), dtype=np.uint8)
    rgba[..., :3] = source
    rgba[..., 3] = 255
    return skia.Image.fromarray(rgba, colorType=skia.kRGBA_8888_ColorType)
