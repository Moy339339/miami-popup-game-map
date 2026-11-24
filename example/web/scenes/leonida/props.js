// Paper-craft parts: turn prints into 3D paper models. The origin is always at the bottom, front edge or center of the object (see each function), +z up, front faces -Y.
import * as THREE from "three";
import {rng, lerp, makeCanvas, toTexture, cutout, rectSheet, polySheet, customPaper, standUp, bendGeometry,
    traceAlpha, slabGeometry, paperMesh} from "./kit.js";
import {P, sheet, lit, lin, grain, finish, rgba, mix, roundRect, ellipse, fitFont, paintFrond, paintBush, paintFlamingo, paintPerson, paintLamp,
    paintSurfboard, paintUmbrella, paintTowel, paintTowerWall} from "./paint.js";
import {paintFacade, paintFin, paintCrown, paintRoof, paintCarSide, paintCarShell, carShellLayout, CARS,
    paintCloud, paintSunDisc, paintSkyline, neonText, paintTowerSkin} from "./paint_city.js";
import {paintStreetPerson, LOOKS} from "./paint_people.js";
import {paintSportbike, paintWheelie, paintATV, paintFloatRing} from "./paint_rides.js";

const PPM = 22;      // printing resolution for small props (pixels / mm)
const PPM_BIG = 18;  // building facade

// ---------- Palm ----------
// UV of the tube: u runs along the trunk (0 root -> 1 top), v wraps around. So the ring marks are vertical lines on the canvas.
function barkStrip(seed) {
    const r = rng(seed);
    const c = makeCanvas(512, 64);
    const ctx = c.getContext("2d");
    ctx.fillStyle = lin(ctx, 0, 0, 512, 0, [[0, "#a88072"], [0.6, "#c39c88"], [1, "#9a8070"]]);
    ctx.fillRect(0, 0, 512, 64);
    for (let x = 4; x < 512; x += 6 + r() * 5) {
        ctx.strokeStyle = rgba("#5a3d58", 0.5);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (r() - 0.5) * 2, 64);
        ctx.stroke();
        ctx.strokeStyle = rgba("#ffd9b8", 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, 0);
        ctx.lineTo(x + 2, 64);
        ctx.stroke();
    }
    grain(ctx, 0.12);
    return c;
}

function trunkGeometry(points, r0, r1, radial = 10, tubular = 28) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
    // Scale the radius ring by ring: thick at the bottom and thin at the top, root slightly bulging
    const pos = geo.attributes.position;
    const frames = curve.computeFrenetFrames(tubular, false);
    for (let i = 0; i <= tubular; i++) {
        const t = i / tubular;
        const c = curve.getPointAt(t);
        const rr = lerp(r0, r1, t) + (t < 0.08 ? (0.08 - t) * 8 * r0 * 0.4 : 0);
        for (let j = 0; j <= radial; j++) {
            const k = i * (radial + 1) + j;
            const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c);
            v.setLength(rr).add(c);
            pos.setXYZ(k, v.x, v.y, v.z);
        }
    }
    void frames;
    geo.computeVertexNormals();
    return {geo, curve};
}

const barkCache = new Map();
export function palm(id, {h = 50, bend = 4, seed = 1, fronds = 9, lean = 0, reach = 1} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    const a = r() * Math.PI * 2;
    const dx = Math.cos(a) * bend, dy = Math.sin(a) * bend;
    const pts = [[0, 0, 0], [dx * 0.15, dy * 0.15, h * 0.35], [dx * 0.5, dy * 0.5, h * 0.7], [dx, dy, h]];
    const {geo} = trunkGeometry(pts, 1.35, 0.8);
    if (!barkCache.has(seed % 4)) barkCache.set(seed % 4, toTexture(barkStrip(seed % 4)));
    const bark = barkCache.get(seed % 4);
    const trunkMesh = customPaper(geo, id + ".trunk", {map: bark, rough: 0.9, repeatY: 1});
    g.add(trunkMesh);
    g.userData.core = trunkMesh;   // the intersection check looks only at the trunk; the crown is checked separately
    // Frond sheaths and coconuts
    const crown = new THREE.Group();
    const frondPivots = [];   // fix item 13: a wind field makes each frond fan gently on its own (adds a little to the original pitch group rotation.y)
    crown.position.set(dx, dy, h);
    const bootGeo = new THREE.SphereGeometry(1.5, 10, 8);
    crown.add(customPaper(bootGeo, id + ".boot", {color: "#7a6a4f", rough: 0.9}));
    for (let k = 0; k < 3; k++) {
        const nut = customPaper(new THREE.SphereGeometry(0.75, 8, 6), id + ".nut" + k, {color: "#7b5a3c", rough: 0.8});
        const na = k * 2.1 + r();
        nut.position.set(Math.cos(na) * 1.1, Math.sin(na) * 1.1, -1.2);
        crown.add(nut);
    }
    for (let k = 0; k < fronds; k++) {
        const len = lerp(17, 21, r()) * reach;
        const canvas = paintFrond(PPM, len, seed * 31 + k, {dry: r() < 0.15 ? 0.6 : 0});
        const mesh = cutout(canvas, {id: `${id}.frond${k}`, ppm: PPM, thickness: 0.2, anchor: [0.5 / (len + 1.2), 0.5],
            trace: {cell: 2, dilate: 1}, rough: 0.75, edge: "#2f5a50"});
        const droop = lerp(0.012, 0.026, r());
        bendGeometry(mesh.geometry, (x, y) => -droop * x * x + Math.abs(y) * 0.32);
        const yawG = new THREE.Group();
        yawG.rotation.z = (k / fronds) * Math.PI * 2 + (r() - 0.5) * 0.5;
        const pitch = new THREE.Group();
        pitch.rotation.y = -lerp(0.15, 0.6, r());
        mesh.rotation.x = (r() - 0.5) * 0.5;
        pitch.add(mesh);
        yawG.add(pitch);
        crown.add(yawG);
        frondPivots.push(pitch);
    }
    // Two young fronds in the center point up
    for (let k = 0; k < 2; k++) {
        const len = 12;
        const canvas = paintFrond(PPM, len, seed * 7 + k + 100);
        const mesh = cutout(canvas, {id: `${id}.young${k}`, ppm: PPM, thickness: 0.2, anchor: [0.5 / (len + 1.2), 0.5], trace: {cell: 2}, edge: "#2f5a50"});
        bendGeometry(mesh.geometry, (x, y) => -0.02 * x * x + Math.abs(y) * 0.4);
        const yawG = new THREE.Group();
        yawG.rotation.z = r() * Math.PI * 2;
        const pitch = new THREE.Group();
        pitch.rotation.y = -1.05;
        pitch.add(mesh);
        yawG.add(pitch);
        crown.add(yawG);
    }
    g.add(crown);
    g.userData.crownGroup = crown;
    for (const f of frondPivots) f.userData.pitch0 = f.rotation.y;
    // Fix item 36: fronds opening - k 0 = gathered pointing up (like umbrella ribs not yet opened), 1 = the original look; the unfold animation piece supplies k over time, the wind field adds sway on top of base
    g.userData.unfold = k => { for (const f of frondPivots) { f.userData.base = lerp(-1.3, f.userData.pitch0, k); f.rotation.y = f.userData.base; } };
    g.userData.wind = {amp: 0.8, crown: 1.4, fronds: frondPivots};   // soft: the trunk sways a little as a whole, the crown sways more, each frond fans on its own
    g.rotation.x = lean;
    g.userData.crown = crown;
    return g;
}

