// Brushes for the print: the GTA6 official illustration style printed on paper - pastel base color + indigo-purple shadow side (multiply) + peach rim light,
// shadows lean purple instead of pure black, a thin ink line around the outer contour, and a paper-grain layer last. Light always comes from the upper left (same direction as the scene's key light).
// Canvas y points down; on a standee canvas up = up, on a ground canvas up = away from the camera (+Y).
import {makeCanvas, rng, clamp, lerp} from "./kit.js";
import {ab} from "./ab.js";

export const P = {
    ink: "#2a1b2c", inkSoft: "#3c2a48",
    shadeMul: "#8478bf", shadeMulDeep: "#6a5ea6", shade: "#5e5a92", shadeDeep: "#4f457c",
    lav: "#9c8dd9", lavLight: "#c3b6ee", mauve: "#b788b6",
    pink: "#e89dac", pinkSoft: "#f1adbf", rose: "#cd8fb5", pinkHot: "#ff4fa3", magenta: "#af307b",
    peach: "#fcac8a", peachLight: "#f9bfa4", apricot: "#facdb9", cream: "#fbf9de", butter: "#fbe1bb",
    coral: "#f9a298", sun: "#ffb089", terracotta: "#af635a",
    teal: "#3fb8b0", aqua: "#6fd6cf", mint: "#a8dccb", sky: "#7da0d5",
    neonTeal: "#3ff0e0", neonPink: "#ff4fa3", neonBlue: "#5b8cff", neonWarm: "#ffcf8a",
    red: "#d8343f", yellow: "#f5c043", white: "#fff6ec",
    sand: "#f6d7b2", sandWet: "#dcb39c", grass: "#73b383", grassDark: "#3f7a6a",
    asphalt: "#6b6584", paper: "#efe3d3",
};

// ---------- Colors ----------
export function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return "#" + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, "0")).join("");
}
export const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

// ---------- Paths ----------
export function poly(pts, close = true) {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    if (close) p.closePath();
    return p;
}
export function capsule(x1, y1, x2, y2, r1, r2 = r1) {
    const p = new Path2D();
    const a = Math.atan2(y2 - y1, x2 - x1);
    p.arc(x1, y1, r1, a + Math.PI / 2, a - Math.PI / 2 + Math.PI * 2);
    p.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2);
    p.closePath();
    return p;
}
export function ellipse(cx, cy, rx, ry, rot = 0) {
    const p = new Path2D();
    p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    return p;
}
export function roundRect(x, y, w, h, r) {
    const p = new Path2D();
    p.roundRect(x, y, w, h, r);
    return p;
}

// path minus its own translated copy = a crescent on one side. Translating toward the upper left gives a crescent at the lower right (shadow side); translating toward the lower right gives a crescent at the upper left (lit edge).
// Doing "fill the shape -> cut out the translated shape" on an offscreen canvas means compound shapes (a cloud made of several overlapping ellipses, curly hair) do not get even-odd holes.
let scratch = null;
function scratchFor(w, h) {
    if (!scratch || scratch.width < w || scratch.height < h) {
        scratch = makeCanvas(Math.max(w, scratch?.width ?? 0), Math.max(h, scratch?.height ?? 0));
    }
    const s = scratch.getContext("2d");
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = "source-over";
    s.globalAlpha = 1;
    s.filter = "none";
    s.clearRect(0, 0, w, h);
    return s;
}
export function crescent(ctx, path, color, dx, dy, alpha = 1, {blur = 0, mode = "source-over"} = {}) {
    const {width: w, height: h} = ctx.canvas;
    const s = scratchFor(w, h);
    s.setTransform(ctx.getTransform());
    s.fillStyle = color;
    s.fill(path);
    s.globalCompositeOperation = "destination-out";
    s.translate(dx, dy);
    if (blur > 0) s.filter = `blur(${blur}px)`;
    s.fill(path);
    s.filter = "none";
    // keep only what lies inside the original shape
    s.setTransform(ctx.getTransform());
    s.globalCompositeOperation = "destination-in";
    s.fill(path);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = mode;
    ctx.drawImage(scratch, 0, 0, w, h, 0, 0, w, h);
    ctx.restore();
}

// A lit shape: base color -> shadow-side crescent (indigo-purple, multiply) -> lit edge (peach)
export function lit(ctx, path, base, o = {}) {
    const {shade = P.shadeMul, shadeA = 0.75, sw = 4, rim = P.peach, rimA = 0.85, rw = 1.5, blur = 0.8,
        dir = [1, 0.55], fill = true} = o;
    const len = Math.hypot(dir[0], dir[1]);
    const ux = dir[0] / len, uy = dir[1] / len;
    if (fill) {
        ctx.fillStyle = base;
        ctx.fill(path);
    }
    if (sw > 0) crescent(ctx, path, shade, -ux * sw, -uy * sw, shadeA, {blur, mode: "multiply"});
    if (rw > 0) crescent(ctx, path, rim, ux * rw, uy * rw, rimA, {blur: blur * 0.5, mode: "screen"});
}

