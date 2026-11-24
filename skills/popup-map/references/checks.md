# Automatic checks

Run these before every export. A human watching the video won't catch a car that passes through another car for 0.2 s, but a fan watching it a third time will.

The scene exposes check functions on `window`. The scripts drive the same headless Chrome as the renderer, at `preview` size. Run them from `example/` with the project's Python.

## Clip-through audit: must be 0

```powershell
python -m popup.pipeline.web_audit --scene scenes/leonida/index.js --style styles/leonida.js:Sunset --t0 0 --t1 57.2 --step 0.1
```

Every 0.1 s, the audit poses the scene and compares the bounding boxes of every pair of standing props. Moving traffic is sampled along its lane at that same time. It prints each overlapping pair with its time and position and exits with 1 when there are any. Leonida: `0 overlapping pairs over 573 instants`.

You decide what counts as solid:

- `userData.core` / `userData.cores`: check only the trunk of a palm, or the pole and canopy of an umbrella separately, not the empty space under the canopy.
- `userData.soft`: grass clumps may overlap each other, but not people, boats or trees.
- `userData.noAudit`: smoke, wires and other things you can't bump into.

Fix overlaps by moving things or changing pop-up timing. Never by turning the check off for a solid object.

## Density: at least 30 per frame

```powershell
python tools/density.py 0 57 0.5
```

For each instant the script reports three numbers: how many props are standing in frame (`n`), how many of them sit in the sharp band (`sharp`), and their summed screen area. Any frame with `n < 30` is flagged. Averages per 4 seconds make it easy to compare with the previous version. This number turned "the opening looks thin" into something you can fix.

## Sign text against its board

```powershell
python tools/text_audit.py
```

Lists every sign whose lettering runs past its board or touches its edge. A negative margin means the text sticks out. Letter widths are measured in the browser with the real font. This is a list to look through in stills, not a pass/fail gate: the final Leonida cut still lists a few signs.

## Other debug tools

- `tools/pop_times.py <name fragment>` prints when each prop stands up and falls down.
- `tools/fall_view.py` lists props that are still on screen when they fall. Their blank backs can cover what's behind them, so either let them sink or keep them standing.
- `python -m popup.pipeline.web_stills --times 3,16.5,30 ...` renders stills at chosen instants. Times `t ≥ 200` are fixed inspection cameras where everything is standing (`VIEWS` in `index.js`).
- `python -m popup.pipeline.web_contact ...` and `tools/sheet.py <dir> <out.png>` build contact sheets for a quick look at a whole run.
