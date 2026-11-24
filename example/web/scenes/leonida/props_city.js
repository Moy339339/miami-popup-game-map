// Components for downtown Vice City (night). Based on official screenshots:
// Vice_City_22 gas station with a giant tire sign (RICARDO TIRES / GAS, red neon slanted canopy); Vice_City_09 mural pillars under the overpass, bikelife;
// Vice_City_11/27 glass towers at night, colored rooftop lights; Vice_City_08 stadium LED outer ring, Ferris wheel; Vice_City_17 police car chase, police helicopter searchlight.
import * as THREE from "three";
import {rng, lerp, toTexture, cutout, rectSheet, customPaper, standUp} from "./kit.js";
import {P, sheet, lit, lin, grain, finish, rgba, mix, roundRect, ellipse, poly, paintBush, fitFont} from "./paint.js";
import {neonText, neonLine, paintRoof} from "./paint_city.js";

const PPM = 22;

// ---------- Glass tower (VC_11/27) ----------
// Redrawn in round 4: following the official night scene, lights are on "floor by floor" - some floors are lit across the whole floor (offices working overtime), some floors are lit in a few segments, some floors are fully dark;
// the light color within one floor is uniform (warm white / cool white). Unlit glass reflects the dusk sky (pink-purple at the top, indigo at the bottom), keeping a bit of reflection in the emissive so the tower body does not smear into a black block at night.
// Floor-slab lines and mullions are thin and clear; a mechanical floor (louvers) every dozen or so floors; the ground level is a two-story-high warmly lit lobby.
function paintTowerFace(w, H, {seed, glass, crown, kind, band, lobby = true}) {
    const r = rng(seed);
    const s = sheet(w, H, 6), e = sheet(w, H, 6);
    const {ctx, mm} = s, ec = e.ctx;
    ec.fillStyle = "#000";
    ec.fillRect(0, 0, s.W, s.H);
    const gTop = mix(glass, "#e2a4d4", 0.5), gMid = mix(glass, "#8c78c8", 0.32), gBot = mix(glass, "#16142e", 0.45);
    ctx.fillStyle = lin(ctx, 0, 0, 0, s.H, [[0, gTop], [0.45, gMid], [1, gBot]]);
    ctx.fillRect(0, 0, s.W, s.H);
    ec.fillStyle = lin(ec, 0, 0, 0, s.H, [[0, rgba(gTop, 0.36)], [0.5, rgba(gMid, 0.18)], [1, rgba(gBot, 0.05)]]);
    ec.fillRect(0, 0, s.W, s.H);
    // Reflected clouds: a few slanted pale reflections
    for (let i = 0; i < 4; i++) {
        const y = r() * s.H * 0.8, hgt = mm(8 + r() * 30), x0 = r() * s.W;
        ctx.fillStyle = rgba("#ffd6ec", 0.07 + r() * 0.06);
        ctx.beginPath();
        ctx.moveTo(x0 - s.W, y + hgt);
        ctx.lineTo(x0 + s.W, y);
        ctx.lineTo(x0 + s.W, y + mm(3 + r() * 6));
        ctx.lineTo(x0 - s.W, y + hgt + mm(3 + r() * 6));
        ctx.fill();
    }
    const resi = kind === "resi";
    const fh = mm(resi ? 3.4 : 3.1);
    const bay = mm(resi ? 4.4 : 2.9);
    const lobbyH = lobby ? mm(8) : 0;
    const tones = ["#ffe0b0", "#ffd49a", "#fff0d8", "#e4ecff", "#ffd0e4"];
    // Lights are done per "office block": several floors x several rooms lit as a patch (one light color per block), then a scattering of isolated single rooms;
    // not per whole floor (it turns into horizontal bars, like a barcode), and not random per single cell (it turns into a dot matrix)
    const rows = Math.floor((s.H - lobbyH - mm(5) - fh * 0.6) / fh) + 1, cols = Math.ceil((s.W - mm(0.4)) / bay);
    const litC = new Array(rows * cols).fill(null);
    const blocks = Math.round(rows * cols * (resi ? 0.04 : 0.05));
    for (let b = 0; b < blocks; b++) {
        const bh = 1 + Math.floor(r() * (resi ? 2 : 4)), bw2 = 2 + Math.floor(r() * (resi ? 3 : 6));
        const r0 = Math.floor(Math.pow(r(), 0.8) * rows), c0 = Math.floor(r() * cols) - 1;
        const tone = tones[r() < 0.62 ? (r() < 0.5 ? 0 : 1) : r() < 0.55 ? 2 : r() < 0.75 ? 3 : 4];
        for (let i = r0; i < Math.min(rows, r0 + bh); i++) for (let j = Math.max(0, c0); j < Math.min(cols, c0 + bw2); j++) if (r() < 0.9) litC[i * cols + j] = tone;
    }
    for (let k = 0; k < rows * cols * 0.1; k++) litC[Math.floor(r() * rows * cols)] = tones[Math.floor(r() * 3)];
    let floor = 0;
    for (let y = mm(5); y < s.H - lobbyH - fh * 0.6; y += fh, floor++) {
        // Mechanical floor: two louver bands, no lights
        if (!resi && floor > 6 && floor % 17 === 0) {
            ctx.fillStyle = mix(glass, "#2a2440", 0.55);
            ctx.fillRect(0, y, s.W, fh);
            ctx.fillStyle = rgba("#b8b0dc", 0.25);
            for (let k = 0; k < 4; k++) ctx.fillRect(0, y + fh * (0.2 + k * 0.2), s.W, mm(0.12));
            continue;
        }
        for (let j = 0, x = 0; j < cols; j++, x += bay) {
            const tone = litC[floor * cols + j];
            if (!tone) continue;
            const a = 0.7 + 0.3 * r();
            const wy = y + mm(resi ? 0.7 : 0.45), wh = fh - mm(resi ? 1.6 : 0.95);
            const bw = Math.min(bay, s.W - x);
            const c = r() < 0.05 ? "#9fd8ff" : tone;   // the occasional TV-blue window
            ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, rgba(mix(c, "#ffffff", 0.35), a)], [1, rgba(c, a * 0.85)]]);
            ctx.fillRect(x, wy, bw, wh);
            ec.fillStyle = lin(ec, 0, wy, 0, wy + wh, [[0, rgba(mix(c, "#000000", 0.25), a)], [1, rgba(mix(c, "#000000", 0.45), a)]]);
            ec.fillRect(x, wy, bw, wh);
            // Blind review (11-24), night-scene paper feel: the windows are holes cut in card with light coming through from behind - a dark edge is drawn along the top and left edges of each hole (the thickness of the card blocks a bit of the light)
            for (const [c2, k] of [[ctx, 0.55], [ec, 0.8]]) {
                c2.fillStyle = rgba("#0a0818", k);
                c2.fillRect(x, wy, bw, mm(0.5));
                c2.fillRect(x, wy, mm(0.36), wh);
            }
            // People and partitions indoors (dark silhouettes)
            if (r() < 0.25) {
                ctx.fillStyle = rgba("#6a4a5a", 0.35);
                ctx.fillRect(x + bw * r(), wy + wh * 0.35, mm(0.35), wh * 0.65);
            }
        }
        // Floor-slab lines (residential: white balcony slabs + glass balustrades)
        if (resi) {
            ctx.fillStyle = "#ece6f6";
            ctx.fillRect(0, y + fh - mm(0.7), s.W, mm(0.7));
            ec.fillStyle = rgba("#ece6f6", 0.10);
            ec.fillRect(0, y + fh - mm(0.7), s.W, mm(0.7));
            ctx.fillStyle = rgba("#cfe0ff", 0.25);
            ctx.fillRect(0, y + fh - mm(1.7), s.W, mm(1.0));
        } else {
            ctx.fillStyle = mix(glass, "#0e0c22", 0.5);
            ctx.fillRect(0, y, s.W, mm(0.42));
        }
    }
    // Mullions
    ctx.fillStyle = resi ? rgba("#ece6f6", 0.35) : rgba("#1a1830", 0.55);
    for (let x = bay; x < s.W; x += bay) ctx.fillRect(x - mm(0.07), mm(5), mm(0.14), s.H - lobbyH - mm(5));
    // Bright corner edges
    ctx.fillStyle = rgba("#ffffff", 0.18);
    ctx.fillRect(0, 0, mm(0.5), s.H);
    ctx.fillStyle = rgba("#000000", 0.18);
    ctx.fillRect(s.W - mm(0.5), 0, mm(0.5), s.H);
    // Rooftop light strip
    for (const [y, wd] of [[mm(0.9), mm(0.7)], [mm(3.0), mm(0.35)]]) {
        ctx.fillStyle = crown;
        ctx.fillRect(0, y, s.W, wd);
        ec.fillStyle = crown;
        ec.fillRect(0, y, s.W, wd);
    }
    for (let k = 1; k <= band; k++) {
        const y = mm(5) + (s.H - lobbyH - mm(5)) * k / (band + 1);
        ctx.fillStyle = crown;
        ctx.fillRect(0, y, s.W, mm(0.32));
        ec.fillStyle = mix(crown, "#000000", 0.2);
        ec.fillRect(0, y, s.W, mm(0.32));
    }
    // Lobby: two-story-high warmly lit glass, vertical door-frame bars, a canopy along the top edge
    if (lobby) {
        const ly = s.H - lobbyH;
        ctx.fillStyle = "#2a2440";
        ctx.fillRect(0, ly, s.W, mm(1.1));
        ctx.fillStyle = lin(ctx, 0, ly, 0, s.H, [[0, "#ffe6b8"], [1, "#ffb878"]]);
        ctx.fillRect(mm(1.2), ly + mm(1.1), s.W - mm(2.4), lobbyH - mm(1.1));
        ec.fillStyle = lin(ec, 0, ly, 0, s.H, [[0, "#c8a070"], [1, "#a86a38"]]);
        ec.fillRect(mm(1.2), ly + mm(1.1), s.W - mm(2.4), lobbyH - mm(1.1));
        ctx.fillStyle = "#3a3050";
        ec.fillStyle = "#000";
        for (let x = mm(1.2); x <= s.W - mm(1.1); x += mm(2.4)) { ctx.fillRect(x, ly + mm(1.1), mm(0.22), lobbyH); ec.fillRect(x, ly + mm(1.1), mm(0.22), lobbyH); }
        ctx.fillStyle = rgba("#5a3a50", 0.55);
        for (let k = 0; k < 3; k++) {
            const x = s.W * (0.2 + 0.3 * k + (r() - 0.5) * 0.1);
            ctx.fillRect(x, ly + lobbyH * 0.45, mm(0.7), lobbyH * 0.55);
            ctx.beginPath(); ctx.arc(x + mm(0.35), ly + lobbyH * 0.4, mm(0.4), 0, Math.PI * 2); ctx.fill();
        }
    }
    grain(ctx, 0.05);
    return {canvas: s.canvas, emissive: e.canvas};
}

