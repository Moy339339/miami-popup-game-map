// Low-level tools for the Leonida papercraft map: random numbers, easing, pop-up, print -> thick paper cut to the shape of the artwork, custom paper-surface meshes.
// World units are mm, the tabletop is in XY, +z points up; the camera looks roughly toward +Y.
import * as THREE from "three";
import {cardGeometry, tagPaper} from "/engine/paper.js";
import {ab} from "./ab.js";

// ---------- Numbers ----------
export function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const smoother = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };
export const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// A 0->1 with bounce: overshoots, then the decay settles. tau is the seconds elapsed since the jump started.
export function springUp(tau, {freq = 1.6, damp = 7.5} = {}) {
    if (tau <= 0) return 0;
    return 1 - Math.exp(-damp * tau) * Math.cos(2 * Math.PI * freq * tau);
}

// Fix item 14: the fold-up is now three phases - fast to position (dur seconds, quadratic ease-out, still carrying speed on arrival) -> lock -> hz hertz small shiver two or three times (amp is a fraction of 90°).
// The old springUp was a 1.6 Hz damped oscillation: it had already turned about 24° on the first frame, then slowly bounced back, like jelly (reviewer section 1, "fold-up").
export function snapUp(tau, {dur = 0.25, amp = 0.035, hz = 4.5, decay = 6} = {}) {
    if (tau <= 0) return 0;
    if (tau < dur) { const u = tau / dur; return 1 - (1 - u) * (1 - u); }
    const a = tau - dur;
    return 1 + amp * Math.exp(-a * decay) * Math.sin(2 * Math.PI * hz * a);
}
// Fold down: first lean back a little (wind-up) -> like being pulled by gravity, falling faster and faster -> after landing flat, pop up once and settle. s = the fraction elapsed since the fold-down began (0-1, 0.7 s overall)
export function fallCurve(s) {
    if (s <= 0) return 0;
    if (s < 0.2) return -0.07 * smooth(s / 0.2);
    if (s < 0.78) { const u = (s - 0.2) / 0.58; return -0.07 + 1.07 * u * u; }
    if (s < 1) return 1 - 0.06 * Math.sin(Math.PI * (s - 0.78) / 0.22);
    return 1;
}
const hash01 = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------- Pop-up registry ----------
// Each object is wrapped in a pivot: rotating about its bottom edge (local x axis) from -90° (lying flat facing +Y, print side up) to 0° (standing).
export class PopRegistry {
    constructor() { this.items = []; }
    // sink: do not flip when folding down, sink vertically into the ground (for things that are tall and wide and still on screen when folding down, e.g. the overpass - the blank back side when flipped would cover a whole area behind it);
    // true = sink to its own foot, a number = sink to this height (see update)
    // hide: invisible before popping up (used when a solid piece is changed to flip up, so it does not lie flat on the map at the start like a fallen tree); fold "drive": the vehicle drives in from off-screen (no scaling, appears when its time comes)
    add(pivot, {t0, fold = "back", freq, damp, down = null, scale = false, sink = false, hide = false}) {
        // Large pieces slow, small pieces fast: reuse the freq originally given at each place (smaller = slower) converted to the time to reach position; each piece also gets ±3% jitter (computed from its index, does not touch the global random numbers)
        const i = this.items.length;
        const slow = 1.6 / (freq ?? 1.6);
        const snap = {dur: 0.25 * slow * (1 + 0.06 * (hash01(i) - 0.5)), hz: 4.5 / Math.sqrt(slow), amp: 0.035};
        const twist = 0.05 * (i % 2 ? 1 : -1) * (0.7 + 0.6 * hash01(i + 7));
        this.items.push({pivot, t0, fold, freq, damp, down, scale, sink, snap, twist, hide});
        return pivot;
    }
    update(t, {noDown = false} = {}) {
        for (const it of this.items) {
            let k = snapUp(t - it.t0, it.snap);
            // On standing up, twist slightly about its own vertical axis, decaying together with the shiver
            const tau = t - it.t0;
            it.pivot.rotation.z = tau > 0 && tau < 2.5 ? it.twist * Math.exp(-tau * 5) * Math.sin(2 * Math.PI * it.snap.hz * 0.5 * tau) : 0;
            if (it.down !== null && !noDown) k *= 1 - smooth((t - it.down) / 0.7);
            // sink given as a number = ground height: things standing on other things (signs on the bridge deck, stars) are pressed toward this ground together with their own height, sinking along with what is under them
            if (typeof it.sink === "number") {
                it.baseZ ??= it.pivot.position.z;
                const f = it.down !== null && !noDown && t > it.down ? smooth((t - it.down) / 0.7) : 0;
                it.pivot.position.z = it.sink + (it.baseZ - it.sink) * (1 - f);
            }
            if (it.fold === "drive") {
                const fall = it.down === null || noDown ? 1 : 1 - smooth((t - it.down) / 0.7);
                it.pivot.scale.setScalar(Math.max(0.001, fall));
                it.pivot.rotation.x = 0;
                it.pivot.rotation.z = 0;
                it.pivot.visible = t >= it.t0 - 0.02 && fall > 0.002;
                continue;
            }
            if (it.fold === "grow") {
                // Solid pieces (palms, umbrellas, cars, boats): grow out of the ground, vertical first, horizontal slightly slower, with bounce
                const fall = it.down === null || noDown ? 1 : 1 - smooth((t - it.down) / 0.7);
                const kz = Math.max(0.001, k);
                const kxy = Math.max(0.001, snapUp(t - it.t0 - 0.06, it.snap) * fall);
                it.pivot.scale.set(kxy, kxy, kz);
                it.pivot.rotation.x = 0;
                it.pivot.visible = k > 0.002;
                continue;
            }
            // When standing up, flips up from behind; after it has been walked past, folds down toward the camera (onto the area that has been walked past and is already flat),
            // after landing flat, lifts a little in height so it does not flicker when stacked on other flat paper
            const flat = it.fold === "front" ? Math.PI / 2 : -Math.PI / 2;
            if (it.sink) {
                const f = it.down !== null && !noDown && t > it.down ? smooth((t - it.down) / 0.7) : 0;
                if (f > 0) {
                    it.pivot.rotation.x = 0;
                    it.pivot.scale.set(1, 1, Math.max(0.001, 1 - f));
                    it.pivot.visible = f < 0.999;
                    continue;
                }
                it.pivot.scale.set(1, 1, 1);
            }
            if (it.hide && it.down !== null && !noDown && t > it.down) {
                // Solid pieces that flipped up (palms, umbrellas) do not fall toward the camera on exit (tall and big: while flipping, the whole tree would sweep across the lower half of the frame, fall_view measured 18% of the frame), so they shrink away as before
                const f = 1 - smooth((t - it.down) / 0.7);
                it.pivot.rotation.x = 0;
                it.pivot.scale.set(Math.max(0.001, f), Math.max(0.001, f), Math.max(0.001, f));
                it.pivot.visible = f > 0.002;
                continue;
            }
            if (it.hide) it.pivot.scale.set(1, 1, 1);
            if (it.down !== null && !noDown && t > it.down) {
                const f = fallCurve((t - it.down) / 0.7);
                it.pivot.rotation.x = (Math.PI / 2) * f;
                it.baseZ ??= it.pivot.position.z;
                it.pivot.position.z = it.baseZ + Math.max(0, f) * (0.4 + 0.3 * (this.items.indexOf(it) % 7));
                it.pivot.visible = true;
                continue;
            }
            if (it.baseZ !== undefined) it.pivot.position.z = it.baseZ;
            it.pivot.rotation.x = flat * (1 - k);
            it.pivot.visible = it.hide ? k > 0.002 : k > -0.5;
            if (it.scale) it.pivot.scale.setScalar(0.4 + 0.6 * clamp(k, 0, 1.2));
        }
    }
}