// shorthand for a linear gradient
export function lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
}
export function rad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
}

// ---------- Paper grain and ink lines ----------
let noiseCanvas = null;
function noiseTile() {
    if (noiseCanvas) return noiseCanvas;
    noiseCanvas = makeCanvas(256, 256);
    const ctx = noiseCanvas.getContext("2d");
    const img = ctx.createImageData(256, 256);
    const r = rng(11);
    for (let i = 0; i < 256 * 256; i++) {
        const v = 128 + (r() - 0.5) * 90;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // paper fibers: short curved bright strands
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 260; i++) {
        const x = r() * 256, y = r() * 256, a = r() * Math.PI, l = 4 + r() * 14;
        ctx.strokeStyle = r() < 0.6 ? "rgba(255,255,255,0.55)" : "rgba(40,30,50,0.35)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 4,
            x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
    }
    return noiseCanvas;
}
export function grain(ctx, amount = 0.07, scale = 1) {
    const {width: w, height: h} = ctx.canvas;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = amount;
    const pat = ctx.createPattern(noiseTile(), "repeat");
    if (scale !== 1) pat.setTransform(new DOMMatrix().scale(scale));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}
// grow an ink line outward around the transparent edge (the cut edge has to read clearly)
export function inkOutline(canvas, color = P.ink, width = 2, alpha = 1) {
    const w = canvas.width, h = canvas.height;
    const sil = makeCanvas(w, h);
    const s = sil.getContext("2d");
    s.drawImage(canvas, 0, 0);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = color;
    s.fillRect(0, 0, w, h);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.globalAlpha = alpha;
    const steps = 16;
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ctx.drawImage(sil, Math.cos(a) * width, Math.sin(a) * width);
    }
    ctx.restore();
    return canvas;
}
export function finish(canvas, {ink = P.ink, inkW = 2, grainAmt = 0.07} = {}) {
    const ctx = canvas.getContext("2d");
    // fix item 34, version B: ink lines are never thinner than 0.2 mm (sheet() records the pixels per millimeter of the canvas)
    if (ab("print") && canvas.ppm && inkW > 0) inkW = Math.max(inkW, 0.2 * canvas.ppm);
    grain(ctx, grainAmt);
    if (inkW > 0) inkOutline(canvas, ink, inkW);
    return canvas;
}

// Draw on the canvas in millimeters: returns {canvas, ctx, mm}, where mm(v) converts millimeters to pixels
// Shrink the font size when the text is too wide: font(size) returns the font string, and if the measured width exceeds maxW it scales down proportionally; returns the size finally used (version 12: sign text stuck out past the backing board and was clipped by the canvas)
export function fitFont(ctx, text, size, maxW, font) {
    ctx.font = font(size);
    const w = ctx.measureText(text).width;
    if (maxW > 0 && w > maxW) { size *= maxW / w; ctx.font = font(size); }
    return size;
}
export function sheet(wMm, hMm, ppm) {
    const canvas = makeCanvas(wMm * ppm, hMm * ppm);
    canvas.ppm = ppm;
    const ctx = canvas.getContext("2d");
    return {canvas, ctx, mm: v => v * ppm, W: canvas.width, H: canvas.height};
}

// =====================================================================
// Palm
// =====================================================================
export function paintTrunk(ppm, hMm, seed, bendMm = 3) {
    const r = rng(seed);
    const pad = 2.2;
    const wMm = Math.abs(bendMm) * 2 + pad * 2 + 3;
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm + 1.5, ppm);
    const cx = W / 2, base = H - mm(0.4), top = mm(1.2);
    const center = t => cx + mm(bendMm) * t * t - mm(bendMm) * 0.35;
    const half = t => mm(lerp(1.45, 0.85, t) + (t < 0.07 ? (0.07 - t) * 9 : 0));
    const yAt = t => lerp(base, top, t);
    const L = [], R = [];
    for (let i = 0; i <= 50; i++) {
        const t = i / 50;
        L.push([center(t) - half(t), yAt(t)]);
        R.push([center(t) + half(t), yAt(t)]);
    }
    const body = poly(L.concat(R.reverse()));
    ctx.fillStyle = lin(ctx, 0, base, 0, top, [[0, "#a98179"], [0.5, "#c29a88"], [1, "#9f7d86"]]);
    ctx.fill(body);
    lit(ctx, body, null, {fill: false, sw: mm(1.1), shadeA: 0.85, rw: mm(0.45), rimA: 0.9, blur: mm(0.15)});
    // trunk rings
    ctx.save();
    ctx.clip(body);
    for (let y = base - mm(0.6); y > top; y -= mm(0.55 + r() * 0.35)) {
        const t = (base - y) / (base - top);
        const c = center(t), h = half(t);
        ctx.strokeStyle = rgba("#5a3d58", 0.45);
        ctx.lineWidth = mm(0.12);
        ctx.beginPath();
        ctx.moveTo(c - h, y);
        ctx.quadraticCurveTo(c, y + mm(0.35), c + h, y - mm(0.05));
        ctx.stroke();
        ctx.strokeStyle = rgba("#ffd9b8", 0.35);
        ctx.lineWidth = mm(0.08);
        ctx.beginPath();
        ctx.moveTo(c - h, y + mm(0.14));
        ctx.quadraticCurveTo(c - h * 0.2, y + mm(0.4), c + h * 0.2, y + mm(0.3));
        ctx.stroke();
    }
    ctx.restore();
    // leaf sheaths and coconuts under the crown
    const tc = center(1), ty = top + mm(0.4);
    const boot = ellipse(tc, ty + mm(0.3), mm(1.5), mm(1.1));
    lit(ctx, boot, "#7a6a4f", {sw: mm(0.6), rw: mm(0.25)});
    for (const [dx, dy] of [[-0.8, 1.1], [0.5, 1.2], [-0.1, 1.6]]) {
        const nut = ellipse(tc + mm(dx), ty + mm(dy), mm(0.62), mm(0.58));
        lit(ctx, nut, "#7b5a3c", {sw: mm(0.35), rw: mm(0.18), shadeA: 0.9});
    }
    return finish(canvas, {inkW: mm(0.1), ink: "#3a2540"});
}

