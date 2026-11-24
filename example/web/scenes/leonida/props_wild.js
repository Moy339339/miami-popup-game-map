// Components for the Keys and Grassrivers. Based on official screenshots:
// Leonida_Keys_01 yellow-and-white seaplane, sea-crossing bridge, small islands in the turquoise shallows; Leonida_Keys_05 boat party (a row of outboard motors, flamingo pool floats, jet ski);
// Leonida_Keys_02/06 green iguana; Grassrivers_01/03/04 caged-fan airboat, alligator, sawgrass; Grassrivers_05 fishing camp and seaplane in a cypress forest.
import * as THREE from "three";
import {rng, lerp, toTexture, cutout, rectSheet, polySheet, customPaper, standUp, bendGeometry} from "./kit.js";
import {P, sheet, lit, lin, grain, finish, rgba, mix, roundRect, ellipse, poly} from "./paint.js";
import {latheX} from "./props_keys.js";

const PPM = 22;

// ---------- Seaplane (LK_01: white fuselage, yellow stripe, high monoplane wing, two floats) ----------
// Redone in v12 (author: the tail was a crooked yellow rectangle sticking out): the fuselage is now a body of revolution (round nose, bulging cockpit, tapering tail section, underside curving up),
// the vertical fin and tailplane are cut-out swept shapes, the fuselage has printed windows, a yellow belt line, a thin blue line and a registration number; struts are placed from their two end points
export function seaplane(id, {body = "#fbf7f0", accent = "#f5c518", accent2 = "#2a6a9a"} = {}) {
    const g = new THREE.Group();
    const mat = (c, extra = {}) => ({color: c, rough: 0.45, ...extra});
    const ZC = 7.5;                                  // fuselage axis height
    const lift = x => 0.09 * Math.pow(Math.max(0, -2 - x), 1.6);   // tail section curves upward
    // Fuselage profile: [x along the fuselage, radius], from tail to nose
    const prof = [[-10.4, 0.12], [-9.6, 0.5], [-8.2, 0.85], [-6, 1.35], [-3, 2.05], [0, 2.5], [3, 2.62], [5.6, 2.55], [7.4, 2.25], [8.5, 1.75], [9.1, 1.0], [9.25, 0.12]];
    const X0 = prof[0][0], XL = prof.at(-1)[0] - X0;
    const fusGeo = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(r, x)), 28, Math.PI);
    fusGeo.rotateZ(-Math.PI / 2);                   // rotation axis turned from y to x; the seam is on the belly
    {
        const p = fusGeo.attributes.position, uv = fusGeo.attributes.uv;
        for (let i = 0; i < p.count; i++) {
            uv.setY(i, (p.getX(i) - X0) / XL);       // v runs linearly along the fuselage length (the Lathe's built-in v goes by profile point index, which is uneven)
            p.setY(i, p.getY(i) * 0.9);              // cross-section slightly taller than wide
        }
    }
    bendGeometry(fusGeo, x => lift(x) * 0.8);
    // Fuselage print: u goes around once (0 belly, 0.25 right side +y, 0.5 top, 0.75 left side -y), v from tail to nose
    const fs = sheet(40, 40, 16);
    {
        const {ctx, W, H} = fs;
        const U = u => u * W, V = x => (1 - (x - X0) / XL) * H;
        ctx.fillStyle = body;
        ctx.fillRect(0, 0, W, H);
        // a ring of pale grey on the belly (sea spray)
        ctx.fillStyle = mix(body, "#b8c0d8", 0.35);
        ctx.fillRect(0, 0, U(0.12), H);
        ctx.fillRect(U(0.88), 0, U(0.12), H);
        for (const side of [0.25, 0.75]) {
            const up = side === 0.25 ? 1 : -1;      // direction toward the top of the fuselage
            // Yellow belt line + a thin blue line above it, running from nose to tail
            ctx.fillStyle = accent;
            ctx.fillRect(U(side - 0.022), V(8.6), U(0.044), V(-9.8) - V(8.6));
            ctx.fillStyle = accent2;
            const sy = side + up * 0.038;
            ctx.fillRect(U(sy - 0.008), V(8.6), U(0.016), V(-9.8) - V(8.6));
            // Windows: three in the cockpit
            ctx.fillStyle = "#2c3a6e";
            for (const [xa, xb] of [[5.4, 4.0], [3.6, 2.2], [1.8, 0.6]]) {
                const u0 = side + up * 0.07, u1 = side + up * 0.155;
                ctx.fill(roundRect(U(Math.min(u0, u1)), V(xa), U(Math.abs(u1 - u0)), V(xb) - V(xa), U(0.012)));
            }
            // Registration number (tail section)
            ctx.save();
            ctx.translate(U(side + up * 0.1), V(-5.6));
            ctx.rotate(up > 0 ? Math.PI / 2 : -Math.PI / 2);
            ctx.fillStyle = accent2;
            ctx.font = `700 ${Math.round(U(0.05))}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("N-DODO", 0, 0);
            ctx.restore();
        }
        // Windshield (front edge of the top)
        ctx.fillStyle = "#2c3a6e";
        ctx.fill(roundRect(U(0.36), V(7.4), U(0.28), V(5.6) - V(7.4), U(0.02)));
        ctx.fillStyle = rgba("#ffffff", 0.35);
        ctx.fillRect(U(0.42), V(7.2), U(0.03), V(5.9) - V(7.2));
        // Engine cowling: yellow
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, W, V(8.3));
        grain(ctx, 0.05);
    }
    const fus = customPaper(fusGeo, id + ".fus", mat(body, {map: toTexture(fs.canvas)}));
    fus.position.z = ZC;
    g.add(fus);
    const topZ = x => ZC + lift(x) * 0.8;   // fuselage axis (tail section raised)
    // Wing (high wing, yellow tips), sitting on top of the cockpit
    const ws = sheet(5, 36, 12);
    ws.ctx.fillStyle = body;
    ws.ctx.fillRect(0, 0, ws.W, ws.H);
    ws.ctx.fillStyle = accent;
    ws.ctx.fillRect(0, 0, ws.W, ws.mm(4));
    ws.ctx.fillRect(0, ws.H - ws.mm(4), ws.W, ws.mm(4));
    ws.ctx.fillStyle = accent2;
    ws.ctx.fillRect(0, ws.mm(4), ws.W, ws.mm(0.6));
    ws.ctx.fillRect(0, ws.H - ws.mm(4.6), ws.W, ws.mm(0.6));
    grain(ws.ctx, 0.05);
    const wing = customPaper(new THREE.BoxGeometry(5, 36, 0.5), id + ".wing", mat(body, {map: toTexture(ws.canvas)}));
    wing.position.set(3.4, 0, ZC + 2.62 * 1.0 + 0.1);
    g.add(wing);
    // Place a strut between two end points
    const rod = (a, b, t, color, name) => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
        const m = customPaper(new THREE.BoxGeometry(t, t, va.distanceTo(vb)), id + "." + name, mat(color));
        m.position.copy(va).add(vb).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vb.clone().sub(va).normalize());
        g.add(m);
        return m;
    };
    for (const s of [-1, 1]) {
        rod([2.6, s * 2.0, ZC - 1.0], [3.2, s * 8.5, wing.position.z - 0.2], 0.4, "#d8d0e0", "strut");
        // Floats: nose tilted up slightly
        const fl = customPaper(new THREE.CapsuleGeometry(0.95, 13, 5, 10), id + ".float", mat(body));
        fl.rotation.z = Math.PI / 2;
        fl.position.set(0.8, s * 4.2, 1.0);
        g.add(fl);
        const flStripe = customPaper(new THREE.BoxGeometry(13, 0.3, 0.4), id + ".flstripe", mat(accent));
        flStripe.position.set(0.8, s * 5.1, 1.1);
        g.add(flStripe);
        for (const x of [-2.2, 4.2]) rod([x, s * 4.0, 1.8], [x + 0.3, s * 1.4, ZC - 1.9], 0.32, "#bcb4cc", "leg");
    }
    // Vertical fin: swept back, with a dorsal fin; yellow on the upper half, one blue line
    {
        const out = [[-4.4, 0], [-10.3, 0], [-10.9, 5.6], [-9.3, 5.8], [-6.9, 1.1]];
        const fsn = sheet(7, 6, 20);
        const {ctx, W, H, mm: m} = fsn;
        ctx.fillStyle = body; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = accent; ctx.fillRect(0, 0, W, H - m(3.2));
        ctx.fillStyle = accent2; ctx.fillRect(0, H - m(3.2), W, m(0.35));
        grain(ctx, 0.05);
        const fin = polySheet(out, {id: id + ".fin", canvas: fsn.canvas, thickness: 0.3, uvFrame: {x: -11, y: 0, width: 7, height: 6},
            edge: body, back: {map: toTexture(fsn.canvas), rough: 0.45}, rough: 0.45});
        fin.rotation.x = Math.PI / 2;
        fin.position.set(0, 0.15, topZ(-8.5) + 0.75);
        g.add(fin);
    }
    // Tailplane: trapezoid, yellow tips
    {
        const out = [[-7.6, 0], [-8.7, 5.4], [-10.1, 5.6], [-10.6, 0], [-10.1, -5.6], [-8.7, -5.4]];
        const hs = sheet(4, 12, 20);
        const {ctx, W, H, mm: m} = hs;
        ctx.fillStyle = body; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = accent; ctx.fillRect(0, 0, W, m(1.6)); ctx.fillRect(0, H - m(1.6), W, m(1.6));
        grain(ctx, 0.05);
        const hz = polySheet(out, {id: id + ".stab", canvas: hs.canvas, thickness: 0.3, uvFrame: {x: -10.8, y: -6, width: 4, height: 12},
            edge: body, back: {color: body, rough: 0.45}, rough: 0.45});
        hz.position.set(0, 0, topZ(-9) - 0.1);
        g.add(hz);
    }
    // Propeller: a translucent spinning disc
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({color: 0xd8d0e8, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide}));
    disc.rotation.y = Math.PI / 2;
    disc.position.set(9.5, 0, ZC);
    disc.userData.noAudit = true;
    g.add(disc);
    const spinner = customPaper(new THREE.ConeGeometry(0.85, 1.6, 12), id + ".spinner", mat(accent));
    spinner.rotation.z = -Math.PI / 2;
    spinner.position.set(9.9, 0, ZC);
    g.add(spinner);
    return g;
}

// ---------- Caged-fan airboat (Grassrivers_01/03): aluminum hull, high driver's seat, a big fan behind it covered by a wire cage ----------
export function airboat(id, {hull = "#c9c4d8", stripe = "#2f8a7a"} = {}) {
    const g = new THREE.Group();
    const L = 20, Wd = 9;
    const hs = sheet(L, Wd, 10);
    hs.ctx.fillStyle = "#b8b2c8";
    hs.ctx.fillRect(0, 0, hs.W, hs.H);
    hs.ctx.fillStyle = rgba("#ffffff", 0.35);
    for (let k = 1; k < 10; k++) hs.ctx.fillRect(0, k * hs.H / 10, hs.W, hs.mm(0.12));   // deck lines
    grain(hs.ctx, 0.08);
    const ring = [[-L / 2, -Wd / 2], [L / 2 - 3, -Wd / 2], [L / 2, -Wd / 2 + 2], [L / 2, Wd / 2 - 2], [L / 2 - 3, Wd / 2], [-L / 2, Wd / 2]];
    const deck = polySheet(ring, {id: id + ".deck", canvas: hs.canvas, thickness: 2.4, uvFrame: {x: -L / 2, y: -Wd / 2, width: L, height: Wd}, edge: hull});
    deck.position.z = 1.2;
    g.add(deck);
    // Gunwale color band (one piece on each side)
    for (const s of [-1, 1]) {
        const band = customPaper(new THREE.BoxGeometry(L - 2, 0.3, 0.9), id + ".band", {color: stripe});
        band.position.set(-1, s * (Wd / 2 + 0.05), 1.6);
        g.add(band);
    }
    // High driver's seat
    const seat = customPaper(new THREE.BoxGeometry(3.2, 3.6, 0.6), id + ".seat", {color: "#3a3450"});
    seat.position.set(-2.5, 0, 7.4);
    g.add(seat);
    for (const [dx, dy] of [[-1.2, -1.4], [-1.2, 1.4], [1.2, -1.4], [1.2, 1.4]]) {
        const leg = customPaper(new THREE.BoxGeometry(0.35, 0.35, 5), id + ".seatleg", {color: "#8a84a0"});
        leg.position.set(-2.5 + dx, dy, 4.9);
        g.add(leg);
    }
    // Engine + cage + fan blades
    const eng = customPaper(new THREE.BoxGeometry(3.2, 3.4, 3.4), id + ".engine", {color: "#4a4458"});
    eng.position.set(-6.2, 0, 4.1);
    g.add(eng);
    const cage = new THREE.Group();
    cage.position.set(-8.4, 0, 7.2);
    const R = 4.6;
    const rim = customPaper(new THREE.TorusGeometry(R, 0.22, 6, 32), id + ".cage", {color: "#d8d2e6", rough: 0.4});
    rim.rotation.y = Math.PI / 2;
    cage.add(rim);
    const rim2 = rim.clone();
    rim2.position.x = -1.6;
    cage.add(rim2);
    for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        const bar = customPaper(new THREE.BoxGeometry(1.6, 0.14, 0.14), id + ".bar", {color: "#d8d2e6"});
        bar.position.set(-0.8, Math.cos(a) * R, Math.sin(a) * R);
        cage.add(bar);
        if (k % 2 === 0) {
            const spoke = customPaper(new THREE.BoxGeometry(0.1, 0.1, R * 2), id + ".spoke", {color: "#c8c2d8"});
            spoke.position.x = -1.6;
            spoke.rotation.x = a;
            cage.add(spoke);
        }
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R - 0.4, 28), new THREE.MeshBasicMaterial({color: 0x6a6280, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide}));
    disc.rotation.y = Math.PI / 2;
    disc.position.x = -0.4;
    disc.userData.noAudit = true;
    cage.add(disc);
    g.add(cage);
    // Two rudders
    for (const s of [-1, 1]) {
        const rud = customPaper(new THREE.BoxGeometry(2.2, 0.25, 5.4), id + ".rudder", {color: stripe});
        rud.position.set(-11.2, s * 1.6, 6.2);
        g.add(rud);
    }
    g.userData.cores = [deck, eng, seat];
    return g;
}

// ---------- Alligator: a whole piece cut out from a top view, lying on the water / bank, scutes printed on the back, two bumps for eyes ----------
function paintGator(len, seed) {
    const r = rng(seed);
    const wMm = len, hMm = len * 0.34;
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, 14);
    const cy = H / 2;
    const half = t => {   // t: 0 tail tip -> 1 snout tip
        if (t < 0.45) return lerp(0.05, 0.62, Math.pow(t / 0.45, 0.8));
        if (t < 0.72) return 0.62 + (t - 0.45) * 0.2;
        if (t < 0.82) return lerp(0.66, 0.42, (t - 0.72) / 0.1);
        return lerp(0.42, 0.16, (t - 0.82) / 0.18);
    };
    const pts = [];
    const n = 40;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([t * W, cy - half(t) * H * 0.42 + Math.sin(t * 6 + seed) * mm(0.4) * (1 - t)]); }
    for (let i = n; i >= 0; i--) { const t = i / n; pts.push([t * W, cy + half(t) * H * 0.42 + Math.sin(t * 6 + seed) * mm(0.4) * (1 - t)]); }
    const bodyP = poly(pts);
    lit(ctx, bodyP, "#4f5a3a", {sw: mm(1.2), rw: mm(0.4), rim: "#c8c890", dir: [0.3, 1]});
    // Four legs
    for (const [t, s] of [[0.5, -1], [0.5, 1], [0.72, -1], [0.72, 1]]) {
        const x = t * W, y = cy + s * half(t) * H * 0.42;
        ctx.fillStyle = "#454f32";
        ctx.beginPath();
        ctx.ellipse(x + s * mm(0.4), y + s * mm(1.2), mm(1.4), mm(0.7), s * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    // Scutes: several rows of ridges on the back
    ctx.save();
    ctx.clip(bodyP);
    for (let row = -2; row <= 2; row++) for (let i = 0; i < 26; i++) {
        const t = 0.12 + i * 0.026;
        if (t > 0.74) break;
        const x = t * W, y = cy + row * half(t) * H * 0.13;
        ctx.fillStyle = rgba(r() < 0.5 ? "#2f3a22" : "#6a7a48", 0.7);
        ctx.fillRect(x - mm(0.35), y - mm(0.3), mm(0.7), mm(0.6));
    }
    ctx.fillStyle = rgba("#2a3020", 0.5);
    for (let i = 0; i < 9; i++) ctx.fillRect(W * (0.03 + i * 0.045), cy - mm(0.15), mm(0.8), mm(0.3));
    ctx.restore();
    // Eyes
    for (const s of [-1, 1]) {
        ctx.fillStyle = "#d8c060";
        ctx.beginPath(); ctx.ellipse(W * 0.84, cy + s * mm(1.1), mm(0.55), mm(0.4), 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1a1a10";
        ctx.fillRect(W * 0.84 - mm(0.08), cy + s * mm(1.1) - mm(0.3), mm(0.16), mm(0.6));
    }
    return finish(canvas, {inkW: mm(0.1), ink: "#1e2418"});
}
export function gator(id, len = 18, seed = 1) {
    const g = new THREE.Group();
    const m = cutout(paintGator(len, seed), {id, ppm: 14, thickness: 1.6, anchor: "center", trace: {cell: 2, dilate: 1}, edge: "#3a4228", back: "#3a4228"});
    bendGeometry(m.geometry, (x, y) => 0.6 * Math.exp(-((x - len * 0.1) ** 2) / (len * len * 0.06)) - Math.abs(y) * 0.12);
    m.position.z = 0.4;
    g.add(m);
    for (const s of [-1, 1]) {
        const eye = customPaper(new THREE.SphereGeometry(0.55, 8, 6), id + ".eye", {color: "#5a6440"});
        eye.position.set(len * 0.34, s * 1.0, 1.6);
        g.add(eye);
    }
    return g;
}

// ---------- Green iguana (LK_02/06): side-view standee, a row of spines on the back, dewlap, long ringed tail; one size bigger than real so it reads clearly ----------
function paintIguana(seed) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(26, 9, PPM);
    const base = H - mm(1.2);
    const body = new Path2D();
    body.moveTo(mm(0.5), base - mm(1.6));
    body.bezierCurveTo(mm(6), base - mm(1.2), mm(9), base - mm(3.2), mm(12), base - mm(3.8));
    body.bezierCurveTo(mm(16), base - mm(4.6), mm(19), base - mm(4.6), mm(21), base - mm(5.4));
    body.bezierCurveTo(mm(23), base - mm(6.4), mm(25.4), base - mm(5.6), mm(25.6), base - mm(4.4));
    body.bezierCurveTo(mm(25.4), base - mm(3.6), mm(23.6), base - mm(3.2), mm(22.4), base - mm(2.4));
    body.bezierCurveTo(mm(21.2), base - mm(1.2), mm(19), base - mm(1.0), mm(16), base - mm(1.2));
    body.bezierCurveTo(mm(12), base - mm(1.0), mm(6), base - mm(0.5), mm(0.5), base - mm(1.2));
    body.closePath();
    lit(ctx, body, "#5fae4a", {sw: mm(0.8), rw: mm(0.3), rim: "#e8f0a0"});
    // Dewlap
    const dew = new Path2D();
    dew.moveTo(mm(22.6), base - mm(2.6));
    dew.quadraticCurveTo(mm(22.4), base - mm(0.6), mm(20.4), base - mm(1.2));
    dew.closePath();
    lit(ctx, dew, "#8ac860", {sw: mm(0.3), rw: mm(0.1)});
    // Legs
    for (const x of [10.5, 19]) {
        ctx.strokeStyle = "#4a8a3a";
        ctx.lineWidth = mm(0.9);
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(mm(x), base - mm(1.6)); ctx.lineTo(mm(x - 0.8), base + mm(0.5)); ctx.lineTo(mm(x + 0.6), base + mm(0.9)); ctx.stroke();
    }
    // Tail rings
    ctx.save();
    ctx.clip(body);
    for (let x = 1.5; x < 10; x += 1.3) { ctx.fillStyle = rgba("#2f5a2a", 0.6); ctx.fillRect(mm(x), 0, mm(0.55), H); }
    for (let i = 0; i < 60; i++) { ctx.fillStyle = rgba(r() < 0.5 ? "#9ad070" : "#3f7a3a", 0.5); ctx.fillRect(mm(10 + r() * 14), base - mm(1 + r() * 4.5), mm(0.4), mm(0.4)); }
    ctx.restore();
    // Back spines
    ctx.fillStyle = "#8ac860";
    for (let x = 11; x < 22.5; x += 0.75) {
        const y = base - mm(3.6 + (x - 11) * 0.16 + (x > 20 ? (x - 20) * 0.5 : 0));
        ctx.beginPath(); ctx.moveTo(mm(x - 0.3), y + mm(0.3)); ctx.lineTo(mm(x), y - mm(1.0)); ctx.lineTo(mm(x + 0.3), y + mm(0.3)); ctx.fill();
    }
    // Eye
    ctx.fillStyle = "#e8b040";
    ctx.beginPath(); ctx.arc(mm(23.6), base - mm(4.9), mm(0.38), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1a10";
    ctx.beginPath(); ctx.arc(mm(23.7), base - mm(4.9), mm(0.16), 0, Math.PI * 2); ctx.fill();
    return finish(canvas, {inkW: mm(0.09), ink: "#1e3018"});
}
export function iguana(id, seed = 1) {
    const g = new THREE.Group();
    const rock = customPaper(new THREE.DodecahedronGeometry(5.5, 0), id + ".rock", {color: "#b8a89a", rough: 0.95});
    rock.scale.set(1.6, 1.1, 0.7);
    rock.position.z = 1.0;
    g.add(rock);
    const lz = standUp(cutout(paintIguana(seed), {id: id + ".body", ppm: PPM, thickness: 0.8, trace: {cell: 2, dilate: 1}, edge: "#a8d080"}));
    lz.position.set(0, 0, 3.3);
    lz.rotation.z = 0.12;
    g.add(lz);
    g.userData.core = rock;
    return g;
}

// ---------- Sawgrass / wetland grass clump: a tuft of long thin blades, two pieces crossed ----------
function paintGrassTuft(wMm, hMm, seed, {base = "#7a9a4a", tip = "#d8c070"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, 14);
    ctx.lineCap = "round";
    const n = Math.round(wMm * 3);
    for (let i = 0; i < n; i++) {
        const x0 = W * (0.15 + 0.7 * r()), lean = (r() - 0.5) * W * 0.5, h = H * (0.45 + 0.55 * r());
        const grd = ctx.createLinearGradient(0, H, 0, H - h);
        grd.addColorStop(0, mix(base, "#2a3a28", 0.4));
        grd.addColorStop(0.6, base);
        grd.addColorStop(1, tip);
        ctx.strokeStyle = grd;
        ctx.lineWidth = mm(0.35 + r() * 0.3);
        ctx.beginPath();
        ctx.moveTo(x0, H);
        ctx.quadraticCurveTo(x0 + lean * 0.3, H - h * 0.6, x0 + lean, H - h);
        ctx.stroke();
    }
    ctx.fillStyle = mix(base, "#2a3a28", 0.5);
    ctx.fillRect(W * 0.12, H - mm(0.8), W * 0.76, mm(0.8));
    return finish(canvas, {inkW: mm(0.06), ink: "#2a3020"});
}
export function grassTuft(id, {w = 10, h = 7, seed = 1, base, tip} = {}) {
    const g = new THREE.Group();
    for (let k = 0; k < 2; k++) {
        const m = standUp(cutout(paintGrassTuft(w * (1 - k * 0.15), h * (1 - k * 0.1), seed * 7 + k, {base, tip}), {id: `${id}.${k}`, ppm: 14, thickness: 0.4,
            trace: {cell: 2, dilate: 1}, edge: "#5a6a3a"}));
        m.rotation.z = k * 1.2 + 0.3;
        g.add(m);
    }
    g.userData.wind = {amp: 2.0};   // Fix item 13: grass is the softest
    return g;
}

// ---------- Wetland cypress / mangrove: flared trunk + three crossed crown pieces + hanging Spanish moss ----------
function paintSwampCanopy(wMm, hMm, seed, {base = "#4a6a3a", light = "#9ab868", moss = "#b8c0a0"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, 10);
    const blobs = [];
    for (let i = 0; i < Math.round(wMm * hMm / 6); i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r());
        blobs.push([W / 2 + Math.cos(a) * d * (W / 2 - mm(1.5)), H * 0.38 + Math.sin(a) * d * H * 0.3, mm(1 + r() * 1.6)]);
    }
    blobs.sort((p, q) => p[1] - q[1]);
    for (const [x, y, rd] of blobs) lit(ctx, ellipse(x, y, rd * 1.3, rd * 0.8), mix(base, light, r() * 0.4), {sw: rd * 0.4, rw: rd * 0.16, blur: rd * 0.1});
    // Spanish moss: grey-green strands hanging from the lower edge of the crown
    ctx.strokeStyle = moss;
    ctx.lineCap = "round";
    for (let i = 0; i < Math.round(wMm * 1.4); i++) {
        const x = W * (0.12 + 0.76 * r()), y0 = H * (0.5 + 0.12 * r()), len = H * (0.15 + 0.3 * r());
        ctx.lineWidth = mm(0.25 + 0.3 * r());
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + mm(0.6), y0 + len * 0.5, x - mm(0.3), y0 + len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return finish(canvas, {inkW: mm(0.07), ink: "#1e2a20"});
}
export function swampTree(id, {h = 30, w = 18, seed = 1, base, light} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    // Flared trunk (the base of a cypress swells)
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(lerp(2.4, 0.6, Math.pow(t, 0.35)), t * h * 0.75)); }
    const trunk = customPaper(new THREE.LatheGeometry(pts, 9), id + ".trunk", {color: "#7a6458", rough: 0.95});
    trunk.rotation.x = Math.PI / 2;
    g.add(trunk);
    const crown = new THREE.Group();
    crown.position.z = h * 0.45;
    for (let k = 0; k < 3; k++) {
        const c = paintSwampCanopy(w * (0.85 + 0.2 * r()), h * 0.62, seed * 5 + k, {base, light});
        const m = standUp(cutout(c, {id: `${id}.c${k}`, ppm: 10, thickness: 0.5, trace: {cell: 3, dilate: 1}, edge: "#3a4a30"}));
        m.rotation.z = k * Math.PI / 3 + (r() - 0.5) * 0.3;
        crown.add(m);
    }
    g.add(crown);
    g.userData.cores = [trunk, crown];
    g.userData.wind = {amp: 0.7};   // Fix item 13: cypress is semi-stiff
    return g;
}

// ---------- Sea-crossing bridge (the Seven Mile Bridge kind in LK_01): a long, low deck + a row of paired piers ----------
export function seaBridge(id, {x0 = -260, x1 = 260, h = 12, w = 16, every = 26} = {}) {
    const g = new THREE.Group();
    const L = x1 - x0;
    const ds = sheet(L, w, 4);
    ds.ctx.fillStyle = "#7e7896";
    ds.ctx.fillRect(0, 0, ds.W, ds.H);
    ds.ctx.fillStyle = "#f5c86a";
    ds.ctx.fillRect(0, ds.H / 2 - ds.mm(0.3), ds.W, ds.mm(0.6));
    ds.ctx.fillStyle = rgba("#ffffff", 0.8);
    ds.ctx.fillRect(0, ds.mm(1), ds.W, ds.mm(0.3));
    ds.ctx.fillRect(0, ds.H - ds.mm(1.3), ds.W, ds.mm(0.3));
    grain(ds.ctx, 0.08);
    const deck = customPaper(new THREE.BoxGeometry(L, w, 2.4), id + ".deck", {map: toTexture(ds.canvas), rough: 0.85});
    deck.position.set((x0 + x1) / 2, 0, h + 1.2);
    g.add(deck);
    for (const y of [-w / 2 + 0.3, w / 2 - 0.3]) {
        const rail = customPaper(new THREE.BoxGeometry(L, 0.6, 1.6), id + ".rail", {color: "#ece6f0"});
        rail.position.set((x0 + x1) / 2, y, h + 3.2);
        g.add(rail);
    }
    const piers = [];
    for (let x = x0 + every / 2; x < x1; x += every) {
        const cap = customPaper(new THREE.BoxGeometry(3, w + 1, 1.6), `${id}.cap`, {color: "#e2dce8"});
        cap.position.set(x, 0, h - 0.8);
        g.add(cap);
        for (const y of [-w * 0.28, w * 0.28]) {
            const p = customPaper(new THREE.BoxGeometry(2, 2, h), `${id}.pier`, {color: "#d8d2e0", rough: 0.9});
            p.position.set(x, y, h / 2 - 0.8);
            g.add(p);
            piers.push(p);
        }
    }
    g.userData.cores = [deck, ...piers];
    return g;
}

// ---------- Jet ski (LK_05): small hull + rider standee ----------
export function jetski(id, {color = "#ff4fa3", rider = null} = {}) {
    const g = new THREE.Group();
    const hull = customPaper(new THREE.CapsuleGeometry(1.8, 5.5, 5, 10), id + ".hull", {color: "#f4f0f8", rough: 0.4, gloss: "card", glossTier: 0});
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.55);
    hull.position.z = 0.9;
    g.add(hull);
    const top = customPaper(new THREE.CapsuleGeometry(1.6, 4, 5, 10), id + ".top", {color, rough: 0.4, gloss: "card", glossTier: 0});
    top.rotation.z = Math.PI / 2;
    top.scale.set(1, 1, 0.4);
    top.position.set(-0.5, 0, 1.6);
    g.add(top);
    if (rider) {
        rider.scale.setScalar(0.8);
        rider.position.set(-0.6, 0, 1.4);
        g.add(rider);
    }
    g.userData.core = hull;
    return g;
}

// ---------- Flamingo pool float (LK_05): pink ring + upright neck and head ----------
export function flamingoFloat(id) {
    const g = new THREE.Group();
    const ring = customPaper(new THREE.TorusGeometry(3.2, 1.3, 8, 24), id + ".ring", {color: "#ff8fc0", rough: 0.35});
    ring.position.z = 0.8;
    g.add(ring);
    const s = sheet(5, 9, PPM);
    const {ctx, mm, H} = s;
    ctx.strokeStyle = "#ff8fc0";
    ctx.lineWidth = mm(1.3);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(mm(2.2), H); ctx.bezierCurveTo(mm(1), H - mm(4), mm(4), H - mm(5), mm(2.6), H - mm(7.4)); ctx.stroke();
    lit(ctx, ellipse(mm(2.8), H - mm(7.6), mm(1.3), mm(1.1)), "#ff8fc0", {sw: mm(0.3), rw: mm(0.1)});
    ctx.fillStyle = "#2a1b2c";
    ctx.beginPath(); ctx.moveTo(mm(3.8), H - mm(7.7)); ctx.lineTo(mm(4.9), H - mm(7.1)); ctx.lineTo(mm(3.7), H - mm(7.0)); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(mm(3.0), H - mm(8.0), mm(0.25), 0, Math.PI * 2); ctx.fill();
    finish(s.canvas, {inkW: mm(0.08), ink: "#8a2a5a"});
    const neck = standUp(cutout(s.canvas, {id: id + ".neck", ppm: PPM, thickness: 0.8, trace: {cell: 2, dilate: 1}, edge: "#ffb0d0"}));
    neck.position.set(0, -2.6, 1.2);
    g.add(neck);
    return g;
}

// ---------- Egret (a Grassrivers bird) ----------
export function egret(id, seed = 1) {
    const s = sheet(5, 8, PPM);
    const {ctx, mm, H} = s;
    void seed;
    ctx.strokeStyle = "#2a2a30";
    ctx.lineWidth = mm(0.18);
    ctx.beginPath(); ctx.moveTo(mm(2.2), H); ctx.lineTo(mm(2.4), H - mm(2.6)); ctx.moveTo(mm(2.9), H); ctx.lineTo(mm(2.7), H - mm(2.6)); ctx.stroke();
    const body = ellipse(mm(2.6), H - mm(3.6), mm(1.6), mm(1.0), -0.3);
    lit(ctx, body, "#fbfaf4", {sw: mm(0.4), rw: mm(0.15), rim: "#ffe8d0"});
    ctx.strokeStyle = "#fbfaf4";
    ctx.lineWidth = mm(0.45);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(mm(3.6), H - mm(4.2)); ctx.bezierCurveTo(mm(4.6), H - mm(5), mm(3.2), H - mm(6), mm(3.8), H - mm(7)); ctx.stroke();
    ctx.fillStyle = "#e8b030";
    ctx.beginPath(); ctx.moveTo(mm(4.0), H - mm(7.2)); ctx.lineTo(mm(5.0), H - mm(6.9)); ctx.lineTo(mm(4.0), H - mm(6.8)); ctx.fill();
    finish(s.canvas, {inkW: mm(0.07), ink: "#3a3a48"});
    return standUp(cutout(s.canvas, {id, ppm: PPM, thickness: 0.6, trace: {cell: 2, dilate: 1}}));
}

// ---------- Roseate spoonbill (v10): the signature bird of Florida wetlands - pink body, a patch of rose on the wing, white neck, a flat spoon-shaped bill ----------
export function spoonbill(id, seed = 1) {
    const s = sheet(6.4, 8, PPM);
    const {ctx, mm, H} = s;
    const flip = seed % 2 ? 1 : -1;   // half face left, half face right
    ctx.save();
    if (flip < 0) { ctx.translate(s.W, 0); ctx.scale(-1, 1); }
    ctx.strokeStyle = "#d8606e";
    ctx.lineWidth = mm(0.2);
    ctx.beginPath(); ctx.moveTo(mm(2.4), H); ctx.lineTo(mm(2.6), H - mm(2.7)); ctx.moveTo(mm(3.1), H); ctx.lineTo(mm(2.9), H - mm(2.7)); ctx.stroke();
    const body = ellipse(mm(2.7), H - mm(3.8), mm(1.9), mm(1.15), -0.2);
    lit(ctx, body, "#f6a0c4", {sw: mm(0.45), rw: mm(0.15), rim: "#ffe0ec", shade: "#c86a98"});
    ctx.fillStyle = "#e8507e";
    ctx.fill(ellipse(mm(2.4), H - mm(3.95), mm(1.1), mm(0.55), -0.25));
    ctx.strokeStyle = "#fbe0ea";
    ctx.lineWidth = mm(0.5);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(mm(4.0), H - mm(4.3)); ctx.bezierCurveTo(mm(4.9), H - mm(5.1), mm(3.8), H - mm(5.9), mm(4.3), H - mm(6.7)); ctx.stroke();
    ctx.fillStyle = "#fbe0ea";
    ctx.fill(ellipse(mm(4.4), H - mm(6.8), mm(0.55), mm(0.48)));
    // Spoon bill: long and thin, with a flat round end
    ctx.strokeStyle = "#a8a090";
    ctx.lineWidth = mm(0.28);
    ctx.beginPath(); ctx.moveTo(mm(4.8), H - mm(6.8)); ctx.lineTo(mm(5.7), H - mm(6.3)); ctx.stroke();
    ctx.fillStyle = "#a8a090";
    ctx.fill(ellipse(mm(5.85), H - mm(6.2), mm(0.42), mm(0.3), 0.4));
    ctx.restore();
    finish(s.canvas, {inkW: mm(0.07), ink: "#5a3a48"});
    return standUp(cutout(s.canvas, {id, ppm: PPM, thickness: 0.6, trace: {cell: 2, dilate: 1}}));
}

// ---------- A patch of water lily pads (v10): a few round leaves with notches lying on the water, a few pink-white flowers among them ----------
export function lilyPads(id, seed = 1, {n = 7, spread = 7} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    for (let k = 0; k < n; k++) {
        const rad = 1.1 + r() * 1.3, a0 = r() * Math.PI * 2, cut = 0.5;
        const ring = [[0, 0]];
        for (let j = 0; j <= 18; j++) { const a = a0 + cut / 2 + (Math.PI * 2 - cut) * j / 18; ring.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
        const pad = polySheet(ring, {id: `${id}.pad${k}`, color: mix("#4f8a3a", "#8ab85a", r()), thickness: 0.15, edge: "#3a6a2a", castShadow: false});
        const d = spread * Math.sqrt(r()), b = r() * Math.PI * 2;
        pad.position.set(Math.cos(b) * d, Math.sin(b) * d * 0.7, 0.08 + k * 0.01);
        g.add(pad);
        if (k % 3 === 1) {
            const fl = customPaper(new THREE.ConeGeometry(0.75, 0.9, 7), `${id}.flower${k}`, {color: k % 2 ? "#ffd0e4" : "#fff6f0", emissiveColor: "#ff9ac8", emissive: 0.15});
            fl.rotation.x = Math.PI / 2;   // cone axis turned from +Y to +Z: the bud points up
            fl.position.set(pad.position.x + 0.3, pad.position.y, 0.6);
            g.add(fl);
        }
    }
    g.traverse(o => { o.userData.noAudit = true; });
    return g;
}

// ---------- Sailboat (redone in v12; it used to be a capsule hull + two flat triangles): round-bottomed hull with a waterline color band, white cabin with windows, mast + boom,
// the mainsail and jib are bulging curved surfaces (white sails, one color band, a sail number printed on the mainsail) ----------
export function sailboat(id, {stripe = "#ff4fa3", hull = "#fbf8f2"} = {}) {
    const g = new THREE.Group();
    // Hull: a body of revolution tapered at both ends, flattened; the stern is blunter and rounder than the bow
    const geo = latheX([[-8.6, 0.1], [-8.2, 1.7], [-6, 2.6], [-2, 3.0], [2, 2.8], [5, 2.0], [7.2, 1.0], [8.6, 0.1]], 20);
    geo.scale(1, 1, 0.5);
    bendGeometry(geo, x => 0.012 * x * x);
    const hs = sheet(20, 20, 12);
    {
        const {ctx, W, H} = hs;
        ctx.fillStyle = hull; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = stripe;
        ctx.fillRect(W * 0.265, 0, W * 0.04, H); ctx.fillRect(W * 0.695, 0, W * 0.04, H);   // color band above the waterline (both sides)
        ctx.fillStyle = "#2a3550";
        ctx.fillRect(W * 0.315, 0, W * 0.012, H); ctx.fillRect(W * 0.673, 0, W * 0.012, H);
        ctx.fillStyle = "#c8a27a";   // deck (a ring of teak color on top)
        ctx.fillRect(W * 0.43, H * 0.08, W * 0.14, H * 0.84);
        grain(ctx, 0.05);
    }
    const h = customPaper(geo, id + ".hull", {map: toTexture(hs.canvas), rough: 0.4, gloss: "card", glossTier: 0});
    h.position.z = 0.5;
    g.add(h);
    // Cabin
    const cs = sheet(8, 4, 16);
    {
        const {ctx, W, H, mm} = cs;
        ctx.fillStyle = "#fbf8f2"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#2c3a6e";
        for (let k = 0; k < 4; k++) ctx.fill(roundRect(mm(0.8 + k * 1.8), mm(1.2), mm(1.3), mm(0.8), mm(0.3)));
        grain(ctx, 0.04);
    }
    const cabin = customPaper(new THREE.BoxGeometry(6.5, 3.4, 1.6), id + ".cabin", {map: toTexture(cs.canvas), rough: 0.45});
    cabin.position.set(-0.5, 0, 2.6);
    g.add(cabin);
    const pit = customPaper(new THREE.BoxGeometry(3.2, 2.6, 0.3), id + ".cockpit", {color: "#3a3450", rough: 0.6});
    pit.position.set(-5.2, 0, 1.9);
    g.add(pit);
    // Mast + boom
    const MX = 1.6, MH = 27;
    const mast = customPaper(new THREE.CylinderGeometry(0.22, 0.3, MH, 6), id + ".mast", {color: "#e8e4ee"});
    mast.rotation.x = Math.PI / 2;
    mast.position.set(MX, 0, 2 + MH / 2);
    g.add(mast);
    const boom = customPaper(new THREE.CylinderGeometry(0.2, 0.2, 9.6, 6), id + ".boom", {color: "#d8d0e0"});
    boom.rotation.z = Math.PI / 2;
    boom.position.set(MX - 4.8, 0, 5.2);
    g.add(boom);
    // Sail: the outline is in XY (x along the boat, y up); it is curved and then stood up
    const sail = (out, name, num) => {
        const xs = out.map(p => p[0]), ys = out.map(p => p[1]);
        const fx = Math.min(...xs), fw = Math.max(...xs) - fx, fh = Math.max(...ys);
        const s = sheet(fw, fh, 10);
        const {ctx, W, H, mm} = s;
        ctx.fillStyle = lin(ctx, 0, 0, W, 0, [[0, "#fbfaff"], [1, "#e8e2f0"]]);
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = stripe;
        ctx.fillRect(0, H * 0.7, W, mm(1.1));
        ctx.fillStyle = rgba(P.shadeDeep, 0.14);
        for (let k = 1; k < 7; k++) ctx.fillRect(0, H * k / 7, W, mm(0.08));
        if (num) {
            ctx.fillStyle = "#2a3550";
            ctx.font = `800 ${mm(2.4)}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(num, W * 0.62, H * 0.45);
        }
        grain(ctx, 0.04);
        // Subdivided mesh: A = lower corner of the sail's leading edge, B = rear corner of the sail, C = top of the sail; P(s,t) = (1-t)*lerp(A,B,s) + t*C, with t stopping at 0.985 (no zero-area triangles)
        const [A, B, C] = out, NS = 10, NT = 14;
        const pos = [], uv = [], idx = [];
        for (let i = 0; i <= NT; i++) for (let j = 0; j <= NS; j++) {
            const t = i / NT * 0.985, u = j / NS;
            const x = (1 - t) * lerp(A[0], B[0], u) + t * C[0], y = (1 - t) * lerp(A[1], B[1], u) + t * C[1];
            pos.push(x, y, 1.1 * (1 - t * 0.7) * Math.sin(Math.PI * u));
            uv.push((x - fx) / fw, y / fh);
        }
        for (let i = 0; i < NT; i++) for (let j = 0; j < NS; j++) {
            const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1;
            idx.push(a, b, d, a, d, c);
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        sg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        sg.setIndex(idx);
        sg.computeVertexNormals();
        const m = customPaper(sg, `${id}.${name}`, {map: toTexture(s.canvas), rough: 0.7, side: "double"});
        m.rotation.x = Math.PI / 2;
        g.add(m);
        return m;
    };
    const main = sail([[MX - 0.2, 0], [MX - 9.6, 0], [MX - 0.3, MH - 4.5]], "main", "L 42");
    main.position.z = 5.4;
    const jib = sail([[7.8, 0], [MX + 0.6, 0.6], [MX + 0.3, MH - 8]], "jib", null);
    jib.position.z = 2.6;
    g.userData.core = h;
    return g;
}
// ---------- Shrimp boat (at the Port Gellhorn docks): white hull with a red stripe, wheelhouse, net outriggers slanting out on both sides of the mast, hanging green nets ----------
export function shrimpBoat(id, {stripe = "#c83a3a", hull = "#f4f2ee"} = {}) {
    const g = new THREE.Group();
    const L = 30, Wd = 9;
    const ring = [[-L / 2, -Wd / 2], [L * 0.22, -Wd / 2], [L / 2, -1], [L / 2, 1], [L * 0.22, Wd / 2], [-L / 2, Wd / 2]];
    const hs = sheet(L, Wd, 8);
    hs.ctx.fillStyle = "#c8b8a0";
    hs.ctx.fillRect(0, 0, hs.W, hs.H);
    for (let x = 0; x < hs.W; x += hs.mm(1.2)) { hs.ctx.fillStyle = rgba("#6a5040", 0.3); hs.ctx.fillRect(x, 0, hs.mm(0.12), hs.H); }
    grain(hs.ctx, 0.1);
    const deck = polySheet(ring, {id: id + ".deck", canvas: hs.canvas, thickness: 4, uvFrame: {x: -L / 2, y: -Wd / 2, width: L, height: Wd}, edge: hull});
    deck.position.z = 1.4;
    g.add(deck);
    for (const s of [-1, 1]) {
        const band = customPaper(new THREE.BoxGeometry(L * 0.7, 0.3, 1.0), id + ".band", {color: stripe});
        band.position.set(-2, s * (Wd / 2 + 0.1), 2.6);
        g.add(band);
    }
    const cab = customPaper(new THREE.BoxGeometry(8, 6.4, 6), id + ".cab", {color: hull});
    cab.position.set(6, 0, 6.4);
    g.add(cab);
    const win = customPaper(new THREE.BoxGeometry(0.3, 5.2, 1.6), id + ".win", {color: "#3a4a7a", emissiveColor: "#ffc070", emissive: 0.4});
    win.position.set(10.1, 0, 8);
    g.add(win);
    const mast = customPaper(new THREE.CylinderGeometry(0.35, 0.4, 20, 6), id + ".mast", {color: "#e8e4ee"});
    mast.rotation.x = Math.PI / 2;
    mast.position.set(0, 0, 13);
    g.add(mast);
    // Two net outriggers extend out at an angle, hung with green nets
    for (const s of [-1, 1]) {
        const boom = new THREE.Group();
        boom.position.set(0, 0, 6);
        boom.rotation.x = s * 0.75;
        const pole = customPaper(new THREE.CylinderGeometry(0.22, 0.25, 18, 5), id + ".boom", {color: "#d8d2e0"});
        pole.position.z = 9;
        pole.rotation.x = Math.PI / 2;
        boom.add(pole);
        g.add(boom);
        // The net hangs down from the tip of the outrigger: the outrigger slants out in the -s*y direction (rotated about x by s*0.75), and the net hangs on that side
        const ns = sheet(7, 14, 10);
        ns.ctx.strokeStyle = "#3f8a5a";
        ns.ctx.lineWidth = ns.mm(0.25);
        for (let k = 0; k <= 7; k++) { ns.ctx.beginPath(); ns.ctx.moveTo(ns.mm(k), 0); ns.ctx.lineTo(ns.mm(3.5 + (k - 3.5) * 0.3), ns.H); ns.ctx.stroke(); }
        for (let k = 0; k <= 14; k++) { ns.ctx.beginPath(); ns.ctx.moveTo(0, ns.mm(k)); ns.ctx.lineTo(ns.W, ns.mm(k)); ns.ctx.stroke(); }
        ns.ctx.fillStyle = "#3f8a5a";
        ns.ctx.fillRect(0, 0, ns.W, ns.mm(0.6));
        const net = standUp(cutout(ns.canvas, {id: id + ".net", ppm: 10, thickness: 0.2, trace: {cell: 2, dilate: 1}, back: "same", castShadow: false}));
        net.position.set(-3, -s * 12, 4.5);
        net.userData.noAudit = true;
        net.traverse(o => { o.userData.noAudit = true; });
        g.add(net);
    }
    g.userData.core = deck;
    return g;
}

