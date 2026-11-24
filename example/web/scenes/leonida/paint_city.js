// Brushes for the city part: Art Deco hotel, cars, boats, ground, city silhouette, sunset and clouds.
import {rng, lerp, clamp} from "./kit.js";
import {P, sheet, lit, crescent, lin, rad, poly, roundRect, ellipse, grain, finish, mix, rgba, fitFont} from "./paint.js";

// =====================================================================
// Art Deco hotel
// =====================================================================
// spec: {name, font, W, H, floors, ground, wall, trim, accent, neon, glass, lit:[...], windows, pilasters:[x…], stripes, porthole}
function glassFill(ctx, x, y, w, h) {
    return lin(ctx, x, y, x + w * 0.4, y + h, [[0, "#8f86c9"], [0.55, "#c49ac4"], [1, "#f6b79a"]]);
}

function drawWindow(ctx, em, x, y, w, h, spec, litOn, mm) {
    const frame = mm(0.28);
    ctx.fillStyle = spec.trim;
    ctx.fillRect(x - frame, y - frame, w + frame * 2, h + frame * 2);
    if (litOn) {
        ctx.fillStyle = lin(ctx, x, y, x, y + h, [[0, "#ffd9a0"], [1, "#ffb070"]]);
        ctx.fillRect(x, y, w, h);
        em.fillStyle = lin(em, x, y, x, y + h, [[0, "#ffcf8a"], [1, "#ff9f5a"]]);
        em.fillRect(x, y, w, h);
        // curtain silhouettes
        ctx.fillStyle = rgba("#b86a5a", 0.55);
        ctx.fillRect(x, y, w * 0.22, h);
        em.fillStyle = "rgba(0,0,0,0.6)";
        em.fillRect(x, y, w * 0.22, h);
    } else {
        ctx.fillStyle = glassFill(ctx, x, y, w, h);
        ctx.fillRect(x, y, w, h);
        // diagonal streaks of sky reflection
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.fillStyle = rgba("#ffe9d8", 0.35);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.15, y + h);
        ctx.lineTo(x + w * 0.45, y);
        ctx.lineTo(x + w * 0.62, y);
        ctx.lineTo(x + w * 0.32, y + h);
        ctx.fill();
        ctx.restore();
    }
    // mullion
    ctx.fillStyle = spec.trim;
    ctx.fillRect(x + w / 2 - mm(0.1), y, mm(0.2), h);
    ctx.fillRect(x, y + h * 0.42, w, mm(0.18));
    // shadow under the windowsill
    ctx.fillStyle = rgba(P.shadeDeep, 0.35);
    ctx.fillRect(x - frame, y + h + frame, w + frame * 2, mm(0.35));
}

