// Fix item 17: generated-image atlases on the cards. One atlas = one whole batch of the same kind of element generated together (so the style stays consistent); the program cuts it up by cell and prints the pieces onto the cards.
// Generation spec (brief and prompts are in the repo under making-of/codex-atlas/): pure white background, front-on view, light from the upper left, no baked-in ground shadow, no text; feet rest on the same line in every cell, all figures at one common scale.
// Usage: index.js awaits preloadAtlases() at the start of build (loaded only when the switch is on); after that each region calls atlasCanvas(name, cell index, options) synchronously.
import {makeCanvas} from "./kit.js";
import {ab} from "./ab.js";

// name -> file and cell layout. Files live in web/assets/generated/ (tracked in Git; raw candidates, prompts and reviewer notes are in the repo's making-of/)
export const ATLASES = {
    keysPeople: {url: "/assets/generated/keys_people.png", cols: 7, rows: 3},
};
const loaded = new Map();      // name -> {img, cells: [{canvas, bbox}], pxPerMm}

export async function preloadAtlases() {
    if (!ab("atlas")) return;
    for (const [name, spec] of Object.entries(ATLASES)) {
        const img = new Image();
        img.src = spec.url;
        await img.decode();
        loaded.set(name, {spec, img, cells: sliceCells(img, spec)});
    }
}
export const hasAtlas = name => loaded.has(name);

// Cell cutting: strip the white background from each cell separately (flood in from the four cell edges, make near-white pixels connected to an edge transparent, then eat one more ring of whitish anti-aliasing fringe inward), and compute the figure's bounding box
function sliceCells(img, {cols, rows}) {
    const cw = img.width / cols, ch = img.height / rows;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x0 = Math.round(c * cw) + 2, y0 = Math.round(r * ch) + 2;
        const w = Math.round(cw) - 4, h = Math.round(ch) - 4;
        const cv = makeCanvas(w, h);
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
        const im = ctx.getImageData(0, 0, w, h), d = im.data;
        // The background is a noisy near-white around 254 (measured by the reviewer), so the threshold is relaxed to 228
        const bg = i => { const R = d[i], G = d[i + 1], B = d[i + 2]; return R > 228 && G > 228 && B > 228 && Math.max(R, G, B) - Math.min(R, G, B) < 20; };
        const seen = new Uint8Array(w * h), stack = [];
        for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
        for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
        while (stack.length) {
            const p = stack.pop();
            if (seen[p] || !bg(p * 4)) continue;
            seen[p] = 1;
            const x = p % w, y = (p - x) / w;
            if (x > 0) stack.push(p - 1);
            if (x < w - 1) stack.push(p + 1);
            if (y > 0) stack.push(p - w);
            if (y < h - 1) stack.push(p + w);
        }
        for (let p = 0; p < w * h; p++) if (seen[p]) d[p * 4 + 3] = 0;
        // Fringe: also remove very bright pixels next to transparent ones (the grey-white transition between the white background and the ink line)
        const fringe = [];
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (seen[p]) continue;
            const L = 0.3 * d[p * 4] + 0.59 * d[p * 4 + 1] + 0.11 * d[p * 4 + 2];
            if (L > 205 && (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w])) fringe.push(p);
        }
        for (const p of fringe) d[p * 4 + 3] = 0;
        ctx.putImageData(im, 0, 0);
        let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 0) {
            if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
        }
        cells.push({canvas: cv, bbox: bx1 < 0 ? null : [bx0, by0, bx1, by1]});
    }
    return cells;
}

// One cell -> standee canvas: scale to ppm using the atlas's common scale (median figure height across cells = 14 mm), feet on the bottom edge of the canvas, body centered.
// Canvas width is at least 12 mm (same as the code-drawn standees), height = figure height + 0.6 mm
export function atlasCanvas(name, index, {ppm = 22, refMm = 14} = {}) {
    const A = loaded.get(name);
    const cell = A.cells[index];
    if (!cell.bbox) throw new Error(`atlas ${name}#${index} is empty`);
    if (!A.scale) {
        const hs = A.cells.filter(c => c.bbox).map(c => c.bbox[3] - c.bbox[1]).sort((a, b) => a - b);
        A.scale = (refMm * ppm) / hs[Math.floor(hs.length / 2)];   // canvas pixels / atlas pixels
    }
    const [x0, y0, x1, y1] = cell.bbox;
    const fw = (x1 - x0 + 1) * A.scale, fh = (y1 - y0 + 1) * A.scale;
    const W = Math.max(12 * ppm, fw + 0.8 * ppm), H = fh + 0.6 * ppm;
    const out = makeCanvas(W, H);
    const ctx = out.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    // Reviewer (round 2): placed into the scene it looks one step darker than everything else, so brighten by about 9%
    ctx.filter = "brightness(1.09)";
    ctx.drawImage(cell.canvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (out.width - fw) / 2, out.height - fh, fw, fh);
    out.ppm = ppm;
    return out;
}
