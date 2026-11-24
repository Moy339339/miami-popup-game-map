# Generated print-art atlases

Use generated images for prints that come in large numbers and are hard to paint in code at quality: crowds of people, animals, plants, shop fronts, vehicle sides. The program cuts the image by grid and prints each cell on a card.

Rules that keep this from taking over the film:

- **Generated images don't decide the camera, layout, structure or timing**, and the film is never aligned to one "golden target image".
- **Generate a whole category as one batch**, on one sheet with one prompt. In a given region, a given category is either all generated or all code-painted, never mixed.
- Sign lettering and structural parts (boards, poles, frames) stay in code.
- **Every sheet passes review** (see [review.md](review.md)) before it reaches a card.

## The brief

Write the brief as a file. The prompt is a few lines that point to it. Sections:

1. **Goal**: what the sheet is for and how it is used ("each cell is cut and printed on a standee; seen at 45–110 px tall").
2. **Inputs**: what each reference image is for, one row per image, with *what to take* and *what not to take*. Official art may be attached as an input for lighting only. It is never published and never printed.
3. **Style**: the print rules from [print-art.md](print-art.md), written out word for word as sentences the model can follow (light direction, rim color with hex, shadow shape and hex, line rules).
4. **Layout**: the exact grid the program will cut.
   - Canvas size, columns × rows, cell size.
   - A flat `#FFFFFF` background with no noise.
   - A shared baseline for feet and head height; figures centered on column centers with a ± px tolerance; a minimum clearance from row lines.
   - No text, numbers or logos.
5. **Cast list**: one line per cell. Fix each person's skin tone, build, outfit and pose. Mark the back views.
6. **Don'ts**: no logos, no weapons, no official characters, no recognizable real people, no background or shadows.
7. **Delivery**: two candidates generated from the same prompt (`a`, `b`); save the prompt next to them. In the reply, show both images and give a table of cells that break the layout.

## What failed in round 1, and what fixed it

Round 1 (`making-of/codex-atlas/round1_prompt.txt`) asked for "flat solid color shapes, no gradients, simple facial features, vibrant". Both sheets were rejected at the style gates. They looked like a summer-beach sticker pack:

| Problem | Round-2 sentence that fixed it |
|---|---|
| Shadows reddish-brown, no readable light direction | "Low warm sun from the upper LEFT (10 o'clock) on every figure… ONE hard-edged lavender-indigo shadow shape (#6065a1 / #5e5a92, multiply look), so skin in shadow turns mauve-rose, never brown." |
| Black ink on muscles, knees, pockets | "Only the outer silhouette gets a thin deep-plum line (#3a2340; nothing darker than #2a1b2c anywhere). Draw NO interior ink lines…" |
| Everyone grinning with teeth | "Relaxed, neutral or cool expressions, mouths closed or a slight smirk; no toothy grins." |
| One bright-orange skin for everyone | Skin tone fixed per cell; "A representative mid-range skin midtone is #af635a… Avoid uniform bright-orange skin." |
| Sticker or cartoon look | "Semi-realistic contemporary Miami crime-drama poster figures… Not a sticker pack, not clip art, not a cartoon mascot, not a mobile-game character sheet, not a children's book, not comic-book inking." |

Two more changes in round 2:

- An official-illustration crop was attached as *lighting reference only*: "Use reference 5 ONLY for how light and shadow are rendered… Do not copy any person, face, pose, outfit, jewelry or text from it."
- The words that caused the problems were removed: flat solid color, no gradients, simple facial features, vibrant.

Round 2 result: sheet `b` was accepted as is. Sheet `a` had the same style, but feet crossed the row lines on two rows, so it couldn't be cut on a fixed grid.

## Cutting onto cards

`web/scenes/leonida/atlas.js`:

1. Split the sheet by grid.
2. In each cell, flood-fill from the four borders inward, turning near-white pixels that connect to the border transparent. The threshold is 228, because the "white" came back as about 254 with noise. Flood-filling from the borders keeps the whites inside the figure, such as eyes and white clothes.
3. Eat one more ring of bright fringe next to the transparent area (the gray anti-aliasing between white and the ink line).
4. Scale the whole sheet with one factor, so that the median figure height maps to the same card height (14 mm). Put the feet on the card's bottom edge and center the body.
5. Trace the alpha edge into a contour and extrude a card.
6. Brighten slightly if needed: the accepted sheet sat one step darker than the code-painted props, so it was lifted about 9 %.

Feet that cross a row line get cut off by a fixed grid. That is why sheet `a` was rejected; check the gutters before you accept a sheet.

Two things to look at after cutting: whether the outline reads at the smallest on-screen size, and whether the shadow side is still violet once the scene's light and grade are applied.