// ---------- Shrubs: 2-3 layers of cut pieces offset front to back ----------
export function bushes(id, {w = 16, h = 7, seed = 1, layers = 3, flowers = null, base = "#4f9a6e", light = "#8fcb7e"} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    for (let k = 0; k < layers; k++) {
        const s = 1 - k * 0.18;
        const canvas = paintBush(PPM, w * s, h * s * (0.9 + 0.2 * r()), seed * 13 + k,
            {base: mix(base, "#2e5762", 0.25 - k * 0.12), light, flowers, flowerCount: flowers ? Math.round(w * 0.6 * s) : 0});
        const mesh = standUp(cutout(canvas, {id: `${id}.l${k}`, ppm: PPM, thickness: 0.8, trace: {cell: 3, dilate: 1}, edge: mix(base, "#1e3a3a", 0.45)}));
        mesh.position.set((r() - 0.5) * w * 0.25, -k * 2.2, 0);
        mesh.rotation.z = (r() - 0.5) * 0.25;
        g.add(mesh);
    }
    g.userData.wind = {amp: 1.3};
    return g;
}

// ---------- Standees (people, flamingos, surfboards, street lamps, street signs) ----------
export function standee(id, canvas, {emissive = null, emissiveIntensity = 1.4, ppm = PPM, base = true} = {}) {
    const g = new THREE.Group();
    const mesh = cutout(canvas, {id, ppm, thickness: 0.8, emissive, emissiveIntensity, trace: {cell: 2, dilate: 1}});
    g.add(standUp(mesh));
    if (base) {
        // Standee base: a small folded-up paper foot
        const [w] = mesh.userData.size;
        const foot = rectSheet(null, {id: id + ".foot", width: Math.min(w * 0.6, 5), height: 2.4, thickness: 0.5, origin: "center",
            back: "#d8c8b8", edge: "#efe3d3"});
        foot.position.set(0, 1.0, 0.3);
        foot.userData.paper.meta.mat.front.color = "#e8d8c8";
        g.add(foot);
    }
    return g;
}
export const person = (id, seed, o) => standee(id, paintPerson(PPM, seed, o));
export const flamingo = (id, seed, o) => standee(id, paintFlamingo(PPM, seed, o));
export function lamp(id) {
    const {canvas, emissive} = paintLamp(PPM);
    return standee(id, canvas, {emissive, emissiveIntensity: 2.2, base: false});
}
export function surfboard(id, seed) {
    const g = standee(id, paintSurfboard(PPM, seed), {base: false});
    g.rotation.y = (seed % 2 ? 1 : -1) * 0.12;
    return g;
}

// ---------- Beach umbrella: a real paper cone ----------
const umbrellaTex = new Map();
export function umbrella(id, colors, {r = 5.2, h = 9, tilt = 0.12, seed = 1} = {}) {
    const key = colors.join();
    if (!umbrellaTex.has(key)) umbrellaTex.set(key, toTexture(paintUmbrella(12, colors)));
    const g = new THREE.Group();
    const pole = customPaper(new THREE.CylinderGeometry(0.18, 0.18, h, 6), id + ".pole", {color: "#f4ecf6", rough: 0.6});
    pole.rotation.x = Math.PI / 2;
    pole.position.z = h / 2;
    g.add(pole);
    const cone = customPaper(new THREE.ConeGeometry(r, 1.9, 8, 1, true), id + ".canopy",
        {map: umbrellaTex.get(key), rough: 0.8, side: "double"});
    cone.rotation.x = Math.PI / 2;
    cone.position.z = h + 0.4;
    cone.rotation.y = seed;
    g.add(cone);
    g.rotation.x = tilt * Math.cos(seed);
    g.rotation.y = tilt * Math.sin(seed);
    g.userData.cores = [pole, cone];   // the intersection check looks at the pole and the canopy separately; the space under the canopy does not count as occupied
    g.userData.wind = {amp: 0.5};      // semi-rigid: the umbrella barely moves
    // Fix item 36: umbrella opening - k 0 = closed (a long thin stick), 1 = open
    g.userData.unfold = k => cone.scale.set(lerp(0.15, 1, k), lerp(2.4, 1, k), lerp(0.15, 1, k));
    return g;
}

export function towel(id, seed) {
    const m = rectSheet(paintTowel(14, seed), {id, width: 6, height: 11, thickness: 0.3, origin: "center", castShadow: false});
    return m;
}

// Beach lounge chair: two folded-up paper strips
export function lounger(id, color) {
    const g = new THREE.Group();
    const c = sheet(4.5, 12, 14);
    c.ctx.fillStyle = color;
    c.ctx.fillRect(0, 0, c.W, c.H);
    c.ctx.fillStyle = rgba("#ffffff", 0.7);
    for (let y = 0; y < c.H; y += c.mm(1.2)) c.ctx.fillRect(0, y, c.W, c.mm(0.5));
    grain(c.ctx, 0.08);
    const seat = rectSheet(c.canvas, {id: id + ".seat", width: 4.5, height: 8, thickness: 0.5, origin: "bottom", back: "same"});
    seat.position.set(0, -4, 1.4);
    const back = rectSheet(c.canvas, {id: id + ".back", width: 4.5, height: 4.5, thickness: 0.5, origin: "bottom", back: "same"});
    back.position.set(0, 4, 1.4);
    back.rotation.x = 0.9;
    g.add(seat, back);
    for (const [x, y] of [[-1.9, -3.5], [1.9, -3.5], [-1.9, 3.5], [1.9, 3.5]]) {
        const leg = customPaper(new THREE.BoxGeometry(0.3, 0.3, 1.4), id + ".leg", {color: "#e9e4f4"});
        leg.position.set(x, y, 0.7);
        g.add(leg);
    }
    return g;
}