export function paintFacade(spec, ppm, {side = false} = {}) {
    const r = rng(spec.seed ?? 3);
    const W = side ? spec.D : spec.W, H = spec.H;
    const s = sheet(W, H, ppm), e = sheet(W, H, ppm);
    const {ctx, mm} = s, em = e.ctx;
    const px = s.W, py = s.H;
    em.fillStyle = "#000";
    em.fillRect(0, 0, px, py);
    // Wall: bright at the top, slightly darker at the bottom, bright on the left and dark on the right (the sunset comes from the left)
    ctx.fillStyle = spec.wall;
    ctx.fillRect(0, 0, px, py);
    ctx.fillStyle = lin(ctx, 0, 0, px, 0, [[0, rgba("#fff1e0", side ? 0.0 : 0.22)], [1, rgba(P.shadeDeep, side ? 0.28 : 0.1)]]);
    ctx.fillRect(0, 0, px, py);
    ctx.fillStyle = lin(ctx, 0, 0, 0, py, [[0, rgba(P.lavLight, 0.12)], [0.75, "rgba(0,0,0,0)"], [1, rgba(P.shadeDeep, 0.18)]]);
    ctx.fillRect(0, 0, px, py);
    const g = mm(spec.ground);
    const floors = spec.floors;
    const fh = (py - g - mm(spec.cornice ?? 2.2)) / floors;
    const top = py - g - floors * fh;
    // Vertical pilasters
    const pil = side ? [0.0, 1.0] : (spec.pilasters ?? []);
    for (const f of pil) {
        const x = f * px - mm(0.9);
        const band = roundRect(Math.max(0, x), 0, mm(1.8), py - g, 0);
        ctx.fillStyle = mix(spec.wall, "#ffffff", 0.18);
        ctx.fill(band);
        crescent(ctx, band, P.shadeMul, -mm(0.5), 0, 0.6, {mode: "multiply"});
        if (spec.pilasterNeon && !side) neonLine(ctx, em, [[x + mm(0.9), mm(1.5)], [x + mm(0.9), py - g - mm(0.5)]], spec.neon, mm(0.28));
    }
    // Cornice trim line
    ctx.fillStyle = spec.trim;
    ctx.fillRect(0, top - mm(0.9), px, mm(0.55));
    ctx.fillRect(0, top - mm(1.7), px, mm(0.25));
    // Windows on each floor
    const cols = side ? Math.max(1, Math.round(spec.D / 9)) : spec.windows;
    const margin = mm(side ? 2.5 : 3.0);
    const gap = mm(spec.winGap ?? 2.2);
    const ww = (px - margin * 2 - gap * (cols - 1)) / cols;
    for (let f = 0; f < floors; f++) {
        const y0 = top + f * fh;
        const wy = y0 + fh * 0.28, wh = fh * 0.5;
        for (let c = 0; c < cols; c++) {
            const x = margin + c * (ww + gap);
            if (!side && spec.skip?.some(([sf, sc]) => sf === f && sc === c)) continue;
            const on = r() < (spec.litRatio ?? 0.3);
            if (spec.porthole && !side && c === Math.floor(cols / 2) && cols % 2 === 1) {
                const rr = Math.min(ww, wh) * 0.45;
                const port = ellipse(x + ww / 2, wy + wh / 2, rr, rr);
                ctx.fillStyle = spec.trim;
                ctx.fill(ellipse(x + ww / 2, wy + wh / 2, rr + mm(0.35), rr + mm(0.35)));
                ctx.fillStyle = on ? "#ffcf8a" : glassFill(ctx, x, wy, ww, wh);
                ctx.fill(port);
                if (on) { em.fillStyle = "#ffcf8a"; em.fill(port); }
                continue;
            }
            drawWindow(ctx, em, x, wy, ww, wh, spec, on, mm);
            // Shadow of the window-head cornice (the physical cornice also casts a shadow, this prints a crisper one)
            if (!side && spec.eyebrows) {
                ctx.fillStyle = rgba(P.shadeDeep, 0.42);
                ctx.fillRect(x - mm(0.6), wy - mm(0.55), ww + mm(1.2), mm(0.9));
            }
        }
        // Decorative band between floors
        if (spec.stripes && f > 0) {
            ctx.fillStyle = spec.accent;
            for (let k = 0; k < 3; k++) ctx.fillRect(0, y0 + mm(0.25 + k * 0.45), px, mm(0.22));
        }
    }
    // Ground floor: lobby glass + door + sign band
    const gy = py - g;
    ctx.fillStyle = spec.trim;
    ctx.fillRect(0, gy, px, mm(0.8));
    if (!side) {
        const lobbyX = mm(2.2), lobbyW = px - mm(4.4);
        const ly = gy + mm(2.6), lh = g - mm(2.6);
        ctx.fillStyle = lin(ctx, 0, ly, 0, ly + lh, [[0, "#ffd7a3"], [1, "#ff9f6a"]]);
        ctx.fillRect(lobbyX, ly, lobbyW, lh);
        em.fillStyle = lin(em, 0, ly, 0, ly + lh, [[0, "#a87a48"], [1, "#9a5530"]]);
        em.fillRect(lobbyX, ly, lobbyW, lh);
        // Interior silhouettes: chandeliers, people
        ctx.fillStyle = rgba("#7a4a6a", 0.5);
        for (let k = 0; k < 3; k++) {
            const x = lobbyX + lobbyW * (0.2 + 0.3 * k + (r() - 0.5) * 0.1);
            ctx.fillRect(x, ly + lh * 0.35, mm(0.9), lh * 0.65);
            ctx.beginPath();
            ctx.arc(x + mm(0.45), ly + lh * 0.3, mm(0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        // Door frame vertical bars
        ctx.fillStyle = spec.trim;
        for (let k = 0; k <= 6; k++) ctx.fillRect(lobbyX + lobbyW * k / 6 - mm(0.12), ly, mm(0.24), lh);
        em.fillStyle = "#000";
        for (let k = 0; k <= 6; k++) em.fillRect(lobbyX + lobbyW * k / 6 - mm(0.12), ly, mm(0.24), lh);
        // Sign band (above the ground floor): the hotel name
        if (spec.bandName) {
            ctx.fillStyle = spec.accent;
            ctx.fillRect(lobbyX - mm(0.6), gy + mm(0.8), lobbyW + mm(1.2), mm(1.8));
            neonText(ctx, em, spec.bandName, px / 2, gy + mm(2.15), mm(1.45), spec.neon, spec.bandFont ?? "Bahnschrift", "700");
        }
    }
    // Neon line along the top
    if (spec.neonEdge && !side) {
        neonLine(ctx, em, [[mm(0.4), top - mm(1.25)], [px - mm(0.4), top - mm(1.25)]], spec.neon, mm(0.32));
    }
    // A bit of grime at the bottom
    ctx.fillStyle = lin(ctx, 0, py - mm(2.5), 0, py, [[0, "rgba(0,0,0,0)"], [1, rgba("#5a3d58", 0.25)]]);
    ctx.fillRect(0, py - mm(2.5), px, mm(2.5));
    grain(ctx, 0.08);
    return {canvas: s.canvas, emissive: e.canvas};
}

// Neon text: the color layer draws the bright tubes + a halo; the emissive layer draws the tubes themselves
export function neonText(ctx, em, text, x, y, size, color, font = "Bahnschrift", weight = "700", {align = "center", glow = 1, maxW = 0} = {}) {
    size = fitFont(ctx, text, size, maxW, s => `${weight} ${s}px "${font}", Bahnschrift, sans-serif`);
    for (const [c, isEm] of [[ctx, false], [em, true]]) {
        c.save();
        c.font = `${weight} ${size}px "${font}", Bahnschrift, sans-serif`;
        c.textAlign = align;
        c.textBaseline = "alphabetic";
        if (!isEm) {
            c.shadowColor = color;
            c.shadowBlur = size * 0.45 * glow;
            c.fillStyle = mix(color, "#ffffff", 0.55);
        } else {
            c.shadowColor = color;
            c.shadowBlur = size * 0.25 * glow;
            c.fillStyle = mix(color, "#ffffff", 0.35);
        }
        c.fillText(text, x, y);
        c.restore();
    }
}
export function neonLine(ctx, em, pts, color, width) {
    for (const [c, isEm] of [[ctx, false], [em, true]]) {
        c.save();
        c.lineCap = "round";
        c.lineJoin = "round";
        c.shadowColor = color;
        c.shadowBlur = width * (isEm ? 2 : 3);
        c.strokeStyle = mix(color, "#ffffff", isEm ? 0.3 : 0.55);
        c.lineWidth = width;
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.stroke();
        c.restore();
    }
}

// Vertical sign fin: letters stacked vertically
export function paintFin(spec, ppm) {
    const w = spec.finW ?? 6, h = spec.finH;
    const s = sheet(w, h, ppm), e = sheet(w, h, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const body = new Path2D();
    body.moveTo(mm(0.3), H);
    body.lineTo(mm(0.3), mm(2.2));
    body.quadraticCurveTo(mm(0.3), mm(0.3), W / 2, mm(0.3));
    body.quadraticCurveTo(W - mm(0.3), mm(0.3), W - mm(0.3), mm(2.2));
    body.lineTo(W - mm(0.3), H);
    body.closePath();
    lit(ctx, body, spec.finColor ?? spec.trim, {sw: mm(0.8), rw: mm(0.3)});
    const inner = new Path2D();
    inner.moveTo(mm(1.1), H - mm(1));
    inner.lineTo(mm(1.1), mm(2.6));
    inner.quadraticCurveTo(mm(1.1), mm(1.1), W / 2, mm(1.1));
    inner.quadraticCurveTo(W - mm(1.1), mm(1.1), W - mm(1.1), mm(2.6));
    inner.lineTo(W - mm(1.1), H - mm(1));
    inner.closePath();
    ctx.fillStyle = spec.finInner ?? P.ink;
    ctx.fill(inner);
    // Neon border
    for (const [c, isEm] of [[ctx, false], [em, true]]) {
        c.save();
        c.strokeStyle = mix(spec.neon, "#ffffff", 0.4);
        c.shadowColor = spec.neon;
        c.shadowBlur = mm(0.6);
        c.lineWidth = mm(0.25);
        c.stroke(inner);
        c.restore();
    }
    const letters = spec.finText.split("");
    const step = (H - mm(4.2)) / letters.length;
    letters.forEach((ch, i) => {
        neonText(ctx, em, ch, W / 2, mm(3.0) + step * (i + 0.78), Math.min(step * 0.86, (W - mm(2.6)) * 1.25),
            spec.finNeon ?? spec.neon, spec.finFont ?? "Bahnschrift", "700");
    });
    grain(ctx, 0.07);
    return {canvas: s.canvas, emissive: e.canvas};
}

// Stepped parapet / tower on the roof (same color as the facade)
export function paintCrown(spec, ppm) {
    const w = spec.crownW ?? spec.W * 0.5, h = spec.crownH ?? 8;
    const s = sheet(w, h, ppm), e = sheet(w, h, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const steps = spec.crownSteps ?? 3;
    const pts = [[0, H]];
    for (let k = 0; k < steps; k++) {
        const x = (W / 2) * (k / steps), y = H - (H - mm(0.4)) * ((k + 1) / steps);
        pts.push([x, pts.at(-1)[1]], [x, y]);
    }
    const mid = pts.slice(1);
    const right = mid.map(([x, y]) => [W - x, y]).reverse();
    const outline = [[0, H], ...mid.slice(1), ...right.slice(0, -1), [W, H]];
    const body = poly(outline);
    lit(ctx, body, spec.wall, {sw: mm(0.9), rw: mm(0.35)});
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = spec.trim;
    for (let k = 1; k <= steps; k++) {
        const y = H - (H - mm(0.4)) * (k / steps);
        ctx.fillRect(0, y + mm(0.5), W, mm(0.35));
    }
    // Vertical stripe decoration on the central axis
    ctx.fillStyle = spec.accent;
    ctx.fillRect(W / 2 - mm(0.35), mm(0.8), mm(0.7), H);
    ctx.fillRect(W / 2 - mm(1.6), mm(2.0), mm(0.35), H);
    ctx.fillRect(W / 2 + mm(1.25), mm(2.0), mm(0.35), H);
    ctx.restore();
    if (spec.crownNeon) {
        const top = outline.filter(([, y]) => y < H - mm(0.1));
        neonLine(ctx, em, top.map(([x, y]) => [clamp(x, mm(0.3), W - mm(0.3)), y + mm(0.35)]), spec.neon, mm(0.28));
    }
    grain(ctx, 0.07);
    return {canvas: s.canvas, emissive: e.canvas};
}

// Roof (top view): asphalt waterproofing layer + equipment
export function paintRoof(wMm, dMm, ppm, seed, color = "#c9b9cf", {pool = false} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, dMm, ppm);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    // Seams of the waterproof membrane
    ctx.strokeStyle = rgba("#ffffff", 0.18);
    ctx.lineWidth = mm(0.12);
    for (let x = mm(3); x < W; x += mm(3)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.strokeStyle = rgba("#ffffff", 0.35);
    ctx.lineWidth = mm(0.35);
    ctx.strokeRect(mm(0.4), mm(0.4), W - mm(0.8), H - mm(0.8));
    if (pool) {
        // Rooftop pool: wooden deck + teal pool water + two lounge chairs
        const deck = roundRect(mm(3), mm(3), W * 0.62, H * 0.55, mm(0.6));
        ctx.fillStyle = "#d9a98a";
        ctx.fill(deck);
        ctx.strokeStyle = rgba("#8f5f4f", 0.4);
        ctx.lineWidth = mm(0.08);
        for (let y = mm(3.5); y < mm(3) + H * 0.55; y += mm(0.6)) { ctx.beginPath(); ctx.moveTo(mm(3), y); ctx.lineTo(mm(3) + W * 0.62, y); ctx.stroke(); }
        const water = roundRect(mm(4.5), mm(4.5), W * 0.42, H * 0.36, mm(1.2));
        ctx.fillStyle = lin(ctx, 0, mm(4.5), 0, mm(4.5) + H * 0.36, [[0, "#7fe6dc"], [1, "#2fa9c0"]]);
        ctx.fill(water);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = mm(0.35);
        ctx.stroke(water);
        ctx.strokeStyle = rgba("#e8fffb", 0.6);
        ctx.lineWidth = mm(0.12);
        for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            const y = mm(5.5) + k * mm(1.0);
            ctx.moveTo(mm(5.5), y);
            ctx.quadraticCurveTo(mm(5.5) + W * 0.2, y - mm(0.4), mm(4.5) + W * 0.4, y);
            ctx.stroke();
        }
        for (let k = 0; k < 2; k++) {
            const ch = roundRect(mm(5) + W * 0.45, mm(4.5) + k * mm(3.2), mm(1.6), mm(2.6), mm(0.3));
            lit(ctx, ch, k ? P.pinkHot : "#fff6ec", {sw: mm(0.3), rw: mm(0.1)});
        }
    }
    for (let i = 0; i < 3; i++) {
        const b = roundRect(W * 0.7 + r() * (W * 0.3 - mm(5)), r() * (H - mm(4)), mm(2 + r() * 2.5), mm(1.6 + r() * 2), mm(0.3));
        lit(ctx, b, "#8f8aa8", {sw: mm(0.5), rw: mm(0.2)});
        // AC fan grille
        ctx.strokeStyle = rgba("#4a4266", 0.6);
        ctx.lineWidth = mm(0.08);
        ctx.stroke(b);
    }
    grain(ctx, 0.1);
    return canvas;
}

// Skin of the rolled-paper round tower: u wraps around, v runs bottom to top
export function paintTowerSkin(spec, circMm, hMm, ppm) {
    const s = sheet(circMm, hMm, ppm), e = sheet(circMm, hMm, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    ctx.fillStyle = spec.wall;
    ctx.fillRect(0, 0, W, H);
    const floors = spec.floors, g = mm(spec.ground);
    const fh = (H - g - mm(4)) / floors;
    for (let f = 0; f < floors; f++) {
        const y0 = mm(4) + f * fh;
        // Horizontal racing stripes wrapping around
        ctx.fillStyle = spec.accent;
        for (let k = 0; k < 3; k++) ctx.fillRect(0, y0 + fh * 0.12 + mm(k * 0.45), W, mm(0.22));
        // Round windows
        for (let k = 0; k < 6; k++) {
            const cx = (k + 0.5) * W / 6, cy = y0 + fh * 0.58, rr = Math.min(fh * 0.24, mm(2.0));
            ctx.fillStyle = spec.trim;
            ctx.fill(ellipse(cx, cy, rr + mm(0.3), rr + mm(0.3)));
            const on = (k + f) % 3 === 0;
            ctx.fillStyle = on ? "#ffcf8a" : lin(ctx, cx, cy - rr, cx, cy + rr, [[0, "#8f86c9"], [1, "#f6b79a"]]);
            ctx.fill(ellipse(cx, cy, rr, rr));
            if (on) { em.fillStyle = "#ffcf8a"; em.fill(ellipse(cx, cy, rr, rr)); }
        }
    }
    // A ring of neon on top
    neonLine(ctx, em, [[0, mm(1.6)], [W, mm(1.6)]], spec.neon, mm(0.4));
    neonLine(ctx, em, [[0, mm(2.6)], [W, mm(2.6)]], spec.neon, mm(0.25));
    ctx.fillStyle = spec.trim;
    ctx.fillRect(0, H - g, W, mm(0.8));
    grain(ctx, 0.08);
    return {canvas: s.canvas, emissive: e.canvas};
}

// =====================================================================
// Car: side-view standing piece + a folded strip for the car shell
// =====================================================================
export const CARS = {
    muscle: {
        L: 24, Wd: 9,
        body: [[0.4, 1.6], [0.0, 2.6], [0.2, 3.9], [3.8, 4.3], [7.6, 4.6], [10.6, 6.5], [14.6, 6.5], [17.3, 4.6], [22.9, 4.2], [24.0, 3.5], [24.0, 2.2], [23.6, 1.6]],
        wheels: [[4.7, 1.75, 1.75], [19.4, 1.75, 1.75]],
        glass: [[8.3, 4.75], [10.8, 6.2], [14.4, 6.2], [16.6, 4.75]],
        seg: {rear: [0, 2], trunk: [2, 4], rearGlass: [4, 5], roof: [5, 6], wind: [6, 7], hood: [7, 8], nose: [8, 11]},
    },
    sedan: {
        L: 25, Wd: 9.4,
        body: [[0.4, 1.6], [0.0, 2.6], [0.2, 4.4], [4.6, 4.6], [7.4, 6.7], [15.2, 6.8], [17.8, 4.7], [24.0, 4.3], [25.0, 3.6], [25.0, 2.2], [24.6, 1.6]],
        wheels: [[4.9, 1.8, 1.8], [20.2, 1.8, 1.8]],
        glass: [[8.0, 4.85], [9.6, 6.35], [15.0, 6.35], [17.0, 4.85]],
        seg: {rear: [0, 2], trunk: [2, 3], rearGlass: [3, 4], roof: [4, 5], wind: [5, 6], hood: [6, 7], nose: [7, 10]},
    },
    // ---- Modern cars in GTA6 (based on official screenshots: Buffalo STX police car, Vice Beach police black sports car, wide-body muscle car, supercar, SUV) ----
    buffalo: {      // four-door muscle sedan, used for the police car (a Charger type)
        L: 25.5, Wd: 9.8,
        body: [[0.5, 1.5], [0.0, 2.5], [0.1, 4.3], [4.2, 4.6], [7.4, 6.4], [15.6, 6.6], [18.6, 4.8], [24.6, 4.4], [25.5, 3.8], [25.5, 2.0], [25.0, 1.4]],
        wheels: [[5.0, 1.95, 1.95], [20.6, 1.95, 1.95]],
        glass: [[8.0, 4.8], [9.4, 6.15], [15.3, 6.25], [17.9, 4.9]],
        seg: {rear: [0, 2], trunk: [2, 3], rearGlass: [3, 4], roof: [4, 5], wind: [5, 6], hood: [6, 7], nose: [7, 10]},
    },
    supercar: {     // wedge-shaped mid-engine supercar
        L: 25, Wd: 10.2,
        body: [[0.3, 1.3], [0.0, 2.6], [0.6, 3.9], [6.0, 4.3], [9.0, 5.3], [13.6, 5.3], [19.5, 3.3], [24.3, 2.7], [25.0, 2.2], [25.0, 1.5], [24.4, 1.1]],
        wheels: [[4.4, 1.8, 1.8], [20.2, 1.75, 1.75]],
        glass: [[8.6, 4.45], [9.7, 5.12], [13.4, 5.12], [17.4, 3.75]],
        seg: {rear: [0, 2], trunk: [2, 3], rearGlass: [3, 4], roof: [4, 5], wind: [5, 6], hood: [6, 7], nose: [7, 10]},
    },
    widebody: {     // two-door wide-body muscle car (a Challenger type), the one at the car meet
        L: 25, Wd: 10.4,
        body: [[0.4, 1.5], [0.0, 2.7], [0.2, 4.2], [5.0, 4.5], [8.4, 6.3], [14.8, 6.4], [17.6, 4.6], [24.2, 4.3], [25.0, 3.6], [25.0, 2.0], [24.6, 1.4]],
        wheels: [[4.9, 1.95, 1.95], [20.1, 1.95, 1.95]],
        glass: [[8.9, 4.7], [9.9, 6.05], [14.6, 6.1], [16.9, 4.75]],
        seg: {rear: [0, 2], trunk: [2, 3], rearGlass: [3, 4], roof: [4, 5], wind: [5, 6], hood: [6, 7], nose: [7, 10]},
    },
    suv: {          // large luxury SUV
        L: 26, Wd: 10.4,
        body: [[0.4, 1.8], [0.0, 3.0], [0.2, 7.6], [1.4, 8.3], [16.8, 8.4], [19.6, 6.0], [25.0, 5.6], [26.0, 4.8], [26.0, 2.4], [25.6, 1.8]],
        wheels: [[5.0, 2.15, 2.15], [21.0, 2.15, 2.15]],
        glass: [[2.0, 6.0], [2.2, 7.85], [16.4, 7.95], [18.8, 6.05]],
        seg: {rear: [0, 2], roof: [2, 4], wind: [4, 5], hood: [5, 6], nose: [6, 9]},
    },
    pickup: {       // full-size pickup (Grassrivers_04, Port_Gellhorn_05): the back is an open cargo bed
        L: 26, Wd: 10.2,
        body: [[0.4, 1.8], [0.0, 3.0], [0.1, 5.2], [10.4, 5.2], [10.8, 8.0], [11.4, 8.4], [16.0, 8.4], [18.2, 5.9], [25.0, 5.5], [26.0, 4.7], [26.0, 2.4], [25.6, 1.8]],
        wheels: [[5.0, 2.2, 2.2], [21.0, 2.2, 2.2]],
        glass: [[11.7, 5.9], [11.95, 7.9], [15.7, 7.9], [17.6, 5.95]],
        seg: {rear: [0, 2], bed: [2, 3], rearGlass: [3, 5], roof: [5, 6], wind: [6, 7], hood: [7, 8], nose: [8, 11]},
    },
    // Mud-bog monster pickup (the modified monster truck of the Thrillbilly Mud Club in T1): body raised by 3.4, wheels a size bigger
    mudtruck: {
        L: 27, Wd: 11,
        body: [[0.4, 5.2], [0.0, 6.4], [0.1, 8.6], [10.8, 8.6], [11.2, 11.4], [11.8, 11.8], [16.6, 11.8], [18.8, 9.3], [25.9, 8.9], [27.0, 8.1], [27.0, 5.8], [26.6, 5.2]],
        wheels: [[5.4, 3.7, 3.7], [21.6, 3.7, 3.7]],
        glass: [[12.1, 9.3], [12.35, 11.3], [16.3, 11.3], [18.2, 9.35]],
        seg: {rear: [0, 2], bed: [2, 3], rearGlass: [3, 5], roof: [5, 6], wind: [6, 7], hood: [7, 8], nose: [8, 11]},
        knobby: true,
    },
    convertible: {
        L: 25, Wd: 9.4,
        body: [[0.4, 1.6], [0.0, 2.8], [0.6, 4.3], [9.0, 4.3], [9.4, 3.7], [15.4, 3.7], [16.0, 4.3], [16.6, 5.9], [17.2, 5.9], [18.0, 4.3], [23.8, 4.0], [25.0, 3.3], [25.0, 2.1], [24.6, 1.6]],
        wheels: [[4.9, 1.8, 1.8], [20.2, 1.8, 1.8]],
        glass: null,
        seg: {rear: [0, 2], trunk: [2, 3], cabin: [3, 6], wind: [6, 9], hood: [9, 10], nose: [10, 13]},
    },
};

// The other side of the car is mirrored: the text has to be written backwards on the canvas first, so it reads correctly after mirroring
function sideText(ctx, text, x, y, mirror) {
    if (!mirror) { ctx.fillText(text, x, y); return; }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
}
export function paintCarSide(type, ppm, c) {
    const m = CARS[type];
    const pad = 0.6;
    const hMm = Math.max(7.4, Math.max(...m.body.map(p => p[1])) + 0.3);   // the roofs of SUVs and pickups are higher than 7.4, so the canvas is made taller to match, otherwise the roof gets cut off
    const s = sheet(m.L + pad * 2, hMm + pad, ppm), e = sheet(m.L + pad * 2, hMm + pad, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const X = x => mm(x + pad), Y = z => H - mm(z);
    const body = poly(m.body.map(([x, z]) => [X(x), Y(z)]));
    ctx.fillStyle = lin(ctx, 0, Y(6.8), 0, Y(1.4), [[0, mix(c.body, "#ffffff", 0.25)], [0.45, c.body], [1, mix(c.body, P.shadeDeep, 0.45)]]);
    ctx.fill(body);
    lit(ctx, body, null, {fill: false, sw: mm(0.9), rw: mm(0.25), shadeA: 0.6, dir: [0.3, 1]});
    ctx.save();
    ctx.clip(body);
    // Beltline highlight
    ctx.fillStyle = rgba(P.peachLight, 0.75);
    ctx.fillRect(0, Y(4.05), W, mm(0.18));
    ctx.fillStyle = rgba(P.shadeDeep, 0.35);
    ctx.fillRect(0, Y(3.85), W, mm(0.25));
    // Stripes
    if (c.stripe) {
        ctx.fillStyle = c.stripe;
        ctx.fillRect(0, Y(c.stripeZ ?? 2.9), W, mm(c.stripeH ?? 0.7));
    }
    // Door seams, handles
    ctx.strokeStyle = rgba(P.ink, 0.55);
    ctx.lineWidth = mm(0.07);
    const doorX = m.glass ? m.glass[0][0] - 0.2 : 9.5, doorX2 = m.glass ? m.glass[3][0] - 1.5 : 15.6;
    ctx.beginPath();
    ctx.moveTo(X(doorX), Y(4.5));
    ctx.lineTo(X(doorX + 0.2), Y(1.9));
    ctx.moveTo(X(doorX2), Y(4.5));
    ctx.lineTo(X(doorX2), Y(1.9));
    ctx.stroke();
    ctx.fillStyle = rgba(P.ink, 0.6);
    ctx.fillRect(X(doorX2 - 1.4), Y(3.7), mm(0.8), mm(0.16));
    // ---- Livery ----
    if (c.livery === "police") {
        // Leonida police car: white body + dark green diagonal band (low at the front, high at the back) + gold police star
        ctx.fillStyle = "#1f5a3e";
        ctx.beginPath();
        ctx.moveTo(X(m.L), Y(2.4));
        ctx.lineTo(X(m.L), Y(3.5));
        ctx.bezierCurveTo(X(m.L * 0.6), Y(3.6), X(m.L * 0.35), Y(4.4), X(0), Y(4.3));
        ctx.lineTo(X(0), Y(3.2));
        ctx.bezierCurveTo(X(m.L * 0.35), Y(3.3), X(m.L * 0.6), Y(2.5), X(m.L), Y(2.4));
        ctx.fill();
        ctx.fillStyle = "#e9c75a";
        ctx.beginPath();
        ctx.moveTo(X(m.L), Y(3.6)); ctx.bezierCurveTo(X(m.L * 0.6), Y(3.7), X(m.L * 0.35), Y(4.5), X(0), Y(4.42));
        ctx.lineTo(X(0), Y(4.32)); ctx.bezierCurveTo(X(m.L * 0.35), Y(4.4), X(m.L * 0.6), Y(3.6), X(m.L), Y(3.5));
        ctx.fill();
        // Police star
        const sx = X(m.L * 0.62), sy = Y(3.1), sr = mm(0.85);
        ctx.fillStyle = "#f0c64a";
        ctx.beginPath();
        for (let k = 0; k < 12; k++) {
            const a = -Math.PI / 2 + k * Math.PI / 6, rr = k % 2 ? sr * 0.5 : sr;
            ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
        }
        ctx.fill();
        ctx.fillStyle = "#1f5a3e";
        ctx.font = `800 ${mm(0.75)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        sideText(ctx, "POLICE", X(m.L * 0.38), Y(2.6), c.mirrorText);
    } else if (c.livery === "vbpd") {
        ctx.fillStyle = "#ffffff";
        ctx.font = `800 ${mm(0.8)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        sideText(ctx, "VICE BEACH POLICE", X(m.L * 0.5), Y(2.7), c.mirrorText);
        ctx.fillStyle = "#5b8cff";
        ctx.fillRect(X(1.2), Y(3.55), X(m.L - 1.2) - X(1.2), mm(0.18));
        ctx.fillStyle = "#ffffff";
        ctx.font = `800 ${mm(0.9)}px Bahnschrift, sans-serif`;
        sideText(ctx, "911", X(m.L * 0.14), Y(2.9), c.mirrorText);
    } else if (c.livery === "wrap") {
        // Graffiti decals on the car at the car meet: big color blocks + black-and-white sprayed lettering
        const r = rng(c.seed ?? 5);
        for (let k = 0; k < 9; k++) {
            ctx.fillStyle = [c.wrap1 ?? "#8a3ad0", c.wrap2 ?? "#ffffff", "#2a1b2c"][k % 3];
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            const x0 = X(r() * m.L), y0 = Y(1.8 + r() * 3);
            ctx.moveTo(x0, y0);
            for (let q = 0; q < 4; q++) ctx.lineTo(x0 + (r() - 0.3) * mm(6), y0 + (r() - 0.5) * mm(2.4));
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#2a1b2c";
        ctx.lineWidth = mm(0.22);
        ctx.lineCap = "round";
        for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            const x0 = X(2 + r() * (m.L - 6)), y0 = Y(2.4 + r() * 1.6);
            ctx.moveTo(x0, y0);
            ctx.bezierCurveTo(x0 + mm(1), y0 - mm(1.2), x0 + mm(2), y0 + mm(0.8), x0 + mm(3.2), y0 - mm(0.4));
            ctx.stroke();
        }
    } else if (c.livery === "supercar") {
        // Side air intake and black lower skirt
        ctx.fillStyle = "#1e1628";
        ctx.beginPath();
        ctx.moveTo(X(5.6), Y(3.6)); ctx.lineTo(X(9.2), Y(3.9)); ctx.lineTo(X(8.6), Y(2.3)); ctx.lineTo(X(6.4), Y(2.1));
        ctx.fill();
        ctx.fillRect(X(6), Y(1.5), X(19) - X(6), mm(0.5));
    }
    if (c.text) {
        ctx.fillStyle = c.textColor ?? P.ink;
        ctx.font = `700 ${mm(1.05)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        sideText(ctx, c.text, X((doorX + doorX2) / 2 + 0.3), Y(2.3), c.mirrorText);
    }
    ctx.restore();
    // Windows
    if (m.glass) {
        const g = poly(m.glass.map(([x, z]) => [X(x), Y(z)]));
        ctx.fillStyle = lin(ctx, X(m.glass[0][0]), Y(6.3), X(m.glass[3][0]), Y(4.7), [[0, "#4a3f72"], [0.6, "#8a6fa8"], [1, "#e7a58f"]]);
        ctx.fill(g);
        ctx.strokeStyle = c.chrome ?? "#e9e4f4";
        ctx.lineWidth = mm(0.22);
        ctx.stroke(g);
        ctx.save();
        ctx.clip(g);
        ctx.fillStyle = rgba("#ffe4d0", 0.4);
        ctx.beginPath();
        const gx = X(m.glass[1][0] + 1.2);
        ctx.moveTo(gx, Y(6.4));
        ctx.lineTo(gx + mm(1.2), Y(6.4));
        ctx.lineTo(gx - mm(0.6), Y(4.6));
        ctx.lineTo(gx - mm(1.8), Y(4.6));
        ctx.fill();
        ctx.restore();
        // B pillar
        ctx.fillStyle = mix(c.body, P.ink, 0.5);
        const bx = (m.glass[1][0] + m.glass[2][0]) / 2 + 0.4;
        ctx.fillRect(X(bx), Y(6.3), mm(0.4), mm(1.55));
    } else {
        // Convertible: seat headrests
        for (const x of [10.2, 13.4]) {
            const seat = roundRect(X(x), Y(5.1), mm(1.6), mm(1.4), mm(0.5));
            lit(ctx, seat, c.seat ?? P.white, {sw: mm(0.4), rw: mm(0.15)});
        }
    }
    // Chrome bumpers, taillights, headlights
    ctx.fillStyle = c.chrome ?? "#e9e4f4";
    ctx.fillRect(X(-0.1), Y(2.35), mm(1.3), mm(0.45));
    ctx.fillRect(X(m.L - 1.2), Y(2.35), mm(1.3), mm(0.45));
    ctx.fillStyle = "#ff3a4a";
    ctx.fillRect(X(0.05), Y(3.7), mm(0.7), mm(0.45));
    em.fillStyle = "#ff2a3a";
    em.fillRect(X(0.05), Y(3.7), mm(0.7), mm(0.45));
    ctx.fillStyle = "#fff4cf";
    ctx.fillRect(X(m.L - 0.75), Y(3.6), mm(0.7), mm(0.45));
    em.fillStyle = "#fff1c0";
    em.fillRect(X(m.L - 0.75), Y(3.6), mm(0.7), mm(0.45));
    // Wheel arch shadow + wheels
    for (const [wx, wz, wr] of m.wheels) {
        const arch = ellipse(X(wx), Y(wz), mm(wr + 0.35), mm(wr + 0.35));
        ctx.fillStyle = mix(c.body, P.ink, 0.7);
        ctx.fill(arch);
        const tire = ellipse(X(wx), Y(wz), mm(wr), mm(wr));
        lit(ctx, tire, "#2b2233", {sw: mm(0.3), rw: mm(0.12), rim: "#7a6a8a"});
        if (m.knobby) {   // tread blocks of the off-road tires
            ctx.fillStyle = "#3e3448";
            for (let k = 0; k < 16; k++) {
                const a = k * Math.PI * 2 / 16;
                ctx.save(); ctx.translate(X(wx) + Math.cos(a) * mm(wr * 0.9), Y(wz) + Math.sin(a) * mm(wr * 0.9)); ctx.rotate(a);
                ctx.fillRect(-mm(0.35), -mm(0.4), mm(0.7), mm(0.8)); ctx.restore();
            }
        }
        // Modern big rims: low-profile tires, ten spokes
        const rr = c.modern ? 0.74 : 0.58;
        const rim = ellipse(X(wx), Y(wz), mm(wr * rr), mm(wr * rr));
        ctx.fillStyle = rad(ctx, X(wx) - mm(0.3), Y(wz) - mm(0.3), 0, mm(wr * 0.8), [[0, "#ffffff"], [0.6, c.rim ?? "#c9c3dc"], [1, "#6e6488"]]);
        ctx.fill(rim);
        ctx.strokeStyle = c.modern ? rgba(c.spoke ?? "#2a2236", 0.9) : rgba("#3a2e48", 0.8);
        ctx.lineWidth = mm(c.modern ? 0.16 : 0.13);
        const n = c.modern ? 10 : 5;
        for (let k = 0; k < n; k++) {
            const a = k * Math.PI * 2 / n;
            ctx.beginPath();
            ctx.moveTo(X(wx), Y(wz));
            ctx.lineTo(X(wx) + Math.cos(a) * mm(wr * rr * 0.95), Y(wz) + Math.sin(a) * mm(wr * rr * 0.95));
            ctx.stroke();
        }
        if (c.modern) {
            ctx.fillStyle = c.caliper ?? "#d8343f";
            ctx.fillRect(X(wx) + mm(wr * 0.25), Y(wz) - mm(wr * 0.45), mm(wr * 0.22), mm(wr * 0.5));
            ctx.fillStyle = "#2a2236";
            ctx.fill(ellipse(X(wx), Y(wz), mm(wr * 0.16), mm(wr * 0.16)));
        }
    }
    // Mud: the lower half splattered with brown mud spots (only lands on already-painted areas)
    if (c.mud) {
        const r = rng((c.seed ?? 3) + 77);
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        for (let i = 0; i < 160; i++) {
            const x = r() * W, z = Math.pow(r(), 1.6) * (Math.max(...m.body.map(p => p[1])) * 0.75);
            ctx.fillStyle = rgba(r() < 0.6 ? "#7a5a3a" : "#5a4030", 0.55 + r() * 0.4);
            ctx.beginPath(); ctx.ellipse(x, Y(z), mm(0.3 + r() * 1.4), mm(0.2 + r() * 0.8), r() * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    finish(s.canvas, {inkW: mm(0.08), ink: "#2a1b2c"});
    return {canvas: s.canvas, emissive: e.canvas, pad};
}

// Car shell: a folded strip along the top edge of the body, u = arc length, v = car width
export function carShellLayout(type) {
    const m = CARS[type];
    const pts = m.body;
    const arc = [0];
    for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return {pts, arc, total: arc.at(-1)};
}

export function paintCarShell(type, ppm, c) {
    const m = CARS[type];
    const {arc, total} = carShellLayout(type);
    const s = sheet(total, m.Wd, ppm), e = sheet(total, m.Wd, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const U = i => (arc[i] / total) * W;
    const segRect = ([a, b]) => [U(a), U(b) - U(a)];
    ctx.fillStyle = c.body;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, rgba("#ffffff", 0.22)], [0.5, "rgba(0,0,0,0)"], [1, rgba(P.shadeDeep, 0.3)]]);
    ctx.fillRect(0, 0, W, H);
    const glass = ([x, w]) => {
        ctx.fillStyle = lin(ctx, x, 0, x + w, H, [[0, "#3f3566"], [0.5, "#8d72aa"], [1, "#efae94"]]);
        ctx.fillRect(x + mm(0.3), mm(0.5), w - mm(0.6), H - mm(1));
        ctx.fillStyle = rgba("#ffe4d0", 0.35);
        ctx.fillRect(x + w * 0.3, mm(0.6), w * 0.15, H - mm(1.2));
    };
    if (m.seg.rearGlass) glass(segRect(m.seg.rearGlass));
    if (m.seg.wind) glass(segRect(m.seg.wind));
    if (m.seg.bed) {   // pickup cargo bed: dark liner + transverse reinforcing ribs, with a cooler casually tossed in the bed
        const [x, w] = segRect(m.seg.bed);
        ctx.fillStyle = "#2e2838";
        ctx.fillRect(x + mm(0.3), mm(0.8), w - mm(0.6), H - mm(1.6));
        ctx.fillStyle = rgba("#6a6080", 0.6);
        for (let k = 1; k < 8; k++) ctx.fillRect(x + w * k / 8, mm(0.9), mm(0.18), H - mm(1.8));
        if (c.cargo) {
            lit(ctx, roundRect(x + w * 0.55, H * 0.25, w * 0.25, H * 0.32, mm(0.3)), c.cargo, {sw: mm(0.4), rw: mm(0.15)});
        }
    }
    if (m.seg.cabin) {
        const [x, w] = segRect(m.seg.cabin);
        ctx.fillStyle = c.interior ?? "#f4e6d8";
        ctx.fillRect(x, mm(0.7), w, H - mm(1.4));
        for (const f of [0.25, 0.62]) {
            const seat = roundRect(x + w * f, mm(1.0), w * 0.24, H - mm(2), mm(0.5));
            lit(ctx, seat, c.seat ?? P.white, {sw: mm(0.4), rw: mm(0.15)});
        }
    }
    if (c.roof && m.seg.roof) {
        const [x, w] = segRect(m.seg.roof);
        ctx.fillStyle = c.roof;
        ctx.fillRect(x, 0, w, H);
    }
    if (c.stripes) {
        ctx.fillStyle = c.stripes;
        const sw = H * 0.12;
        for (const seg of ["trunk", "roof", "hood"]) {
            if (!m.seg[seg]) continue;
            const [x, w] = segRect(m.seg[seg]);
            ctx.fillRect(x, H / 2 - sw * 1.4, w, sw);
            ctx.fillRect(x, H / 2 + sw * 0.4, w, sw);
        }
    }
    // Rear: taillights + license plate
    {
        const [x, w] = segRect(m.seg.rear);
        ctx.fillStyle = "#ff3a4a";
        em.fillStyle = "#ff2a3a";
        for (const y of [mm(0.6), H - mm(2.4)]) { ctx.fillRect(x + w * 0.45, y, w * 0.4, mm(1.8)); em.fillRect(x + w * 0.45, y, w * 0.4, mm(1.8)); }
        ctx.fillStyle = "#f8f0d8";
        ctx.fillRect(x + w * 0.1, H / 2 - mm(1.2), w * 0.3, mm(2.4));
    }
    // Front: grille + headlights + bumper
    {
        const [x, w] = segRect(m.seg.nose);
        ctx.fillStyle = "#2a2236";
        ctx.fillRect(x + w * 0.1, mm(1.2), w * 0.55, H - mm(2.4));
        ctx.strokeStyle = "#b9b2cc";
        ctx.lineWidth = mm(0.08);
        for (let k = 1; k < 6; k++) {
            ctx.beginPath();
            ctx.moveTo(x + w * 0.1 + k * w * 0.55 / 6, mm(1.2));
            ctx.lineTo(x + w * 0.1 + k * w * 0.55 / 6, H - mm(1.2));
            ctx.stroke();
        }
        for (const y of [mm(1.6), H - mm(1.6)]) {
            // modern cars: slim LED light bars; old cars: round lights
            const lamp = c.modern ? roundRect(x + w * 0.05, y - mm(0.9), w * 0.18, mm(1.8), mm(0.2)) : ellipse(x + w * 0.38, y, w * 0.2, mm(0.65));
            ctx.fillStyle = c.modern ? "#eaf6ff" : "#fff6d8";
            ctx.fill(lamp);
            em.fillStyle = c.modern ? "#dff0ff" : "#fff1c0";
            em.fill(lamp);
        }
        ctx.fillStyle = c.modern ? "#1e1628" : "#e9e4f4";
        ctx.fillRect(x + w * 0.72, 0, w * 0.2, H);
        if (c.pushbar) {   // police push bar at the front
            ctx.fillStyle = "#1e1628";
            ctx.fillRect(x + w * 0.55, mm(1.2), w * 0.12, H - mm(2.4));
        }
    }
    if (c.lightbar && m.seg.roof) {
        // a bit of roof-color band printed on; the real light bar is a separate piece
        const [x, w] = segRect(m.seg.roof);
        ctx.fillStyle = "#263c63";
        ctx.fillRect(x + w * 0.3, 0, w * 0.4, H);
        ctx.fillStyle = P.white;
        ctx.font = `700 ${mm(1.6)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(x + w * 0.5, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("27", 0, mm(0.55));
        ctx.restore();
    }
    grain(ctx, 0.07);
    return {canvas: s.canvas, emissive: e.canvas};
}

// =====================================================================
// Ground
// =====================================================================
export function paintOcean(wMm, hMm, ppm, seed, {glitter = [0.35, 0.0]} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    // Top = shore (shallow, teal), bottom = open sea (deep, indigo, reflecting lavender)
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#72dccf"], [0.18, "#4fc2c4"], [0.45, "#3f99be"], [0.75, "#4a74b4"], [1, "#5a62a8"]]);
    ctx.fillRect(0, 0, W, H);
    // Color patches in the shallows
    for (let i = 0; i < 40; i++) {
        const x = r() * W, y = r() * H * 0.3;
        ctx.fillStyle = rgba("#9eeadf", 0.18 + r() * 0.15);
        ctx.beginPath();
        ctx.ellipse(x, y, mm(6 + r() * 16), mm(2 + r() * 4), (r() - 0.5) * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    // A warm streak of the setting sun on the water
    const gx = W * glitter[0];
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 900; i++) {
        const y = r() * H;
        const spread = mm(8 + 26 * (y / H));
        const x = gx + (r() + r() + r() - 1.5) * spread;
        const l = mm(1.2 + r() * 3.2);
        ctx.fillStyle = rgba(r() < 0.5 ? "#ffc89a" : "#ff9fb8", 0.25 + r() * 0.4);
        ctx.fillRect(x, y, l, mm(0.25 + r() * 0.2));
    }
    ctx.restore();
    // Short ripple lines
    ctx.lineCap = "round";
    for (let i = 0; i < 1500; i++) {
        const x = r() * W, y = r() * H;
        const l = mm(1.5 + r() * 4);
        const light = r() < 0.55;
        ctx.strokeStyle = light ? rgba("#d9fff6", 0.35 + 0.3 * (1 - y / H)) : rgba("#2f4f8f", 0.3);
        ctx.lineWidth = mm(0.18 + r() * 0.12);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + l / 2, y - mm(0.5), x + l, y);
        ctx.stroke();
    }
    grain(ctx, 0.08, 2);
    return canvas;
}

export function paintSand(wMm, hMm, ppm, seed, {label = null} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    // Bottom = toward the sea (wet sand), top = dry sand
    ctx.fillStyle = lin(ctx, 0, H, 0, 0, [[0, "#d7ad9c"], [0.12, "#e9c2a8"], [0.3, "#f6d6b2"], [1, "#f8dfbd"]]);
    ctx.fillRect(0, 0, W, H);
    // Parallel rake marks on the sand (Miami Beach is raked every day at dawn)
    ctx.strokeStyle = rgba("#d9aa95", 0.28);
    ctx.lineWidth = mm(0.25);
    for (let y = mm(2); y < H * 0.85; y += mm(1.4)) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += mm(6)) ctx.lineTo(x, y + Math.sin(x / mm(17) + y) * mm(0.3));
        ctx.stroke();
    }
    // Footprints
    for (let t = 0; t < 7; t++) {
        let x = r() * W, y = H * (0.2 + 0.7 * r());
        const a = (r() - 0.5) * 2.4;
        for (let k = 0; k < 18; k++) {
            x += Math.cos(a) * mm(1.6);
            y += Math.sin(a) * mm(1.6);
            ctx.fillStyle = rgba("#b88f99", 0.35);
            ctx.beginPath();
            ctx.ellipse(x + (k % 2 ? mm(0.45) : -mm(0.45)) * Math.sin(a), y, mm(0.32), mm(0.5), a, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Shells, seaweed
    for (let i = 0; i < 160; i++) {
        const x = r() * W, y = H * (0.75 + 0.25 * r());
        ctx.fillStyle = r() < 0.5 ? rgba("#fff3e6", 0.8) : rgba("#b97d8a", 0.6);
        ctx.beginPath();
        ctx.ellipse(x, y, mm(0.25 + r() * 0.3), mm(0.18), r() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    // Lifeguard vehicle tracks
    ctx.strokeStyle = rgba("#c29a92", 0.35);
    ctx.lineWidth = mm(0.5);
    ctx.setLineDash([mm(0.6), mm(0.4)]);
    for (const off of [0, mm(2.6)]) {
        ctx.beginPath();
        ctx.moveTo(0, H * 0.55 + off);
        ctx.bezierCurveTo(W * 0.3, H * 0.45 + off, W * 0.6, H * 0.7 + off, W, H * 0.5 + off);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    if (label) mapLabel(ctx, label, W * 0.5, H * 0.48, mm(7.5), mm);
    grain(ctx, 0.1, 2);
    return canvas;
}

// Place names on the tourist map: white condensed capitals + dark blue outline + drop shadow (signature: the base plate is the Leonida map)
export function mapLabel(ctx, text, x, y, size, mm, {color = "#ffffff", stroke = "#2f5f8f", tracking = 0.08} = {}) {
    ctx.save();
    ctx.font = `700 ${size}px "Bahnschrift Condensed", "Bahnschrift", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${size * tracking}px`;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = rgba("#3b2a55", 0.35);
    ctx.fillText(text, x + mm(0.5), y + mm(0.6));
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
}

export function paintLawn(wMm, hMm, ppm, seed, {path = true} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = "#79b585";
    ctx.fillRect(0, 0, W, H);
    // Mowing stripes
    for (let x = 0; x < W; x += mm(5)) {
        ctx.fillStyle = (Math.round(x / mm(5)) % 2) ? rgba("#9fd09a", 0.35) : rgba("#4f8f74", 0.18);
        ctx.fillRect(x, 0, mm(5), H);
    }
    for (let i = 0; i < 1400; i++) {
        ctx.strokeStyle = r() < 0.5 ? rgba("#3f7a6a", 0.4) : rgba("#c9e7a0", 0.45);
        ctx.lineWidth = mm(0.12);
        const x = r() * W, y = r() * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + mm((r() - 0.5) * 0.6), y - mm(0.5 + r() * 0.5));
        ctx.stroke();
    }
    if (path) {
        // Winding footpath (pink paving)
        const pathY = x => H * 0.5 + Math.sin(x / mm(38)) * H * 0.2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#e9b8b4";
        ctx.lineWidth = mm(6.5);
        ctx.beginPath();
        for (let x = -mm(5); x <= W + mm(5); x += mm(2)) (x < 0 ? ctx.moveTo(x, pathY(x)) : ctx.lineTo(x, pathY(x)));
        ctx.stroke();
        ctx.strokeStyle = rgba("#ffffff", 0.45);
        ctx.lineWidth = mm(0.25);
        ctx.setLineDash([mm(1.1), mm(1.1)]);
        ctx.beginPath();
        for (let x = -mm(5); x <= W + mm(5); x += mm(2)) (x < 0 ? ctx.moveTo(x, pathY(x)) : ctx.lineTo(x, pathY(x)));
        ctx.stroke();
        ctx.setLineDash([]);
        for (const off of [-mm(3.25), mm(3.25)]) {
            ctx.strokeStyle = rgba("#c98f99", 0.8);
            ctx.lineWidth = mm(0.35);
            ctx.beginPath();
            for (let x = -mm(5); x <= W + mm(5); x += mm(2)) (x < 0 ? ctx.moveTo(x, pathY(x) + off) : ctx.lineTo(x, pathY(x) + off));
            ctx.stroke();
        }
    }
    grain(ctx, 0.1, 2);
    return canvas;
}

export function paintRoad(wMm, hMm, ppm, seed, {crosswalks = [], label = null, labelY = 0.27, lines = null, parkDepth = null} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, "#7a7092"], [1, "#655f82"]]);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = r() < 0.5 ? rgba("#9d94b8", 0.35) : rgba("#4a4266", 0.35);
        ctx.fillRect(r() * W, r() * H, mm(0.15), mm(0.15));
    }
    // Lane lines: by default "double yellow line + white edge lines on both sides"; when lines is given they are drawn per the config (y is a ratio from the canvas top edge)
    const lineSet = lines ?? [{y: 0.5, kind: "yellow2"}, {y: mm(1.15) / H, kind: "white"}, {y: 1 - mm(1.15) / H, kind: "white"}];
    for (const {y: f, kind} of lineSet) {
        const y = f * H;
        if (kind === "yellow2") {
            ctx.fillStyle = "#f5c86a";
            ctx.fillRect(0, y - mm(0.5), W, mm(0.3));
            ctx.fillRect(0, y + mm(0.2), W, mm(0.3));
        } else if (kind === "white") {
            ctx.fillStyle = rgba("#ffffff", 0.85);
            ctx.fillRect(0, y - mm(0.15), W, mm(0.3));
        } else if (kind === "park") {   // roadside parking: one solid white line + a short line every car length
            ctx.fillStyle = rgba("#ffffff", 0.8);
            ctx.fillRect(0, y - mm(0.12), W, mm(0.24));
            for (let x = mm(8); x < W; x += mm(30)) ctx.fillRect(x, y, mm(0.24), (parkDepth ?? 0.2) * H);
        }
    }
    for (const cx of crosswalks) {
        for (let y = mm(1.6); y < H - mm(1.6); y += mm(1.5)) {
            ctx.fillStyle = rgba("#ffffff", 0.85);
            ctx.fillRect(cx * W - mm(3), y, mm(6), mm(0.8));
        }
    }
    // Map-style street names (signature: the base plate is the Leonida map)
    if (label) for (let x = mm(60); x < W; x += mm(170)) mapLabel(ctx, label, x, H * labelY, mm(3.2), mm, {stroke: "#4a3f6a"});
    // Patches and oil stains
    for (let i = 0; i < 14; i++) {
        ctx.fillStyle = rgba("#4a4266", 0.25);
        ctx.beginPath();
        ctx.ellipse(r() * W, r() * H, mm(1 + r() * 3), mm(0.6 + r()), r(), 0, Math.PI * 2);
        ctx.fill();
    }
    grain(ctx, 0.1, 2);
    return canvas;
}

export function paintPavement(wMm, hMm, ppm, seed, {tile = 2.4, base = "#f1d7cf", line = "#d8b2b5"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = line;
    ctx.lineWidth = mm(0.12);
    for (let x = 0; x < W; x += mm(tile)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += mm(tile)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = 0; i < 200; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? "#ffffff" : "#b99aa6", 0.25);
        ctx.fillRect(r() * W, r() * H, mm(tile), mm(tile));
    }
    grain(ctx, 0.1, 2);
    return canvas;
}

// Distant city blocks (map print: street grid + rooftop blocks), as an underlay for the skyline silhouette
export function paintCityGround(wMm, hMm, ppm, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = "#cdb3cf";
    ctx.fillRect(0, 0, W, H);
    const block = mm(16), street = mm(3);
    for (let y = 0; y < H; y += block + street) {
        for (let x = 0; x < W; x += block + street) {
            ctx.fillStyle = mix("#e7cbd6", "#bfaee0", r());
            ctx.fillRect(x, y, block, block);
            for (let k = 0; k < 4; k++) {
                ctx.fillStyle = rgba(r() < 0.5 ? "#9c8dd9" : "#f3b8cf", 0.6);
                ctx.fillRect(x + r() * block * 0.6, y + r() * block * 0.6, block * (0.2 + r() * 0.3), block * (0.2 + r() * 0.3));
            }
        }
    }
    ctx.fillStyle = rgba("#f5c86a", 0.6);
    for (let y = block; y < H; y += block + street) ctx.fillRect(0, y + street / 2 - mm(0.15), W, mm(0.3));
    grain(ctx, 0.08, 2);
    return canvas;
}

// =====================================================================
// Distant view: city silhouette, sunset, clouds
// =====================================================================
export function paintSkyline(wMm, hMm, ppm, seed, {near = 0, windows = 0.4} = {}) {
    const r = rng(seed);
    const s = sheet(wMm, hMm, ppm), e = sheet(wMm, hMm, ppm);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    // near: 0 = farthest (light pink) -> 1 = near (darker lavender)
    const base = mix("#f0c3cf", "#8f7fc4", near), shade = mix("#e2a9c4", "#6a5ea6", near);
    let x = 0;
    const towers = [];
    // First lay down a continuous low-rise band: only then is the whole row of silhouettes one piece of paper (outline tracing keeps only the largest connected component)
    for (let bx = 0; bx < W; ) {
        const w = mm(5 + r() * 9);
        towers.push([bx, w + mm(0.6), H * (0.1 + 0.08 * r())]);
        bx += w;
    }
    // Tall buildings in clusters: one or two "downtown" spots dense and tall, sparse and low on both sides
    const centers = [0.25 + 0.5 * r(), r() < 0.5 ? 0.15 + 0.2 * r() : 0.7 + 0.2 * r()];
    const cluster = f => Math.max(...centers.map((c, i) => (i ? 0.6 : 1) * Math.exp(-((f - c) ** 2) / (2 * 0.1 ** 2))));
    while (x < W) {
        const w = mm(7 + r() * 11);
        const k = cluster(x / W);
        if (r() < 0.25 + 0.75 * k) {
            const h = H * (0.18 + 0.78 * k * (0.55 + 0.45 * r()));
            towers.push([x, w, h]);
        }
        x += w * (0.55 + 0.4 * (1 - k)) + mm(r() * 6 * (1 - k));
    }
    towers.sort((a, b) => b[2] - a[2]);   // draw the tall ones first, the short ones stack in front
    for (const [tx, w, h] of towers) {
        const top = H - h;
        const p = new Path2D();
        p.moveTo(tx, H);
        p.lineTo(tx, top + mm(2));
        const kind = r();
        if (kind < 0.25) {      // stepped top
            p.lineTo(tx + w * 0.15, top + mm(2));
            p.lineTo(tx + w * 0.15, top);
            p.lineTo(tx + w * 0.85, top);
            p.lineTo(tx + w * 0.85, top + mm(2));
        } else if (kind < 0.4) { // spire
            p.lineTo(tx + w * 0.5, top - mm(4));
        } else if (kind < 0.55) { // antenna
            p.lineTo(tx + w * 0.45, top + mm(2));
            p.lineTo(tx + w * 0.47, top - mm(6));
            p.lineTo(tx + w * 0.53, top - mm(6));
            p.lineTo(tx + w * 0.55, top + mm(2));
        } else {
            p.lineTo(tx + w, top + mm(2));
        }
        p.lineTo(tx + w, top + mm(2));
        p.lineTo(tx + w, H);
        p.closePath();
        ctx.fillStyle = lin(ctx, 0, top, 0, H, [[0, mix(base, "#ffd2b8", 0.35)], [1, base]]);
        ctx.fill(p);
        crescent(ctx, p, shade, -w * 0.3, 0, 0.75);
        crescent(ctx, p, "#ffc9a8", w * 0.08, 0, 0.6, {mode: "screen"});
        // Window lights
        ctx.save();
        ctx.clip(p);
        // Window lights: sparse, a bit bigger, so from afar they read as cells of warm light and not noise
        for (let wy = top + mm(3.5); wy < H - mm(2); wy += mm(2.6)) {
            for (let wx = tx + mm(1.4); wx < tx + w - mm(1.8); wx += mm(2.4)) {
                if (r() > windows * 0.32) continue;
                const c = r() < 0.75 ? "#ffcf96" : "#c9d8ff";
                ctx.fillStyle = rgba(c, 0.7);
                ctx.fillRect(wx, wy, mm(1.1), mm(1.3));
                em.fillStyle = mix(c, "#000000", 0.35);
                em.fillRect(wx, wy, mm(1.1), mm(1.3));
            }
        }
        ctx.restore();
    }
    // Palm silhouettes in the front row
    if (near > 0.5) {
        for (let i = 0; i < 10; i++) {
            const bx = r() * W, h = H * (0.25 + r() * 0.15);
            ctx.strokeStyle = mix(shade, P.ink, 0.3);
            ctx.lineWidth = mm(0.5);
            ctx.beginPath();
            ctx.moveTo(bx, H);
            ctx.quadraticCurveTo(bx + mm(1), H - h * 0.6, bx + mm(2), H - h);
            ctx.stroke();
            for (let k = 0; k < 7; k++) {
                const a = -Math.PI / 2 + (k - 3) * 0.45;
                ctx.lineWidth = mm(0.6);
                ctx.beginPath();
                ctx.moveTo(bx + mm(2), H - h);
                ctx.quadraticCurveTo(bx + mm(2) + Math.cos(a) * mm(3), H - h + Math.sin(a) * mm(3) - mm(1),
                    bx + mm(2) + Math.cos(a) * mm(5.5), H - h + Math.sin(a) * mm(3) + mm(2));
                ctx.stroke();
            }
        }
    }
    grain(ctx, 0.06);
    return {canvas: s.canvas, emissive: e.canvas};
}

export function paintSunDisc(dMm, ppm) {
    const s = sheet(dMm, dMm, ppm), e = sheet(dMm, dMm, ppm);
    const {ctx, W, H} = s, em = e.ctx;
    const disc = ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 2);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#fff1c8"], [0.45, "#ffcf9a"], [1, "#ff8f8a"]]);
    ctx.fill(disc);
    em.fillStyle = lin(em, 0, 0, 0, H, [[0, "#ffe6b0"], [0.5, "#ffb882"], [1, "#ff7a78"]]);
    em.fill(disc);
    grain(ctx, 0.05);
    return {canvas: s.canvas, emissive: e.canvas};
}

export function paintCloud(wMm, hMm, ppm, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    // Cumulus: flat bottom, a string of bumps on top, high in the middle and low at the ends
    const base = H - mm(1.2), left = mm(1.5), right = W - mm(1.5);
    const n = 5 + Math.floor(r() * 3);
    const p = new Path2D();
    p.moveTo(left, base);
    let x = left;
    for (let i = 0; i < n; i++) {
        const f = (i + 0.5) / n;
        const span = (right - left) / n * (0.85 + 0.3 * r());
        const rise = (H - mm(2.5)) * (0.35 + 0.65 * Math.sin(Math.PI * f)) * (0.75 + 0.25 * r());
        const nx = i === n - 1 ? right : Math.min(right, x + span);
        p.bezierCurveTo(x, base - rise * 1.1, nx, base - rise * 1.1, nx, base - rise * 0.25 * (i === n - 1 ? 0 : 1));
        x = nx;
    }
    p.lineTo(right, base);
    p.closePath();
    // Sunset clouds: bottoms lit peach-pink, tops lavender
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#c9b2e6"], [0.55, "#f2b6c8"], [1, "#ffc59a"]]);
    ctx.fill(p);
    crescent(ctx, p, "#a48fd0", 0, mm(1.2), 0.6, {mode: "multiply"});
    crescent(ctx, p, "#fff0d8", 0, -mm(0.8), 0.8, {mode: "screen"});
    return finish(canvas, {inkW: mm(0.08), ink: "#6a4f86", grainAmt: 0.06});
}

// Boat: side view
export const BOATS = {
    speed: {
        L: 30, Wd: 7,
        body: [[0, 0], [0, 3.2], [17, 3.6], [24, 3.3], [30, 2.2], [28.5, 1.2], [24, 0]],
        seg: null,
    },
};
export function paintBoatSide(ppm, c) {
    const m = BOATS.speed;
    const s = sheet(m.L + 1, 5.5, ppm);
    const {ctx, mm, W, H} = s;
    const X = x => mm(x + 0.5), Y = z => H - mm(z + 0.5);
    const hull = poly(m.body.map(([x, z]) => [X(x), Y(z)]));
    lit(ctx, hull, c.hull, {sw: mm(0.8), rw: mm(0.25), dir: [0.2, 1]});
    ctx.save();
    ctx.clip(hull);
    ctx.fillStyle = c.stripe;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(2.0));
    ctx.lineTo(X(30), Y(2.9));
    ctx.lineTo(X(30), Y(2.3));
    ctx.lineTo(X(0), Y(1.4));
    ctx.fill();
    ctx.fillStyle = c.stripe2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1.2));
    ctx.lineTo(X(30), Y(2.1));
    ctx.lineTo(X(30), Y(1.8));
    ctx.lineTo(X(0), Y(0.9));
    ctx.fill();
    ctx.fillStyle = rgba("#ffffff", 0.9);
    ctx.font = `italic 700 ${mm(1.3)}px Bahnschrift, sans-serif`;
    ctx.fillText(c.name ?? "", X(16), Y(2.35));
    ctx.restore();
    return finish(s.canvas, {inkW: mm(0.08)});
}