// ---------- Canvas ----------
export function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}

export function toTexture(canvas, {color = true, aniso = 8} = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = aniso;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    return t;
}

// ---------- Tracing an outline from the alpha channel ----------
// Returns the outer outline point list in pixel coordinates (y down); cell is the sampling cell size in pixels, dilate is the number of cells to expand outward (leaves a ring of cut-edge margin and joins fine fragments into one piece).
export function traceAlpha(canvas, {cell = 2, dilate = 1, threshold = 60, tol = 0.7} = {}) {
    const W = canvas.width, H = canvas.height;
    const data = canvas.getContext("2d").getImageData(0, 0, W, H).data;
    const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
    let mask = new Uint8Array(gw * gh);
    for (let y = 0; y < H; y++) {
        const gy = Math.floor(y / cell) + 1;
        for (let x = 0; x < W; x++) {
            if (data[(y * W + x) * 4 + 3] > threshold) mask[gy * gw + Math.floor(x / cell) + 1] = 1;
        }
    }
    for (let r = 0; r < dilate; r++) {
        const next = mask.slice();
        for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
            if (mask[y * gw + x]) continue;
            for (let dy = -1; dy <= 1 && !next[y * gw + x]; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (mask[(y + dy) * gw + x + dx]) { next[y * gw + x] = 1; break; }
            }
        }
        // Keep the outer ring empty; the edge-tracing algorithm needs it
        for (let x = 0; x < gw; x++) { next[x] = 0; next[(gh - 1) * gw + x] = 0; }
        for (let y = 0; y < gh; y++) { next[y * gw] = 0; next[y * gw + gw - 1] = 0; }
        mask = next;
    }
    // Keep only the largest connected component
    const label = new Int32Array(gw * gh).fill(-1);
    let best = -1, bestSize = 0, comp = 0;
    const stack = [];
    for (let i = 0; i < mask.length; i++) {
        if (!mask[i] || label[i] >= 0) continue;
        let size = 0;
        stack.push(i); label[i] = comp;
        while (stack.length) {
            const j = stack.pop(); size++;
            const x = j % gw, y = (j - x) / gw;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const k = (y + dy) * gw + x + dx;
                if (k >= 0 && k < mask.length && mask[k] && label[k] < 0) { label[k] = comp; stack.push(k); }
            }
        }
        if (size > bestSize) { bestSize = size; best = comp; }
        comp++;
    }
    if (best < 0) throw new Error("traceAlpha: empty canvas");
    const fg = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && label[y * gw + x] === best;
    let start = -1;
    for (let i = 0; i < label.length && start < 0; i++) if (label[i] === best) start = i;
    const dirs = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
    const dirIndex = (dx, dy) => dirs.findIndex(([a, b]) => a === dx && b === dy);
    let cx = start % gw, cy = (start - cx) / gw, back = 6;
    const sx = cx, sy = cy;
    const pts = [[cx, cy]];
    let first = null;
    for (let step = 0; step < gw * gh * 4; step++) {
        let found = false;
        for (let k = 1; k <= 8; k++) {
            const d = (back + k) % 8;
            const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
            if (!fg(nx, ny)) continue;
            const pd = (d + 7) % 8;
            const px = cx + dirs[pd][0], py = cy + dirs[pd][1];
            if (cx === sx && cy === sy && first && first[0] === nx && first[1] === ny) { found = false; step = Infinity; break; }
            if (!first) first = [nx, ny];
            back = dirIndex(px - nx, py - ny);
            cx = nx; cy = ny;
            pts.push([cx, cy]);
            found = true;
            break;
        }
        if (!found) break;
    }
    if (pts.length > 1 && pts.at(-1)[0] === sx && pts.at(-1)[1] === sy) pts.pop();
    const px = pts.map(([x, y]) => [(x - 1 + 0.5) * cell, (y - 1 + 0.5) * cell]);
    return cleanRing(rdp(px.concat([px[0]]), tol * cell).slice(0, -1), cell * 0.4);
}