// ---------- Lifeguard tower ----------
export function lifeguardTower(id, scheme, seed) {
    const g = new THREE.Group();
    const w = 8, d = 7, hc = 6.5, z0 = 6;
    const wall = (W, H, s) => paintTowerWall(PPM, W, H, scheme, seed + s);
    const front = rectSheet(wall(w, hc, 0), {id: id + ".front", width: w, height: hc, thickness: 0.6, back: "#d8c8d8"});
    const fr = standUp(front); fr.position.set(0, -d / 2, z0);
    const backW = rectSheet(wall(w, hc, 1), {id: id + ".backw", width: w, height: hc, thickness: 0.6});
    const bk = standUp(backW); bk.position.set(0, d / 2, z0); bk.rotation.z = Math.PI;
    const left = rectSheet(wall(d, hc, 2), {id: id + ".left", width: d, height: hc, thickness: 0.6});
    const lf = standUp(left); lf.position.set(-w / 2, 0, z0); lf.rotation.z = -Math.PI / 2;
    const right = rectSheet(wall(d, hc, 3), {id: id + ".right", width: d, height: hc, thickness: 0.6});
    const rt = standUp(right); rt.position.set(w / 2, 0, z0); rt.rotation.z = Math.PI / 2;
    g.add(fr, bk, lf, rt);
    // Platform and railing
    const deck = rectSheet(null, {id: id + ".deck", width: w + 4, height: d + 3, thickness: 0.7, origin: "center", back: "#d8c8d8"});
    deck.userData.paper.meta.mat.front.color = scheme[0];
    deck.position.set(0, -1, z0);
    g.add(deck);
    // Roof: single slope, with overhanging eaves
    const roofC = sheet(w + 3, d + 3, 14);
    roofC.ctx.fillStyle = scheme[scheme.length - 1];
    roofC.ctx.fillRect(0, 0, roofC.W, roofC.H);
    roofC.ctx.fillStyle = rgba("#ffffff", 0.5);
    for (let x = 0; x < roofC.W; x += roofC.mm(1.4)) roofC.ctx.fillRect(x, 0, roofC.mm(0.5), roofC.H);
    grain(roofC.ctx, 0.08);
    const roof = rectSheet(roofC.canvas, {id: id + ".roof", width: w + 3, height: d + 3, thickness: 0.7, origin: "center"});
    roof.position.set(0, 0, z0 + hc + 0.9);
    roof.rotation.x = -0.22;
    g.add(roof);
    // Legs
    for (const [x, y] of [[-w / 2 + 0.5, -d / 2 + 0.5], [w / 2 - 0.5, -d / 2 + 0.5], [-w / 2 + 0.5, d / 2 - 0.5], [w / 2 - 0.5, d / 2 - 0.5]]) {
        const leg = customPaper(new THREE.BoxGeometry(0.7, 0.7, z0), id + ".leg", {color: "#f4ecf6"});
        leg.position.set(x, y, z0 / 2);
        g.add(leg);
    }
    // Ramp
    const rampC = sheet(3, 12, 14);
    rampC.ctx.fillStyle = scheme[1];
    rampC.ctx.fillRect(0, 0, rampC.W, rampC.H);
    rampC.ctx.fillStyle = rgba("#ffffff", 0.55);
    for (let y = 0; y < rampC.H; y += rampC.mm(0.9)) rampC.ctx.fillRect(0, y, rampC.W, rampC.mm(0.25));
    const ramp = rectSheet(rampC.canvas, {id: id + ".ramp", width: 3, height: 12, thickness: 0.6, origin: "bottom"});
    ramp.position.set(w / 2 + 0.5, -d / 2 - 1.5, 0);
    ramp.rotation.order = "ZXY";
    ramp.rotation.z = Math.PI / 2;
    ramp.rotation.x = -Math.atan2(z0, 11.5);
    g.add(ramp);
    // Flag
    const flagC = sheet(4, 9, PPM);
    const fx = flagC.ctx;
    fx.fillStyle = "#e9e4f4";
    fx.fillRect(flagC.mm(0.2), 0, flagC.mm(0.3), flagC.H);
    fx.fillStyle = "#ffcf3a";
    fx.fillRect(flagC.mm(0.5), flagC.mm(0.2), flagC.mm(3.2), flagC.mm(1.4));
    fx.fillStyle = "#ff3a4a";
    fx.fillRect(flagC.mm(0.5), flagC.mm(1.6), flagC.mm(3.2), flagC.mm(1.2));
    finish(flagC.canvas, {inkW: flagC.mm(0.06)});
    const flag = standUp(cutout(flagC.canvas, {id: id + ".flag", ppm: PPM, thickness: 0.3, anchor: [0.08, 0], trace: {cell: 2}}));
    flag.position.set(-w / 2 + 0.5, -d / 2 + 0.5, z0 + hc + 1);
    g.add(flag);
    return g;
}

// ---------- Art Deco hotel ----------
function flipped(tex) {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.offset.x = 1;
    t.needsUpdate = true;
    return t;
}

