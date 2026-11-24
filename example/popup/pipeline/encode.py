"""Stream display-referred BT.709 RGB to a tagged H.264 MP4."""

from pathlib import Path
from subprocess import DEVNULL, PIPE, Popen
from queue import Queue
from tempfile import NamedTemporaryFile
from threading import Thread


def ffmpeg_command(preset, destination, wav=None, crf=16, speed="slow", frame_count=None):
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pixel_format", "rgb24",
        "-video_size", f"{preset.width}x{preset.height}", "-framerate", str(preset.fps),
        "-i", "pipe:0",
    ]
    if wav is not None:
        if frame_count is None or frame_count < 1:
            raise ValueError("WAV encoding requires the video frame count")
        duration = frame_count / preset.fps
        command += ["-i", str(wav), "-map", "0:v:0", "-map", "1:a:0",
                    "-af", f"apad,atrim=duration={duration:.9f}", "-c:a", "aac", "-b:a", "192k"]
    command += [
        "-filter_threads", "2",
        "-vf", "scale=out_color_matrix=bt709:in_range=pc:out_range=tv:flags=accurate_rnd+full_chroma_int,"
               "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
        "-c:v", "libx264", "-profile:v", "high", "-preset", speed, "-crf", str(crf),
        "-threads:v", "4", "-pix_fmt", "yuv420p",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
        "-movflags", "+faststart+write_colr", str(destination),
    ]
    return command


def encode_frames(frames, preset, out, wav=None, crf=16, speed="slow", frame_count=None):
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    log_dir = Path("out/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{out.stem}-ffmpeg.log"
    with NamedTemporaryFile(dir=out.parent, suffix=".mp4", prefix=f".{out.stem}-", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        with log_path.open("wb") as log:
            with Popen(ffmpeg_command(preset, temporary, wav, crf, speed, frame_count), stdin=PIPE,
                       stdout=DEVNULL, stderr=log) as process:
                try:
                    # writing frames to ffmpeg happens in another thread: the main thread (frame capture) does not wait on the pipe, so drawing the next frame and encoding run at the same time
                    queue, failed = Queue(maxsize=6), []

                    def writer():
                        try:
                            while (rgb := queue.get()) is not None:
                                process.stdin.write(rgb)
                        except BaseException as exc:   # noqa: BLE001 - re-raised in the main thread
                            failed.append(exc)
                            while queue.get() is not None:
                                pass

                    thread = Thread(target=writer, daemon=True)
                    thread.start()
                    try:
                        for rgb in frames:
                            if failed:
                                break
                            queue.put(rgb)
                    finally:
                        queue.put(None)
                        thread.join()
                    if failed:
                        raise failed[0]
                    process.stdin.close()
                    status = process.wait()
                except BrokenPipeError as exc:
                    raise RuntimeError(f"ffmpeg pipe failed. See {log_path}") from exc
                finally:
                    if process.poll() is None:
                        process.terminate()
            if status != 0:
                raise RuntimeError(f"ffmpeg exited with {status}. See {log_path}")
        temporary.replace(out)
    finally:
        temporary.unlink(missing_ok=True)