function rdp(points, eps) {
    if (points.length < 3) return points;
    const [ax, ay] = points[0], [bx, by] = points.at(-1);
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let maxD = -1, idx = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i];
        const d = len > 1e-9 ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
        if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD <= eps) return [points[0], points.at(-1)];
    return rdp(points.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(points.slice(idx), eps));
}

// Dedupe, remove collinear points (zero-area triangle -> zero normal -> NaN -> glow spreads to a fully black frame; hit this in the first version)
export function cleanRing(ring, minDist = 0.05) {
    let out = [];
    for (const p of ring) {
        const q = out.at(-1);
        if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > minDist) out.push(p);
    }
    if (out.length > 2 && Math.hypot(out[0][0] - out.at(-1)[0], out[0][1] - out.at(-1)[1]) <= minDist) out.pop();
    let changed = true;
    while (changed && out.length > 3) {
        changed = false;
        for (let i = 0; i < out.length; i++) {
            const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
            const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
            const scale = Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1]);
            if (Math.abs(cross) <= 1e-4 * Math.max(scale, 1e-9)) { out.splice(i, 1); changed = true; break; }
        }
    }
    return out;
}

// ---------- Paper-piece geometry ----------
export function fixNormals(geometry, flat = true) {
    const n = geometry.attributes.normal;
    const groups = geometry.groups;
    for (const g of groups) {
        for (let i = g.start; i < g.start + g.count; i++) {
            const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
            if (flat && g.materialIndex === 0) n.setXYZ(i, 0, 0, 1);
            else if (flat && g.materialIndex === 1) n.setXYZ(i, 0, 0, -1);
            else if (!(len > 0.5)) n.setXYZ(i, g.materialIndex === 1 ? 0 : 0, 0, g.materialIndex === 1 ? -1 : 1);
            else n.setXYZ(i, n.getX(i) / len, n.getY(i) / len, n.getZ(i) / len);
        }
    }
    n.needsUpdate = true;
    return geometry;
}

