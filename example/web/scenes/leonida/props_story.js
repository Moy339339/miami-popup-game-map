// Props for the storyline (round 6): plot points from the GTA VI trailer that went viral - wanted stars, banknotes, burnout smoke, mud, police boat, post-mounted signs.
// Basis: GTA VI's wanted level is 6 stars at the top right of the HUD, solid white = the police can see you and are chasing;
// slots not yet reached are dark; below the stars a row of small red "heat" icons (looks, vehicle, surveillance).
import * as THREE from "three";
import {rng, lerp, cutout, rectSheet, customPaper, standUp, polySheet, toTexture} from "./kit.js";
import {P, sheet, lit, rgba, mix, finish, grain, roundRect, ellipse, poly, lin} from "./paint.js";
import * as K from "./props.js";

const PPM = 16;

export function starPath(cx, cy, R, r = R * 0.45) {
    const p = new Path2D();
    for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R;
        if (k) p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        else p.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    p.closePath();
    return p;
}

// ---------- Wanted-level sign: 6 star slots + red heat icons below (like a paper sign lifted out of the HUD) ----------
// Reshaped after the blind review (11-24): it used to be a solid black 78x21 rectangle, the unlit star slots were almost invisible, it read like "a few stars on a blackboard", and it blocked the signs behind it.
// Now it is a narrow pill-shaped strip (the star slots) + a small tab centered below (the heat icons), about a third smaller in area; unlit star slots draw a pale star outline, so you can tell at a glance "how many of the 6 slots are lit".
// pill: height of the pill strip; cy: how far the star-slot center is from the top of the sign; tab: width and height of the small tab
export const WANTED = {n: 6, step: 11.8, R: 4.6, w: 76, pill: 13, cy: 6.5, tabW: 25, tabH: 5.6, legs: 16};
WANTED.h = WANTED.pill + WANTED.tabH;
function panelOutline(mm, w, pill, tabW, tabH) {
    const r = mm(pill / 2), x0 = mm(0.3), x1 = mm(w - 0.3), y0 = mm(0.3), yb = mm(pill), tl = mm(w / 2 - tabW / 2), tr = mm(w / 2 + tabW / 2),
        tb = mm(pill + tabH - 0.3), c = mm(1.8);
    const p = new Path2D();
    p.moveTo(x0 + r, y0);
    p.lineTo(x1 - r, y0);
    p.arc(x1 - r, y0 + r, r, -Math.PI / 2, Math.PI / 2);
    p.lineTo(tr, y0 + 2 * r);
    p.lineTo(tr, tb - c);
    p.arcTo(tr, tb, tr - c, tb, c);
    p.lineTo(tl + c, tb);
    p.arcTo(tl, tb, tl, tb - c, c);
    p.lineTo(tl, y0 + 2 * r);
    p.lineTo(x0 + r, y0 + 2 * r);
    p.arc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 3 / 2);
    p.closePath();
    void yb;
    return p;
}
// Steel frame (the kind of billboard frame that stands on a rooftop): two uprights + one in the middle + crossbars and diagonal cross braces in each bay; pale, so you can tell at night that the sign is mounted on a frame
function truss(id, x0, x1, h, y, {color = "#d8d2f0", audit = true} = {}) {
    const g = new THREE.Group();
    const bar = (ax, az, bx, bz, t = 0.5) => {
        const len = Math.hypot(bx - ax, bz - az);
        const m = customPaper(new THREE.BoxGeometry(t, t, len), id, {color, emissive: 0.25, emissiveColor: "#5a5290", rough: 0.8});
        m.position.set((ax + bx) / 2, y, (az + bz) / 2);
        m.rotation.y = Math.atan2(bx - ax, bz - az);
        if (!audit) m.userData.noAudit = true;
        g.add(m);
    };
    const xm = (x0 + x1) / 2, nb = Math.max(2, Math.round(h / 5));
    for (const x of [x0, xm, x1]) bar(x, 0, x, h, 0.9);
    for (let i = 0; i <= nb; i++) bar(x0, h * i / nb, x1, h * i / nb, 0.45);
    for (let i = 0; i < nb; i++) {
        const z0 = h * i / nb, z1 = h * (i + 1) / nb;
        for (const [a, b] of [[x0, xm], [xm, x1]]) { bar(a, z0, b, z1, 0.35); bar(b, z0, a, z1, 0.35); }
    }
    return g;
}
// legX: how far the two poles are from the center line (as a fraction of the sign width); legsAudit = false: the poles are excluded from the clipping check (the kind standing on a rooftop, with the pole feet resting on the roof); glow: the glow color of the outline at night;
// legs = 0: no poles, the sign stands on the ground by itself (the small tab touches the ground); truss: use a steel frame instead of the two poles
export function wantedPanel(id, {legs = WANTED.legs, legX = 0.3, legsAudit = true, glow = null, truss: useTruss = false} = {}) {
    const {n, step, R, w, h, pill, cy, tabW, tabH} = WANTED;
    const s = sheet(w, h, PPM);
    const {ctx, mm, W, H} = s;
    const face = panelOutline(mm, w, pill, tabW, tabH);
    lit(ctx, face, "#1c1a2a", {sw: mm(0.8), rw: mm(0.3), rim: "#5a5a8a"});
    // The sign face is not dead black: a gradient layer bright at the top and dark at the bottom (like the glass backing of a HUD) + very faint halftone dots (printed card)
    ctx.save();
    ctx.clip(face);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, rgba("#8a86c0", 0.24)], [0.45, rgba("#8a86c0", 0.05)], [1, rgba("#000000", 0.16)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba("#b8b4e8", 0.07);
    for (let y = mm(0.6); y < H; y += mm(0.9)) for (let x = mm(0.6) + ((y / mm(0.9)) % 2) * mm(0.45); x < W; x += mm(0.9)) ctx.fillRect(x, y, mm(0.22), mm(0.22));
    ctx.restore();
    ctx.strokeStyle = rgba("#ffffff", 0.32);
    ctx.lineWidth = mm(0.3);
    ctx.stroke(roundRect(mm(1.2), mm(1.2), W - mm(2.4), mm(pill - 2.1), mm(pill / 2 - 1.2)));
    // Star slots: recessed dark stars (a dark edge at the upper left, a bright edge at the lower right) + a thin pale star-shaped outline, so unlit slots can still be read
    for (let k = 0; k < n; k++) {
        const cx = mm(w / 2 + (k - (n - 1) / 2) * step), cyp = mm(cy);
        const star = (dx, dy, rr = R) => starPath(cx + dx, cyp + dy, mm(rr), mm(rr * 0.45));
        ctx.fillStyle = rgba("#9a96d0", 0.35);
        ctx.fill(star(mm(0.35), mm(0.35)));
        ctx.fillStyle = "#08070e";
        ctx.fill(star(-mm(0.3), -mm(0.3)));
        ctx.fillStyle = "#3a3854";
        ctx.fill(star(0, 0));
        ctx.strokeStyle = rgba("#d8d4ff", 0.85);
        ctx.lineWidth = mm(0.42);
        ctx.lineJoin = "round";
        ctx.stroke(star(0, 0, R * 0.84));
    }
    // Heat icons (red): person, car, surveillance camera, printed on the small tab
    const ic = "#ff3a4a";
    const y0 = mm(pill + tabH / 2 - 0.5);
    ctx.fillStyle = ic;
    paintHeatIcons(ctx, mm, mm(w / 2), y0, "#1c1a2a");
    grain(ctx, 0.06);
    // glow (used at night): a thin line along the outer edge and the heat icons glow by themselves, so the sign stands out against the night sky
    let em = null;
    if (glow) {
        em = sheet(w, h, PPM);
        em.ctx.fillStyle = "#000";
        em.ctx.fillRect(0, 0, W, H);
        em.ctx.strokeStyle = rgba(glow, 0.9);
        em.ctx.lineWidth = mm(0.9);
        em.ctx.stroke(face);
        em.ctx.strokeStyle = rgba(glow, 0.5);
        em.ctx.lineWidth = mm(0.3);
        for (let k = 0; k < n; k++) em.ctx.stroke(starPath(mm(w / 2 + (k - (n - 1) / 2) * step), mm(cy), mm(R * 0.84), mm(R * 0.84 * 0.45)));
        em.ctx.fillStyle = "#c02030";
        paintHeatIcons(em.ctx, mm, mm(w / 2), y0, "#000");
    }
    // A sign printed on white card: the cut edge shows the white paper core, and it is a bit thicker, so from the side you can tell it is a piece of card
    const board = standUp(cutout(s.canvas, {id: id + ".board", ppm: PPM, thickness: 1.3, back: "#1c1a2a", edge: "#ece6f0",
        emissive: em && em.canvas, emissiveIntensity: 1.4, trace: {cell: 2, dilate: 1}}));
    board.position.z = legs;
    const g = new THREE.Group();
    g.add(board);
    // The poles are on either side of the small tab and must reach all the way up to the bottom edge of the pill strip (the sign's origin is under the small tab)
    const top = legs + tabH + 0.8;
    if (legs > 0 && useTruss) g.add(truss(id + ".truss", -w * legX, w * legX, top, 0.9, {audit: legsAudit}));
    else if (legs > 0) for (const x of [-w * legX, w * legX]) {
        const leg = customPaper(new THREE.BoxGeometry(0.9, 0.9, top), id + ".leg", {color: "#2a2840"});
        leg.position.set(x, 0.6, top / 2);
        if (!legsAudit) leg.userData.noAudit = true;
        g.add(leg);
    }
    return g;
}
// Three heat icons (person, car, surveillance camera), drawn with the current fillStyle; cx = x of the middle one, y0 = baseline y of the icon row (pixels); hole = the color of the wheel cutouts
// Extracted in fix batch 18: the dark piece for the closing "heat icons turn off" (heatOff in props_lovers.js) uses it too
export function paintHeatIcons(c, mm, cx, y0, hole) {
    const icons = [
        x => { c.fill(ellipse(x, y0 - mm(1.3), mm(0.9), mm(0.9))); c.fill(roundRect(x - mm(1.4), y0 - mm(0.2), mm(2.8), mm(2), mm(0.8))); },
        x => { c.fill(roundRect(x - mm(2.4), y0 - mm(0.4), mm(4.8), mm(1.6), mm(0.5))); c.fill(roundRect(x - mm(1.3), y0 - mm(1.5), mm(2.6), mm(1.4), mm(0.4)));
            const f = c.fillStyle; c.fillStyle = hole; c.fill(ellipse(x - mm(1.4), y0 + mm(1.2), mm(0.6), mm(0.6))); c.fill(ellipse(x + mm(1.4), y0 + mm(1.2), mm(0.6), mm(0.6))); c.fillStyle = f; },
        x => { c.fill(roundRect(x - mm(1.8), y0 - mm(1.4), mm(3.2), mm(2), mm(0.4))); c.fill(poly([[x + mm(1.4), y0 - mm(0.8)], [x + mm(2.4), y0 - mm(1.4)], [x + mm(2.4), y0 + mm(0.2)]]));
            c.fillRect(x - mm(0.3), y0 + mm(0.4), mm(0.6), mm(1.3)); },
    ];
    icons.forEach((f, i) => f(cx + mm((i - 1) * 7.5)));
}
// Position of the k-th star on the sign (sign-local x, z of the bottom edge of the lit-star standee): the star-slot center is cy below the top of the board; in the lit-star canvas the star center is R*1.05 + 0.4 above the bottom edge
export const starSlot = (k, legs = WANTED.legs) => [(k - (WANTED.n - 1) / 2) * WANTED.step, legs + WANTED.h - WANTED.cy - (WANTED.R * 1.05 + 0.4)];
// Lit white star: a slightly thicker white card, dark outline, a bit of emissive (still readable at dusk)
export function wantedStar(id) {
    const R = WANTED.R * 1.05;
    const s = sheet(R * 2 + 1.6, R * 2 + 1.6, 24), e = sheet(R * 2 + 1.6, R * 2 + 1.6, 24);
    const {ctx, mm, W, H} = s;
    const path = starPath(W / 2, H / 2 + mm(0.4), mm(R), mm(R * 0.45));
    lit(ctx, path, "#ffffff", {sw: mm(0.5), rw: mm(0.2), shade: "#c8c4e8", shadeA: 0.6});
    e.ctx.fillStyle = "#9a96a8";
    e.ctx.fill(path);
    finish(s.canvas, {inkW: mm(0.4), ink: "#0e0c16", grainAmt: 0.04});
    const m = cutout(s.canvas, {id, ppm: 24, thickness: 1.0, emissive: e.canvas, emissiveIntensity: 1.2, trace: {cell: 2, dilate: 1}, back: "#e8e4f4"});
    Object.assign(m.userData.paper.meta.mat.front, {gloss: "foil", glossTier: 1});   // Fix item 29 version B: foil finish on the wanted stars (the cut edge is still a matte paper core)
    return standUp(m);
}