export function paintFrond(ppm, lenMm, seed, {dry = 0} = {}) {
    const r = rng(seed);
    const span = 5.2;
    const {canvas, ctx, mm, W, H} = sheet(lenMm + 1.2, span * 2 + 1.2, ppm);
    const x0 = mm(0.5), x1 = W - mm(0.5), y0 = H / 2;
    const base = mix("#4e9068", "#9a9a5a", dry), light = mix("#93c97c", "#d8c27a", dry), deep = "#2e5762";
    const n = Math.round(lenMm * 1.45);
    for (const side of [1, -1]) {           // draw the lower side (dark) first, then the upper side (light)
        for (let i = 0; i < n; i++) {
            const f = (i + 0.5) / n;
            const x = lerp(x0 + mm(1.2), x1, f);
            const y = y0 + side * mm(0.12);
            const len = mm(span) * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * f)), 0.55) * (1 - 0.25 * f) * (0.85 + 0.3 * r());
            const ang = (55 - 30 * f + (r() - 0.5) * 10) * Math.PI / 180;
            const ex = x + Math.cos(ang) * len, ey = y + side * Math.sin(ang) * len;
            const wBase = mm(0.42 + 0.2 * (1 - f));
            const nx = -Math.sin(ang) * side, ny = Math.cos(ang);
            const mx = (x + ex) / 2 - nx * mm(0.35) * side, my = (y + ey) / 2 + mm(0.25);
            const p = new Path2D();
            p.moveTo(x - wBase * 0.5, y);
            p.quadraticCurveTo(mx - wBase * 0.4 * Math.sign(side), my, ex, ey);
            p.quadraticCurveTo(mx + wBase * 0.6, my + wBase * 0.3 * side, x + wBase * 0.7, y);
            p.closePath();
            const c = side < 0 ? mix(base, light, 0.35 + 0.4 * r()) : mix(base, deep, 0.2 + 0.35 * r());
            ctx.fillStyle = c;
            ctx.fill(p);
            if (side < 0 && r() < 0.8) crescent(ctx, p, P.peach, mm(0.12), mm(0.12), 0.55, {mode: "screen"});
            else crescent(ctx, p, P.shadeMulDeep, -mm(0.12), -mm(0.12), 0.6, {mode: "multiply"});
        }
    }
    // frond rachis
    ctx.lineCap = "round";
    const rib = (w, c) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, y0 - mm(0.2), x1, y0 + mm(0.1));
        ctx.stroke();
    };
    rib(mm(0.42), "#5f7c4a");
    rib(mm(0.2), "#e3e39a");
    // the frond tips are a bit warmer on the side facing the sunset
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, "rgba(255,190,140,0)"], [0.7, "rgba(255,190,140,0)"], [1, "rgba(255,180,130,0.35)"]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return finish(canvas, {inkW: mm(0.07), ink: "#24343c", grainAmt: 0.05});
}