export function hotel(id, spec) {
    const g = new THREE.Group();
    g.userData.neon = null;
    const {W, D, H} = spec;
    const face = paintFacade(spec, PPM_BIG);
    const sideF = paintFacade(spec, PPM_BIG, {side: true});
    const neonOn = {flicker: spec.neonT ?? 0};
    g.userData.neon = neonOn;
    const front = rectSheet(face.canvas, {id: id + ".front", width: W, height: H, thickness: 0.7, emissive: face.emissive,
        emissiveIntensity: 0.9, back: spec.wall});
    front.userData.paper.meta.mat.front.neon = neonOn;
    const fr = standUp(front);
    g.add(fr);
    for (const sgn of [-1, 1]) {
        const sw = rectSheet(sideF.canvas, {id: `${id}.side${sgn}`, width: D, height: H, thickness: 0.7, emissive: sideF.emissive,
            emissiveIntensity: 0.9, back: spec.wall});
        const s = standUp(sw);
        s.position.set(sgn * W / 2, D / 2, 0);
        s.rotation.z = sgn * Math.PI / 2;
        g.add(s);
    }
    const back = rectSheet(null, {id: id + ".back", width: W, height: H, thickness: 0.7, back: spec.wall});
    back.userData.paper.meta.mat.front.color = mix(spec.wall, P.shadeDeep, 0.25);
    const bk = standUp(back);
    bk.position.set(0, D, 0);
    bk.rotation.z = Math.PI;
    g.add(bk);
    const roof = rectSheet(paintRoof(W, D, 10, spec.seed ?? 1, spec.roofColor ?? "#c9b9cf", {pool: spec.pool}),
        {id: id + ".roof", width: W, height: D, thickness: 0.7, origin: "center"});
    roof.position.set(0, D / 2, H);
    g.add(roof);
    // Rolled-paper round tower (corner): a paper tube printed with stripes and round windows, with a round cap and a ring of thin eaves on top
    if (spec.cornerTower) {
        const {r: tr, x: tx, extra = 6} = spec.cornerTower;
        const th = H + extra;
        const skin = paintTowerSkin(spec, 2 * Math.PI * tr, th, PPM_BIG);
        const geo = new THREE.CylinderGeometry(tr, tr, th, 28, 1, true);
        const tube = customPaper(geo, id + ".tower", {map: toTexture(skin.canvas), emissiveMap: toTexture(skin.emissive), emissive: 1.4,
            neon: neonOn, rough: 0.85});
        tube.rotation.x = Math.PI / 2;
        tube.position.set(tx, tr * 0.35, th / 2);
        g.add(tube);
        for (const [rr, z, c] of [[tr + 1.2, th - 3.2, spec.trim], [tr * 0.92, th, spec.accent]]) {
            const cap = customPaper(new THREE.CylinderGeometry(rr, rr, 0.7, 28), `${id}.cap${z}`, {color: c, rough: 0.8});
            cap.rotation.x = Math.PI / 2;
            cap.position.set(tx, tr * 0.35, z);
            g.add(cap);
        }
        // Small flagpole on the spire
        const mast = customPaper(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), id + ".mast", {color: "#f4ecf6"});
        mast.rotation.x = Math.PI / 2;
        mast.position.set(tx, tr * 0.35, th + 3.5);
        g.add(mast);
    }
    // Stepped roof / tower
    if (spec.crownW) {
        const cr = paintCrown(spec, PPM_BIG);
        const crown = cutout(cr.canvas, {id: id + ".crown", ppm: PPM_BIG, thickness: 0.8, emissive: cr.emissive, emissiveIntensity: 1.8,
            back: spec.wall, trace: {cell: 3, dilate: 0}});
        crown.userData.paper.meta.mat.front.neon = neonOn;
        const c = standUp(crown);
        c.position.set(spec.crownX ?? 0, -0.5, H - 0.6);
        g.add(c);
        // The tower has depth: stand another piece behind it, and close up the two sides
        if (spec.crownDepth) {
            const c2 = standUp(cutout(cr.canvas, {id: id + ".crown2", ppm: PPM_BIG, thickness: 0.8, back: spec.wall, trace: {cell: 3, dilate: 0}}));
            c2.position.set(spec.crownX ?? 0, spec.crownDepth, H - 0.6);
            c2.rotation.z = Math.PI;
            g.add(c2);
        }
    }
    // Vertical sign fin
    if (spec.finText) {
        const fin = paintFin(spec, PPM_BIG);
        const mesh = cutout(fin.canvas, {id: id + ".fin", ppm: PPM_BIG, thickness: 0.9, emissive: fin.emissive, emissiveIntensity: 2.2,
            trace: {cell: 3, dilate: 0}, back: "same"});
        const mat = mesh.userData.paper.meta.mat;
        mat.back = {...mat.front, map: flipped(mat.front.map), emissiveMap: flipped(mat.front.emissiveMap)};
        mat.front.neon = neonOn;
        mat.back.neon = neonOn;
        const f = standUp(mesh);
        f.rotation.z = Math.PI / 2;
        f.position.set(spec.finX ?? 0, -(spec.finW ?? 6) / 2 - 0.2, spec.finZ ?? spec.ground + 1);
        g.add(f);
    }
    // Cornice: a thin board sticking out horizontally at the head of each floor of windows
    if (spec.eyebrows) {
        const cornice = spec.cornice ?? 2.2;
        const fh = (H - spec.ground - cornice) / spec.floors;
        for (let f = 0; f < spec.floors; f++) {
            const yTop = cornice + f * fh + fh * 0.28;
            const ledge = rectSheet(null, {id: `${id}.ledge${f}`, width: W - 1.6, height: 2.6, thickness: 0.6, origin: "center", back: spec.trim});
            ledge.userData.paper.meta.mat.front.color = spec.trim;
            ledge.position.set(0, -1.3, H - yTop + 0.55);
            g.add(ledge);
        }
    }
    // Ground-floor awning
    if (spec.awning) {
        const ac = sheet(W - 6, 4.5, 14);
        for (let i = 0; i < 12; i++) {
            ac.ctx.fillStyle = i % 2 ? spec.awning : "#fff6ec";
            ac.ctx.fillRect(i * ac.W / 12, 0, ac.W / 12 + 1, ac.H);
        }
        ac.ctx.fillStyle = lin(ac.ctx, 0, 0, 0, ac.H, [[0, "rgba(0,0,0,0)"], [1, rgba(P.shadeDeep, 0.25)]]);
        ac.ctx.fillRect(0, 0, ac.W, ac.H);
        // Scalloped edge
        const val = sheet(W - 6, 1.6, 14);
        for (let i = 0; i < 12; i++) {
            val.ctx.fillStyle = i % 2 ? spec.awning : "#fff6ec";
            val.ctx.beginPath();
            val.ctx.moveTo(i * val.W / 12, 0);
            val.ctx.lineTo((i + 1) * val.W / 12, 0);
            val.ctx.lineTo((i + 1) * val.W / 12, val.H * 0.55);
            val.ctx.arc((i + 0.5) * val.W / 12, val.H * 0.55, val.W / 24, 0, Math.PI);
            val.ctx.fill();
        }
        grain(ac.ctx, 0.08);
        const aw = rectSheet(ac.canvas, {id: id + ".awning", width: W - 6, height: 4.5, thickness: 0.5, origin: "bottom", back: "same"});
        // Local +y turned to "outward and downward": rotate about x by π + angle (both front and back are printed with stripes)
        aw.position.set(0, -0.3, spec.ground - 1.6);
        aw.rotation.x = Math.PI + 0.42;
        g.add(aw);
        const valance = standUp(cutout(val.canvas, {id: id + ".valance", ppm: 14, thickness: 0.4, trace: {cell: 2, dilate: 0}, back: "same"}));
        const ang = 0.42;
        valance.position.set(0, -0.3 - 4.5 * Math.cos(ang), spec.ground - 1.6 - 4.5 * Math.sin(ang) - 1.5);
        g.add(valance);
    }
    // Rooftop 3D-letter sign (a crossbar under the letters connects them, so it is one whole piece)
    if (spec.roofSign) {
        const rs = sheet(spec.roofSign.w, spec.roofSign.h, PPM_BIG);
        const re = sheet(spec.roofSign.w, spec.roofSign.h, PPM_BIG);
        re.ctx.fillStyle = "#000";
        re.ctx.fillRect(0, 0, re.W, re.H);
        rs.ctx.fillStyle = "#5b4f7a";
        rs.ctx.fillRect(rs.mm(1), rs.H - rs.mm(1.2), rs.W - rs.mm(2), rs.mm(0.6));
        for (let x = rs.mm(2); x < rs.W - rs.mm(1); x += rs.mm(4)) rs.ctx.fillRect(x, rs.H - rs.mm(1.2), rs.mm(0.4), rs.mm(1.2));
        // v12: letters scale to the canvas width (1.2 mm left on each side; before, Sunset, OCEAN VIEW, Club Vice touched the canvas edge)
        const rsFont = s => `700 ${s}px "${spec.roofSign.font ?? "Segoe Script"}", sans-serif`;
        const rsSize = fitFont(rs.ctx, spec.roofSign.text, rs.mm(spec.roofSign.h * 0.62), rs.W - rs.mm(2.4), rsFont);
        neonText(rs.ctx, re.ctx, spec.roofSign.text, rs.W / 2, rs.H - rs.mm(1.6), rsSize,
            spec.roofSign.neon ?? spec.neon, spec.roofSign.font ?? "Segoe Script", "700", {glow: 0.6});
        // Solid backing for the letters: a thick stroke of the base color, so the letters join into a shape that can be cut out
        const solid = makeCanvas(rs.W, rs.H);
        const sc = solid.getContext("2d");
        sc.font = rsFont(rsSize);
        sc.textAlign = "center";
        sc.lineJoin = "round";
        sc.lineWidth = rs.mm(1.1);
        sc.strokeStyle = spec.roofSign.back ?? "#3c2a48";
        sc.strokeText(spec.roofSign.text, rs.W / 2, rs.H - rs.mm(1.6));
        sc.fillStyle = spec.roofSign.back ?? "#3c2a48";
        sc.fillText(spec.roofSign.text, rs.W / 2, rs.H - rs.mm(1.6));
        sc.drawImage(rs.canvas, 0, 0);
        const mesh = cutout(solid, {id: id + ".roofsign", ppm: PPM_BIG, thickness: 0.8, emissive: re.canvas, emissiveIntensity: 2.4,
            trace: {cell: 2, dilate: 1}});
        mesh.userData.paper.meta.mat.front.neon = neonOn;
        const s = standUp(mesh);
        s.position.set(spec.roofSign.x ?? 0, 2, H + 0.3);
        g.add(s);
    }
    return g;
}