// ---------- Large yacht (the kind at the VC_15/17 docks): four white decks, dark glass bands, a helipad on the top deck ----------
export function megaYacht(id, {L = 62} = {}) {
    const g = new THREE.Group();
    const deck = (w, d, h, z, x, part) => {
        const s = sheet(w, h, 8);
        s.ctx.fillStyle = "#fbfaf6";
        s.ctx.fillRect(0, 0, s.W, s.H);
        s.ctx.fillStyle = lin(s.ctx, 0, 0, s.W, 0, [[0, "#1e2440"], [0.6, "#3a4a7a"], [1, "#1e2440"]]);
        s.ctx.fillRect(s.mm(1.5), s.mm(h * 0.25), s.W - s.mm(3), s.mm(h * 0.45));
        s.ctx.fillStyle = rgba("#ffe0b0", 0.6);
        for (let k = 0; k < w / 6; k++) s.ctx.fillRect(s.mm(3 + k * 6), s.mm(h * 0.3), s.mm(2), s.mm(h * 0.32));
        grain(s.ctx, 0.05);
        const ring = [[-w / 2, -d / 2], [w * 0.3, -d / 2], [w / 2, -d * 0.1], [w / 2, d * 0.1], [w * 0.3, d / 2], [-w / 2, d / 2]];
        const top = polySheet(ring, {id: `${id}.${part}`, color: "#fbfaf6", thickness: h, uvFrame: {x: -w / 2, y: -d / 2, width: w, height: d}, edge: "#f4f2f8"});
        top.position.set(x, 0, z + h / 2);
        g.add(top);
        const side = standUp(rectSheet(s.canvas, {id: `${id}.${part}s`, width: w * 0.8, height: h, thickness: 0.2, back: "#fbfaf6"}));
        side.position.set(x - w * 0.1, -d / 2 - 0.15, z);
        g.add(side);
    };
    const hullRing = [[-L / 2, -7], [L * 0.28, -7], [L / 2, 0], [L * 0.28, 7], [-L / 2, 7]];
    const hull = polySheet(hullRing, {id: id + ".hull", color: "#1e2440", thickness: 4, uvFrame: {x: -L / 2, y: -7, width: L, height: 14}, edge: "#2a3050"});
    hull.position.z = 1.2;
    g.add(hull);
    deck(L * 0.9, 13, 4, 3.2, -L * 0.03, "d1");
    deck(L * 0.7, 11, 4, 7.2, -L * 0.08, "d2");
    deck(L * 0.48, 9, 3.6, 11.2, -L * 0.12, "d3");
    const pad = customPaper(new THREE.CylinderGeometry(5.5, 5.5, 0.4, 24), id + ".pad", {color: "#3a4a6a"});
    pad.rotation.x = Math.PI / 2;
    pad.position.set(-L * 0.36, 0, 7.4);
    g.add(pad);
    const mast = customPaper(new THREE.BoxGeometry(1, 1, 6), id + ".radar", {color: "#f4f2f8"});
    mast.position.set(-L * 0.08, 0, 17.6);
    g.add(mast);
    g.userData.core = hull;
    return g;
}