// =====================================================================
// Shrubs (sea grape, hibiscus): one cut-out layer; callers stack 2-3 layers
// =====================================================================
export function paintBush(ppm, wMm, hMm, seed, {base = "#4f9a6e", light = "#8fcb7e", flowers = null, flowerCount = 0} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm + 1, hMm + 1, ppm);
    const blobs = [];
    const n = Math.round(wMm / 2.2) + 3;
    for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const x = lerp(mm(1.2), W - mm(1.2), f) + (r() - 0.5) * mm(1);
        const mound = Math.sin(Math.PI * clamp(f, 0.05, 0.95));
        const rad = mm(1.3 + 1.4 * r()) * (0.7 + 0.5 * mound);
        const y = H - mm(0.5) - rad * 0.6 - mound * (H - mm(1) - rad * 2.2) * (0.75 + 0.25 * r());
        blobs.push([x, Math.max(y, rad + mm(0.4)), rad]);
    }
    // a flat bottom edge
    const footing = new Path2D();
    footing.rect(mm(0.8), H - mm(2.2), W - mm(1.6), mm(1.7));
    ctx.fillStyle = mix(base, "#2e5762", 0.45);
    ctx.fill(footing);
    blobs.sort((a, b) => a[1] - b[1]);
    for (const [x, y, rd] of blobs) {
        const p = ellipse(x, y, rd, rd * 0.92);
        lit(ctx, p, mix(base, light, r() * 0.25), {sw: rd * 0.45, rw: rd * 0.16, blur: rd * 0.08});
        // leaf texture: a few short arcs
        ctx.strokeStyle = rgba("#2d5a55", 0.45);
        ctx.lineWidth = mm(0.12);
        for (let k = 0; k < 4; k++) {
            const a = r() * Math.PI * 2, rr = rd * (0.3 + 0.5 * r());
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * rr * 0.5, y + Math.sin(a) * rr * 0.5, rd * 0.35, a, a + 1.2);
            ctx.stroke();
        }
    }
    if (flowers) {
        for (let i = 0; i < flowerCount; i++) {
            const [x, y, rd] = blobs[Math.floor(r() * blobs.length)];
            const fx = x + (r() - 0.5) * rd * 1.2, fy = y + (r() - 0.6) * rd * 1.0;
            const fr = mm(0.45 + r() * 0.25);
            for (let k = 0; k < 5; k++) {
                const a = k * Math.PI * 2 / 5 + r();
                const petal = ellipse(fx + Math.cos(a) * fr * 0.6, fy + Math.sin(a) * fr * 0.6, fr * 0.55, fr * 0.38, a);
                ctx.fillStyle = flowers;
                ctx.fill(petal);
            }
            crescent(ctx, ellipse(fx, fy, fr, fr), P.shadeMul, -fr * 0.3, -fr * 0.3, 0.5, {mode: "multiply"});
            ctx.fillStyle = "#ffe6a0";
            ctx.fill(ellipse(fx, fy, fr * 0.22, fr * 0.22));
        }
    }
    return finish(canvas, {inkW: mm(0.09), ink: "#22343a"});
}

// =====================================================================
// Flamingo
// =====================================================================
export function paintFlamingo(ppm, seed, {pose = "stand"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(9, 15, ppm);
    const pinkBase = "#f28cb1", pinkLight = "#ffc3b0", pinkDeep = "#b4588f";
    const bx = mm(4.6), by = mm(7.2);
    // legs
    ctx.lineCap = "round";
    ctx.strokeStyle = "#d76f98";
    ctx.lineWidth = mm(0.28);
    ctx.beginPath();
    ctx.moveTo(bx - mm(0.2), by + mm(1.2));
    ctx.lineTo(bx - mm(0.1), H - mm(0.4));
    ctx.stroke();
    if (pose === "stand") {
        ctx.beginPath();
        ctx.moveTo(bx + mm(0.3), by + mm(1.2));
        ctx.lineTo(bx + mm(1.6), by + mm(3.0));
        ctx.lineTo(bx + mm(0.3), by + mm(3.6));
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(bx + mm(0.3), by + mm(1.2));
        ctx.lineTo(bx + mm(0.6), H - mm(0.4));
        ctx.stroke();
    }
    ctx.fillStyle = "#c45a86";
    ctx.fillRect(bx - mm(0.6), H - mm(0.6), mm(1.0), mm(0.35));
    // body
    const body = new Path2D();
    body.moveTo(bx - mm(3.0), by - mm(0.4));
    body.bezierCurveTo(bx - mm(2.4), by - mm(2.0), bx + mm(1.6), by - mm(2.2), bx + mm(2.4), by - mm(0.6));
    body.bezierCurveTo(bx + mm(2.8), by + mm(0.6), bx + mm(1.0), by + mm(1.8), bx - mm(0.6), by + mm(1.5));
    body.bezierCurveTo(bx - mm(2.0), by + mm(1.3), bx - mm(3.6), by + mm(0.5), bx - mm(3.0), by - mm(0.4));
    lit(ctx, body, pinkBase, {sw: mm(0.9), rw: mm(0.35), rim: pinkLight, blur: mm(0.15)});
    // wing feather marks
    ctx.strokeStyle = rgba(pinkDeep, 0.55);
    ctx.lineWidth = mm(0.13);
    for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(bx - mm(2.2 - k * 0.3), by - mm(0.3 - k * 0.35));
        ctx.quadraticCurveTo(bx - mm(0.2), by + mm(0.2 + k * 0.2), bx + mm(1.6), by - mm(0.4 - k * 0.3));
        ctx.stroke();
    }
    ctx.fillStyle = "#5a2d4e";
    ctx.beginPath();
    ctx.moveTo(bx - mm(3.0), by - mm(0.3));
    ctx.lineTo(bx - mm(3.9), by + mm(0.2));
    ctx.lineTo(bx - mm(2.7), by + mm(0.5));
    ctx.fill();
    // neck (S-shaped) + head
    const head = pose === "stand" ? [bx + mm(1.7), mm(1.9)] : [bx + mm(3.2), by + mm(1.6)];
    ctx.strokeStyle = pinkBase;
    ctx.lineWidth = mm(0.75);
    ctx.beginPath();
    ctx.moveTo(bx + mm(1.9), by - mm(1.0));
    if (pose === "stand") ctx.bezierCurveTo(bx + mm(3.6), by - mm(2.8), bx - mm(0.4), by - mm(3.4), head[0], head[1] + mm(0.5));
    else ctx.bezierCurveTo(bx + mm(3.6), by - mm(1.8), bx + mm(4.2), by - mm(0.2), head[0], head[1] - mm(0.3));
    ctx.stroke();
    ctx.strokeStyle = rgba(pinkLight, 0.8);
    ctx.lineWidth = mm(0.22);
    ctx.stroke();
    const hp = ellipse(head[0], head[1], mm(0.75), mm(0.62));
    lit(ctx, hp, pinkBase, {sw: mm(0.25), rw: mm(0.15), rim: pinkLight});
    // curved beak: pink-white + black tip
    const dir = pose === "stand" ? 1 : 1;
    const beak = new Path2D();
    beak.moveTo(head[0] + mm(0.4) * dir, head[1] - mm(0.3));
    beak.quadraticCurveTo(head[0] + mm(1.6) * dir, head[1] - mm(0.1), head[0] + mm(1.5) * dir, head[1] + mm(1.0));
    beak.lineTo(head[0] + mm(0.9) * dir, head[1] + mm(0.5));
    beak.quadraticCurveTo(head[0] + mm(0.6) * dir, head[1] + mm(0.2), head[0] + mm(0.3) * dir, head[1] + mm(0.25));
    beak.closePath();
    ctx.fillStyle = "#f8e3d4";
    ctx.fill(beak);
    ctx.save();
    ctx.clip(beak);
    ctx.fillStyle = "#2a1b2c";
    ctx.fillRect(head[0] + mm(0.95) * dir, head[1] - mm(0.4), mm(1.5), mm(2));
    ctx.restore();
    ctx.fillStyle = "#2a1b2c";
    ctx.fill(ellipse(head[0] + mm(0.15), head[1] - mm(0.12), mm(0.12), mm(0.12)));
    return finish(canvas, {inkW: mm(0.1), ink: "#4a2240"});
}