// ---------- Cars ----------
function shellGeometry(type) {
    const m = CARS[type];
    const {pts, arc, total} = carShellLayout(type);
    const pos = [], uv = [], idx = [];
    pts.forEach(([x, z], i) => {
        for (const s of [-1, 1]) {
            pos.push(x - m.L / 2, s * m.Wd / 2, z);
            uv.push(arc[i] / total, s < 0 ? 0 : 1);
        }
    });
    for (let i = 0; i < pts.length - 1; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

export function car(id, type, colors, {lightbar = false} = {}) {
    const m = CARS[type];
    const g = new THREE.Group();
    const sides = {[-1]: paintCarSide(type, PPM, colors), [1]: paintCarSide(type, PPM, {...colors, mirrorText: true})};
    for (const s of [-1, 1]) {
        const side = sides[s];
        const mesh = cutout(side.canvas, {id: `${id}.side${s}`, ppm: PPM, thickness: 0.5, emissive: side.emissive, emissiveIntensity: 1.5,
            trace: {cell: 2, dilate: 0}, back: colors.body});
        const holder = new THREE.Group();
        const st = standUp(mesh);
        st.position.y = -m.Wd / 2;
        holder.add(st);
        if (s > 0) holder.scale.y = -1;
        g.add(holder);
    }
    const shell = paintCarShell(type, PPM, colors);
    g.add(customPaper(shellGeometry(type), id + ".shell",
        {map: toTexture(shell.canvas), emissiveMap: toTexture(shell.emissive), emissive: 1.5, rough: 0.4, side: "double", paper: 0.15,
            gloss: "varnish", glossTier: 1}));   // fix item 29 version B: local varnish gloss on the car paint, from sunset on
    // A dark board under the car covers the cut-outs
    const under = customPaper(new THREE.BoxGeometry(m.L * 0.92, m.Wd * 0.96, 0.4), id + ".under", {color: "#2a2236"});
    under.position.z = Math.max(1.4, Math.min(...m.body.map(p => p[1])) - 0.3);   // for a raised big-wheel truck, the dark board follows the car body
    g.add(under);
    if (lightbar) {
        const roofZ = Math.max(...m.body.map(p => p[1]));
        for (const [s, col] of [[-1, "red"], [1, "blue"]]) {
            const bar = customPaper(new THREE.BoxGeometry(1.6, m.Wd * 0.42, 0.9), `${id}.bar${s}`,
                {color: col === "red" ? "#ff5060" : "#5080ff", emissive: 1, emissiveColor: col === "red" ? "#ff2030" : "#2050ff",
                    flash: col, rough: 0.3});
            bar.position.set(0.4, s * m.Wd * 0.22, roofZ + 0.45);
            g.add(bar);
        }
    }
    return g;
}

// ---------- Speedboat: a thick board cut to the deck shape, stripes printed on the sides ----------
export function speedboat(id, colors) {
    const g = new THREE.Group();
    const L = 30, Wd = 7.4;
    const outline = [];
    for (let i = 0; i <= 16; i++) {          // stern flat, bow pointed
        const t = i / 16;
        const x = lerp(-L / 2, L / 2, t);
        const half = t < 0.55 ? Wd / 2 : Wd / 2 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.55) / 0.45, 2)));
        outline.push([x, -Math.max(half, 0.01)]);
    }
    const right = outline.slice(0, -1).map(([x, y]) => [x, -y]).reverse();
    const ring = outline.concat(right);
    const deck = sheet(L, Wd, PPM);
    const dc = deck.ctx;
    dc.fillStyle = colors.deck;
    dc.fillRect(0, 0, deck.W, deck.H);
    dc.fillStyle = colors.stripe;
    dc.fillRect(deck.mm(4), deck.H / 2 - deck.mm(0.6), deck.W - deck.mm(8), deck.mm(1.2));
    // Cockpit
    const cockpit = new Path2D();
    cockpit.roundRect(deck.mm(5), deck.mm(1.4), deck.mm(10), deck.H - deck.mm(2.8), deck.mm(1.2));
    dc.fillStyle = "#4a3f6a";
    dc.fill(cockpit);
    for (const x of [6.5, 10.5]) for (const y of [2.0, 4.0]) {
        const seat = new Path2D();
        seat.roundRect(deck.mm(x), deck.mm(y), deck.mm(2.6), deck.mm(1.5), deck.mm(0.5));
        lit(dc, seat, "#fff1e6", {sw: deck.mm(0.4), rw: deck.mm(0.15)});
    }
    grain(dc, 0.07);
    const hullTex = sheet(8, 4, 32);
    const hc = hullTex.ctx;
    hc.fillStyle = colors.hull;
    hc.fillRect(0, 0, hullTex.W, hullTex.H);
    hc.fillStyle = colors.stripe;
    hc.fillRect(0, hullTex.H * 0.35, hullTex.W, hullTex.H * 0.16);
    hc.fillStyle = colors.stripe2;
    hc.fillRect(0, hullTex.H * 0.58, hullTex.W, hullTex.H * 0.1);
    hc.fillStyle = rgba(P.shadeDeep, 0.35);
    hc.fillRect(0, hullTex.H * 0.85, hullTex.W, hullTex.H * 0.15);
    grain(hc, 0.06);
    const geo = slabGeometry(ring, 4, {x: -L / 2, y: -Wd / 2, width: L, height: Wd});
    const hull = paperMesh(geo, id + ".hull", {
        front: {map: toTexture(deck.canvas), rough: 0.5, gloss: "card", glossTier: 0},   // fix item 29 version B: white glossy card for the hull
        back: {color: "#3a2e58"},
        edge: {map: toTexture(hullTex.canvas), rough: 0.45, gloss: "card", glossTier: 0},
    });
    hull.position.z = 1.2;
    g.add(hull);
    // A row of black outboard motors at the stern (the center-console boat in Leonida_Keys_05)
    for (let k = 0; k < 3; k++) {
        const ob = customPaper(new THREE.BoxGeometry(2.2, 1.6, 4.2), `${id}.motor${k}`, {color: k === 1 ? "#2a2433" : "#3a3448", rough: 0.4});
        ob.position.set(-L / 2 - 1.0, (k - 1) * 2.1, 3.2);
        g.add(ob);
        const cap = customPaper(new THREE.BoxGeometry(2.4, 1.7, 0.8), `${id}.motorcap${k}`, {color: "#f4f0ff", rough: 0.4});
        cap.position.set(-L / 2 - 1.0, (k - 1) * 2.1, 5.6);
        g.add(cap);
    }
    // T-top canopy: four thin poles + a top
    for (const [x, y] of [[-2, -2.4], [-2, 2.4], [3, -2.4], [3, 2.4]]) {
        const post = customPaper(new THREE.CylinderGeometry(0.2, 0.2, 6, 6), `${id}.tpost`, {color: "#e9e4f4"});
        post.rotation.x = Math.PI / 2;
        post.position.set(x, y, 6.2);
        g.add(post);
    }
    const ttop = customPaper(new THREE.BoxGeometry(8, 6.4, 0.6), `${id}.ttop`, {color: colors.top ?? "#ffffff", rough: 0.6});
    ttop.position.set(0.5, 0, 9.3);
    g.add(ttop);    // windshield
    // The plane is first stood up facing -Y, then turned to face the bow (+X), and finally the top leans back
    const ws = customPaper(new THREE.PlaneGeometry(Wd * 0.8, 2.2), id + ".windscreen",
        {color: "#9a8fd0", rough: 0.15, opacity: 0.7, side: "double"});
    ws.rotation.x = Math.PI / 2;
    ws.position.z = 1.1;
    const face = new THREE.Group();
    face.rotation.z = Math.PI / 2;
    face.add(ws);
    const lean = new THREE.Group();
    lean.rotation.y = -0.55;
    lean.position.set(2.0, 0, 3.2);
    lean.add(face);
    g.add(lean);
    return g;
}

