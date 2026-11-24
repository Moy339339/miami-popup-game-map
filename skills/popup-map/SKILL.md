---
name: popup-map
description: Make a papercraft pop-up map video entirely in code. One continuous camera move over a tabletop paper map; each region's printed cards stand up as the camera arrives; day turns to night; tilt-shift depth of field. three.js renders in headless Chrome, frame by frame, and ffmpeg encodes the result. Use this skill when someone asks for a paper / pop-up / papercraft / miniature map video of a game world, city or region. Also covers fan-art versions of a game's map, generated print-art atlases, blind A/B review, and clip-through checks. Trigger phrases include popup map, pop-up paper map, papercraft map video, tilt-shift paper map and miniature map flythrough.
---

# Pop-up map

**Output:** a 3:4 vertical video (1080×1440, 30 fps). A paper map lies flat on a table. The camera moves across it in one shot. As the camera reaches each region, that region's cards stand up; once it passes, they fold back down. The light runs from day to night, and a narrow tilt-shift focus band makes everything look miniature.

The example in this repo is *Leonida* (GTA VI's state): 57 s, 25 bars of a 105 BPM track, five regions, about 640 props that pop up.

**Engine.** The working project is `example/` in the repository this skill ships with (`https://github.com/Moy339339/miami-popup-game-map`). If you only have the skill folder, clone the repository first. Start a new map by copying `example/`. Keep `web/engine/`, `popup/` and `tools/`. Use `web/scenes/demo/` and `web/styles/debug.js` as the minimal scene, and read `web/scenes/leonida/` before writing your own scene. The API is in `example/docs/api-web.md`.

The engine never decides how anything looks. Colors, lights, shadows, depth of field, bloom and grading come from the **style** module. Camera, timing and props come from the **scene** module. If you need a look the engine can't express, add a parameter. Don't hard-code a "nice value" in the engine.

## The loop

Work in this order. Each step lists what done looks like.

1. **Pin the brief.** Write down the user's own words. Answer four questions: what must a viewer recognize in the first second, how long is the piece and what music runs under it, which platform it is for, and what the user said they disliked. *Done:* a short design doc that quotes the user and states those four answers.

2. **Study the source's art, then write rules.** Collect official art and screenshots as references only; never ship or texture them. Measure a palette from them (k-means over a few key images) and write the print rules as checkable statements. See [references/print-art.md](references/print-art.md). *Done:* palette table + rules P1–P4, C1–C4, L1–L5, M1–M3 in the design doc.

3. **Plan the route.** Pick 4–6 regions in camera order. For each one, decide the time of day, the ground paper color, one landmark sign, and one **story beat** that fans recognize (a famous trailer moment, a meme). Put camera keyframes on half-bars of the music, start props popping in groups on eighth notes, and land region titles on downbeats. *Done:* a `MAP` table and a `KEYS` camera table, like `web/scenes/leonida/index.js`.

4. **Make one region fully dense before you extend.** Aim for at least 30 standing props in every frame, and leave no empty ground: print small details on it. Show stills to the user, and extend to the whole map only after they approve. *Done:* density check passes (step 8) and the user has seen stills.

5. **Build props from three construction types.** See [references/print-art.md](references/print-art.md) for the rules.
   - *Printed standee:* paint a print texture in canvas code, trace its alpha edge into a contour, and extrude a card 0.6–1 mm thick with a paper-core edge.
   - *Folded volume:* buildings are folded boxes with protruding cornices, sign fins and awnings. Vehicles are two side cards plus a folded roof.
   - *Layered organics:* bushes are 2–3 offset layers, and a palm is a cross-card trunk plus 7–9 drooping fronds.

   For crowds and other many-of-a-kind prints, a **generated atlas** is allowed. See [references/image-gen.md](references/image-gen.md).

6. **Motion.**
   - Cards stand up around their bottom edge. The snap-up takes 0.25 s with a quadratic ease-out, then a small 4.5 Hz wobble of about 3.5 % (`snapUp` in `kit.js`). A slow damped spring looks like jelly, so don't use one.
   - Cards fold down after the camera passes: a small lean back, an accelerating fall, one bounce, 0.7 s in total.
   - Cars drive in from outside the frame instead of folding up.
   - Paper grain is generated in each object's own coordinates, so it moves with a moving car.

7. **Look.**
   - Time of day changes per region.
   - Special-paper gloss (foil, spot varnish) goes only on cars and building glass at sunset and night. A fully matte film reads as a picture book; a fully glossy one reads as plastic.
   - Use a narrow focus band. Pull focus onto a landmark on a musical hit.
   - Add bloom to neon and lit windows, and grade shadows toward violet.

8. **Check automatically before every export.** See [references/checks.md](references/checks.md).
   - The clip-through audit runs every 0.1 s and must report **0 hits**.
   - Every frame needs at least 30 standing props.
   - Look through the signs whose text touches or passes the edge of its board.

9. **Review with a second agent, not yourself.** See [references/review.md](references/review.md).
   - Every generated atlas goes through two style gates.
   - Compare old and new versions in blind A/B pairs at the same instants, in random order.
   - Turn risky effects into per-segment switches and decide them from the pairs.

10. **Export.** See [references/render.md](references/render.md). Use `draft` for checks and `final` (2× supersampling) for delivery. Run at most 2 Chrome instances at once and keep 3 GB of VRAM free. Mux the audio last.

## Lessons that each cost us a round

- **Round 1 was rejected.** It used flat printed cards, boxes with window grids, a fast flying camera and a three-color misregistered print. The user's verdict was "nothing to do with GTA6; neither artistic nor realistic." Don't start from that kit. Start from the source's own official illustration style (step 2).
- **Theme ≠ source.** A later round looked like a tourism promo. Fans need the *game*: its place names, its shop signs, its trailer moments, and its wanted stars. Put one story beat in every region (step 3). Every element needs a source screenshot you can name; if you can't find one, leave it out.
- **Contemporary, not retro.** Use the cars, clothes and buildings of the game's present day. Don't add old cars or old fashion that the source doesn't have.
- **Generated images don't steer the film.** No single "golden target image" for the whole video to align to. Generated atlases are allowed as print art for cards. They pass the same review as everything else, and one category in one region is either all generated or all code-painted, never mixed.
- **Generated people come out as sticker cartoons on the first try.** Write the light and line rules into the prompt word for word, and list round 1's failures. See the two real prompts in `making-of/codex-atlas/`.
- **Keep the payoff small.** The ending easter egg (two silhouettes on a rooftop, a small neon heart) is a finishing touch; the city is the subject. When the user said it was "too big", the answer was smaller, not a push-in.
- **Show the user only differences they can see at phone size.** If two switch settings look the same in a full frame, decide yourself, write down why, and move on.
- **Leave the machine usable.** Render at below-normal priority, with at most 2 parallel parts and 3 GB of VRAM free (`web_render.py --parallel`).

## Copyright lines for fan work

- Don't draw official characters' faces. Protagonists appear masked or from behind.
- Don't draw the game's logo or the publisher's logo. No guns: robberies read through bandanas, cash bags, police cars and wanted stars.
- In-world place names and shop signs may be printed; say it's fan work.
- Official images are references only. They never go into the repository or onto a card.

## Files you will touch

| Path | What |
|---|---|
| `web/scenes/<map>/index.js` | Route, camera keys, time of day, pop-up registry, audits (`window.<map>Audit`, `Density`) |
| `web/scenes/<map>/regions/*.js` | One file per region, in region-local coordinates |
| `web/scenes/<map>/paint*.js` | Canvas-code print art (`lit`, `grain`, `inkOutline`, `sheet`…) |
| `web/scenes/<map>/props*.js` | Construction of cards, boxes, organics, vehicles |
| `web/scenes/<map>/atlas.js` | Cuts generated atlases by grid onto cards |
| `web/scenes/<map>/ab*.js` | Per-segment switches for A/B review |
| `web/scenes/<map>/beat.js` | Tempo, bar length, drop and verse times |
| `web/styles/<map>.js` | Materials, lights, shadows, post chain, grading |
