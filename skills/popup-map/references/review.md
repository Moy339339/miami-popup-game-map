# Review: a second agent, two style gates, blind pairs, switches

The agent that builds the map should not judge it. Start a separate agent, give it only the images and the rules, and have it write a report with evidence: frame times, crops, pixel measurements. The builder fixes what the report finds, and the reviewer checks again.

## 1. Gates for generated atlases

Each candidate sheet goes through four gates. Gates 1 and 2 can each reject a sheet on their own.

1. **Source style (veto).** Would a fan of the game accept these people as from that game's official art? Check light direction, shadow color, line treatment, expression, and clothing era.
2. **Our film's style (veto).** Do they obey the print rules (P1–P4)? Do they sit with the code-painted props at the sizes they will appear on screen? Make two composites: drop the sheet into a real frame at the largest size (about 110 px tall) and at the smallest (about 45 px tall).
3. **Cuttable.** Does every cell sit inside its grid cell, on the baseline, with clear gutters? List the cell numbers that fail.
4. **Red lines.** No logos, no weapons, no official characters, no real people, no text.

The report ends with a verdict per sheet: accept, accept parts (which cells), or reject. A rejected sheet gets a "why it came out this way" section and the exact sentences to put into the next prompt. See [image-gen.md](image-gen.md) for how that went in practice.

## 2. Blind A/B pairs

Use them when you have changed many things and need to know whether the new version is actually better, and where.

1. Render the old and new version at the same instants. Use 10–15 instants spread over the film, more where the changes are.
2. Put each pair side by side. Randomize left/right per pair and keep the key in a separate file the reviewer never sees.
3. Instruct the reviewer: for each pair, pick left, right or "about the same", with a one-line reason that points at something visible. Pixel diffs, brightness ratios and zoomed crops are allowed.
4. Only then reveal the key and count.

Leonida, new version vs. the version before the fix batch: **14 pairs; new won 6, tied 8, lost 0.** The ties were useful too:

- In 8 pairs the two frames were nearly identical. That showed which changes were invisible in a single frame, so they could be decided without asking anyone.
- The reviewer noticed that the big VICE CITY sign was only ever a blurry background word. That became a focus pull onto the sign on the beat where the verse comes in (`PULLS` in `index.js`).
- It also noticed that 10–21 s was soft at the top and bottom thirds, and the focus band went from 100 to 125.
- In the old version, one pair showed cars passing through each other. That is now covered by the clip-through audit.

## 3. Per-segment switches

A risky effect becomes a switch. Then both versions can always be rendered and compared, and you can turn the effect on for some segments only.

`web/scenes/leonida/ab.js` holds the defaults. Each `ab_*.js` entry file sets a switch and re-exports `build`, so `--scene scenes/leonida/ab_off.js` renders everything off. Scene and style code read the switches when called, not at module load.

| Switch | What it does | Decision |
|---|---|---|
| `print` | short violet drop shadow between layered sheets, ink lines ≥ 0.2 mm, contact darkening under standees | on: cleaner cut edges |
| `gloss` | special-paper gloss (spot varnish, foil) | on, softened, and only on cars and building glass at sunset and night. The first version flashed a large pink-white hotspot for 0.3 s while the camera turned |
| `desat` | desaturate the daytime ground | off: invisible at phone size, and the opening sea stays bright |
| `atlas` | generated tourists instead of code-painted ones in the opening | on: they read more like the game in close-ups |

Make one table per decision: rows are 4–6 instants, columns are switch combinations, each cell is a still from `web_stills` (`tools/ab_table.py` builds the table). For anything that moves, such as gloss highlights, also compare a few consecutive frames, because a still won't show flicker.

## 4. What to show the human

Show only differences that are visible on a phone at the size the video will be watched. If a full frame doesn't show the difference, the reviewer decides, writes down the reason, and the human is not asked.