// Wake: a white cut piece lying on the water
export function wake(id, seed, len = 60) {
    const r = rng(seed);
    const c = sheet(len, 22, 8);
    const ctx = c.ctx;
    for (let i = 0; i < 900; i++) {
        const t = r();
        const spread = c.mm(2 + 9 * t);
        const side = r() < 0.5 ? -1 : 1;
        const y = c.H / 2 + side * spread * (0.75 + 0.25 * r());
        const x = c.W * (1 - t);
        ctx.fillStyle = rgba("#ffffff", (1 - t) * (0.5 + 0.5 * r()));
        ctx.beginPath();
        ctx.ellipse(x, y, c.mm(0.8 + 1.6 * r()), c.mm(0.3 + 0.4 * r()), 0, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 300; i++) {
        const t = r() * 0.6;
        ctx.fillStyle = rgba("#e8fffb", (1 - t) * 0.6);
        ctx.fillRect(c.W * (1 - t), c.H / 2 + (r() - 0.5) * c.mm(2.5), c.mm(1.5), c.mm(0.3));
    }
    const mesh = cutout(c.canvas, {id, ppm: 8, thickness: 0.2, anchor: [1, 0.5], trace: {cell: 4, dilate: 1, threshold: 30},
        castShadow: false, back: "#ffffff"});
    mesh.userData.paper.meta.mat.front.alphaTest = 0.08;
    mesh.userData.paper.meta.mat.front.transparent = true;
    return mesh;
}

// A strip of white spray cut-out standing on the water
export function waveStrip(id, len, seed, {h = 2.2} = {}) {
    const r = rng(seed);
    const c = sheet(len, h + 0.6, PPM / 2);
    const ctx = c.ctx;
    const top = x => c.mm(0.4) + (Math.sin(x / c.mm(3.2) + seed) * 0.5 + 0.5) * c.mm(h * 0.45) + r() * c.mm(0.1);
    const p = new Path2D();
    p.moveTo(0, c.H);
    for (let x = 0; x <= c.W; x += c.mm(0.4)) p.lineTo(x, top(x));
    p.lineTo(c.W, c.H);
    p.closePath();
    ctx.fillStyle = lin(ctx, 0, 0, 0, c.H, [[0, "#f4fffb"], [0.3, "#9ee9de"], [1, "#3f9fc0"]]);
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    ctx.strokeStyle = rgba("#ffffff", 0.9);
    ctx.lineWidth = c.mm(0.35);
    ctx.beginPath();
    for (let x = 0; x <= c.W; x += c.mm(0.4)) (x ? ctx.lineTo(x, top(x) + c.mm(0.15)) : ctx.moveTo(x, top(x) + c.mm(0.15)));
    ctx.stroke();
    ctx.restore();
    grain(ctx, 0.06);
    return standUp(cutout(c.canvas, {id, ppm: PPM / 2, thickness: 0.5, trace: {cell: 3, dilate: 0}, back: "same", edge: "#e8fffb"}));
}

// ---------- Modern lifeguard tower in GTA6: yellow pitched-roof cabin + front porch railing + red cross (Vice_City_05) ----------
export function lifeguardModern(id, {wall = "#ffd23a", roofC = "#ffb21e", trim = "#fff6ec"} = {}) {
    const g = new THREE.Group();
    const w = 8, d = 6.5, hc = 5.5, z0 = 6.5;
    const paintWall = (W, H, front) => {
        const s = sheet(W, H, PPM);
        s.ctx.fillStyle = wall;
        s.ctx.fillRect(0, 0, s.W, s.H);
        s.ctx.fillStyle = lin(s.ctx, 0, 0, 0, s.H, [[0, rgba("#ffffff", 0.2)], [1, rgba(P.shadeDeep, 0.2)]]);
        s.ctx.fillRect(0, 0, s.W, s.H);
        // Vertical wood plank seams
        s.ctx.strokeStyle = rgba("#b07a10", 0.35);
        s.ctx.lineWidth = s.mm(0.08);
        for (let x = s.mm(0.8); x < s.W; x += s.mm(0.8)) { s.ctx.beginPath(); s.ctx.moveTo(x, 0); s.ctx.lineTo(x, s.H); s.ctx.stroke(); }
        // Window
        const win = roundRect(s.W * 0.18, s.H * 0.2, s.W * 0.64, s.H * 0.4, s.mm(0.3));
        s.ctx.fillStyle = lin(s.ctx, 0, s.H * 0.2, 0, s.H * 0.6, [[0, "#3f3566"], [1, "#9a8ad0"]]);
        s.ctx.fill(win);
        s.ctx.strokeStyle = trim;
        s.ctx.lineWidth = s.mm(0.35);
        s.ctx.stroke(win);
        if (front) {   // red cross sign
            s.ctx.fillStyle = "#ffffff";
            s.ctx.fill(roundRect(s.W * 0.38, s.H * 0.66, s.W * 0.24, s.H * 0.28, s.mm(0.2)));
            s.ctx.fillStyle = "#e0283a";
            s.ctx.fillRect(s.W * 0.47, s.H * 0.68, s.W * 0.06, s.H * 0.24);
            s.ctx.fillRect(s.W * 0.41, s.H * 0.77, s.W * 0.18, s.H * 0.06);
        }
        grain(s.ctx, 0.08);
        return s.canvas;
    };
    const wallAt = (W, H, front, x, y, rz, part) => {
        const m = standUp(rectSheet(paintWall(W, H, front), {id: `${id}.${part}`, width: W, height: H, thickness: 0.6, back: wall}));
        m.position.set(x, y, z0);
        m.rotation.z = rz;
        g.add(m);
    };
    wallAt(w, hc, true, 0, -d / 2, 0, "front");
    wallAt(w, hc, false, 0, d / 2, Math.PI, "back");
    wallAt(d, hc, false, -w / 2, 0, -Math.PI / 2, "left");
    wallAt(d, hc, false, w / 2, 0, Math.PI / 2, "right");
    // Pitched roof: ridge runs front to back, two steep slopes + front and back triangular gables
    const pitch = 0.95, half = w / 2 + 1.2;
    const slope = half / Math.cos(pitch), rise = half * Math.tan(pitch);
    for (const sgn of [-1, 1]) {
        const rc = sheet(slope, d + 3, 14);
        rc.ctx.fillStyle = roofC;
        rc.ctx.fillRect(0, 0, rc.W, rc.H);
        rc.ctx.fillStyle = rgba("#ffffff", 0.35);
        for (let x = 0; x < rc.W; x += rc.mm(1.2)) rc.ctx.fillRect(x, 0, rc.mm(0.3), rc.H);
        grain(rc.ctx, 0.08);
        const s = rectSheet(rc.canvas, {id: `${id}.roof${sgn}`, width: d + 3, height: slope, thickness: 0.6, origin: "bottom", back: roofC});
        // Local y (slope length) points from the eave to the ridge
        const holder = new THREE.Group();
        holder.position.set(sgn * half, 0, z0 + hc);
        holder.rotation.z = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
        s.rotation.x = pitch;
        holder.add(s);
        g.add(holder);
    }
    for (const [y, rz] of [[-d / 2 - 0.2, 0], [d / 2 + 0.2, Math.PI]]) {
        const tri = polySheet([[-half, 0], [half, 0], [0, rise]], {id: `${id}.gable${y}`, color: wall, thickness: 0.6, castShadow: true});
        const t = standUp(tri);
        t.position.set(0, y, z0 + hc);
        t.rotation.z = rz;
        g.add(t);
    }
    // Platform, railing, legs, diagonal braces
    const deck = rectSheet(null, {id: id + ".deck", width: w + 3, height: d + 5, thickness: 0.7, origin: "center", back: "#d8c8a8"});
    deck.userData.paper.meta.mat.front.color = "#e8d6b0";
    deck.position.set(0, -1.2, z0);
    g.add(deck);
    for (const [x, y, sx, sy] of [[0, -d / 2 - 3.6, w + 3, 0.35], [-(w + 3) / 2, -2.2, 0.35, 6], [(w + 3) / 2, -2.2, 0.35, 6]]) {
        const rail = customPaper(new THREE.BoxGeometry(sx, sy, 0.35), id + ".rail", {color: trim});
        rail.position.set(x, y, z0 + 2.2);
        g.add(rail);
        for (let k = 0; k <= 4; k++) {
            const post = customPaper(new THREE.BoxGeometry(0.3, 0.3, 2.2), id + ".post", {color: trim});
            post.position.set(sx > 1 ? x - sx / 2 + k * sx / 4 : x, sy > 1 ? y - sy / 2 + k * sy / 4 : y, z0 + 1.1);
            g.add(post);
        }
    }
    for (const [x, y] of [[-w / 2, -d / 2 - 3], [w / 2, -d / 2 - 3], [-w / 2, d / 2], [w / 2, d / 2]]) {
        const leg = customPaper(new THREE.BoxGeometry(0.8, 0.8, z0), id + ".leg", {color: "#f4ecf6"});
        leg.position.set(x, y, z0 / 2);
        g.add(leg);
    }
    const ramp = rectSheet(null, {id: id + ".ramp", width: 3, height: 12, thickness: 0.6, origin: "bottom"});
    ramp.userData.paper.meta.mat.front.color = "#e8d6b0";
    ramp.position.set(w / 2 + 2, -d / 2 - 2.5, 0);
    ramp.rotation.order = "ZXY";
    ramp.rotation.z = Math.PI / 2;
    ramp.rotation.x = -Math.atan2(z0, 11.5);
    g.add(ramp);
    return g;
}

// ---------- Giant VICE CITY sign (Vice_City_01): letters stand on scaffolding, a row of lights below shining up ----------
export function viceCitySign(id, {wMm = 128, letterH = 24, scaffold = 30} = {}) {
    const hMm = letterH + scaffold + 2;
    const s = sheet(wMm, hMm, 10), e = sheet(wMm, hMm, 10);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const base = H - mm(0.5), top = base - mm(scaffold);
    // Scaffolding: uprights + crossbars + diagonal cross-braces
    ctx.strokeStyle = "#4a3f5e";
    ctx.lineWidth = mm(0.45);
    const cols = 16;
    for (let i = 0; i <= cols; i++) {
        const x = mm(3) + (W - mm(6)) * i / cols;
        ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, top - mm(letterH * 0.6)); ctx.stroke();
    }
    ctx.lineWidth = mm(0.3);
    for (let y = base - mm(1); y > top - mm(letterH * 0.6); y -= mm(5.5)) {
        ctx.beginPath(); ctx.moveTo(mm(3), y); ctx.lineTo(W - mm(3), y); ctx.stroke();
    }
    for (let i = 0; i < cols; i++) {
        const x0 = mm(3) + (W - mm(6)) * i / cols, x1 = mm(3) + (W - mm(6)) * (i + 1) / cols;
        for (let y = base - mm(1); y > top + mm(2); y -= mm(5.5)) {
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y - mm(5.5)); ctx.stroke();
        }
    }
    // Letters
    const font = `${mm(letterH * 1.18)}px Impact, "Arial Black", sans-serif`;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const text = "VICE CITY";
    ctx.save();
    ctx.fillStyle = lin(ctx, 0, top - mm(letterH), 0, top, [[0, "#fff1e0"], [0.6, "#f6d8c0"], [1, "#ffb48a"]]);
    ctx.fillText(text, W / 2, top);
    // Weathered vertical streaks and rust marks on the letter faces
    ctx.globalCompositeOperation = "source-atop";
    const r = rng(77);
    for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rgba(r() < 0.6 ? "#b89a8a" : "#ffffff", 0.18 + r() * 0.2);
        ctx.fillRect(r() * W, top - mm(letterH) + r() * mm(letterH), mm(0.15), mm(1 + r() * 4));
    }
    // Right-side dark face: the difference after the whole row of letters is shifted to the upper left
    ctx.restore();
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#9a7f90";
    ctx.fillText(text, W / 2 + mm(0.7), top + mm(0.4));   // the thickness side of the letters
    ctx.restore();
    // Uplights at the letter base
    for (let i = 0; i < 22; i++) {
        const x = mm(6) + (W - mm(12)) * i / 21;
        ctx.fillStyle = "#fff2c8";
        ctx.fill(ellipse(x, top + mm(0.8), mm(0.55), mm(0.4)));
        em.fillStyle = "#ffd9a0";
        em.fill(ellipse(x, top + mm(0.8), mm(0.55), mm(0.4)));
        const glow = em.createRadialGradient(x, top - mm(2), 0, x, top - mm(2), mm(5));
        glow.addColorStop(0, "rgba(255,190,120,0.45)");
        glow.addColorStop(1, "rgba(255,190,120,0)");
        em.fillStyle = glow;
        em.fillRect(x - mm(5), top - mm(9), mm(10), mm(10));
    }
    // Emissive only on the letters and the lights
    em.globalCompositeOperation = "destination-in";
    em.drawImage(s.canvas, 0, 0);
    finish(s.canvas, {inkW: mm(0.12), ink: "#3a2a48", grainAmt: 0.06});
    const mesh = cutout(s.canvas, {id, ppm: 10, thickness: 1.2, emissive: e.canvas, emissiveIntensity: 1.3, trace: {cell: 3, dilate: 1},
        back: "#4a3f5e"});
    return standUp(mesh);
}