function towerBlock(g, id, W, D, H, z0, opts, roofSeed) {
    const front = paintTowerFace(W, H, opts), side = paintTowerFace(D, H, {...opts, seed: opts.seed + 7});
    const wall = (sv, w, x, y, rz, part) => {
        const m = standUp(rectSheet(sv.canvas, {id: `${id}.${part}`, width: w, height: H, thickness: 0.8, emissive: sv.emissive, emissiveIntensity: 1.0,   // the dark edges on the window holes dimmed them, so the emissive goes from 0.85 -> 1.0 to compensate
            back: "#1e2040"}));
        const mat = m.children[0].userData.paper.meta.mat;
        Object.assign(mat.front, {gloss: "varnish", glossTier: 2});   // Fix item 29 version B: spot varnish on the tower facade (at night)
        // Blind review (11-24), night-scene paper feel: window light varies with the paper texture (the style reads glowPaper); the cut edges of the card glow faintly at night, outlining the shape of card pieces joined together (following the time-of-day neon coefficient)
        mat.front.glowPaper = 1.7;
        mat.edge = {...mat.edge, color: "#f0eaff", emissiveColor: "#c8bcff", emissive: 1.25};
        m.position.set(x, y, z0);
        m.rotation.z = rz;
        g.add(m);
    };
    wall(front, W, 0, 0, 0, "f");
    wall(front, W, 0, D, Math.PI, "b");
    wall(side, D, -W / 2, D / 2, -Math.PI / 2, "l");
    wall(side, D, W / 2, D / 2, Math.PI / 2, "r");
    const roof = rectSheet(paintRoof(W, D, 5, roofSeed, "#3a3a58"), {id: id + ".roof", width: W, height: D, thickness: 0.8, origin: "center"});
    roof.position.set(0, D / 2, z0 + H);
    g.add(roof);
}

export function glassTower(id, {W = 34, D = 26, H = 160, seed = 1, glass = "#3a4a7a", crown = "#3ff0e0", top = "flat", band = 0, kind = "office"} = {}) {
    const g = new THREE.Group();
    const opts = {seed, glass, crown, kind, band};
    // Tall tower: the lower section takes 70%, the upper section steps back to 0.72
    let topZ = H;
    if (H > 150) {
        const h1 = Math.round(H * 0.7);
        towerBlock(g, id + ".lo", W, D, h1, 0, opts, seed);
        const W2 = W * 0.72, D2 = D * 0.72;
        const up = new THREE.Group();
        up.position.y = (D - D2) / 2;
        towerBlock(up, id + ".hi", W2, D2, H - h1, h1, {...opts, seed: seed + 3, band: 0, lobby: false}, seed + 1);
        g.add(up);
    } else {
        towerBlock(g, id, W, D, H, 0, opts, seed);
    }
    const tw = H > 150 ? W * 0.72 : W, td = H > 150 ? D * 0.72 : D;
    if (top === "spire") {
        const sp = customPaper(new THREE.ConeGeometry(Math.min(tw, td) * 0.3, H * 0.2, 4), id + ".spire", {color: "#dfe6ff", rough: 0.4,
            emissiveColor: crown, emissive: 0.4});
        sp.rotation.x = Math.PI / 2;
        sp.rotation.y = Math.PI / 4;
        sp.position.set(0, D / 2, topZ + H * 0.1);
        g.add(sp);
        topZ += H * 0.2;
    } else if (top === "crown") {
        const cr = customPaper(new THREE.BoxGeometry(tw * 0.7, td * 0.7, 8), id + ".crown", {color: "#2a2a48", emissiveColor: crown, emissive: 0.6});
        cr.position.set(0, D / 2, topZ + 4);
        g.add(cr);
        topZ += 8;
    }
    const beacon = customPaper(new THREE.SphereGeometry(0.9, 8, 6), id + ".beacon", {color: "#ff3040", emissiveColor: "#ff2030", emissive: 3});
    beacon.position.set(0, D / 2, topZ + 1);
    g.add(beacon);
    return g;
}