// ---------- Fix item 19: the wanted strip lying flat on the opening map (readable as GTA from frame 0) ----------
// A dark pill-shaped card lies flat on the top edge of the tourist map's frame, printed with 6 recessed dark star slots; each star slot is covered by a small star-shaped flip tile (starTile),
// back side up = dark star, flipped over = white star. STRIP.slot(k) = the card-local x of the k-th slot.
export const STRIP = {n: 6, step: 13, R: 4.3, w: 86, h: 13.2, slot: k => (k - 2.5) * 13};
export function wantedStrip(id) {
    const {n, R, w, h} = STRIP;
    const s = sheet(w, h, PPM);
    const {ctx, mm, W, H} = s;
    const face = roundRect(mm(0.3), mm(0.3), W - mm(0.6), H - mm(0.6), mm(h / 2 - 0.3));
    lit(ctx, face, "#1c1a2a", {sw: mm(0.6), rw: mm(0.25), rim: "#5a5a8a"});
    ctx.save();
    ctx.clip(face);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, rgba("#8a86c0", 0.22)], [0.5, rgba("#8a86c0", 0.04)], [1, rgba("#000000", 0.18)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba("#b8b4e8", 0.07);
    for (let y = mm(0.6); y < H; y += mm(0.9)) for (let x = mm(0.6) + ((y / mm(0.9)) % 2) * mm(0.45); x < W; x += mm(0.9)) ctx.fillRect(x, y, mm(0.22), mm(0.22));
    ctx.restore();
    ctx.strokeStyle = rgba("#ffffff", 0.3);
    ctx.lineWidth = mm(0.3);
    ctx.stroke(roundRect(mm(1.1), mm(1.1), W - mm(2.2), H - mm(2.2), mm(h / 2 - 1.1)));
    for (let k = 0; k < n; k++) {
        const cx = mm(w / 2 + STRIP.slot(k)), cy = H / 2;
        const star = (dx, dy) => starPath(cx + dx, cy + dy, mm(R), mm(R * 0.45));
        ctx.fillStyle = rgba("#9a96d0", 0.35);
        ctx.fill(star(mm(0.3), mm(0.3)));
        ctx.fillStyle = "#08070e";
        ctx.fill(star(-mm(0.25), -mm(0.25)));
        ctx.fillStyle = "#34324a";
        ctx.fill(star(0, 0));
    }
    grain(ctx, 0.06);
    const m = cutout(s.canvas, {id, ppm: PPM, thickness: 0.9, anchor: "center", back: "#1c1a2a", edge: "#ece6f0", trace: {cell: 2, dilate: 1}});
    m.userData.noAudit = true;
    return m;
}
// Small star-shaped flip tile: white star on the front (with a bit of emissive), the back is the dark color of the star slot; lies flat, origin at the star center. Wrapped in a group, so it rotates about the star center when flipping
export function starTile(id) {
    const R = STRIP.R * 1.05;
    const s = sheet(R * 2 + 1.2, R * 2 + 1.2, 24), e = sheet(R * 2 + 1.2, R * 2 + 1.2, 24);
    const {ctx, mm, W, H} = s;
    const path = starPath(W / 2, H / 2 + mm(0.3), mm(R), mm(R * 0.45));
    lit(ctx, path, "#ffffff", {sw: mm(0.4), rw: mm(0.15), shade: "#c8c4e8", shadeA: 0.6});
    e.ctx.fillStyle = "#9a96a8";
    e.ctx.fill(path);
    finish(s.canvas, {inkW: mm(0.3), ink: "#0e0c16", grainAmt: 0.04});
    // Back (the unlit dark star): dark grey-purple base + a thin pale border, like a not-yet-reached star slot in the HUD; the tile flips about the y axis (the star is left-right symmetric, so its shape does not change when flipped)
    const b = sheet(R * 2 + 1.2, R * 2 + 1.2, 24);
    const bp = starPath(b.W / 2, b.H / 2 + b.mm(0.3), b.mm(R), b.mm(R * 0.45));
    b.ctx.fillStyle = "#2e2c42";
    b.ctx.fill(bp);
    b.ctx.strokeStyle = rgba("#a8a4d8", 0.75);
    b.ctx.lineWidth = b.mm(0.35);
    b.ctx.stroke(starPath(b.W / 2, b.H / 2 + b.mm(0.3), b.mm(R * 0.86), b.mm(R * 0.39)));
    finish(b.canvas, {inkW: b.mm(0.3), ink: "#0e0c16", grainAmt: 0.04});
    const m = cutout(s.canvas, {id, ppm: 24, thickness: 0.6, emissive: e.canvas, emissiveIntensity: 1.2, anchor: "center",
        trace: {cell: 2, dilate: 1}, back: {map: toTexture(b.canvas), alphaTest: 0.35, rough: 0.86}, edge: "#ece6f0"});
    m.userData.noAudit = true;
    Object.assign(m.userData.paper.meta.mat.front, {gloss: "foil", glossTier: 1});
    const g = new THREE.Group();
    g.add(m);
    return g;
}