// ---------- White modern apartment building (the glass-balcony band kind from Vice_City_03/05) ----------
export function condoTower(id, {W = 30, D = 22, H = 90, seed = 1, glass = "#8f9ad8", accent = "#ffffff"} = {}) {
    const r = rng(seed);
    const paint = (w) => {
        const s = sheet(w, H, 8), e = sheet(w, H, 8);
        const {ctx, mm} = s;
        e.ctx.fillStyle = "#000";
        e.ctx.fillRect(0, 0, s.W, s.H);
        ctx.fillStyle = "#f6f1ec";
        ctx.fillRect(0, 0, s.W, s.H);
        const fh = mm(3.2);
        for (let y = mm(4); y < s.H - mm(6); y += fh) {
            // Glass band (reflecting the sunset) + white floor-slab lines + glass balustrades
            ctx.fillStyle = lin(ctx, 0, y, s.W, y + fh, [[0, glass], [0.6, "#c7a0c8"], [1, "#f3b29a"]]);
            ctx.fillRect(0, y + mm(0.6), s.W, fh - mm(1.2));
            ctx.fillStyle = accent;
            ctx.fillRect(0, y, s.W, mm(0.6));
            ctx.fillStyle = rgba("#dff6ff", 0.45);
            ctx.fillRect(0, y + fh - mm(1.4), s.W, mm(0.8));
            for (let x = mm(2); x < s.W - mm(2); x += mm(3.4)) {
                if (r() < 0.18) {
                    ctx.fillStyle = "#ffd39a";
                    ctx.fillRect(x, y + mm(0.8), mm(2.6), fh - mm(1.8));
                    e.ctx.fillStyle = "#c89060";
                    e.ctx.fillRect(x, y + mm(0.8), mm(2.6), fh - mm(1.8));
                }
            }
        }
        // Vertical white fins
        ctx.fillStyle = accent;
        for (const f of [0, 0.5, 1]) ctx.fillRect(f * s.W - mm(0.6), 0, mm(1.2), s.H);
        ctx.fillStyle = lin(ctx, 0, 0, s.W, 0, [[0, rgba("#ffffff", 0.15)], [1, rgba(P.shadeDeep, 0.15)]]);
        ctx.fillRect(0, 0, s.W, s.H);
        grain(ctx, 0.06);
        return s;
    };
    const g = new THREE.Group();
    const front = paint(W), side = paint(D);
    const wall = (sv, w, x, y, rz, part) => {
        const m = standUp(rectSheet(sv.canvas, {id: `${id}.${part}`, width: w, height: H, thickness: 0.8, back: "#e9e2ef"}));
        m.position.set(x, y, 0);
        m.rotation.z = rz;
        g.add(m);
    };
    wall(front, W, 0, 0, 0, "f");
    wall(front, W, 0, D, Math.PI, "b");
    wall(side, D, -W / 2, D / 2, -Math.PI / 2, "l");
    wall(side, D, W / 2, D / 2, Math.PI / 2, "r");
    const roof = rectSheet(paintRoof(W, D, 6, seed, "#d9d2e2"), {id: id + ".roof", width: W, height: D, thickness: 0.8, origin: "center"});
    roof.position.set(0, D / 2, H);
    g.add(roof);
    // Crown light frame on the roof
    const crown = customPaper(new THREE.BoxGeometry(W * 0.6, D * 0.6, 4), id + ".crown", {color: "#f6f1ec"});
    crown.position.set(0, D / 2, H + 2);
    g.add(crown);
    return g;
}

