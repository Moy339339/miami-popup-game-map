# Print art and paper construction

The rules below are the Leonida set. For a new map, keep the structure (P / C / L / M rules, palette table) and replace the values with ones measured from *your* source.

## 1. Read the source before painting anything

Look at the official illustrations, not only at screenshots. For GTA VI the official artwork gave these traits:

1. Semi-realistic digital painting, not the thick black outlines of older covers. Volume comes from 2–3 color steps with soft gradients inside each step.
2. The whole picture sits under a sunset: lit faces and rim light are peach-orange, shadows are lavender to indigo. **Warm-versus-cool contrast matters more than light-versus-dark.**
3. Even the darkest areas are purple, never pure black. Outlines are rare: silhouettes separate by value, and interior detail lines use the shadow color.
4. Aerial perspective: distant towers are flat lavender silhouettes, lighter and pinker with distance.
5. Recurring subjects: Art Deco hotels (pastel walls, horizontal cornices, vertical sign fins, stepped tops, neon), palms, flamingos, alligators, speedboats, seaplanes, police cars, muscle cars, supercars, gas stations, motels.

Then go through the game's own screenshots region by region and list what fans will recognize: cars and liveries, outfits, landmark signs, and the trailer's famous moments. **Every element you add needs a screenshot you can name.** If you can't find one, leave the element out.

## 2. Measure the palette

Run k-means (k≈8–12) over a handful of key official images and sort the clusters by role:

| Role | Leonida values |
|---|---|
| Sky top → horizon | `#b788b6` → `#c78fbc` → `#de92b6` → `#eb97a7` → `#f9a298` → `#ffb089` |
| Lit face / rim light | `#fcac8a` `#f3a588` `#f9bfa4` `#facdb9` `#fbe1bb`, highlight cream `#fbf9de` |
| Pink | `#e89dac` `#cd8fb5` `#da9ab0` `#f1adbf` |
| Lavender mid | `#9c8dd9` `#907fc2` `#8e76b2` `#886faa` |
| Indigo-violet shadow | `#6065a1` `#5e5a92` `#4f457c` `#493958` |
| Darkest (still purple) | `#351f29` `#291b2c` `#221c25` |
| Skin / terracotta mid | `#af635a` `#a8635b` `#975950` |
| Accents | magenta `#af307b`, sky blue `#7da0d5` |

Publish only the measured colors. Don't publish the official images you measured them from.

## 3. Rules

### Print (the picture printed on every card)

- **P1** Every print is a base color, plus a cool shadow shape (indigo-violet), plus a warm rim light (peach), with a soft gradient inside each step. Light comes from the upper left, the same direction as the scene's key light.
- **P2** The darkest value is around `#2a1b2c`; never use black. A thin dark-plum line runs around the outer contour so the cut edge reads, and interior lines use the shadow color.
- **P3** Base colors are pastel (hotels: peach `#f7c9b0`, mint `#a8dccb`, pink `#f3b8cf`, periwinkle `#c3cdf3`, cream `#fff1d6`). Accents are saturated (neon pink `#ff4fa3`, neon cyan `#3ff0e0`, car red `#d8343f`, taxi yellow `#f5c043`).
- **P4** Every print carries a fine paper grain. No halftone dots and no misregistration.

In code these become helpers: `lit()` for the base + shadow + rim, `inkOutline()`, `grain()` and `finish()` (see `web/scenes/leonida/paint.js`). Use them on every print so the rules hold everywhere.

### Construction

- **C1** Everything is paper with thickness: standees 0.8 mm, ground sheets 1 mm, building walls 0.6 mm. The cut edge shows the paper-core color.
- **C2** Anything larger than a prop is not "one print on one card". A building is a folded volume with protruding cornices, sign fins, stepped roofs and awnings. A car is two side cards plus a folded roof, nose and tail.
- **C3** Organic things are layered: bushes in 2–3 offset layers; a palm is a cross-card trunk with 7–9 fronds radiating and drooping in space; waves are several standing strips of foam.
- **C4** Density: at least 30 props in every frame. The ground is never blank; print small details on it (road shields, dashed routes, dive flags, dolphins, map grid letters).

### Light and camera

- **L1** Key light: warm orange, low (about 30° elevation), sweeping from front-left, long soft shadows to the back-right.
- **L2** Fill light: lavender from the sky and pink from the ground. Shadows are tinted violet (`shadows.tint`).
- **L3** Neon signs and windows are emissive and bloom. Put a sun disc and cut-paper clouds in the far distance.
- **L4** Tilt-shift: a narrow focus band, with the foreground and background both soft.
- **L5** Grade: lift shadows toward violet, push highlights toward peach, add a vignette and fine grain.

### Motion

- **M1** One shot, slow and even, eased in and out, with no cuts.
- **M2** Props stand up around their bottom edge, nearest first. Use a fast snap (0.25 s) plus a small wobble; don't use a slow spring.
- **M3** Small things keep moving: cars drive, boats leave wakes, flamingos nod, palms sway, police lights flash, neon flickers on, dust floats in the air.

## 4. Signature and blacklist

Decide two **signatures** that belong only to this piece. In Leonida, the ground is printed as a tourist road map (highway shields, county dashes, grid letters), and each region gets a standing cut-cardboard title sign, like a postcard.

Write a **blacklist** of obvious starting points you will not use. For Leonida:

- The rejected round 1: flat cards, boxes with window grids, a fast flying camera, and a misregistered three-color print.
- Synthwave: striped sunsets, purple grid floors, neon everywhere. The official art doesn't have it.
- The thick black comic outlines of older game covers.
- Low-poly or isometric "mini city" models.