// ---------- Banknotes: small green bills printed on both sides (for scattering) ----------
export function cashBill(id, seed = 1) {
    const r = rng(seed);
    const s = sheet(3.4, 1.6, 40);
    const {ctx, mm, W, H} = s;
    ctx.fillStyle = mix("#8ad07a", "#c8e8a0", r() * 0.4);
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#3a7a3a";
    ctx.lineWidth = mm(0.12);
    ctx.strokeRect(mm(0.2), mm(0.2), W - mm(0.4), H - mm(0.4));
    ctx.fillStyle = "#3a7a3a";
    ctx.fill(ellipse(W / 2, H / 2, mm(0.42), mm(0.5)));
    ctx.font = `800 ${mm(0.55)}px Bahnschrift, sans-serif`;
    ctx.fillText("100", mm(0.35), mm(0.75));
    const m = rectSheet(s.canvas, {id, width: 3.4, height: 1.6, thickness: 0.15, origin: "center", back: "same", castShadow: true});
    return m;
}

// ---------- Smoke puff / mud blob: a soft blob made of several overlapping circles, cut edge in the same color ----------
export function puff(id, seed = 1, {w = 9, h = 7, color = "#efe8f0", shade = "#b8aac8"} = {}) {
    const r = rng(seed);
    const s = sheet(w, h, 14);
    const {ctx, mm, W, H} = s;
    const path = new Path2D();
    for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        path.addPath(ellipse(W / 2 + Math.cos(a) * W * 0.24 * (0.7 + r() * 0.4), H * 0.55 + Math.sin(a) * H * 0.2, W * (0.18 + r() * 0.08), H * (0.2 + r() * 0.08)));
    }
    path.addPath(ellipse(W / 2, H * 0.5, W * 0.3, H * 0.3));
    lit(ctx, path, color, {sw: mm(1.2), rw: mm(0.4), shade, shadeA: 0.55, blur: mm(0.3)});
    grain(ctx, 0.05);
    const m = standUp(cutout(s.canvas, {id, ppm: 14, thickness: 0.4, anchor: "center", trace: {cell: 2, dilate: 1}, back: color, edge: color, castShadow: false}));
    m.traverse(o => { o.userData.noAudit = true; });   // smoke is intangible, so it does not count as clipping
    return m;
}
// Mud splash: a ring of mud drops flung outward (brown), with a blob in the middle
export function mudSplash(id, seed = 1, {w = 14, h = 9} = {}) {
    const r = rng(seed);
    const s = sheet(w, h, 14);
    const {ctx, mm, W, H} = s;
    const path = new Path2D();
    path.addPath(ellipse(W / 2, H * 0.82, W * 0.32, H * 0.16));
    for (let i = 0; i < 14; i++) {
        const a = Math.PI * (1.05 + r() * 0.9), d = 0.3 + r() * 0.62;
        const x = W / 2 + Math.cos(a) * W * 0.5 * d, y = H * 0.85 + Math.sin(a) * H * 0.95 * d;
        path.addPath(ellipse(x, y, mm(0.5 + r() * 0.9), mm(0.6 + r() * 1.0), a));
        // thin strips connected to the middle (the automatic outline tracing keeps only the largest connected component)
        const p2 = new Path2D();
        p2.moveTo(W / 2 - mm(0.3), H * 0.8); p2.lineTo(x, y); p2.lineTo(W / 2 + mm(0.3), H * 0.8); p2.closePath();
        path.addPath(p2);
    }
    lit(ctx, path, "#7a5a3a", {sw: mm(0.6), rw: mm(0.25), shade: "#4a3428", shadeA: 0.6});
    return standUp(cutout(s.canvas, {id, ppm: 14, thickness: 0.4, trace: {cell: 2, dilate: 1}, back: "#6a4a30", edge: "#6a4a30", castShadow: false}));
}
// Mud pit: an irregular patch of mud lying on the ground, with tire tracks and puddles
export function mudPit(id, rx, ry, seed = 1) {
    const r = rng(seed);
    const pts = [];
    for (let k = 0; k < 40; k++) {
        const a = k / 40 * Math.PI * 2, f = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 7 + seed * 2);
        pts.push([Math.cos(a) * rx * f, Math.sin(a) * ry * f]);
    }
    const s = sheet(rx * 2.4, ry * 2.4, 8);
    const {ctx, mm, W, H} = s;
    ctx.fillStyle = "#7a5a40";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? "#5a4030" : "#9a7a58", 0.5);
        ctx.beginPath(); ctx.ellipse(r() * W, r() * H, mm(1 + r() * 5), mm(0.6 + r() * 2), r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // Puddle (reflecting the golden sky)
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = rgba("#c8a870", 0.7);
        ctx.beginPath(); ctx.ellipse(r() * W, r() * H, mm(2 + r() * 5), mm(0.8 + r() * 1.6), 0, 0, Math.PI * 2); ctx.fill();
    }
    // Tire tracks: two curved arcs
    ctx.strokeStyle = rgba("#3a2820", 0.55);
    ctx.lineWidth = mm(1.0);
    ctx.setLineDash([mm(0.6), mm(0.4)]);
    for (const off of [-2.6, 2.6]) {
        ctx.beginPath();
        ctx.ellipse(W / 2, H / 2, W * 0.32 + mm(off), H * 0.28 + mm(off), 0.2, 0, Math.PI * 1.6);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    grain(ctx, 0.08);
    return polySheet(pts, {id, canvas: s.canvas, thickness: 0.4, uvFrame: {x: -rx * 1.2, y: -ry * 1.2, width: rx * 2.4, height: ry * 2.4}, edge: "#6a4a30", castShadow: false});
}