// Lights on the ground (emissive layer): warm halos under street lamps, colored light under neon signs
export function paintGroundGlow(wMm, hMm, ppm, pools) {
    const {canvas, ctx, mm} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    for (const {x, y, r, color, a = 0.35} of pools) {
        const g = ctx.createRadialGradient(mm(x), mm(y), 0, mm(x), mm(y), mm(r));
        g.addColorStop(0, rgba(color, a));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(mm(x - r), mm(y - r), mm(2 * r), mm(2 * r));
    }
    return canvas;
}
// ---------- Gas station: giant tire sign + GAS red arrow + red neon slanted canopy (VC_22) ----------
export function gasStation(id) {
    const g = new THREE.Group();
    // Sign: one whole standee (tire + text + arrow + posts)
    const s = sheet(30, 62, 12), e = sheet(30, 62, 12);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    // Posts: two steel columns + diagonal braces
    ctx.strokeStyle = "#6a6488";
    ctx.lineWidth = mm(0.9);
    for (const x of [W * 0.42, W * 0.58]) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, mm(20)); ctx.stroke(); }
    ctx.lineWidth = mm(0.35);
    for (let y = H - mm(3); y > mm(34); y -= mm(5)) {
        ctx.beginPath(); ctx.moveTo(W * 0.42, y); ctx.lineTo(W * 0.58, y - mm(5)); ctx.moveTo(W * 0.58, y); ctx.lineTo(W * 0.42, y - mm(5)); ctx.stroke();
    }
    // Tire
    const cx = W / 2, cy = mm(11), R0 = mm(10.5);
    const tire = new Path2D();
    tire.ellipse(cx, cy, R0, R0, 0, 0, Math.PI * 2);
    tire.ellipse(cx, cy, R0 * 0.52, R0 * 0.52, 0, 0, Math.PI * 2, true);
    lit(ctx, tire, "#3a3440", {sw: mm(1.6), rw: mm(0.6), rim: "#ffb0c8"});
    // Tread
    ctx.save(); ctx.clip(tire);
    ctx.strokeStyle = rgba("#1a1620", 0.7);
    ctx.lineWidth = mm(0.4);
    for (let k = 0; k < 36; k++) {
        const a = k * Math.PI / 18;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R0 * 0.92, cy + Math.sin(a) * R0 * 0.92);
        ctx.lineTo(cx + Math.cos(a + 0.08) * R0, cy + Math.sin(a + 0.08) * R0);
        ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "#d8d0e8";
    ctx.fill(ellipse(cx, cy, R0 * 0.5, R0 * 0.5));
    // White text RICARDO / TIRES along the ring
    const arcText = (text, r0, a0, a1, size) => {
        ctx.save();
        ctx.font = `800 ${size}px Bahnschrift, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        const n = text.length;
        for (let k = 0; k < n; k++) {
            const a = lerp(a0, a1, (k + 0.5) / n);
            ctx.save();
            ctx.translate(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
            ctx.rotate(a + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2));
            ctx.fillText(text[k], 0, size * 0.35);
            ctx.restore();
        }
        ctx.restore();
    };
    arcText("RICARDO", R0 * 0.76, -Math.PI * 0.85, -Math.PI * 0.15, mm(2.6));
    arcText("TIRES", R0 * 0.76, Math.PI * 0.78, Math.PI * 0.22, mm(2.6));
    // GAS double-headed arrow (neon on a red background)
    const ay = mm(29);
    const arrow = poly([[mm(1), ay], [mm(6), ay - mm(5)], [mm(6), ay - mm(2.6)], [W - mm(6), ay - mm(2.6)], [W - mm(6), ay - mm(5)], [W - mm(1), ay],
        [W - mm(6), ay + mm(5)], [W - mm(6), ay + mm(2.6)], [mm(6), ay + mm(2.6)], [mm(6), ay + mm(5)]]);
    lit(ctx, arrow, "#e0283a", {sw: mm(0.6), rw: mm(0.25)});
    em.fillStyle = "#701018";
    em.fill(arrow);
    neonLine(ctx, em, [[mm(1.6), ay], [mm(6), ay - mm(4.2)], [mm(6), ay - mm(2)], [W - mm(6), ay - mm(2)], [W - mm(6), ay - mm(4.2)], [W - mm(1.6), ay],
        [W - mm(6), ay + mm(4.2)], [W - mm(6), ay + mm(2)], [mm(6), ay + mm(2)], [mm(6), ay + mm(4.2)], [mm(1.6), ay]], "#ff3a50", mm(0.35));
    neonText(ctx, em, "GAS", W / 2, ay + mm(1.9), mm(5.4), "#fff0f0", "Bahnschrift", "800", {glow: 0.6});
    finish(s.canvas, {inkW: mm(0.1)});
    const sign = standUp(cutout(s.canvas, {id: id + ".sign", ppm: 12, thickness: 1.2, emissive: e.canvas, emissiveIntensity: 1.6, trace: {cell: 3, dilate: 1},
        back: "#3a3440"}));
    sign.position.set(-26, 6, 0);
    g.add(sign);
    // Canopy: a long slanted roof with a red neon tube along the front edge
    const canopy = new THREE.Group();
    const roofM = customPaper(new THREE.BoxGeometry(46, 20, 1.4), id + ".canopy", {color: "#d8d0e0", rough: 0.6});
    canopy.add(roofM);
    for (const [y, z] of [[-10.2, -0.4], [10.2, -0.4]]) {
        const tube = customPaper(new THREE.BoxGeometry(46.4, 0.6, 0.6), id + ".tube", {color: "#ff4060", emissiveColor: "#ff2040", emissive: 4.5});
        tube.position.set(0, y, z);
        canopy.add(tube);
    }
    // Canopy underside: two rows of white light panels (at night the gas station is the brightest spot on the whole street)
    for (let x = -18; x <= 18; x += 9) for (const y of [-4.5, 4.5]) {
        const panel = customPaper(new THREE.BoxGeometry(5, 2.2, 0.3), id + ".panel", {color: "#ffffff", emissiveColor: "#fff4e0", emissive: 2.2});
        panel.position.set(x, y, -0.85);
        canopy.add(panel);
    }
    canopy.position.set(14, 6, 17);
    canopy.rotation.x = -0.08;
    g.add(canopy);
    // Convenience store + tire shop (the building on the left in VC_22, ...DOS TIRES): white walls, red signboard band, lit floor-to-ceiling glass
    {
        const MW = 34, MD = 12, MH = 12;
        const fs = sheet(MW, MH, 14), fe = sheet(MW, MH, 14);
        const c = fs.ctx, m = fs.mm;
        fe.ctx.fillStyle = "#000";
        fe.ctx.fillRect(0, 0, fs.W, fs.H);
        c.fillStyle = "#ece6f2";
        c.fillRect(0, 0, fs.W, fs.H);
        c.fillStyle = "#d8283a";
        c.fillRect(0, m(1), fs.W, m(3));
        neonText(c, fe.ctx, "RICARDO'S TIRES · MINI MART", fs.W / 2, m(3.3), m(2.2), "#ffffff", "Bahnschrift", "800", {glow: 0.4});
        for (let k = 0; k < 4; k++) {
            const x = m(1.5 + k * 8), wd = m(6.4), y = m(5.4), h = m(6.6);
            c.fillStyle = lin(c, 0, y, 0, y + h, [[0, "#fff2d0"], [1, "#ffc890"]]);
            c.fillRect(x, y, wd, h);
            fe.ctx.fillStyle = "#c8a070";
            fe.ctx.fillRect(x, y, wd, h);
            c.fillStyle = rgba("#c04a5a", 0.6);
            for (let s2 = 0; s2 < 3; s2++) c.fillRect(x + m(0.6), y + m(1.2 + s2 * 1.8), wd - m(1.2), m(0.6));   // shelves
            c.fillStyle = "#3a3450";
            c.fillRect(x + wd / 2 - m(0.1), y, m(0.2), h);
        }
        grain(c, 0.06);
        const body = customPaper(new THREE.BoxGeometry(MW, MD, MH), id + ".mart", {color: "#ddd4e6", rough: 0.85});
        body.position.set(14, 30, MH / 2);
        g.add(body);
        const front = standUp(rectSheet(fs.canvas, {id: id + ".martFront", width: MW, height: MH, thickness: 0.3, emissive: fe.canvas, emissiveIntensity: 1.3}));
        front.position.set(14, 30 - MD / 2 - 0.2, 0);
        g.add(front);
        g.userData.mart = body;
    }
    for (const [x, y] of [[-6, -2], [-6, 14], [34, -2], [34, 14]]) {
        const post = customPaper(new THREE.BoxGeometry(1, 1, 16.5), id + ".post", {color: "#f0e8f4"});
        post.position.set(x, y, 8.25);
        g.add(post);
    }
    // Two groups of fuel pumps
    for (const x of [6, 22]) {
        const ps = sheet(4, 8, PPM), pe = sheet(4, 8, PPM);
        pe.ctx.fillStyle = "#000";
        pe.ctx.fillRect(0, 0, ps.W, ps.H);
        const body = roundRect(ps.mm(0.2), ps.mm(0.2), ps.W - ps.mm(0.4), ps.H - ps.mm(0.4), ps.mm(0.4));
        lit(ps.ctx, body, "#f4f0ff", {sw: ps.mm(0.5), rw: ps.mm(0.2)});
        ps.ctx.fillStyle = "#e0283a";
        ps.ctx.fillRect(ps.mm(0.2), ps.mm(0.2), ps.W - ps.mm(0.4), ps.mm(1.4));
        ps.ctx.fillStyle = "#1e2a3a";
        ps.ctx.fillRect(ps.mm(0.8), ps.mm(2.2), ps.W - ps.mm(1.6), ps.mm(1.6));
        pe.ctx.fillStyle = "#5ad0ff";
        pe.ctx.fillRect(ps.mm(0.8), ps.mm(2.2), ps.W - ps.mm(1.6), ps.mm(1.6));
        finish(ps.canvas, {inkW: ps.mm(0.06)});
        const pump = customPaper(new THREE.BoxGeometry(4, 2.4, 8), id + ".pump" + x, {map: toTexture(ps.canvas), emissiveMap: toTexture(pe.canvas), emissive: 1.5});
        pump.position.set(x, 6, 4);
        g.add(pump);
    }
    g.userData.cores = [sign, canopy, g.userData.mart, ...g.children.filter(c => c.name?.includes?.("pump"))];
    return g;
}

// ---------- Overpass: deck + a row of mural pillars (VC_09) ----------
function paintMural(ppm, wMm, hMm, seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    const palettes = [["#8a5ad0", "#c9a0ff", "#ffd36a", "#ffffff"], ["#e0283a", "#ffd36a", "#3fb8b0", "#2a3a8a"], ["#3fb8b0", "#ff8fc0", "#fff1d6", "#5a2a8a"]];
    const pal = palettes[seed % palettes.length];
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, W, H);
    // Curled cloud edges, stars, big letters
    for (let i = 0; i < 9; i++) {
        ctx.fillStyle = pal[1 + (i % 2)];
        ctx.beginPath();
        const y = r() * H, rr = mm(2 + r() * 3);
        for (let k = 0; k < 4; k++) ctx.arc(W * (k / 3), y + Math.sin(k) * mm(1), rr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = pal[3];
    for (let i = 0; i < 7; i++) {
        const x = r() * W, y = r() * H, rr = mm(0.8 + r());
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? rr * 0.45 : rr; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
        ctx.fill();
    }
    ctx.font = `900 ${mm(wMm * 0.55)}px Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = pal[3];
    ctx.strokeStyle = "#1e1628";
    ctx.lineWidth = mm(0.4);
    const letter = "VICE"[seed % 4];
    ctx.strokeText(letter, W * 0.5, H * 0.55);
    ctx.fillText(letter, W * 0.5, H * 0.55);
    grain(ctx, 0.1);
    return canvas;
}