// ---------- Container ship (v10): sailing out of Port Gellhorn - dark blue hull, white bridge tower at the stern + yellow funnel, rows of colored containers on deck ----------
// The bow points toward +x. Containers are grouped by bay: each group is one solid dark box, with a sheet of paper printed with the box colors and vertical ribs stuck on the camera-facing side (-y) and on the top (a group is 3 meshes, not hundreds of little boxes).
const BOX_COLORS = ["#c8443a", "#2a6aa8", "#e8a020", "#3f8a5a", "#8a8a9a", "#f2ece0", "#7a3a6a", "#d86a3a", "#3fb8b0", "#24305a", "#b8b030"];
export function containerShip(id, {L = 80, B = 14, seed = 7, name = "LEONIDA LINES"} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    const HULL = 6, SINK = 1.5, DECK = HULL - SINK;   // hull is 6 high, 1.5 of it under water
    const PPMS = 14;
    // Hull: the plan is a pentagon with a blunt bow, and the cut edge is the hull's dark blue
    const hullRing = [[-L / 2, -B / 2], [L * 0.32, -B / 2], [L / 2, -B * 0.14], [L / 2, B * 0.14], [L * 0.32, B / 2], [-L / 2, B / 2]];
    const ds = sheet(L, B, 6);
    ds.ctx.fillStyle = "#4a4f62";
    ds.ctx.fillRect(0, 0, ds.W, ds.H);
    ds.ctx.fillStyle = "#c8443a";
    ds.ctx.fillRect(ds.mm(L * 0.8), ds.H * 0.3, ds.mm(L * 0.12), ds.H * 0.4);   // a patch of red on the bow deck
    grain(ds.ctx, 0.08);
    const hull = polySheet(hullRing, {id: id + ".hull", canvas: ds.canvas, thickness: HULL, uvFrame: {x: -L / 2, y: -B / 2, width: L, height: B}, edge: "#22305a"});
    hull.position.z = HULL / 2 - SINK;
    g.add(hull);
    // Camera-facing side of the hull: a red band at the waterline, big white lettering printed on the dark blue hull (the kind of shipping-company name printed on a freighter's hull), a white line along the deck edge
    {
        const len = L * 0.82, hs = sheet(len, HULL, PPMS);
        const {ctx, mm, W, H} = hs;
        ctx.fillStyle = "#22305a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#b8343a";
        ctx.fillRect(0, H - mm(SINK + 0.9), W, mm(SINK + 0.9));
        ctx.fillStyle = rgba("#ffffff", 0.85);
        ctx.fillRect(0, mm(0.35), W, mm(0.25));
        ctx.font = `900 ${mm(2.3)}px "Arial Black", sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f4f2ee";
        ctx.fillText(name, mm(len * 0.3), mm(2.2));
        ctx.font = `700 ${mm(0.9)}px Bahnschrift, sans-serif`;
        ctx.fillText("GELLHORN", mm(11), mm(2.6));   // the port of registry is printed at the stern end
        for (let x = mm(1.5); x < W; x += mm(5.5)) { ctx.fillStyle = rgba("#000000", 0.12); ctx.fillRect(x, mm(0.6), mm(0.12), H - mm(SINK + 1.5)); }   // hull plate seams
        grain(ctx, 0.06);
        const side = standUp(rectSheet(hs.canvas, {id: id + ".side", width: len, height: HULL, thickness: 0.15, back: "#22305a", edge: "#22305a", castShadow: false}));
        side.position.set(-L / 2 + len / 2, -B / 2 - 0.1, -SINK);
        side.userData.noAudit = true;
        side.traverse(o => { o.userData.noAudit = true; });
        g.add(side);
    }
    // Containers: laid out from in front of the bridge tower to just short of the bow; each bay is 3 or 4 tiers, with one tier fewer toward the bow
    const BL = 6.2, TIER = 2.4, ROWS = 5, RW = (B - 2.4) / ROWS;
    const xa = -L / 2 + 15, xb = L * 0.3;
    const nb = Math.floor((xb - xa) / BL);
    for (let i = 0; i < nb; i++) {
        const tiers = (i === nb - 1 ? 2 : 3) + (r() < 0.55 ? 1 : 0);
        const h = tiers * TIER, cx = xa + BL * (i + 0.5), bw = BL - 0.35, bd = ROWS * RW;
        const cols = Array.from({length: tiers}, () => Array.from({length: ROWS}, () => BOX_COLORS[Math.floor(r() * BOX_COLORS.length)]));
        const body = customPaper(new THREE.BoxGeometry(bw, bd, h), `${id}.bay${i}`, {color: "#2a2838"});
        body.position.set(cx, 0, DECK + h / 2);
        g.add(body);
        // Camera-facing side: the outermost row of boxes on each tier (long side, vertical ribs)
        const ss = sheet(bw, h, PPMS);
        for (let k = 0; k < tiers; k++) {
            const y = ss.H - ss.mm((k + 1) * TIER), c = cols[k][0];
            ss.ctx.fillStyle = c;
            ss.ctx.fillRect(0, y, ss.W, ss.mm(TIER));
            ss.ctx.fillStyle = rgba("#ffffff", 0.18);
            ss.ctx.fillRect(0, y, ss.W, ss.mm(0.25));
            for (let x = ss.mm(0.4); x < ss.W - ss.mm(0.3); x += ss.mm(0.36)) { ss.ctx.fillStyle = rgba("#000000", 0.16); ss.ctx.fillRect(x, y + ss.mm(0.3), ss.mm(0.1), ss.mm(TIER - 0.55)); }
            ss.ctx.fillStyle = rgba("#000000", 0.55);
            ss.ctx.fillRect(0, y + ss.mm(TIER - 0.14), ss.W, ss.mm(0.14));
            ss.ctx.fillRect(0, y, ss.mm(0.15), ss.mm(TIER));
            ss.ctx.fillRect(ss.W - ss.mm(0.15), y, ss.mm(0.15), ss.mm(TIER));
        }
        grain(ss.ctx, 0.05);
        const face = standUp(rectSheet(ss.canvas, {id: `${id}.bay${i}f`, width: bw, height: h, thickness: 0.12, back: "#2a2838", edge: "#2a2838", castShadow: false}));
        face.position.set(cx, -bd / 2 - 0.07, DECK);
        g.add(face);
        // Top face: the 5 rows of the top tier (top edge of the canvas = the +y row)
        const ts = sheet(bw, bd, PPMS);
        for (let k = 0; k < ROWS; k++) {
            const y = ts.H - ts.mm((k + 1) * RW);
            ts.ctx.fillStyle = cols[tiers - 1][k];
            ts.ctx.fillRect(0, y, ts.W, ts.mm(RW));
            for (let x = ts.mm(0.5); x < ts.W; x += ts.mm(0.7)) { ts.ctx.fillStyle = rgba("#000000", 0.1); ts.ctx.fillRect(x, y, ts.mm(0.12), ts.mm(RW)); }
            ts.ctx.fillStyle = rgba("#000000", 0.5);
            ts.ctx.fillRect(0, y, ts.W, ts.mm(0.12));
        }
        grain(ts.ctx, 0.05);
        const top = polySheet([[-bw / 2, -bd / 2], [bw / 2, -bd / 2], [bw / 2, bd / 2], [-bw / 2, bd / 2]],
            {id: `${id}.bay${i}t`, canvas: ts.canvas, thickness: 0.12, uvFrame: {x: -bw / 2, y: -bd / 2, width: bw, height: bd}, edge: "#2a2838", castShadow: false});
        top.position.set(cx, 0, DECK + h + 0.06);
        g.add(top);
        for (const m of [face, top]) { m.userData.noAudit = true; m.traverse(o => { o.userData.noAudit = true; }); }
    }
    // Bridge tower: five white floors, the top floor is a ring of dark windows (the bridge), with bridge wings extending out on both sides
    {
        const bx = -L / 2 + 7.5, bl = 9, bh = 12.5;
        const blk = customPaper(new THREE.BoxGeometry(bl, B - 2, bh), id + ".bridge", {color: "#f4f2ee"});
        blk.position.set(bx, 0, DECK + bh / 2);
        g.add(blk);
        const fs = sheet(bl, bh, PPMS);
        fs.ctx.fillStyle = "#f4f2ee";
        fs.ctx.fillRect(0, 0, fs.W, fs.H);
        fs.ctx.fillStyle = "#2a3050";
        fs.ctx.fillRect(fs.mm(0.4), fs.mm(0.8), fs.W - fs.mm(0.8), fs.mm(1.5));   // ring of windows on the bridge
        for (let k = 0; k < 4; k++) for (let j = 0; j < 5; j++) {
            fs.ctx.fillStyle = j === 2 && k === 1 ? "#ffd8a0" : "#3a4a7a";
            fs.ctx.fillRect(fs.mm(0.9 + j * 1.6), fs.mm(3.6 + k * 2.2), fs.mm(0.9), fs.mm(0.9));
        }
        fs.ctx.fillStyle = rgba("#000000", 0.08);
        fs.ctx.fillRect(0, fs.H - fs.mm(1.2), fs.W, fs.mm(1.2));
        grain(fs.ctx, 0.05);
        const front = standUp(rectSheet(fs.canvas, {id: id + ".bridgef", width: bl, height: bh, thickness: 0.12, back: "#f4f2ee", edge: "#f4f2ee", castShadow: false}));
        front.position.set(bx, -(B - 2) / 2 - 0.07, DECK);
        front.userData.noAudit = true;
        front.traverse(o => { o.userData.noAudit = true; });
        g.add(front);
        const wing = customPaper(new THREE.BoxGeometry(bl - 2, B + 2, 0.7), id + ".wing", {color: "#f4f2ee"});
        wing.position.set(bx + 1, 0, DECK + bh - 2.6);
        g.add(wing);
        const win = customPaper(new THREE.BoxGeometry(0.3, B - 3, 1.5), id + ".bridgew", {color: "#2a3050", emissiveColor: "#ffc070", emissive: 0.25});
        win.position.set(bx + bl / 2 + 0.1, 0, DECK + bh - 1.55);
        g.add(win);
        // Funnel: yellow body, one dark blue band, black cap
        const fun = customPaper(new THREE.BoxGeometry(3.6, 4.6, 6), id + ".funnel", {color: "#f5c518"});
        fun.position.set(bx - 2.2, 0, DECK + bh + 3);
        g.add(fun);
        const band = customPaper(new THREE.BoxGeometry(3.7, 4.7, 1), id + ".funnelb", {color: "#22305a"});
        band.position.set(bx - 2.2, 0, DECK + bh + 3.8);
        g.add(band);
        const cap = customPaper(new THREE.BoxGeometry(3.7, 4.7, 0.6), id + ".funnelc", {color: "#1a1a24"});
        cap.position.set(bx - 2.2, 0, DECK + bh + 6.2);
        g.add(cap);
        const mast = customPaper(new THREE.CylinderGeometry(0.25, 0.3, 5, 6), id + ".mast", {color: "#f4f2ee"});
        mast.rotation.x = Math.PI / 2;
        mast.position.set(bx + 1.5, 0, DECK + bh + 2.5);
        g.add(mast);
    }
    // A foremast at the bow
    const fm = customPaper(new THREE.CylinderGeometry(0.3, 0.35, 7, 6), id + ".foremast", {color: "#f4f2ee"});
    fm.rotation.x = Math.PI / 2;
    fm.position.set(L * 0.38, 0, DECK + 3.5);
    g.add(fm);
    return g;
}

void [rectSheet, roundRect, P];