// ---------- Post sign: a printed board + two poles (like THRILLBILLY MUD CLUB, BRIAN'S BOAT WORKS) ----------
export function postSign(id, {lines, w = 40, h = 10, bg = "#f4ecd0", color = "#2a2440", edge = "#2a2440", legs = 8, font = "Arial Black", sizes = null,
        colors = null, shape = "rect", post = "#5a4a40"} = {}) {
    const s = sheet(w, h, PPM);
    const {ctx, mm, W, H} = s;
    const board = shape === "arch" ? (() => {
        const p = new Path2D();
        p.moveTo(mm(0.4), H - mm(0.4)); p.lineTo(mm(0.4), H * 0.35); p.quadraticCurveTo(W / 2, -H * 0.15, W - mm(0.4), H * 0.35); p.lineTo(W - mm(0.4), H - mm(0.4)); p.closePath();
        return p;
    })() : roundRect(mm(0.4), mm(0.4), W - mm(0.8), H - mm(0.8), mm(1.2));
    lit(ctx, board, bg, {sw: mm(0.6), rw: mm(0.25)});
    ctx.strokeStyle = edge;
    ctx.lineWidth = mm(0.5);
    ctx.stroke(board);
    const n = lines.length;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((t, i) => {
        const sz = sizes?.[i] ?? (h * 0.62) / n;
        ctx.font = `900 ${mm(sz)}px "${font}", sans-serif`;
        ctx.fillStyle = colors?.[i] ?? color;
        const y = H * (shape === "arch" ? 0.42 : 0.5) + (i - (n - 1) / 2) * H * 0.8 / n + (shape === "arch" ? H * 0.12 : 0);
        ctx.fillText(t, W / 2, y, W - mm(2.5));
    });
    finish(s.canvas, {inkW: mm(0.1), ink: edge, grainAmt: 0.06});
    const g = new THREE.Group();
    const b = standUp(cutout(s.canvas, {id: id + ".board", ppm: PPM, thickness: 0.7, trace: {cell: 2, dilate: 0}, back: mix(bg, "#000000", 0.2)}));
    b.position.z = legs;
    g.add(b);
    for (const x of [-w * 0.38, w * 0.38]) {
        const leg = customPaper(new THREE.BoxGeometry(0.9, 0.9, legs + h * 0.5), id + ".post", {color: post});
        leg.position.set(x, 0.6, (legs + h * 0.5) / 2);
        g.add(leg);
    }
    return g;
}