// ---------- Ferris wheel (the one in the background of Vice_City_08 / Jason_and_Lucia_09) ----------
export function ferrisWheel(id, d = 46) {
    const R = d / 2;
    const s = sheet(d + 4, d + 10, 10), e = sheet(d + 4, d + 10, 10);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    const cx = W / 2, cy = mm(R + 2);
    ctx.strokeStyle = "#f4ecf6";
    ctx.lineWidth = mm(0.5);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - mm(R * 0.7), H - mm(0.5)); ctx.moveTo(cx, cy); ctx.lineTo(cx + mm(R * 0.7), H - mm(0.5)); ctx.stroke();
    for (const rr of [R, R - 1.2]) { ctx.beginPath(); ctx.arc(cx, cy, mm(rr), 0, Math.PI * 2); ctx.stroke(); }
    ctx.lineWidth = mm(0.22);
    for (let k = 0; k < 24; k++) {
        const a = k * Math.PI / 12;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * mm(R), cy + Math.sin(a) * mm(R)); ctx.stroke();
        // Gondola
        const gx = cx + Math.cos(a) * mm(R), gy = cy + Math.sin(a) * mm(R);
        ctx.fillStyle = k % 3 === 0 ? "#ff8fc0" : "#ffffff";
        ctx.fill(roundRect(gx - mm(0.9), gy, mm(1.8), mm(1.6), mm(0.4)));
    }
    // A ring of LEDs on the rim
    for (let k = 0; k < 72; k++) {
        const a = k * Math.PI / 36;
        const x = cx + Math.cos(a) * mm(R - 0.6), y = cy + Math.sin(a) * mm(R - 0.6);
        const c = ["#ff4fa3", "#3ff0e0", "#ffd36a"][k % 3];
        ctx.fillStyle = c;
        ctx.fillRect(x - mm(0.25), y - mm(0.25), mm(0.5), mm(0.5));
        em.fillStyle = c;
        em.fillRect(x - mm(0.3), y - mm(0.3), mm(0.6), mm(0.6));
    }
    const mesh = cutout(s.canvas, {id, ppm: 10, thickness: 0.8, emissive: e.canvas, emissiveIntensity: 1.8, trace: {cell: 3, dilate: 1},
        back: "#e9e2ef", castShadow: false});
    return standUp(mesh);
}

// ---------- Distant view ----------
export function skylineFlat(id, w, h, seed, near) {
    const s = paintSkyline(w, h, 6, seed, {near});
    return standUp(cutout(s.canvas, {id, ppm: 6, thickness: 1.2, emissive: s.emissive, emissiveIntensity: 1.6,
        trace: {cell: 3, dilate: 0}, back: "#8f7fc4", castShadow: false}));
}
export function sunDisc(id, d) {
    const s = paintSunDisc(d, 6);
    const ring = [];
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; ring.push([Math.cos(a) * d / 2, d / 2 + Math.sin(a) * d / 2]); }
    const mesh = polySheet(ring, {id, canvas: s.canvas, emissive: s.emissive, emissiveIntensity: 1.3, thickness: 1.2,
        uvFrame: {x: -d / 2, y: 0, width: d, height: d}, castShadow: false, receiveShadow: false, rough: 1});
    mesh.userData.paper.meta.mat.front.unlit = true;
    return standUp(mesh);
}
export function cloud(id, w, h, seed) {
    return standUp(cutout(paintCloud(w, h, 8, seed), {id, ppm: 8, thickness: 1, trace: {cell: 3, dilate: 0}, back: "#c9b2e6", castShadow: false}));
}

void traceAlpha;

// ---------- GTA6 pedestrians, motorcycles, buggies ----------
export function streetPerson(id, seed, look, extra = {}) {
    const o = {...(typeof look === "string" ? LOOKS[look] : look), ...extra};
    const g = standee(id, paintStreetPerson(PPM, seed, o));
    g.userData.person = true;   // gets a slight sway when placed in the world
    return g;
}
// Fix item 17: people cut from the generated image sheet (atlas; atlas.js supplies the canvas), standees + paper feet + slight sway, same as the code-drawn pedestrians
export function atlasPerson(id, canvas) {
    const g = standee(id, canvas, {ppm: canvas.ppm ?? PPM});
    g.userData.person = true;
    return g;
}
export const sportbike = (id, o) => standee(id, paintSportbike(PPM, o), {base: false});
export const wheelie = (id, seed, o) => standee(id, paintWheelie(PPM, seed, o), {base: false});
export const atv = (id) => standee(id, paintATV(PPM), {base: false});
export function floatRing(id) {
    const m = cutout(paintFloatRing(PPM), {id, ppm: PPM, thickness: 1.2, anchor: "center", trace: {cell: 2, dilate: 0}, back: "#ff8fc0", edge: "#ff9fca"});
    return m;
}
// Moon: a pale disc with crater patches, unlit
export function moonDisc(id, d) {
    const s = sheet(d, d, 6);
    const {ctx, W, H} = s;
    const disc = ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 2);
    ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#fffaf0"], [1, "#d9d4f4"]]);
    ctx.fill(disc);
    ctx.fillStyle = rgba("#b8b0d8", 0.45);
    for (const [x, y, r] of [[0.35, 0.4, 0.12], [0.62, 0.3, 0.07], [0.55, 0.65, 0.15], [0.3, 0.7, 0.06]]) ctx.fill(ellipse(W * x, H * y, W * r, H * r));
    const ring = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; ring.push([Math.cos(a) * d / 2, d / 2 + Math.sin(a) * d / 2]); }
    const mesh = polySheet(ring, {id, canvas: s.canvas, emissive: s.canvas, emissiveIntensity: 1.1, thickness: 1,
        uvFrame: {x: -d / 2, y: 0, width: d, height: d}, castShadow: false, receiveShadow: false, rough: 1});
    mesh.userData.paper.meta.mat.front.unlit = true;
    return standUp(mesh);
}