// =====================================================================
// Passerby standee
// =====================================================================
const SKIN = ["#e9b293", "#c98b6b", "#9a6148", "#6e4535", "#f2c6a8"];
export function paintPerson(ppm, seed, o = {}) {
    const r = rng(seed);
    const {pose = "stand", skin = SKIN[Math.floor(r() * SKIN.length)], top = "#ffffff", topStyle = "tank",
        bottom = "#4a6fa5", bottomStyle = "shorts", hair = "#2a1b2c", hairStyle = "short", shoes = "#fff6ec",
        shades = r() < 0.5, chain = false, cap = null, prop = null, heightMm = 13.5, build = 1} = o;
    const {canvas, ctx, mm, W, H} = sheet(9.5, heightMm + 1.2, ppm);
    const U = mm(heightMm) / 7.4;   // one head height
    const cx = W / 2, feet = H - mm(0.5);
    const hip = feet - U * 3.5, shoulder = feet - U * 6.0, headC = feet - U * 6.7;
    const sh = U * 0.95 * build, wa = U * 0.62 * build, hi = U * 0.78 * build;
    const walk = pose === "walk" ? 1 : 0;
    const limb = (x1, y1, x2, y2, r1, r2, color, o2 = {}) => {
        const p = capsule(x1, y1, x2, y2, r1, r2);
        lit(ctx, p, color, {sw: r1 * 0.9, rw: r1 * 0.35, blur: r1 * 0.15, ...o2});
        return p;
    };
    // legs
    const legL = [cx - hi * 0.45, hip, cx - hi * 0.5 - walk * U * 0.7, feet - U * 0.15];
    const legR = [cx + hi * 0.45, hip, cx + hi * 0.45 + walk * U * 0.6, feet - U * 0.15];
    for (const [x1, y1, x2, y2] of [legR, legL]) {
        const knee = [(x1 + x2) / 2, (y1 + y2) / 2];
        const lower = bottomStyle === "pants" ? bottom : skin;
        limb(knee[0], knee[1], x2, y2, U * 0.23, U * 0.15, lower);
        const upper = bottomStyle === "bikini" ? skin : bottom;
        limb(x1, y1, knee[0], knee[1] + (bottomStyle === "shorts" ? -U * 0.1 : 0), U * 0.31, U * 0.24, bottomStyle === "pants" ? bottom : upper);
        if (bottomStyle === "shorts") limb(x1, y1, (x1 * 0.4 + knee[0] * 0.6), y1 + (knee[1] - y1) * 0.7, U * 0.34, U * 0.3, bottom);
        const shoe = ellipse(x2 + U * 0.12, y2 + U * 0.08, U * 0.33, U * 0.17);
        lit(ctx, shoe, shoes, {sw: U * 0.12, rw: U * 0.06});
    }
    // torso
    const torso = new Path2D();
    torso.moveTo(cx - sh, shoulder + U * 0.15);
    torso.quadraticCurveTo(cx - sh * 1.02, shoulder - U * 0.1, cx - sh * 0.6, shoulder - U * 0.12);
    torso.lineTo(cx + sh * 0.6, shoulder - U * 0.12);
    torso.quadraticCurveTo(cx + sh * 1.02, shoulder - U * 0.1, cx + sh, shoulder + U * 0.15);
    torso.quadraticCurveTo(cx + wa * 1.05, hip - U * 1.1, cx + wa, hip - U * 0.6);
    torso.quadraticCurveTo(cx + hi * 1.05, hip - U * 0.2, cx + hi, hip + U * 0.15);
    torso.lineTo(cx - hi, hip + U * 0.15);
    torso.quadraticCurveTo(cx - hi * 1.05, hip - U * 0.2, cx - wa, hip - U * 0.6);
    torso.quadraticCurveTo(cx - wa * 1.05, hip - U * 1.1, cx - sh, shoulder + U * 0.15);
    torso.closePath();
    lit(ctx, torso, skin, {sw: U * 0.55, rw: U * 0.2, blur: U * 0.1});
    // clothes: drawn on the torso using a clip
    ctx.save();
    ctx.clip(torso);
    if (topStyle !== "none") {
        const topY = topStyle === "bikini" ? shoulder + U * 0.55 : topStyle === "tank" ? shoulder - U * 0.2 : shoulder - U * 0.3;
        const botY = topStyle === "bikini" ? shoulder + U * 1.05 : topStyle === "crop" ? hip - U * 1.0 : hip + U * 0.2;
        const cloth = new Path2D();
        cloth.rect(cx - sh * 1.2, topY, sh * 2.4, botY - topY);
        ctx.fillStyle = top;
        ctx.fill(cloth);
        if (topStyle === "tank") {   // the tank top's armholes show the shoulders
            ctx.fillStyle = skin;
            ctx.fill(ellipse(cx - sh * 0.95, shoulder + U * 0.35, sh * 0.32, U * 0.55));
            ctx.fill(ellipse(cx + sh * 0.95, shoulder + U * 0.35, sh * 0.32, U * 0.55));
            ctx.fill(ellipse(cx, shoulder - U * 0.05, sh * 0.28, U * 0.3));
        }
        if (topStyle === "hawaii") {  // Hawaiian shirt: small flower dots
            for (let i = 0; i < 26; i++) {
                ctx.fillStyle = [P.yellow, P.pinkHot, P.white, P.teal][i % 4];
                ctx.fill(ellipse(cx + (r() - 0.5) * sh * 2.2, lerp(topY, botY, r()), U * 0.09, U * 0.07));
            }
            ctx.strokeStyle = rgba(P.ink, 0.35);
            ctx.lineWidth = U * 0.05;
            ctx.beginPath();
            ctx.moveTo(cx, topY + U * 0.3);
            ctx.lineTo(cx, botY);
            ctx.stroke();
        }
        if (topStyle === "jersey") {
            ctx.fillStyle = rgba(P.white, 0.9);
            ctx.font = `700 ${U * 0.7}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(String(1 + Math.floor(r() * 30)), cx, shoulder + U * 1.4);
        }
    }
    ctx.restore();
    lit(ctx, torso, null, {fill: false, sw: U * 0.55, rw: U * 0.18, blur: U * 0.1, shadeA: 0.55});
    if (chain) {
        ctx.strokeStyle = "#ffd36a";
        ctx.lineWidth = U * 0.07;
        ctx.beginPath();
        ctx.arc(cx, shoulder - U * 0.1, U * 0.42, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();
    }
    // arms
    const armUp = pose === "wave";
    const armL = armUp ? [cx - sh * 0.92, shoulder + U * 0.1, cx - sh * 1.6, shoulder - U * 1.4]
        : [cx - sh * 0.92, shoulder + U * 0.1, cx - sh * 1.1 + walk * U * 0.5, hip + U * 0.1];
    const armR = [cx + sh * 0.92, shoulder + U * 0.1, cx + sh * 1.12 - walk * U * 0.4, hip + U * 0.05];
    for (const [x1, y1, x2, y2] of [armL, armR]) {
        limb(x1, y1, x2, y2, U * 0.2, U * 0.13, skin);
        lit(ctx, ellipse(x2, y2 + U * 0.08, U * 0.15, U * 0.19), skin, {sw: U * 0.08, rw: U * 0.04});
        if (topStyle === "tee" || topStyle === "hawaii" || topStyle === "jersey") {
            limb(x1, y1, lerp(x1, x2, 0.35), lerp(y1, y2, 0.35), U * 0.3, U * 0.27, top);
        }
    }
    if (prop === "drink") {
        const cup = roundRect(armR[2] - U * 0.15, armR[3] - U * 0.55, U * 0.32, U * 0.5, U * 0.05);
        lit(ctx, cup, "#ff6fae", {sw: U * 0.1, rw: U * 0.05});
    } else if (prop === "phone") {
        ctx.fillStyle = "#2a1b2c";
        ctx.fillRect(armR[2] - U * 0.12, armR[3] - U * 0.5, U * 0.22, U * 0.4);
    } else if (prop === "board") {
        const board = ellipse(armR[2] + U * 0.45, armR[3] - U * 1.3, U * 0.42, U * 2.3, 0.05);
        lit(ctx, board, "#7fd6d0", {sw: U * 0.25, rw: U * 0.12});
        ctx.strokeStyle = P.pinkHot;
        ctx.lineWidth = U * 0.12;
        ctx.beginPath();
        ctx.moveTo(armR[2] + U * 0.45, armR[3] - U * 3.4);
        ctx.lineTo(armR[2] + U * 0.45, armR[3] + U * 0.8);
        ctx.stroke();
    }
    // neck and head
    limb(cx, shoulder - U * 0.1, cx, headC + U * 0.2, U * 0.2, U * 0.2, skin, {rw: 0});
    const head = ellipse(cx, headC, U * 0.42, U * 0.5);
    lit(ctx, head, skin, {sw: U * 0.22, rw: U * 0.1, blur: U * 0.05});
    // hair
    ctx.save();
    const hairP = new Path2D();
    if (hairStyle === "short" || hairStyle === "buzz") {
        hairP.ellipse(cx, headC - U * 0.17, U * 0.45, U * (hairStyle === "buzz" ? 0.36 : 0.4), 0, Math.PI, 0);
        hairP.closePath();
    } else if (hairStyle === "pony" || hairStyle === "long") {
        hairP.ellipse(cx, headC - U * 0.12, U * 0.47, U * 0.46, 0, Math.PI * 0.95, Math.PI * 0.05);
        hairP.closePath();
        const tail = hairStyle === "pony"
            ? capsule(cx + U * 0.35, headC - U * 0.25, cx + U * 0.6, headC + U * 0.9, U * 0.18, U * 0.1)
            : capsule(cx + U * 0.25, headC - U * 0.1, cx + U * 0.32, headC + U * 1.3, U * 0.3, U * 0.24);
        hairP.addPath(tail);
        if (hairStyle === "long") hairP.addPath(capsule(cx - U * 0.25, headC - U * 0.1, cx - U * 0.32, headC + U * 1.2, U * 0.28, U * 0.22));
    } else if (hairStyle === "curly") {
        for (let i = 0; i < 11; i++) {
            const a = Math.PI * (0.85 + 1.3 * i / 10);
            hairP.addPath(ellipse(cx + Math.cos(a) * U * 0.5, headC - U * 0.05 + Math.sin(a) * U * 0.52, U * 0.24, U * 0.24));
        }
        hairP.addPath(ellipse(cx, headC - U * 0.3, U * 0.48, U * 0.35));
    }
    lit(ctx, hairP, hair, {sw: U * 0.18, rw: U * 0.1, rim: P.peach, rimA: 0.7});
    ctx.restore();
    if (cap) {
        const capP = new Path2D();
        capP.ellipse(cx, headC - U * 0.25, U * 0.47, U * 0.33, 0, Math.PI, 0);
        capP.lineTo(cx - U * 0.85, headC - U * 0.22);
        capP.closePath();
        lit(ctx, capP, cap, {sw: U * 0.12, rw: U * 0.08});
    }
    if (shades) {
        ctx.fillStyle = "#1e1628";
        ctx.fill(roundRect(cx - U * 0.4, headC - U * 0.12, U * 0.8, U * 0.2, U * 0.08));
        ctx.fillStyle = rgba(P.peach, 0.7);
        ctx.fillRect(cx - U * 0.32, headC - U * 0.1, U * 0.12, U * 0.05);
    }
    return finish(canvas, {inkW: mm(0.09), ink: "#2e1d33"});
}

// =====================================================================
// Small props
// =====================================================================
export function paintLamp(ppm, hMm = 16) {
    const {canvas, ctx, mm, W, H} = sheet(4, hMm + 0.6, ppm);
    const em = sheet(4, hMm + 0.6, ppm);
    const cx = W / 2;
    const pole = roundRect(cx - mm(0.25), mm(2.6), mm(0.5), H - mm(3), mm(0.2));
    lit(ctx, pole, "#4b3f66", {sw: mm(0.2), rw: mm(0.1)});
    const foot = roundRect(cx - mm(0.7), H - mm(1.0), mm(1.4), mm(0.8), mm(0.2));
    lit(ctx, foot, "#4b3f66", {sw: mm(0.3), rw: mm(0.12)});
    const lantern = poly([[cx - mm(1.1), mm(1.0)], [cx + mm(1.1), mm(1.0)], [cx + mm(0.8), mm(2.8)], [cx - mm(0.8), mm(2.8)]]);
    ctx.fillStyle = "#ffe3b0";
    ctx.fill(lantern);
    const capP = poly([[cx - mm(1.4), mm(1.05)], [cx, mm(0.2)], [cx + mm(1.4), mm(1.05)]]);
    lit(ctx, capP, "#4b3f66", {sw: mm(0.25), rw: mm(0.12)});
    em.ctx.fillStyle = "#ffcf8a";
    em.ctx.fill(lantern);
    finish(canvas, {inkW: mm(0.08)});
    return {canvas, emissive: em.canvas};
}

export function paintSurfboard(ppm, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(3.2, 12.5, ppm);
    const colors = [["#7fd6d0", P.pinkHot], ["#ffd36a", "#e2508c"], ["#ff9fc0", "#3fb8b0"], ["#fff6ec", "#5b8cff"]];
    const [a, b] = colors[Math.floor(r() * colors.length)];
    const board = new Path2D();
    board.moveTo(W / 2, mm(0.3));
    board.bezierCurveTo(W - mm(0.2), mm(2.5), W - mm(0.3), H - mm(2.5), W / 2, H - mm(0.4));
    board.bezierCurveTo(mm(0.3), H - mm(2.5), mm(0.2), mm(2.5), W / 2, mm(0.3));
    lit(ctx, board, a, {sw: mm(0.5), rw: mm(0.2)});
    ctx.save();
    ctx.clip(board);
    ctx.fillStyle = b;
    ctx.fillRect(W / 2 - mm(0.25), 0, mm(0.5), H);
    ctx.fillRect(0, H * 0.3, W, mm(0.35));
    ctx.restore();
    return finish(canvas, {inkW: mm(0.08)});
}

// Umbrella canopy (stripes for unrolling the cone, u goes once around)
export function paintUmbrella(ppm, colors) {
    const {canvas, ctx, W, H} = sheet(40, 8, ppm);
    const n = 8;
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(i * W / n, 0, W / n + 1, H);
    }
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "rgba(255,240,220,0.25)"], [0.85, "rgba(0,0,0,0)"], [1, "rgba(60,30,80,0.25)"]]);
    ctx.fillRect(0, 0, W, H);
    grain(ctx, 0.06);
    return canvas;
}

export function paintTowel(ppm, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(6, 11, ppm);
    const sets = [[P.pinkHot, P.white, P.yellow], [P.teal, P.white, "#5b8cff"], ["#ffd36a", P.red, P.white], [P.lav, P.white, P.pinkHot]];
    const cs = sets[Math.floor(r() * sets.length)];
    const stripes = 5 + Math.floor(r() * 4);
    for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = cs[i % cs.length];
        ctx.fillRect(0, i * H / stripes, W, H / stripes + 1);
    }
    ctx.fillStyle = rgba(P.white, 0.8);
    for (let x = 0; x < W; x += mm(0.4)) { ctx.fillRect(x, 0, mm(0.15), mm(0.4)); ctx.fillRect(x, H - mm(0.4), mm(0.15), mm(0.4)); }
    grain(ctx, 0.12);
    return canvas;
}

// Lifeguard tower wall: Miami-style candy-colored stripes
export function paintTowerWall(ppm, wMm, hMm, scheme, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    const n = scheme.length;
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = scheme[i];
        ctx.fillRect(0, i * H / n, W, H / n + 1);
    }
    // window
    const win = roundRect(W * 0.2, H * 0.18, W * 0.6, H * 0.38, mm(0.4));
    ctx.fillStyle = lin(ctx, 0, H * 0.18, 0, H * 0.56, [[0, "#6a5ea6"], [1, "#c3a0d0"]]);
    ctx.fill(win);
    ctx.strokeStyle = P.white;
    ctx.lineWidth = mm(0.3);
    ctx.stroke(win);
    ctx.fillStyle = rgba(P.peach, 0.6);
    ctx.fillRect(W * 0.25, H * 0.22, W * 0.12, H * 0.3);
    if (r() < 0.5) {
        ctx.fillStyle = P.white;
        ctx.font = `700 ${mm(1.3)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(String(5 + Math.floor(r() * 30)) + " ST", W / 2, H * 0.85);
    }
    grain(ctx, 0.08);
    return canvas;
}

export function paintSign(ppm, kind) {
    if (kind === "1A") {
        const {canvas, ctx, mm, W, H} = sheet(4.4, 9, ppm);
        const pole = roundRect(W / 2 - mm(0.2), mm(3.5), mm(0.4), H - mm(3.8), mm(0.1));
        lit(ctx, pole, "#8a87a8", {sw: mm(0.15), rw: mm(0.08)});
        const shield = roundRect(mm(0.3), mm(0.3), W - mm(0.6), mm(3.6), mm(0.4));
        ctx.fillStyle = P.white;
        ctx.fill(shield);
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = mm(0.25);
        ctx.stroke(shield);
        ctx.fillStyle = P.ink;
        ctx.font = `700 ${mm(2.2)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("1A", W / 2, mm(3.05));
        return finish(canvas, {inkW: mm(0.06)});
    }
    throw new Error("unknown sign " + kind);
}