// ---------- Police boat: speedboat + police lights (flashing red and blue) + a dark blue stripe on the hull ----------
export function policeBoat(id) {
    const g = K.speedboat(id, {deck: "#f4f6fa", hull: "#f4f6fa", stripe: "#1f3a6a", stripe2: "#ffffff", top: "#1f3a6a"});
    for (const [s, col] of [[-1, "red"], [1, "blue"]]) {
        const bar = customPaper(new THREE.BoxGeometry(1.4, 2.6, 1.0), `${id}.bar${s}`,
            {color: col === "red" ? "#ff5060" : "#5080ff", emissive: 1, emissiveColor: col === "red" ? "#ff2030" : "#2050ff", flash: col, rough: 0.3});
        bar.position.set(0.5, s * 1.5, 10.1);
        g.add(bar);
    }
    return g;
}

// ---------- Boat on a stand (in the boatyard): a speedboat resting on two wooden cradles ----------
export function boatOnStand(id, colors) {
    const g = new THREE.Group();
    const b = K.speedboat(id + ".boat", colors);
    b.position.z = 3.2;
    g.add(b);
    for (const x of [-7, 6]) {
        const cr = customPaper(new THREE.BoxGeometry(2, 8, 3.4), id + ".cradle", {color: "#8a6a50"});
        cr.position.set(x, 0, 1.7);
        g.add(cr);
    }
    g.userData.core = g;
    return g;
}

