// Grassrivers - golden afternoon. Region-local y runs from -12 (joins the Keys' wave cut-out) to 390 (joins Port Gellhorn).
// Based on official screenshots: Grassrivers_01/03 (caged-fan airboat, alligators, sawgrass), Grassrivers_02 (stilt restaurant over the water: red tin roof, white walls, wooden deck),
// Grassrivers_04 (pickup driving through the shallows, helicopter), Grassrivers_05 (cypress grove, fishing camp, parked floatplane, egrets); official postcard GRASSRIVERS.
import * as THREE from "three";
import {rng} from "../kit.js";
import {sheet, rgba, grain, lin, mix} from "../paint.js";
import * as K from "../props.js";
import * as C from "../props_city.js";
import * as T from "../props_town.js";
import * as Wd from "../props_wild.js";
import * as S from "../props_story.js";
import {BEAT} from "../beat.js";

export const Y0 = -12, Y1 = 390;
const X0 = -260, X1 = 260;
export const LANES = {channel: 128, track: 330};

// Wetland: olive-green water (reflecting the golden sky), patches of sawgrass meadow, bands of light in the channels; the small GRASSRIVERS place name and the highway shield are printed on the ground
function paintSwamp(wMm, hMm, ppm, y0, lands) {
    const r = rng(61);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    const Y = y => H - mm(y - y0), X = x => mm(x - X0);
    // water: deep teal-green (tea-tinted wetland water), brighter in the distance
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#66a894"], [0.5, "#579884"], [1, "#4a8878"]]);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 120; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? "#2a4a40" : "#5a8a6a", 0.25);
        ctx.beginPath(); ctx.ellipse(r() * W, r() * H, mm(4 + r() * 14), mm(1 + r() * 3), 0, 0, Math.PI * 2); ctx.fill();
    }
    // the water reflects the golden sky: streaks of warm light (the afternoon sun is ahead of the camera, a bit to the left)
    for (let i = 0; i < 110; i++) {
        const y = r() * H, w = mm(10 + r() * 90), x = r() * W;
        ctx.fillStyle = rgba(r() < 0.5 ? "#ffe0a0" : "#ffc080", 0.22 + r() * 0.25);
        ctx.fillRect(x, y, w, mm(0.4 + r() * 1.0));
    }
    // sawgrass meadows: big irregular patches with fuzzy edges
    for (const [x, y, rx, ry] of lands) {
        ctx.save();
        ctx.translate(X(x), Y(y));
        const pts = [];
        for (let k = 0; k < 36; k++) {
            const a = k / 36 * Math.PI * 2, f = 1 + 0.18 * Math.sin(a * 4 + x) + 0.1 * Math.sin(a * 9 + y);
            pts.push([Math.cos(a) * mm(rx) * f, Math.sin(a) * mm(ry) * f]);
        }
        ctx.beginPath();
        pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
        ctx.closePath();
        // a ring of mud at the edge, then grass
        ctx.strokeStyle = "#6a5a38";
        ctx.lineWidth = mm(2.2);
        ctx.stroke();
        ctx.fillStyle = "#b0a24a";
        ctx.fill();
        ctx.clip();
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, mm(Math.max(rx, ry)));
        g.addColorStop(0, rgba("#7a9a40", 0.7));
        g.addColorStop(1, rgba("#d8c060", 0.2));
        ctx.fillStyle = g;
        ctx.fillRect(-mm(rx) * 1.3, -mm(ry) * 1.3, mm(rx) * 2.6, mm(ry) * 2.6);
        for (let i = 0; i < rx * ry * 1.6; i++) {
            ctx.strokeStyle = rgba(r() < 0.35 ? "#e8cc70" : r() < 0.7 ? "#5a7a30" : "#9aaa48", 0.7);
            ctx.lineWidth = mm(0.2);
            const px = (r() - 0.5) * mm(rx) * 2.2, py = (r() - 0.5) * mm(ry) * 2.2;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + mm(0.3), py - mm(1.4)); ctx.stroke();
        }
        ctx.restore();
    }
    // water lily pads
    for (let i = 0; i < 160; i++) {
        const x = r() * W, y = r() * H, rr = mm(0.6 + r() * 0.9);
        ctx.fillStyle = rgba("#4a8a4a", 0.8);
        ctx.beginPath(); ctx.arc(x, y, rr, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x, y); ctx.fill();
        if (r() < 0.15) { ctx.fillStyle = "#ffd0e0"; ctx.beginPath(); ctx.arc(x + rr * 0.3, y - rr * 0.2, rr * 0.35, 0, Math.PI * 2); ctx.fill(); }
    }
    // channel: the one the airboat runs along is brighter and flatter
    ctx.fillStyle = lin(ctx, 0, Y(LANES.channel + 16), 0, Y(LANES.channel - 16), [[0, rgba("#8ab89a", 0)], [0.5, rgba("#a8c8a0", 0.55)], [1, rgba("#8ab89a", 0)]]);
    ctx.fillRect(0, Y(LANES.channel + 16), W, mm(32));
    // map elements: county name + Highway 41 shield
    ctx.font = `700 ${mm(5)}px "Bookman Old Style", serif`;
    ctx.fillStyle = rgba("#fff6e4", 0.8);
    ctx.textAlign = "center";
    ctx.fillText("GRASSRIVERS NATIONAL PRESERVE", X(-120), Y(24));
    ctx.setLineDash([mm(3), mm(2)]);
    ctx.strokeStyle = rgba("#fff6e4", 0.5);
    ctx.lineWidth = mm(0.4);
    ctx.beginPath(); ctx.moveTo(0, Y(16)); ctx.bezierCurveTo(W * 0.3, Y(30), W * 0.6, Y(4), W, Y(20)); ctx.stroke();
    ctx.setLineDash([]);
    grain(ctx, 0.08, 2);
    return canvas;
}

