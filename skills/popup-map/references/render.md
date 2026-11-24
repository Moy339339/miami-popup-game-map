# Rendering and export

## How a frame is made

1. A local static server serves `web/`. Playwright starts the installed Chrome (`channel="chrome"`) headless, with a temporary profile and the GPU on. Software rendering is refused.
2. The page loads the scene and style modules. `window.popup.ready()` waits for every texture, font and shader warm-up.
3. For each frame, Python calls `renderAt({style, t})`. The scene rebuilds its state from `t` alone, so any frame can be rendered on its own and in any order. The page reads the pixels back right after drawing and posts RGB24 over loopback HTTP.
4. ffmpeg encodes BT.709 H.264. Drawing the next frame, reading back the last one, and encoding run at the same time.

Because a frame depends only on `t`, a render can be split into parts that run in parallel and then be concatenated losslessly. The result is identical, pixel for pixel, to a serial render.

## Presets

| Preset | Size | fps | Use |
|---|---|---|---|
| `preview` | 540×720 | 15 | checks, contact sheets |
| `draft` | 1080×1440 | 30 | self-review, about 0.3 s per frame on an RTX 4070 |
| `final` | 1080×1440 | 30 | delivery. Draws at 2× and downsamples on the GPU, which cleans up the stair-stepped edges of alpha-cut cards |

## Commands (from `example/`)

```powershell
# whole film, final quality, two parts in parallel
python -m popup.pipeline.web_render --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --t0 0 --t1 1714/30 --preset final --parallel 2 --out out/leonida.mp4

# stills at chosen instants
python -m popup.pipeline.web_stills --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --preset final --times 3,16.5,30,41,46.5,56.5 --out out/stills
```

`--t1` accepts a fraction, so you can end on an exact frame: 1714/30 s is 1714 frames, which is 25 bars at 105 BPM.

Leonida's final render takes a little over 6 minutes on one RTX 4070.

## Leave the machine usable

- The render process runs at below-normal priority, and Chrome and ffmpeg inherit it.
- `--parallel` runs at most 2 parts. Before starting it reads free VRAM with `nvidia-smi` and runs fewer parts if that would leave less than 3 GB free. One 2× supersampled Chrome uses about 4 GB.
- The page has a duty-cycle limit, so the GPU stays roughly under 60–70 % busy.

## Music

The video is cut to the music, but the audio is not in the repository. Put the tempo and section times in `beat.js`: frame 0 is the first beat of bar 1, plus the audio's start offset. Then place:

- camera keyframes on half-bars,
- groups of props popping on eighth notes,
- region titles on downbeats,
- the biggest change of scene (the drums coming in) on its own bar.

Mux the audio after rendering:

```powershell
ffmpeg -i out/leonida.mp4 -ss 0.110 -i your_track.m4a -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/leonida_audio.mp4
```

(`-ss 0.110` because Leonida's frame 0 sits 0.110 s into the track.) `web_render.py` can also take `--wav` and encode the audio in the same pass.