// ---------- Fuel pump (the XERO kind): a small upright cabinet ----------
export function gasPump(id, color = "#1f4aa8") {
    const g = new THREE.Group();
    const body = customPaper(new THREE.BoxGeometry(2.6, 1.8, 6), id + ".body", {color: "#f4f2f8", rough: 0.5});
    body.position.z = 3;
    g.add(body);
    const band = customPaper(new THREE.BoxGeometry(2.7, 1.9, 1.4), id + ".band", {color, rough: 0.5});
    band.position.z = 5.2;
    g.add(band);
    const screen = customPaper(new THREE.BoxGeometry(1.6, 0.2, 1.0), id + ".screen", {color: "#1e1b26", emissiveColor: "#3ff0e0", emissive: 0.8});
    screen.position.set(0, -0.95, 3.8);
    g.add(screen);
    return g;
}

void [lerp, P, lin];

// ---------- Beach (v8): parasailing, banana boat, beach volleyball - generic beach activities for the Vice City beach, not tied to any particular scene in the game ----------
function rope(id, a, b, r = 0.08, color = "#3a3450") {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const m = customPaper(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 4), id, {color});
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    m.userData.noAudit = true;
    return m;
}

// Parasail: a speedboat (length 30, stern toward -x) tows a fan-shaped striped canopy, with the canopy facing the camera standing in the air behind the boat; a person hangs under the canopy, and the tow rope slants back to the stern
export function parasail(id, {boat: boatColors, rider, colors = ["#ff4fa3", "#ffd36a", "#3fb8b0", "#fff6ec", "#ff7f6a", "#9c8dd9"]} = {}) {
    const g = new THREE.Group();
    const boat = K.speedboat(id + ".boat", boatColors);
    g.add(boat);
    const w = 27, h = 13;
    const s = sheet(w, h + 0.6, PPM);
    const {ctx, mm, W} = s;
    const cx = W / 2, cy = mm(h + 0.3), rx = mm(w / 2 - 0.3), ry = mm(h);
    const canopy = new Path2D();
    canopy.ellipse(cx, cy, rx, ry, 0, Math.PI, 2 * Math.PI);
    canopy.quadraticCurveTo(cx, cy - mm(3.4), cx - rx, cy);
    canopy.closePath();
    ctx.save();
    ctx.clip(canopy);
    const n = 12;
    for (let k = 0; k < n; k++) {
        const a0 = Math.PI + k * Math.PI / n, a1 = a0 + Math.PI / n;
        ctx.fillStyle = colors[k % colors.length];
        ctx.beginPath(); ctx.moveTo(cx, cy + mm(4));
        ctx.lineTo(cx + Math.cos(a0) * rx * 1.3, cy + Math.sin(a0) * ry * 1.3);
        ctx.lineTo(cx + Math.cos(a1) * rx * 1.3, cy + Math.sin(a1) * ry * 1.3);
        ctx.closePath(); ctx.fill();
    }
    // the lower edge is the inside of the canopy (backlit), with a bright edge along the upper edge
    ctx.fillStyle = lin(ctx, 0, cy - ry, 0, cy, [[0, rgba("#ffffff", 0.25)], [0.35, rgba("#ffffff", 0)], [0.75, rgba(P.shadeDeep, 0.05)], [1, rgba(P.shadeDeep, 0.4)]]);
    ctx.fillRect(0, 0, W, cy);
    ctx.restore();
    finish(s.canvas, {inkW: mm(0.1), ink: "#4a3a5a", grainAmt: 0.05});
    const cz = 31, cxw = -36;
    const sail = standUp(cutout(s.canvas, {id: id + ".canopy", ppm: PPM, thickness: 0.4, anchor: [0.5, 0], trace: {cell: 2, dilate: 1}, back: "same"}));
    sail.position.set(cxw, 0, cz);
    g.add(sail);
    const hz = cz - 10;
    [-w / 2 + 1, -w / 4, w / 4, w / 2 - 1].forEach((dx, k) => g.add(rope(`${id}.line${k}`, [cxw + dx, 0, cz + (Math.abs(dx) > w / 3 ? 0.4 : 2.2)], [cxw, 0, hz], 0.05)));
    g.add(rope(id + ".tow", [cxw, 0, hz], [-14, 0, 3.2], 0.09));
    if (rider) {
        rider.scale.setScalar(0.8);
        rider.position.set(cxw, 0.2, hz - 8.2);
        g.add(rider);
    }
    g.userData.core = boat.userData.core ?? boat;
    return g;
}