export function overpass(id, {x0 = -260, x1 = 260, h = 30, w = 26, every = 46, seed = 1, pillarR = 4.5} = {}) {
    const g = new THREE.Group();
    const L = x1 - x0;
    const ds = sheet(L, w, 4);
    ds.ctx.fillStyle = "#8a84a8";
    ds.ctx.fillRect(0, 0, ds.W, ds.H);
    ds.ctx.fillStyle = "#f5c86a";
    ds.ctx.fillRect(0, ds.H / 2 - ds.mm(0.3), ds.W, ds.mm(0.6));
    ds.ctx.fillStyle = rgba("#ffffff", 0.7);
    for (let x = 0; x < ds.W; x += ds.mm(8)) { ds.ctx.fillRect(x, ds.H * 0.25, ds.mm(4), ds.mm(0.3)); ds.ctx.fillRect(x, ds.H * 0.75, ds.mm(4), ds.mm(0.3)); }
    grain(ds.ctx, 0.08);
    const deck = customPaper(new THREE.BoxGeometry(L, w, 3), id + ".deck", {map: toTexture(ds.canvas), rough: 0.85});
    deck.position.set((x0 + x1) / 2, 0, h + 1.5);
    g.add(deck);
    // Guardrails on both sides of the deck and a row of orange street lamps
    for (const y of [-w / 2 + 0.4, w / 2 - 0.4]) {
        const rail = customPaper(new THREE.BoxGeometry(L, 0.8, 2.2), id + ".rail", {color: "#c9c3dc"});
        rail.position.set((x0 + x1) / 2, y, h + 4.1);
        g.add(rail);
    }
    const cores = [deck];
    for (let x = x0 + every / 2, k = 0; x < x1; x += every, k++) {
        const tex = toTexture(paintMural(10, 2 * pillarR * Math.PI, h, seed + k));
        const col = customPaper(new THREE.CylinderGeometry(pillarR, pillarR, h, 20, 1, false), `${id}.pillar${k}`, {map: tex, rough: 0.9});
        col.rotation.x = Math.PI / 2;
        col.position.set(x, 0, h / 2);
        g.add(col);
        cores.push(col);
        const capM = customPaper(new THREE.BoxGeometry(12, 14, 2.4), `${id}.cap${k}`, {color: "#a8a2c4"});
        capM.position.set(x, 0, h - 1.2);
        g.add(capM);
        const lampPole = customPaper(new THREE.BoxGeometry(0.5, 0.5, 8), `${id}.lp${k}`, {color: "#5a5478"});
        lampPole.position.set(x, -w / 2 + 1, h + 7);
        g.add(lampPole);
        const lampHead = customPaper(new THREE.BoxGeometry(3, 1.2, 0.8), `${id}.lh${k}`, {color: "#ffd9a0", emissiveColor: "#ffb060", emissive: 3});
        lampHead.position.set(x, -w / 2 + 2.2, h + 11);
        g.add(lampHead);
    }
    g.userData.cores = cores;
    return g;
}

// ---------- Stadium: flattened round shape + LED outer ring ----------
export function arena(id, {r = 34, h = 18} = {}) {
    const g = new THREE.Group();
    const s = sheet(2 * Math.PI * r, h, 4), e = sheet(2 * Math.PI * r, h, 4);
    // Skin: pale metal panels + a ring of glass band, with LED zigzag lines running over it at night
    s.ctx.fillStyle = lin(s.ctx, 0, 0, 0, s.H, [[0, "#d8d0ec"], [0.5, "#a89cc8"], [1, "#6a5e94"]]);
    s.ctx.fillRect(0, 0, s.W, s.H);
    s.ctx.fillStyle = "#3a3060";
    s.ctx.fillRect(0, s.H * 0.82, s.W, s.H * 0.18);
    e.ctx.fillStyle = "#3a2a20";
    e.ctx.fillRect(0, s.H * 0.84, s.W, s.H * 0.14);
    e.ctx.fillStyle = "#000";
    e.ctx.fillRect(0, 0, s.W, s.H);
    // Diagonal LED diamond grid (the zigzag skin in VC_08)
    for (let k = 0; k < 24; k++) {
        const x = k * s.W / 24;
        const c = ["#3ff0e0", "#ff4fa3", "#ffffff"][k % 3];
        for (const [c2, isEm] of [[s.ctx, false], [e.ctx, true]]) {
            c2.strokeStyle = isEm ? mix(c, "#000000", 0.2) : c;
            c2.lineWidth = s.mm(0.9);
            c2.beginPath();
            c2.moveTo(x, s.H * 0.2);
            c2.lineTo(x + s.W / 48, s.H * 0.8);
            c2.lineTo(x + s.W / 24, s.H * 0.2);
            c2.stroke();
        }
    }
    const shell = customPaper(new THREE.CylinderGeometry(r, r * 1.08, h, 48, 1, true), id + ".shell",
        {map: toTexture(s.canvas), emissiveMap: toTexture(e.canvas), emissive: 1.4, side: "double"});
    shell.rotation.x = Math.PI / 2;
    shell.position.z = h / 2;
    g.add(shell);
    const roofM = customPaper(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 2, 48), id + ".roof", {color: "#d8d4e8", rough: 0.5});
    roofM.rotation.x = Math.PI / 2;
    roofM.position.z = h + 1;
    g.add(roofM);
    const dome = customPaper(new THREE.SphereGeometry(r * 0.8, 32, 8, 0, Math.PI * 2, 0, 0.5), id + ".dome", {color: "#efe9f8", rough: 0.4});
    dome.rotation.x = Math.PI / 2;
    dome.position.z = h + 1 - r * 0.8 * Math.cos(0.5);
    g.add(dome);
    return g;
}