export function slabGeometry(outline, thickness, uvFrame) {
    return fixNormals(cardGeometry(outline, thickness, [], uvFrame));
}

// Bent paper: apply a z offset to local x (leaves drooping, strips arching), then recompute normals
export function bendGeometry(geometry, fn) {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + fn(p.getX(i), p.getY(i)));
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    return fixNormals(geometry, false);
}

// Material convention: meta.mat = {front, back, edge}, each entry {map, emissiveMap, emissive, color, rough, alphaTest, sheen}
export function paperMesh(geometry, id, mat, {kind = "piece", castShadow = true, receiveShadow = true, slots} = {}) {
    const mesh = new THREE.Mesh(geometry, []);
    tagPaper(mesh, {id, kind, meta: {mat}, castShadow, receiveShadow}, slots ?? ["front", "back", "edge"]);
    return mesh;
}

// Make one paper piece cut to shape from a canvas: ppm = canvas pixels per mm. The origin is at the midpoint of the canvas bottom edge (the standee footing).
export function cutout(canvas, {id, ppm, thickness = 0.8, emissive = null, emissiveIntensity = 1, back = "same",
        edge = "#efe3d3", trace = {}, anchor = "bottom", castShadow = true, rough = 0.86}) {
    const ring = traceAlpha(canvas, trace);
    const wmm = canvas.width / ppm, hmm = canvas.height / ppm;
    const [fx, fy] = Array.isArray(anchor) ? anchor : anchor === "center" ? [0.5, 0.5] : [0.5, 0];
    const ox = wmm * fx, oy = hmm * fy;
    const outline = ring.map(([x, y]) => [x / ppm - ox, (canvas.height - y) / ppm - oy]);
    const geometry = slabGeometry(outline, thickness, {x: -ox, y: -oy, width: wmm, height: hmm});
    // Fix item 34 version B: a contact darkening printed at the bottom of a standee (the kind that is footed on its bottom edge) - copy the canvas first and then darken it, so as not to alter a canvas shared elsewhere
    if (ab("print") && anchor === "bottom") canvas = contactShade(canvas, ppm);
    const map = toTexture(canvas);
    const em = emissive ? toTexture(emissive) : null;
    const front = {map, emissiveMap: em, emissive: em ? emissiveIntensity : 0, alphaTest: 0.35, rough};
    const backMat = back === "same" ? {...front, tint: 0.82} : (typeof back === "string" ? {color: back, rough} : back);
    const mesh = paperMesh(geometry, id, {front, back: backMat, edge: {color: edge, rough: 0.95}}, {castShadow});
    mesh.userData.size = [wmm, hmm];
    return mesh;
}