// Banana boat: a jet ski tows a yellow banana (small floats on both sides) with three people riding it (legs sunk below the water, so it looks like they are straddling it)
export function bananaBoat(id, {riders = [], ski = null} = {}) {
    const g = new THREE.Group();
    const tube = customPaper(new THREE.CapsuleGeometry(1.5, 11, 6, 12), id + ".tube", {color: "#ffd33a", rough: 0.45});
    tube.rotation.z = Math.PI / 2;
    tube.position.z = 1.0;
    g.add(tube);
    for (const sd of [-1, 1]) {
        const p = customPaper(new THREE.CapsuleGeometry(0.8, 8.5, 5, 10), id + ".side" + sd, {color: "#f5b82a", rough: 0.45});
        p.rotation.z = Math.PI / 2;
        p.position.set(-0.6, sd * 2.1, 0.6);
        g.add(p);
    }
    const tip = customPaper(new THREE.ConeGeometry(0.9, 2.6, 10), id + ".tip", {color: "#5a4a2a"});
    tip.rotation.z = -Math.PI / 2;
    tip.position.set(8.4, 0, 1.4);
    g.add(tip);
    riders.forEach((p, k) => {
        p.scale.setScalar(0.75);
        p.position.set(4 - k * 4.2, 0, -1.6);
        g.add(p);
    });
    if (ski) {
        ski.position.set(19, 0, 0);
        g.add(ski);
        g.add(rope(id + ".tow", [9.6, 0, 1.6], [15.2, 0, 1.4], 0.07));
    }
    g.userData.cores = [tube, ...(ski ? [ski.userData.core ?? ski] : [])];
    return g;
}