// ---------- Police helicopter + searchlight ----------
export function heli(id) {
    const g = new THREE.Group();
    const body = customPaper(new THREE.CapsuleGeometry(3.2, 7, 6, 12), id + ".body", {color: "#f4f4f8", rough: 0.35});
    body.rotation.z = Math.PI / 2;
    g.add(body);
    const stripe = customPaper(new THREE.CapsuleGeometry(3.25, 7, 6, 12, 1), id + ".stripe", {color: "#1f3a6a", rough: 0.35});
    stripe.rotation.z = Math.PI / 2;
    stripe.scale.set(1, 1, 0.35);
    stripe.position.z = -0.6;
    g.add(stripe);
    const glass = customPaper(new THREE.SphereGeometry(2.8, 12, 8, 0, Math.PI), id + ".glass", {color: "#5a6aa8", rough: 0.1, emissiveColor: "#203060", emissive: 0.6});
    glass.rotation.y = -Math.PI / 2;
    glass.position.x = 4.2;
    g.add(glass);
    const tail = customPaper(new THREE.BoxGeometry(12, 1, 1.2), id + ".tail", {color: "#f4f4f8"});
    tail.position.set(-10, 0, 1);
    g.add(tail);
    const fin = customPaper(new THREE.BoxGeometry(2.4, 0.4, 3.6), id + ".fin", {color: "#1f3a6a"});
    fin.position.set(-15.5, 0, 2.4);
    g.add(fin);
    for (const y of [-2.6, 2.6]) {
        const skid = customPaper(new THREE.BoxGeometry(11, 0.5, 0.5), id + ".skid", {color: "#3a3a48"});
        skid.position.set(0.5, y, -4.2);
        g.add(skid);
    }
    const mast = customPaper(new THREE.CylinderGeometry(0.4, 0.4, 2, 6), id + ".mast", {color: "#3a3a48"});
    mast.rotation.x = Math.PI / 2;
    mast.position.z = 4;
    g.add(mast);
    // Rotor: translucent disc (the blades cannot be made out when it spins) + two blades
    const disc = new THREE.Mesh(new THREE.CircleGeometry(13, 32), new THREE.MeshBasicMaterial({color: 0x9a96b8, transparent: true, opacity: 0.18, depthWrite: false}));
    disc.position.z = 5.1;
    disc.userData.noAudit = true;
    g.add(disc);
    const blades = new THREE.Group();
    for (const a of [0, Math.PI / 2]) {
        const b = customPaper(new THREE.BoxGeometry(26, 1, 0.2), id + ".blade", {color: "#2a2a38"}, {castShadow: false});   // Blind review: the shadow of the fast-spinning rotor lands on the fuselage lettering every frame (at 46 s the Z of WEAZEL is covered by a dark band), so it casts no shadow
        b.rotation.z = a;
        blades.add(b);
    }
    blades.position.z = 5.2;
    g.add(blades);
    g.userData.blades = blades;
    const nav = customPaper(new THREE.SphereGeometry(0.5, 6, 4), id + ".nav", {color: "#ff3040", emissiveColor: "#ff2030", emissive: 4, flash: "red"});
    nav.position.set(-15.6, 0, 4.4);
    g.add(nav);
    // Searchlight: a light cone angled down from the belly (additive, no depth write)
    const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 60, 24, 1, true),
        new THREE.MeshBasicMaterial({color: new THREE.Color("#fff6e0").multiplyScalar(0.55), transparent: true, opacity: 0.22,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false}));
    cone.geometry.translate(0, -30, 0);
    cone.userData.noAudit = true;
    const aim = new THREE.Group();
    aim.position.set(3, 0, -3.5);
    aim.add(cone);
    g.add(aim);
    g.userData.beam = aim;
    return g;
}

// Searchlight spot on the ground (an additive ellipse lying on the ground)
export function spotDecal(id, r = 14) {
    const s = sheet(2, 2, 64);
    const gr = s.ctx.createRadialGradient(s.W / 2, s.H / 2, 0, s.W / 2, s.H / 2, s.W / 2);
    gr.addColorStop(0, "rgba(255,250,235,1)");
    gr.addColorStop(0.6, "rgba(255,245,225,0.55)");
    gr.addColorStop(1, "rgba(255,240,220,0)");
    s.ctx.fillStyle = gr;
    s.ctx.fillRect(0, 0, s.W, s.H);
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({map: toTexture(s.canvas), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.9, 0.86, 0.78), fog: false}));
    m.name = id;
    return m;
}