// Boardwalk / pier (a flat sheet of paper printed with planks, raised slightly)
function paintDock(wMm, hMm) {
    const s = sheet(wMm, hMm, 8);
    s.ctx.fillStyle = "#b08a6a";
    s.ctx.fillRect(0, 0, s.W, s.H);
    for (let x = 0; x < s.W; x += s.mm(1.4)) { s.ctx.fillStyle = rgba("#5a3a30", 0.4); s.ctx.fillRect(x, 0, s.mm(0.15), s.H); }
    grain(s.ctx, 0.1);
    return s.canvas;
}

export function build(W) {
    const {R, jitter, band} = W;
    const front = x => -6 + 5 * Math.sin(x / 17 + 0.5) + 2 * Math.sin(x / 6.3);   // the wave cut-out between this region and the Keys
    const back = x => 384 + 4 * Math.sin(x / 21) + 2 * Math.sin(x / 8 + 2);
    const LANDS = [[-150, 60, 70, 30], [150, 40, 60, 24], [-20, 205, 60, 26], [180, 210, 70, 34], [-190, 250, 50, 40], [40, 330, 90, 30], [-120, 360, 80, 22]];
    W.ground("swamp", band(front, back, 6), paintSwamp(X1 - X0, Y1 - Y0 + 20, 5, Y0 - 10, LANDS), {x: X0, y: Y0 - 10, width: X1 - X0, height: Y1 - Y0 + 20}, 0.8, 1.2,
        {edge: "#c8b878"});

    // ---------- Postcard lettering: GRASSRIVERS ----------
    W.put(T.postcardTitle("title_glades", ["GRASSRIVERS"], {font: "Arial Black", weight: "900", fill: ["#9ae860", "#2f9a3a"], outline: "#1e2418", depth: "#4a3a20",
        size: 13, arc: 0.12}), 0, 46, 0.8, {freq: 1.0, damp: 4.2, lead: 30, rect: [60, 3], onBar: true});

    // ---------- Airboat: runs along the channel, towing a white wake ----------
    let airboatPivot = null;
    {
        const ab = Wd.airboat("airboat");
        const p = W.put(ab, -120, LANES.channel, 0.8, {fold: "grow"});
        p.holder.scale.setScalar(1.35);
        // T2: Jason and Lucia run through the swamp in an airboat with a helicopter chasing behind (drawn from behind only)
        const drv = K.streetPerson("abDriver", 600, "jasonHeist", {back: true});
        drv.scale.setScalar(0.9);
        drv.position.set(-2.5, 0, 7.7);
        p.holder.add(drv);
        const pas = K.streetPerson("abPass", 601, "luciaHeist", {back: true, prop: "duffel", propColor: "#c06cff"});
        pas.scale.setScalar(0.9);
        pas.position.set(3, 0, 2.4);
        p.holder.add(pas);
        airboatPivot = p.pivot;
        const wk = K.wake("abWake", 7, 60);
        wk.position.set(-12, 0, 0.2);
        p.holder.add(wk);
        W.mover({kind: "boat", obj: p.pivot, x0: -30, v: 20, atY: 100});   // when the camera focus reaches the front of the channel, the boat is just left of the middle of the frame
    }
    // a second airboat is moored at the restaurant pier
    const ab2 = W.put(Wd.airboat("airboat2", {stripe: "#d8603a"}), 37, 176, 0.8, {fold: "grow", yaw: 0.2, rect: [13, 7]});
    if (ab2) ab2.holder.scale.setScalar(1.25);

    // ---------- Alligators: floating in the water, lying on the bank ----------
    [[-60, 96, 20, 0.4], [70, 100, 16, -0.3], [-150, 72, 22, 0.8], [140, 54, 18, 2.6], [-10, 160, 14, 1.4], [110, 236, 20, -0.6], [-100, 244, 18, 0.2]].forEach(([x, y, len, rot], i) =>
        W.flat(Wd.gator("gator" + i, len, 70 + i), x, y, 0.8, {rot, r: len * 0.5}));

    // ---------- Stilt restaurant over the water (Grassrivers_02) + pier ----------
    W.reserve(60, 205, 32, 22);
    W.put(T.house("stiltDiner", {W: 44, D: 24, H: 12, wall: "#f4efe6", trim: "#3a6aa8", roof: "#c83a3a", roofKind: "tin", siding: true, windows: 5, doorX: 0.3, lit: 0.4,
        seed: 31, pitch: 9, stilts: 7, deck: 6, sign: {text: "SEAFOOD · AIRBOAT TOURS", h: 3, y: 11.6, bg: "#3a6aa8", color: "#ffffff", font: "Bahnschrift"}}),
    60, 196, 0.8, {freq: 1.0, damp: 4.8});
    W.ground("gladeDock", [[4, 170], [22, 170], [22, 186], [4, 186]], paintDock(18, 16), {x: 4, y: 170, width: 18, height: 16}, 2.6, 0.6);
    // guests on the deck in front of the restaurant, people waiting for a boat on the pier
    [[46, 191.4, "campShirt", 7.8, 0], [74, 191.4, "sunhatLady", 7.8, 0], [14, 179, "detectorGuy", 2.6, 2.4]].forEach(([x, y, look, z, r], i) =>
        W.put(K.streetPerson("gd" + i, 610 + i, look), x, y, z, {yaw: jitter(0.5), r}));

    // ---------- Fishing camp (Grassrivers_05): cabin + pier + parked floatplane ----------
    W.reserve(-110, 300, 16, 11);
    W.put(T.house("fishCamp", {W: 26, D: 18, H: 10, wall: "#c8a888", trim: "#f4ecd8", roof: "#6a7a6a", roofKind: "tin", siding: true, windows: 2, doorX: 0.62, lit: 0.3,
        seed: 33, pitch: 7, stilts: 4, deck: 4, weathered: true, sign: {text: "BAIT · ICE", h: 2.6, y: 9.6, bg: "#f4ecd8", color: "#3a5a3a"}}), -110, 292, 0.8,
    {freq: 1.0, damp: 4.8});
    W.ground("campDock", [[-96, 270], [-60, 270], [-60, 280], [-96, 280]], paintDock(36, 10), {x: -96, y: 270, width: 36, height: 10}, 2.2, 0.6);
    W.put(Wd.seaplane("gladePlane", {body: "#f4f0e8", accent: "#d8343f", accent2: "#2a3a6a"}), -62, 262, 0.8, {fold: "grow", yaw: 0.4, rect: [16, 13]});

    W.reserve(0, LANES.track, 262, 6.5);   // the dirt road in the shallows behind, kept clear for the pickup

    // ---------- Thrillbilly Mud Club (T1 at about 0:55): two monster-truck pickups throw mud in the mud pit, and a ring of people on the bank raise their drinks and cheer ----------
    W.reserve(-42, 214, 32, 17);
    W.flat(S.mudPit("mudPit", 30, 15, 7), -42, 214, 1.0);
    {
        const mt = (key, col, seed) => {
            const c = K.car(key, "mudtruck", {...col, modern: true, rim: "#c9c3dc", mud: true, seed});
            for (const [x, s] of [[-8, 1], [8, 2]]) {
                const sp = S.mudSplash(key + ".mud" + s, seed + s, {w: 14, h: 10});
                sp.position.set(x, -6.2, 0.2);
                c.add(sp);
            }
            return c;
        };
        W.put(mt("mud1", {body: "#2f8a4a", cargo: "#c8a060"}, 3), -62, 208, 1.0, {fold: "grow", yaw: 0.3, freq: 1.2, damp: 5});
        // the second truck's nose is tipped up (it is charging out of the mud pit)
        const tilt = new THREE.Group();
        const t2 = mt("mud2", {body: "#e8a020", cargo: "#3a3428"}, 5);
        t2.rotation.y = -0.2;
        t2.position.z = 2.2;
        tilt.add(t2);
        tilt.userData.core = t2;
        W.put(tilt, -27, 222, 1.0, {fold: "grow", yaw: Math.PI - 0.35, freq: 1.2, damp: 5});
    }
    W.put(S.postSign("mudSign", {lines: ["THRILLBILLY", "MUD CLUB"], w: 44, h: 11, legs: 7, bg: "#d8a868", colors: ["#7a2a1a", "#3a2418"], edge: "#3a2418",
        sizes: [4.6, 3.4], shape: "arch"}), -42, 236, 1.0, {freq: 1.1, damp: 5, rect: [23, 2]});
    [[-70, 194.5, "neonBikini", {pose: "wave"}], [-58, 194, "greenTrunks", {prop: "cup"}], [-46, 193.5, "sunhatLady", {}], [-33, 194.5, "fishingShirt", {pose: "wave"}],
        [-21, 195.5, "cropCargo", {}], [-4, 206, "campShirt", {}]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("mc" + i, 640 + i, look, extra), x, y, 0.8, {yaw: W.jitter(0.3), r: 4.5}));

    // ---------- XERO gas station convenience store: an alligator is crawling in through the door (the security-camera footage in T1, based on a real incident in Florida in 2013)----------
    W.reserve(40, 309, 16, 8);
    {
        const xs = T.house("xero", {W: 30, D: 14, H: 10, wall: "#f4f2ee", trim: "#1f4aa8", roof: "#a8a8b8", roofKind: "tin", roofType: "flat", windows: 3, doorX: 0.5,
            lit: 0.8, seed: 35, sign: {text: "GAS · BAIT · COLD BEER · ICE", h: 2.4, y: 9.6, bg: "#1f4aa8", color: "#ffffff"}});
        const rs = S.postSign("xeroSign", {lines: ["XERO"], w: 18, h: 7, legs: 1.2, bg: "#1f4aa8", color: "#ffffff", edge: "#d8343f", sizes: [5]});
        rs.position.set(0, 7, 10);
        xs.add(rs);
        W.put(xs, 40, 302, 0.8, {freq: 1.0, damp: 4.8});
        W.flat(Wd.gator("storeGator", 15, 91), 40, 296.5, 0.9, {rot: Math.PI / 2});
        W.put(K.streetPerson("xRun", 660, "detectorGuy", {prop: null, pose: "run"}), 58, 296, 0.8, {yaw: 0.2});
        W.put(K.streetPerson("xFilm", 661, "hoodieKid", {prop: "phone", pose: "selfie"}), 22, 295, 0.8, {yaw: -0.2});
        W.put(S.gasPump("pump1"), 66, 306, 0.8, {fold: "grow", rect: [1.6, 1.2]});
        W.put(S.gasPump("pump2"), 74, 306, 0.8, {fold: "grow", rect: [1.6, 1.2]});
    }

    // ---------- Cypress grove, sawgrass, egrets ----------
    // cypress trees grow in clumps on the grass (also inside the camera corridor x ~ +/-70, not only at the sides)
    const trees = [[-230, 120], [-200, 150], [-236, 190], [-176, 196], [210, 120], [236, 160], [196, 168], [-40, 270], [-6, 300], [150, 300], [196, 290],
        [232, 330], [-230, 320], [-180, 340], [150, 352],
        [-76, 70], [-98, 50], [-118, 76], [92, 62], [118, 80], [140, 30], [-150, 172], [-122, 204], [40, 262], [128, 250], [168, 226]];
    trees.forEach(([x, y], i) => W.put(Wd.swampTree("cy" + i, {h: 26 + R() * 20, w: 15 + R() * 9, seed: 100 + i, base: i % 3 ? "#4a6a3a" : "#5a7a40"}), x, y, 0.8,
        {fold: "grow", freq: 1.1, damp: 5, r: 6.5}));
    // sawgrass: clumps poking into each other looks natural (userData.soft, they do not count as clipping with each other), but they must not stab into people, boats or trees (footprint is based on clump width)
    for (let i = 0; i < 64; i++) {
        const [lx, ly, rx, ry] = LANDS[i % LANDS.length];
        const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.85, w = 9 + R() * 8;
        const tuft = Wd.grassTuft("sg" + i, {w, h: 6 + R() * 7, seed: 130 + i});
        tuft.userData.soft = true;
        W.put(tuft, lx + Math.cos(a) * rx * d, ly + Math.sin(a) * ry * d, 0.8, {fold: "grow", r: w * 0.42, soft: true});
    }
    // egrets stand in the grass (treated as soft like the clumps, touching each other does not count as clipping)
    [[-128, 62], [-112, 68], [160, 44], [12, 200], [196, 222]].forEach(([x, y], i) => {
        const e = Wd.egret("eg" + i, i);
        e.userData.soft = true;
        W.put(e, x, y, 0.8, {yaw: jitter(0.8), r: 2});
    });

    // ---------- Behind: pickup driving through the shallows (Grassrivers_04) + helicopter ----------
    const tr = W.lane("gladeTrack", LANES.track, 14);
    tr.add(K.car("gp0", "pickup", {body: "#e9e6f2", modern: true, rim: "#2a2236", cargo: "#d8603a"}), -40);
    tr.add(K.car("gp1", "pickup", {body: "#2a3a5a", modern: true, rim: "#c9c3dc", cargo: "#f5c518"}), -90);
    {
        const hh = C.heli("gladeHeli");
        hh.userData.beam.visible = false;
        const hp = W.put(hh, -40, 150, 46, {fold: "grow", lead: 60});
        if (hp && airboatPivot) W.mover({kind: "follow", obj: hp.pivot, heli: hh, target: airboatPivot, offset: [-30, 16, 40], yaw: 0.15, phase: 1.1});
    }
    // ---------- Version 10: the water in front of and behind the big lettering is no longer empty - a flock of pink spoonbills and two egrets in the shallows, a few lily pads, and a "beware of alligators" sign ----------
    // placed at the very end of the region, no footprint registered, no individual people: no extra random numbers are drawn, so the random positions in later regions stay the same. Keeps clear of the airboat channel (y 128 +/- 10).
    {
        [[-41, 108, 1], [-34, 104, 2], [-27, 110, 3]].forEach(([x, y, sd]) => {
            const b = Wd.spoonbill("spoon" + sd, sd);
            b.scale.setScalar(1.7);
            b.userData.soft = true;
            W.put(b, x, y, 0.8, {yaw: (sd - 2) * 0.25});
        });
        [[44, 150, 5], [52, 145, 6]].forEach(([x, y, sd]) => {
            const e = Wd.egret("eg2_" + sd, sd);
            e.scale.setScalar(1.6);
            e.userData.soft = true;
            W.put(e, x, y, 0.8, {yaw: sd === 5 ? 0.3 : -0.4});
        });
        [[-8, 106, 21], [58, 114, 22], [-26, 148, 23], [-38, 24, 24], [32, 18, 25], [14, 152, 26]].forEach(([x, y, sd]) =>
            W.flat(Wd.lilyPads("lily" + sd, sd), x, y, 0.82));
        W.put(S.postSign("gatorSign", {lines: ["DANGER", "ALLIGATORS · NO SWIMMING"], w: 26, h: 9, legs: 5, bg: "#f4ecd0", colors: ["#c8202a", "#2a2440"],
            edge: "#2a2440", sizes: [3.8, 1.9]}), 20, 100, 0.8, {freq: 1.1, damp: 5, yaw: -0.15});
    }
    // ---------- blind review (11-24): no wanted star is visible at 8-14 s - stand a pole-less wanted sign in front of GRASSRIVERS (a small tab rests on the ground), the star from the Keys lights up along with the sign,
    // and the 2nd star lights up on the next beat (the police boats have just chased past the jet ski). Placed at the end of the region, no footprint registered: no extra random numbers are drawn
    {
        const sc = 0.8, x = -16, y = 10, z = 0.8;
        W.put(S.wantedPanel("wantedG", {legs: 0}), x, y, z, {freq: 1.1, damp: 5, lead: 20}).holder.scale.setScalar(sc);
        for (let k = 0; k < 2; k++) {
            const [sx, sz] = S.starSlot(k, 0);
            const st = S.wantedStar("starG" + k);
            st.scale.setScalar(sc);
            const s = W.put(st, x + sx * sc, y - 1.1, z + sz * sc, {fold: "grow", freq: 1.6, damp: 6, lead: 20, dt: k ? 0.5 + 2 * BEAT : 0.45});
            W.mover({kind: "pulse", obj: s.holder, of: s.pivot, delay: 0});
        }
    }
    void [mix, rng];
    return {name: "grassrivers", y0: Y0, y1: Y1};
}