// Beach volleyball: two white poles + a net (the mesh is cut out so you can see the people on the other side), two people seen from behind in the foreground, two on the far side (one raising a hand to block), and the ball above the net
export function volleyCourt(id, players = []) {
    const g = new THREE.Group();
    const half = 9, top = 9.4, netH = 3.0;
    for (const sd of [-1, 1]) {
        const post = customPaper(new THREE.CylinderGeometry(0.3, 0.36, top + 0.6, 6), id + ".post" + sd, {color: "#f4f0e8"});
        post.rotation.x = Math.PI / 2;
        post.position.set(sd * half, 0, (top + 0.6) / 2);
        g.add(post);
    }
    const s = sheet(half * 2, netH, 20);
    const {ctx, mm, W, H} = s;
    ctx.strokeStyle = "#2a2440";
    ctx.lineWidth = mm(0.12);
    for (let x = mm(0.4); x < W; x += mm(0.8)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = mm(0.5); y < H; y += mm(0.8)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#fbf8f2";
    ctx.fillRect(0, 0, W, mm(0.5));
    ctx.fillRect(0, H - mm(0.3), W, mm(0.3));
    ctx.fillRect(0, 0, mm(0.3), H);
    ctx.fillRect(W - mm(0.3), 0, mm(0.3), H);
    const net = cutout(s.canvas, {id: id + ".net", ppm: 20, thickness: 0.1, anchor: [0.5, 0], trace: {cell: 3, dilate: 2, threshold: 20}, back: "same", castShadow: true});
    net.userData.paper.meta.mat.front.alphaTest = 0.3;
    const netUp = standUp(net);
    netUp.position.set(0, 0, top - netH);
    g.add(netUp);
    const ball = customPaper(new THREE.SphereGeometry(0.75, 12, 8), id + ".ball", {color: "#fff4c8"});
    ball.position.set(2.4, -1.2, top + 4.5);
    ball.userData.noAudit = true;
    g.add(ball);
    for (const [p, x, y, z] of players) { p.position.set(x, y, z ?? 0); g.add(p); }
    g.userData.cores = [netUp, ...players.map(([p]) => p)];
    return g;
}