// Downtown ground: street grid + sidewalks + crosswalks + printed street names
export function paintDowntownGround(wMm, hMm, ppm, seed, {streets = [], avenues = [], labels = [], parks = [], lots = [], plazas = []} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    // Sidewalks: warm grey concrete (lit warm by lamps at night, no longer all lavender purple)
    ctx.fillStyle = "#c9b8bc";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? "#b8a4b4" : "#d8c8c4", 0.35);
        ctx.fillRect(r() * W, r() * H, mm(4 + r() * 16), mm(3 + r() * 12));
    }
    ctx.strokeStyle = rgba("#a898b8", 0.5);
    ctx.lineWidth = mm(0.12);
    for (let x = 0; x < W; x += mm(3)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += mm(3)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Plaza: ochre-red square tiles + a pale border
    for (const {x, y, w, h} of plazas) {
        ctx.fillStyle = "#c98a7a";
        ctx.fillRect(mm(x), mm(y), mm(w), mm(h));
        ctx.strokeStyle = rgba("#8a5a5a", 0.5);
        ctx.lineWidth = mm(0.1);
        for (let k = x; k < x + w; k += 2) { ctx.beginPath(); ctx.moveTo(mm(k), mm(y)); ctx.lineTo(mm(k), mm(y + h)); ctx.stroke(); }
        for (let k = y; k < y + h; k += 2) { ctx.beginPath(); ctx.moveTo(mm(x), mm(k)); ctx.lineTo(mm(x + w), mm(k)); ctx.stroke(); }
        ctx.strokeStyle = "#efe0d8";
        ctx.lineWidth = mm(0.6);
        ctx.strokeRect(mm(x), mm(y), mm(w), mm(h));
    }
    // Park: lawn + winding paths + flower beds
    for (const {x, y, w, h} of parks) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(mm(x), mm(y), mm(w), mm(h), mm(4));
        ctx.clip();
        ctx.fillStyle = "#5f9a62";
        ctx.fillRect(mm(x), mm(y), mm(w), mm(h));
        for (let i = 0; i < w * h / 6; i++) {
            ctx.fillStyle = rgba(r() < 0.5 ? "#4a8a58" : "#7ab070", 0.5);
            ctx.fillRect(mm(x + r() * w), mm(y + r() * h), mm(0.4), mm(0.9));
        }
        ctx.strokeStyle = "#e8d8c8";
        ctx.lineWidth = mm(2.2);
        ctx.beginPath();
        ctx.moveTo(mm(x), mm(y + h * 0.7));
        ctx.bezierCurveTo(mm(x + w * 0.3), mm(y + h * 0.2), mm(x + w * 0.6), mm(y + h * 0.95), mm(x + w), mm(y + h * 0.35));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mm(x + w * 0.45), mm(y));
        ctx.quadraticCurveTo(mm(x + w * 0.55), mm(y + h * 0.5), mm(x + w * 0.4), mm(y + h));
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = "#e8d8c8";
        ctx.lineWidth = mm(0.8);
        ctx.beginPath();
        ctx.roundRect(mm(x), mm(y), mm(w), mm(h), mm(4));
        ctx.stroke();
    }
    const road = (x, y, w, h) => {
        ctx.fillStyle = "#5e5878";
        ctx.fillRect(x, y, w, h);
        for (let i = 0; i < w * h / mm(1) / mm(1) * 0.3; i++) {
            ctx.fillStyle = r() < 0.5 ? rgba("#8a84a8", 0.3) : rgba("#3a3458", 0.3);
            ctx.fillRect(x + r() * w, y + r() * h, mm(0.15), mm(0.15));
        }
    };
    // Parking lot: asphalt + white parking-space lines
    for (const {x, y, w, h} of lots) {
        road(mm(x), mm(y), mm(w), mm(h));
        ctx.fillStyle = rgba("#ffffff", 0.8);
        for (let k = x + 1; k < x + w - 1; k += 5.5) {
            ctx.fillRect(mm(k), mm(y + 0.8), mm(0.3), mm(h * 0.38));
            ctx.fillRect(mm(k), mm(y + h - 0.8 - h * 0.38), mm(0.3), mm(h * 0.38));
        }
    }
    // streets: horizontal roads (along world x), given as canvas y (top to bottom) and width; avenues: vertical roads [x, w, canvas y start, canvas y end]
    for (const [y, w] of streets) road(0, mm(y - w / 2), W, mm(w));
    for (const [x, w, a = 0, b = hMm] of avenues) road(mm(x - w / 2), mm(a), mm(w), mm(b - a));
    for (const [y, w] of streets) {
        ctx.fillStyle = "#f5c86a";
        ctx.fillRect(0, mm(y) - mm(0.45), W, mm(0.3));
        ctx.fillRect(0, mm(y) + mm(0.15), W, mm(0.3));
        ctx.fillStyle = rgba("#ffffff", 0.75);
        for (let x = 0; x < W; x += mm(7)) { ctx.fillRect(x, mm(y - w / 4), mm(3.5), mm(0.25)); ctx.fillRect(x, mm(y + w / 4), mm(3.5), mm(0.25)); }
        // Curb: a pale stone curb
        ctx.fillStyle = "#e6d8d8";
        ctx.fillRect(0, mm(y - w / 2) - mm(0.5), W, mm(0.5));
        ctx.fillRect(0, mm(y + w / 2), W, mm(0.5));
    }
    for (const [x, w, a = 0, b = hMm] of avenues) {
        ctx.fillStyle = "#f5c86a";
        for (let y = mm(a); y < mm(b); y += mm(7)) ctx.fillRect(mm(x) - mm(0.35), y, mm(0.25), mm(3.5)), ctx.fillRect(mm(x) + mm(0.1), y, mm(0.25), mm(3.5));
        ctx.fillStyle = "#e6d8d8";
        ctx.fillRect(mm(x - w / 2) - mm(0.5), mm(a), mm(0.5), mm(b - a));
        ctx.fillRect(mm(x + w / 2), mm(a), mm(0.5), mm(b - a));
        // Intersection crosswalks
        ctx.fillStyle = rgba("#ffffff", 0.8);
        for (const [sy, sw] of streets) {
            if (sy + sw / 2 < a - 4 || sy - sw / 2 > b + 4) continue;
            for (let k = -w / 2 + 1; k < w / 2 - 0.5; k += 1.5) {
                ctx.fillRect(mm(x + k), mm(sy - sw / 2 - 3.5), mm(0.8), mm(3));
                ctx.fillRect(mm(x + k), mm(sy + sw / 2 + 0.5), mm(0.8), mm(3));
            }
        }
    }
    for (const {text, x, y, size} of labels) {
        ctx.save();
        ctx.font = `700 ${mm(size)}px "Bahnschrift Condensed", Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = `${mm(size) * 0.08}px`;
        ctx.lineWidth = mm(size) * 0.12;
        ctx.strokeStyle = "#3a3060";
        ctx.strokeText(text, mm(x), mm(y));
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, mm(x), mm(y));
        ctx.restore();
    }
    grain(ctx, 0.1, 2);
    return canvas;
}

// Street lamp (lit at night): curved-head lamp pole
export function streetLight(id) {
    const s = sheet(8, 22, PPM), e = sheet(8, 22, PPM);
    const {ctx, mm, W, H} = s;
    e.ctx.fillStyle = "#000";
    e.ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#4a4466";
    ctx.lineWidth = mm(0.6);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(mm(1.5), H - mm(0.3));
    ctx.lineTo(mm(1.5), mm(3));
    ctx.quadraticCurveTo(mm(1.5), mm(1), mm(4), mm(1.2));
    ctx.lineTo(mm(6), mm(1.4));
    ctx.stroke();
    const head = roundRect(mm(4.6), mm(1.2), mm(3), mm(1.1), mm(0.4));
    ctx.fillStyle = "#ffe2b0";
    ctx.fill(head);
    e.ctx.fillStyle = "#ffcf8a";
    e.ctx.fill(head);
    finish(s.canvas, {inkW: mm(0.07)});
    const m = cutout(s.canvas, {id, ppm: PPM, thickness: 0.6, emissive: e.canvas, emissiveIntensity: 3, anchor: [mm(1.5) / W, 0], trace: {cell: 2, dilate: 1},
        back: "#4a4466"});
    return standUp(m);
}
void [P, finish];

// =====================================================================
// Round 4: components used to fill in downtown density
// =====================================================================

// ---------- Street trees (sea grape / banyan in the downtown plaza and park): thin trunk + three crossed round crown cutouts, so they have volume from any viewing direction ----------
function paintCanopy(ppm, wMm, hMm, seed, {base = "#3f7a5a", light = "#7fc08a"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm + 1, hMm + 1, ppm);
    const blobs = [];
    const n = Math.round(wMm * hMm / 9) + 6;
    for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.62;
        const x = W / 2 + Math.cos(a) * d * (W / 2 - mm(1.4)), y = H * 0.52 + Math.sin(a) * d * (H / 2 - mm(1.4));
        blobs.push([x, y, mm(1.1 + r() * 1.3)]);
    }
    blobs.sort((p, q) => p[1] - q[1]);
    for (const [x, y, rd] of blobs) lit(ctx, ellipse(x, y, rd, rd * 0.9), mix(base, light, r() * 0.35), {sw: rd * 0.5, rw: rd * 0.18, blur: rd * 0.08});
    // darken the lower half of the crown (self-shadowing)
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "rgba(0,0,0,0)"], [0.55, "rgba(0,0,0,0)"], [1, rgba("#1e2a40", 0.45)]]);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return finish(canvas, {inkW: mm(0.08), ink: "#1e3030"});
}

export function shadeTree(id, {h = 16, w = 14, seed = 1, base = "#3f7a5a", light = "#7fc08a"} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    const trunk = customPaper(new THREE.CylinderGeometry(0.45, 0.75, h * 0.6, 7), id + ".trunk", {color: "#6a5048", rough: 0.9});
    trunk.rotation.x = Math.PI / 2;
    trunk.position.z = h * 0.3;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.z = h * 0.38;
    for (let k = 0; k < 3; k++) {
        const c = paintCanopy(PPM * 0.7, w * (0.9 + 0.15 * r()), h * 0.62, seed * 11 + k, {base, light});
        const m = standUp(cutout(c, {id: `${id}.c${k}`, ppm: PPM * 0.7, thickness: 0.5, trace: {cell: 3, dilate: 1}, edge: mix(base, "#1e3030", 0.4)}));
        m.rotation.z = k * Math.PI / 3 + (r() - 0.5) * 0.2;
        crown.add(m);
    }
    g.add(crown);
    g.userData.cores = [trunk, crown];
    return g;
}

// ---------- Rooftop clutter: AC condensers, water tanks, vent caps (the roofs of low-rise buildings no longer look like a flat sheet of paper from above) ----------
export function roofClutter(id, W, D, seed, {tank = false} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    const n = Math.max(2, Math.round(W * D / 260));
    for (let i = 0; i < n; i++) {
        const w = 3 + r() * 4, d = 2.5 + r() * 3, h = 1.6 + r() * 2;
        const b = customPaper(new THREE.BoxGeometry(w, d, h), `${id}.ac${i}`, {color: r() < 0.5 ? "#d8d2e4" : "#b8b0cc", rough: 0.8});
        b.position.set((r() - 0.5) * (W - w - 4), D * (0.2 + 0.6 * r()), h / 2);
        g.add(b);
    }
    if (tank) {
        const t = customPaper(new THREE.CylinderGeometry(2.6, 2.6, 4.5, 14), id + ".tank", {color: "#8a7468", rough: 0.9});
        t.rotation.x = Math.PI / 2;
        t.position.set(W * 0.25, D * 0.6, 4.5 / 2 + 3);
        g.add(t);
        for (const [dx, dy] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
            const leg = customPaper(new THREE.BoxGeometry(0.4, 0.4, 3), `${id}.tleg`, {color: "#5a4a50"});
            leg.position.set(W * 0.25 + dx, D * 0.6 + dy, 1.5);
            g.add(leg);
        }
    }
    return g;
}

// ---------- Rooftop billboard: steel frame + print + three spotlights on top ----------
// The imagery is all of the kinds common on Miami streets (no real brands printed): a car-accident lawyer (Spanish-English bilingual), a Visit Leonida tourism postcard (the official postcard series), a nightclub show
function paintBillboard(kind, wMm, hMm) {
    const s = sheet(wMm, hMm, 16), e = sheet(wMm, hMm, 16);
    const {ctx, mm, W, H} = s, ec = e.ctx;
    const text = (c, str, x, y, size, color, {font = "Bahnschrift", weight = "800", align = "center", stroke = null} = {}) => {
        c.save();
        // v12: scale the font size to the width available at the placement (the small portrait-format Visit LEONIDA ad at the bus stop used to run off the canvas at both ends)
        const avail = (align === "center" ? 2 * Math.min(x, W - x) : align === "left" ? W - x : x) * 0.92;
        fitFont(c, str, mm(size), avail, s => `${weight} ${s}px "${font}", Bahnschrift, sans-serif`);
        c.textAlign = align;
        c.textBaseline = "middle";
        if (stroke) { c.lineWidth = mm(size) * 0.16; c.strokeStyle = stroke; c.lineJoin = "round"; c.strokeText(str, x, y); }
        c.fillStyle = color;
        c.fillText(str, x, y);
        c.restore();
    };
    if (kind === "lawyer") {
        ctx.fillStyle = "#f5c518";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#1e1628";
        ctx.fillRect(0, H * 0.7, W, H * 0.3);
        text(ctx, "¿ACCIDENTE?", W * 0.38, H * 0.24, hMm * 0.22, "#1e1628");
        text(ctx, "LLAME YA", W * 0.38, H * 0.5, hMm * 0.18, "#d8343f");
        text(ctx, "INJURY LAW · VICE CITY", W * 0.5, H * 0.85, hMm * 0.12, "#f5c518");
        // The lawyer himself: half-length silhouette in a suit (no real human face is drawn)
        const cx = W * 0.82;
        ctx.fillStyle = "#2a3050";
        ctx.beginPath();
        ctx.moveTo(cx - mm(wMm * 0.11), H * 0.7);
        ctx.quadraticCurveTo(cx - mm(wMm * 0.1), H * 0.38, cx, H * 0.36);
        ctx.quadraticCurveTo(cx + mm(wMm * 0.1), H * 0.38, cx + mm(wMm * 0.11), H * 0.7);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.moveTo(cx - mm(1.2), H * 0.38); ctx.lineTo(cx, H * 0.55); ctx.lineTo(cx + mm(1.2), H * 0.38); ctx.fill();
        ctx.fillStyle = "#d8343f";
        ctx.fillRect(cx - mm(0.3), H * 0.4, mm(0.6), H * 0.15);
        ctx.fillStyle = "#c98a6a";
        ctx.beginPath(); ctx.ellipse(cx, H * 0.25, mm(hMm * 0.09), mm(hMm * 0.11), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a2a30";
        ctx.beginPath(); ctx.ellipse(cx, H * 0.18, mm(hMm * 0.095), mm(hMm * 0.05), 0, Math.PI, 0); ctx.fill();
    } else if (kind === "leonida") {
        ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#7a6ac8"], [0.45, "#e88ab8"], [0.75, "#ffb08a"], [1, "#ffd08a"]]);
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffe8b0";
        ctx.beginPath(); ctx.arc(W * 0.7, H * 0.72, mm(hMm * 0.26), Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#3fb8b0";
        ctx.fillRect(0, H * 0.72, W, H * 0.28);
        ctx.fillStyle = "#3a2a58";
        for (const [x, hh] of [[0.08, 0.6], [0.16, 0.5], [0.9, 0.55]]) {
            const bx = W * x, by = H * 0.74;
            ctx.fillRect(bx - mm(0.25), by - H * hh, mm(0.5), H * hh);
            for (let k = 0; k < 6; k++) {
                const a = -Math.PI / 2 + (k - 2.5) * 0.5;
                ctx.beginPath();
                ctx.ellipse(bx + Math.cos(a) * mm(2.2), by - H * hh + Math.sin(a) * mm(1.2) + mm(1), mm(2.6), mm(0.6), a, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        text(ctx, "Visit", W * 0.32, H * 0.2, hMm * 0.2, "#ffffff", {font: "Segoe Script", weight: "700", stroke: "#5a2a6a"});
        text(ctx, "LEONIDA", W * 0.5, H * 0.47, hMm * 0.34, "#fff4d8", {font: "Impact", weight: "900", stroke: "#5a2a6a"});
    } else {
        ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#1e1040"], [1, "#5a1a6a"]]);
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = rgba("#ff4fa3", 0.6);
        ctx.lineWidth = mm(0.3);
        for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(W * 0.75, H * 0.1); ctx.lineTo(W * (0.45 + k * 0.07), H); ctx.stroke(); }
        ctx.fillStyle = "#120a24";
        ctx.beginPath(); ctx.ellipse(W * 0.75, H * 0.5, mm(hMm * 0.12), mm(hMm * 0.14), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(W * 0.75 - mm(hMm * 0.2), H * 0.62, mm(hMm * 0.4), H * 0.38);
        text(ctx, "TONIGHT", W * 0.3, H * 0.3, hMm * 0.2, "#3ff0e0");
        text(ctx, "LIVE DJ", W * 0.3, H * 0.56, hMm * 0.26, "#ffffff", {font: "Impact", weight: "900"});
        text(ctx, "VICE CITY", W * 0.3, H * 0.8, hMm * 0.12, "#ff8fc0");
    }
    // Lit by the spotlights on top at night: bright at the top, dark at the bottom
    ec.fillStyle = "#000";
    ec.fillRect(0, 0, W, H);
    ec.globalAlpha = 0.5;
    ec.drawImage(s.canvas, 0, 0);
    ec.globalAlpha = 1;
    ec.globalCompositeOperation = "multiply";
    ec.fillStyle = lin(ec, 0, 0, 0, H, [[0, "#ffffff"], [1, "#404040"]]);
    ec.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#e9e4f4";
    ctx.lineWidth = mm(0.5);
    ctx.strokeRect(mm(0.25), mm(0.25), W - mm(0.5), H - mm(0.5));
    grain(ctx, 0.06);
    return {canvas: s.canvas, emissive: e.canvas};
}

export function billboard(id, {kind = "lawyer", w = 30, h = 12, legs = 8} = {}) {
    const g = new THREE.Group();
    const art = paintBillboard(kind, w, h);
    const board = standUp(rectSheet(art.canvas, {id: id + ".board", width: w, height: h, thickness: 0.6, emissive: art.emissive, emissiveIntensity: 1.1,
        back: "#5a5478"}));
    board.position.set(0, 0, legs);
    g.add(board);
    for (const x of [-w * 0.3, w * 0.3]) {
        const leg = customPaper(new THREE.BoxGeometry(0.8, 0.8, legs), `${id}.leg`, {color: "#5a5478"});
        leg.position.set(x, 1.5, legs / 2);
        g.add(leg);
        const brace = customPaper(new THREE.BoxGeometry(0.4, 3.2, 0.4), `${id}.brace`, {color: "#5a5478"});
        brace.position.set(x, 0.9, legs * 0.6);
        brace.rotation.x = 0.6;
        g.add(brace);
    }
    const walk = customPaper(new THREE.BoxGeometry(w, 1.6, 0.3), id + ".walk", {color: "#6a6488"});
    walk.position.set(0, -0.9, legs - 0.3);
    g.add(walk);
    for (const x of [-w * 0.33, 0, w * 0.33]) {
        const arm = customPaper(new THREE.BoxGeometry(0.3, 2.4, 0.3), `${id}.arm`, {color: "#3a3450"});
        arm.position.set(x, -1.2, legs + h + 0.4);
        g.add(arm);
        const head = customPaper(new THREE.BoxGeometry(1.6, 0.8, 0.6), `${id}.lamp`, {color: "#fff2d0", emissiveColor: "#ffe0a0", emissive: 3});
        head.position.set(x, -2.4, legs + h + 0.4);
        g.add(head);
    }
    return g;
}

// ---------- Fountain in Bay Park: round pool + lit water surface + a column of spray in the middle (at night the underwater lights alternate between cyan and pink) ----------
export function fountain(id, r = 11) {
    const g = new THREE.Group();
    const wall = customPaper(new THREE.CylinderGeometry(r, r, 2.4, 40, 1, true), id + ".wall", {color: "#e8dcd8", rough: 0.8, side: "double"});
    wall.rotation.x = Math.PI / 2;
    wall.position.z = 1.2;
    g.add(wall);
    const rim = customPaper(new THREE.TorusGeometry(r, 0.6, 6, 40), id + ".rim", {color: "#f4ece8", rough: 0.7});
    rim.position.z = 2.4;
    g.add(rim);
    const s = sheet(2 * r, 2 * r, 8), e = sheet(2 * r, 2 * r, 8);
    const gr = (c2) => { const q = c2.createRadialGradient(s.W / 2, s.H / 2, 0, s.W / 2, s.H / 2, s.W / 2); return q; };
    const a = gr(s.ctx); a.addColorStop(0, "#bff8ff"); a.addColorStop(0.5, "#4fd8e8"); a.addColorStop(1, "#ff6fb8");
    s.ctx.fillStyle = a;
    s.ctx.fillRect(0, 0, s.W, s.H);
    s.ctx.strokeStyle = rgba("#ffffff", 0.5);
    s.ctx.lineWidth = s.mm(0.25);
    for (let k = 1; k < 6; k++) { s.ctx.beginPath(); s.ctx.arc(s.W / 2, s.H / 2, s.W / 2 * k / 6, 0, Math.PI * 2); s.ctx.stroke(); }
    const b = gr(e.ctx); b.addColorStop(0, "#80d8e0"); b.addColorStop(0.6, "#2a90a8"); b.addColorStop(1, "#a03070");
    e.ctx.fillStyle = b;
    e.ctx.fillRect(0, 0, e.W, e.H);
    const water = customPaper(new THREE.CircleGeometry(r - 0.3, 40), id + ".water", {map: toTexture(s.canvas), emissiveMap: toTexture(e.canvas), emissive: 1.1, rough: 0.2});
    water.position.z = 1.8;
    g.add(water);
    const ped = customPaper(new THREE.CylinderGeometry(1.2, 2, 4, 12), id + ".ped", {color: "#f4ece8"});
    ped.rotation.x = Math.PI / 2;
    ped.position.z = 2;
    g.add(ped);
    const spray = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 16, 1, true),
        new THREE.MeshBasicMaterial({color: new THREE.Color("#dffcff").multiplyScalar(0.7), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending,
            depthWrite: false, side: THREE.DoubleSide}));
    spray.rotation.x = -Math.PI / 2;
    spray.position.z = 10;
    spray.userData.noAudit = true;
    g.add(spray);
    const jet = customPaper(new THREE.CylinderGeometry(0.35, 0.6, 14, 8), id + ".jet", {color: "#e8fcff", emissiveColor: "#a0f0ff", emissive: 1.2, rough: 0.2});
    jet.rotation.x = Math.PI / 2;
    jet.position.z = 9;
    g.add(jet);
    return g;
}

// ---------- Bus shelter: roof + a light-box ad (Visit Leonida) + bench ----------
export function busShelter(id) {
    const g = new THREE.Group();
    const roof = customPaper(new THREE.BoxGeometry(16, 6, 0.5), id + ".roof", {color: "#e8e4f0", rough: 0.5});
    roof.position.set(0, 0, 16.5);
    g.add(roof);
    for (const x of [-7.6, 7.6]) {
        const post = customPaper(new THREE.BoxGeometry(0.5, 0.5, 16.5), id + ".post", {color: "#5a5478"});
        post.position.set(x, 2.6, 8.25);
        g.add(post);
    }
    const back = customPaper(new THREE.BoxGeometry(15, 0.3, 11), id + ".glass", {color: "#a8c0e8", rough: 0.1, transparent: true, opacity: 0.35});
    back.position.set(0, 2.8, 6);
    g.add(back);
    const art = paintBillboard("leonida", 6, 11);
    const panel = standUp(rectSheet(art.canvas, {id: id + ".ad", width: 6, height: 11, thickness: 0.5, emissive: art.emissive, emissiveIntensity: 2.2, back: "#5a5478"}));
    panel.position.set(-7.6, 0, 0.8);
    panel.rotation.z = Math.PI / 2;
    g.add(panel);
    const bench = customPaper(new THREE.BoxGeometry(9, 1.6, 0.5), id + ".bench", {color: "#8a7aa8"});
    bench.position.set(1, 1.6, 3.4);
    g.add(bench);
    g.userData.core = roof;
    return g;
}

// ---------- Nightclub entrance rope barrier: gold posts + red velvet rope ----------
export function velvetRope(id, n = 5, step = 3.2) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
        const post = customPaper(new THREE.CylinderGeometry(0.28, 0.28, 3, 8), `${id}.post${i}`, {color: "#e8c060", rough: 0.3,
            emissiveColor: "#a07020", emissive: 0.3});
        post.rotation.x = Math.PI / 2;
        post.position.set(i * step, 0, 1.5);
        g.add(post);
        const knob = customPaper(new THREE.SphereGeometry(0.42, 8, 6), `${id}.knob${i}`, {color: "#f4d878", rough: 0.3});
        knob.position.set(i * step, 0, 3.1);
        g.add(knob);
        if (i < n - 1) {
            const pts = [];
            for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push(new THREE.Vector3(i * step + f * step, 0, 2.7 - Math.sin(f * Math.PI) * 0.9)); }
            const rope = customPaper(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.16, 5), `${id}.rope${i}`, {color: "#c0203a", rough: 0.6});
            g.add(rope);
        }
    }
    return g;
}

// ---------- Underglow (the car with green underglow in VC_22): additive light spot lying on the ground ----------
export function underglow(id, color = "#2fff8a", L = 16, Wd = 8) {
    const s = sheet(2, 2, 64);
    const gr = s.ctx.createRadialGradient(s.W / 2, s.H / 2, 0, s.W / 2, s.H / 2, s.W / 2);
    gr.addColorStop(0, rgba(color, 0.9));
    gr.addColorStop(0.55, rgba(color, 0.45));
    gr.addColorStop(1, rgba(color, 0));
    s.ctx.fillStyle = gr;
    s.ctx.fillRect(0, 0, s.W, s.H);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, Wd), new THREE.MeshBasicMaterial({map: toTexture(s.canvas), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false}));
    m.name = id;
    m.userData.noAudit = true;
    return m;
}