function contactShade(src, ppm) {
    const c = makeCanvas(src.width, src.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0);
    const h = Math.max(ppm * 0.6, src.height * 0.07);
    const g = ctx.createLinearGradient(0, src.height, 0, src.height - h);
    g.addColorStop(0, "rgba(74,63,138,0.42)");
    g.addColorStop(1, "rgba(74,63,138,0)");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = g;
    ctx.fillRect(0, src.height - h, src.width, h);
    return c;
}

// Rectangular printed paper (no outline tracing)
export function rectSheet(canvas, {id, width, height, thickness = 0.6, emissive = null, emissiveIntensity = 1,
        back = "#efe3d3", edge = "#efe3d3", origin = "bottom", rough = 0.86, castShadow = true}) {
    const x0 = -width / 2, y0 = origin === "bottom" ? 0 : -height / 2;
    const outline = [[x0, y0], [x0 + width, y0], [x0 + width, y0 + height], [x0, y0 + height]];
    const geometry = slabGeometry(outline, thickness, {x: x0, y: y0, width, height});
    const front = {map: canvas ? toTexture(canvas) : null, emissiveMap: emissive ? toTexture(emissive) : null,
        emissive: emissive ? emissiveIntensity : 0, rough};
    const backMat = back === "same" ? {...front, tint: 0.85} : {color: back, rough};
    return paperMesh(geometry, id, {front, back: backMat, edge: {color: edge, rough: 0.95}}, {castShadow});
}

// Arbitrary polygon board (ground paper, silhouettes), outline in mm, uvFrame defaults to the bounding box
export function polySheet(outline, {id, canvas = null, color = null, thickness = 1, uvFrame, edge = "#efe3d3",
        emissive = null, emissiveIntensity = 1, back = null, rough = 0.9, castShadow = true, receiveShadow = true, tint}) {
    const ring = cleanRing(outline, 0.02);
    const geometry = slabGeometry(ring, thickness, uvFrame);
    const front = {map: canvas ? toTexture(canvas) : null, color, rough, tint,
        emissiveMap: emissive ? toTexture(emissive) : null, emissive: emissive ? emissiveIntensity : 0};
    return paperMesh(geometry, id, {front, back: back ?? {color: "#d9cbb8", rough}, edge: {color: edge, rough: 0.95}},
        {castShadow, receiveShadow});
}

// Custom mesh (car body, umbrella canopy, curved wall): single material slot
export function customPaper(geometry, id, mat, opts = {}) {
    geometry.clearGroups();
    geometry.addGroup(0, geometry.index ? geometry.index.count : geometry.attributes.position.count, 0);
    return paperMesh(geometry, id, {front: mat, back: mat, edge: mat}, {...opts, slots: ["front"]});
}

// An object standing at (x,y,z): pivot (for the pop-up) -> holder (orientation) -> content
export function place(root, object, {x = 0, y = 0, z = 0, yaw = 0}) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const holder = new THREE.Group();
    holder.rotation.z = yaw;
    holder.add(object);
    pivot.add(holder);
    root.add(pivot);
    return {pivot, holder};
}

// Standee: stands up a paper piece drawn on the XY plane (local y -> world z), front face toward -Y (toward the camera)
export function standUp(mesh) {
    const g = new THREE.Group();
    mesh.rotation.x = Math.PI / 2;
    g.add(mesh);
    return g;
}
