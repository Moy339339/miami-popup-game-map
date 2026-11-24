# example: the Leonida project

The project that rendered the video. Copy this folder to start your own map.

```
example/
├─ web/                    the page that renders (three.js 0.180, native ES modules, no bundler)
│  ├─ engine/              rendering base: paper primitives, pop-up book, shadows, post chain, boot
│  ├─ styles/leonida.js    materials, lights, shadows, depth of field, bloom, grade
│  ├─ styles/debug.js      gray debug style
│  ├─ scenes/leonida/      the map: route, camera, regions, print art, props, checks, A/B switches
│  ├─ scenes/demo/         a small gray test scene for the engine
│  └─ assets/generated/    the generated tourist sheet that is cut onto cards
├─ popup/pipeline/         capture (Playwright + installed Chrome), encode (ffmpeg), stills, contact sheets, audit
├─ popup/engine/           the earlier 2D (skia) engine; the pipeline still uses its presets and helpers
├─ tools/                  density, sign text, pop-up times, fold-down visibility, contact sheet, A/B table
├─ tests/                  pytest (engine, pipeline, browser color and determinism)
└─ docs/api-web.md         scene and style API
```

The engine API is described in [docs/api-web.md](docs/api-web.md).

## Setup

```powershell
npm --prefix web ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m popup.pipeline.web_textures    # debug texture for the demo scene and tests
```

On macOS / Linux, use `.venv/bin/python`. The capture uses the installed Google Chrome (`channel="chrome"`); Playwright doesn't need to download a browser.

## Commands

```powershell
$py = ".\.venv\Scripts\python.exe"
$times = "3,16.5,30,41,46.5,56.5"

# whole film
& $py -m popup.pipeline.web_render --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --t0 0 --t1 1714/30 --preset final --parallel 2 --out out/leonida.mp4

# quick self-check quality (about 0.3 s per frame)
& $py -m popup.pipeline.web_render --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --t0 10 --t1 20 --preset draft --out out/draft.mp4

# stills; t >= 200 are fixed inspection cameras with everything standing
& $py -m popup.pipeline.web_stills --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --preset final --times $times --out out/stills

# checks (see skills/popup-map/references/checks.md)
& $py -m popup.pipeline.web_audit --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --t0 0 --t1 57.2 --step 0.1
& $py tools/density.py 0 57 0.5
& $py tools/text_audit.py

# A/B: the same instants with every switch off, then a table (rows = instants, columns = versions)
& $py -m popup.pipeline.web_stills --scene scenes/leonida/ab_off.js --style styles/leonida.js:Sunset --preset final --times $times --out out/ab_off
& $py tools/ab_table.py out/ab.png 360 "off=out/ab_off" "default=out/stills"

# tests
npm --prefix web test
& $py -m pytest -q --basetemp=out/pytest-tmp
```

`--scene` is relative to `web/`. `--style` is `file.js:ExportName`. A render range is half-open. `--gpu` is empty by default, which accepts any hardware GPU; pass part of the renderer name to require a specific card.

## Scene entry points

| Entry | What |
|---|---|
| `scenes/leonida/index.js` | the film, with the default switches |
| `scenes/leonida/ab_off.js`, `ab_print.js`, `ab_gloss.js`, … | the same film with switches overridden (see `ab.js`) |
| `scenes/leonida/love_small.js`, `love_medium.js`, `love_large.js` | three sizes of the ending easter egg (`medium` is the default) |
| `scenes/leonida/paper_steps.js` | exports the "how one paper figure is made" step images |
| `scenes/leonida/test_people.js`, `test_lovers.js`, `text_audit.js` | debug and check scenes |
| `scenes/demo/index.js` | gray engine test scene |
