// Vice Beach (Ocean Drive) - sunset. Region-local coordinates: y runs from the open sea (-320) to the hotel back street (236).
// Based on official screenshots Vice_City_05 (beach, lifeguard tower, 4x4), Vice_City_06 (OCEAN VIEW, DIXON, Vice Beach police car), Vice_City_01 (VICE CITY sign).
import * as THREE from "three";
import {rng, cutout, standUp, polySheet} from "../kit.js";
import {P, sheet, rgba, grain, paintSign} from "../paint.js";
import {paintOcean, paintSand, paintLawn, paintRoad, paintPavement} from "../paint_city.js";
import * as K from "../props.js";
import * as Wd from "../props_wild.js";
import * as C from "../props_city.js";
import * as S from "../props_story.js";
import * as T from "../props_town.js";

export const Y0 = -320, Y1 = 236;
const X0 = -260, X1 = 260;
const shore = x => -38 + 4 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1);
const dune = x => 55 + 3 * Math.sin(x / 31 + 2) + 1.2 * Math.sin(x / 7);

// Ocean Drive lanes (region-local y): eastbound 112, westbound 126, roadside parking 139; road surface 104-146
export const LANES = {east: 112, west: 126, park: 139};

export function build(W) {
    const {R, jitter, band} = W;

    // ---------- Ground ----------
    W.ground("ocean", band(Y0 - 40, shore), paintOcean(X1 - X0, 300, 6, 1), {x: X0, y: Y0 - 40, width: X1 - X0, height: 300}, 0, 1.2,
        {gloss: {gloss: "water", glossTier: 0}});   // fix item 29, version B: sunset sea-surface gloss varnish
    {
        const foam = sheet(X1 - X0, 16, 6);
        const fr = rng(5);
        for (let i = 0; i < 2600; i++) {
            const x = fr() * foam.W, y = foam.H * (0.15 + 0.7 * Math.pow(fr(), 0.7));
            foam.ctx.fillStyle = rgba("#ffffff", 0.55 + 0.45 * fr());
            foam.ctx.beginPath();
            foam.ctx.ellipse(x, y, foam.mm(0.4 + fr() * 1.6), foam.mm(0.2 + fr() * 0.5), 0, 0, Math.PI * 2);
            foam.ctx.fill();
        }
        const m = cutout(foam.canvas, {id: "foam", ppm: 6, thickness: 0.2, anchor: [0, 0], trace: {cell: 4, dilate: 2, threshold: 40},
            castShadow: false, back: "#ffffff"});
        m.userData.paper.meta.mat.front.alphaTest = 0.2;
        W.flat(m, X0, -52, 0.35);
    }
    W.ground("sand", band(shore, 64), paintSand(X1 - X0, 110, 7, 2), {x: X0, y: -46, width: X1 - X0, height: 110}, 1.2, 1.2);
    W.ground("lawn", band(dune, 100), paintLawn(X1 - X0, 48, 8, 3), {x: X0, y: 52, width: X1 - X0, height: 48}, 2.2, 1.0);
    W.ground("walk", band(96, 104, 20), paintPavement(X1 - X0, 8, 10, 4), {x: X0, y: 96, width: X1 - X0, height: 8}, 2.8, 1.2);
    // canvas top edge = far (y=146), bottom edge = near (y=104)
    const roadH = 42, f = y => (146 - y) / roadH;
    W.ground("road", band(104, 146, 20), paintRoad(X1 - X0, roadH, 9, 5, {crosswalks: [0.36, 0.64], label: "OCEAN DRIVE", labelY: f(105.8) - 0.02,
        lines: [{y: f(119), kind: "yellow2"}, {y: f(105.3), kind: "white"}, {y: f(133.2), kind: "park"}, {y: f(144.8), kind: "white"}], parkDepth: 0.26}),
        {x: X0, y: 104, width: X1 - X0, height: roadH}, 2.2, 1.0);
    W.ground("pave", band(146, 216, 20), paintPavement(X1 - X0, 70, 8, 6, {tile: 3, base: "#f3dfd2", line: "#d9bcbc"}), {x: X0, y: 146, width: X1 - X0, height: 70}, 2.8, 1.2);
    W.ground("backroad", band(216, Y1, 20), paintRoad(X1 - X0, Y1 - 216, 6, 7), {x: X0, y: 216, width: X1 - X0, height: Y1 - 216}, 2.2, 1.0);

    // ---------- Sea ----------
    for (let i = 0; i < 9; i++) {
        const len = 30 + R() * 50;
        const y = i < 5 ? -50 - i * 7 + jitter(3) : -95 - R() * 140;
        const w = W.put(K.waveStrip("wave" + i, len, 40 + i, {h: 1.6 + R() * 1.2}), -200 + R() * 400 - len / 2, y, 0, {});
        W.mover({kind: "wave", obj: w.holder, phase: R() * 6, amp: 2 + R() * 2});
    }
    {
        const boat = K.speedboat("boat", {deck: "#fff6ec", hull: "#fff6ec", stripe: "#2a2a3a", stripe2: "#3fb8b0", top: "#ffffff"});
        const b = W.put(boat, -70, -92, 0, {fold: "grow", dt: -0.3});
        const wk = K.wake("wake", 9, 70);
        wk.position.set(-15, 0, 0.3);
        b.holder.add(wk);
        W.mover({kind: "boat", obj: b.pivot, x0: -75, v: 12, atY: -140});
        const p1 = K.streetPerson("boatman", 70, "leonidaTank", {heightMm: 11});
        p1.position.set(3, -1.2, 1);
        p1.scale.setScalar(0.8);
        b.holder.add(p1);
        const p2 = K.streetPerson("boatgirl", 71, "neonBikini", {heightMm: 10.5, top: {kind: "bikini", color: "#ff4fa3"}, bottom: {kind: "bikini", color: "#ff4fa3"}});
        p2.position.set(-5, 1.4, 1);
        p2.scale.setScalar(0.8);
        b.holder.add(p2);
    }
    // distant yacht: three stacked white boxes
    {
        const g = new THREE.Group();
        const deckC = (w, d, c) => {
            const s = sheet(w, d, 8);
            s.ctx.fillStyle = c;
            s.ctx.fillRect(0, 0, s.W, s.H);
            s.ctx.fillStyle = "#3e3560";
            for (let x = s.mm(3); x < s.W - s.mm(6); x += s.mm(4)) s.ctx.fillRect(x, s.mm(1), s.mm(2.4), s.H - s.mm(2));
            grain(s.ctx, 0.06);
            return s.canvas;
        };
        const ring = (L, Wd) => [[-L / 2, -Wd / 2], [L * 0.25, -Wd / 2], [L / 2, 0], [L * 0.25, Wd / 2], [-L / 2, Wd / 2]];
        let z = 0;
        [[46, 13, 6, "#ffffff"], [32, 10, 4, "#f4f0ff"], [18, 8, 3.5, "#ffffff"]].forEach(([L, Wd, h, c], i) => {
            const m = polySheet(ring(L, Wd), {id: "yacht" + i, canvas: deckC(L, Wd, c), thickness: h, uvFrame: {x: -L / 2, y: -Wd / 2, width: L, height: Wd},
                edge: i === 0 ? "#f6f2ff" : "#3e3560"});
            m.position.set(-i * 4, 0, z + h / 2);
            z += h;
            g.add(m);
        });
        W.put(g, 95, -150, -1.5, {yaw: 0.2, fold: "grow"});
    }
    // Open sea (the stretch seen when flying in from Port Gellhorn): large yachts, sailboats, jet skis, speedboats (the yachts by the VC_15/17 pier, the jet skis from LK_05)
    {
        const my = W.put(Wd.megaYacht("megaYacht"), 84, -262, -0.6, {fold: "grow", yaw: 0.12, r: 30});
        if (my) {
            [["neonBikini", 8, -3], ["shirtlessTats", 2, -3.4], ["sparkleDress", -6, -3]].forEach(([look, x, y], i) => {
                const p = K.streetPerson("yp" + i, 760 + i, look);
                p.scale.setScalar(0.75);
                p.position.set(x, y, 14.8);
                my.holder.add(p);
            });
            W.mover({kind: "bob", obj: my.holder, phase: 0.7, keepYaw: true});
        }
        [[-120, -300, 4, "#ff4fa3"], [150, -196, -3, "#3fb8b0"], [-180, -220, 3, "#f5c518"]].forEach(([x, y, v, c], i) => {
            const sb = W.put(Wd.sailboat("sail" + i, {stripe: c}), x, y, -0.4, {fold: "grow", r: 10});
            if (sb) W.mover({kind: "boat", obj: sb.pivot, x0: x, v, atY: -300});
        });
        // After the robbery they flee toward Vice City: the speedboat carries the two of them seen from behind + duffel bags, two police boats behind (red and blue lights flashing), a police helicopter overhead (T2: police helicopter chasing the speedboat)
        {
            const gb = K.speedboat("getawayBoat", {deck: "#fff6ec", hull: "#c0202c", stripe: "#1e1b26", stripe2: "#ffffff", top: "#1e1b26"});
            [["jasonHeist", {back: true}, -1, -1.4], ["luciaHeist", {back: true, prop: "moneybag"}, 4, 1.4]].forEach(([look, extra, x, y], i) => {
                const p = K.streetPerson("gbp" + i, 780 + i, look, extra);
                p.scale.setScalar(0.95);
                p.position.set(x, y, 1);
                gb.add(p);
            });
            const g = W.put(gb, -40, -228, 0, {fold: "grow"});
            const gw = K.wake("gbWake", 11, 80);
            gw.position.set(-15, 0, 0.3);
            g.holder.add(gw);
            W.mover({kind: "boat", obj: g.pivot, x0: -40, v: 24, atY: -330});
            [[-80, -220], [-108, -238]].forEach(([x, y], i) => {
                const pb = W.put(S.policeBoat("policeBoat" + i), x, y, 0, {fold: "grow"});
                const w = K.wake("pbWake" + i, 12 + i, 70);
                w.position.set(-15, 0, 0.3);
                pb.holder.add(w);
                W.mover({kind: "boat", obj: pb.pivot, x0: x, v: 24, atY: -330});
            });
            const hh = C.heli("seaHeli");
            hh.userData.beam.visible = false;
            const hp = W.put(hh, -60, -230, 44, {fold: "grow", lead: 60});
            W.mover({kind: "follow", obj: hp.pivot, heli: hh, target: g.pivot, offset: [-22, 12, 40], yaw: 0.1, phase: 0.4});
        }
        const fb = W.put(K.speedboat("farBoat", {deck: "#fff6ec", hull: "#1e2440", stripe: "#f5c518", stripe2: "#ffffff", top: "#ffffff"}), 40, -292, 0, {fold: "grow", yaw: Math.PI});
        const fw = K.wake("farWake", 9, 70);
        fw.position.set(-15, 0, 0.3);
        fb.holder.add(fw);
        W.mover({kind: "boat", obj: fb.pivot, x0: 60, v: -14, atY: -360});
    }
    for (let i = 0; i < 8; i++) {
        const g = new THREE.Group();
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), new THREE.MeshStandardMaterial({color: i % 2 ? 0xff5a6a : 0xfff6ec, roughness: 0.6}));
        s.castShadow = true;
        s.position.z = 0.6;
        g.add(s);
        W.put(g, -180 + i * 50 + jitter(10), -74 + jitter(4), 0, {fold: "grow", r: 1.6});
    }
    for (const [x, y] of [[-30, -58], [64, -64]]) {
        const ring = K.floatRing("float" + x);
        W.flat(ring, x, y, 0.4);
        W.mover({kind: "bob", obj: ring, phase: x});
    }

    // ---------- Beach: place big items first, then small ones; each registers a footprint radius, overlaps get moved, and if it cannot be moved it is not placed ----------
    W.put(K.lifeguardModern("tower1"), -80, 22, 1.2, {yaw: 0.12, r: 12});
    W.put(K.lifeguardModern("tower2", {wall: "#ff9fc8", roofC: "#ff6fa8"}), 150, 14, 1.2, {yaw: -0.2, r: 12});
    W.put(K.atv("atv1"), -56, 6, 1.2, {yaw: 0.5, r: 7});
    // blind review (11-24): VICE BEACH used to be just small print on the sand, so at 26 s it did not read as a new region. Changed to upright postcard lettering like the other regions
    // (Miami pink + turquoise). The footprint is the same size as the one reserved for the old print (0, 0, 30, 9), so the later avoidance and random numbers are unchanged.
    W.put(T.postcardTitle("title_vbeach", ["VICE", "BEACH"], {font: "Bookman Old Style", fill: ["#ffd6ea", "#ff4fa3"], outline: "#2a1440", depth: "#2a8f9a",
        hi: "#fff4fa", size: 13, arc: 0.15}), 0, 0, 1.2, {freq: 1.0, damp: 4.2, lead: 30, rect: [30, 9], onBar: true});
    const umbrellaSets = [[P.pinkHot, "#fff6ec"], ["#3fb8b0", "#fff6ec"], ["#ffd36a", "#ff7f6a"], ["#9c8dd9", "#fff6ec"], ["#ff8fb8", "#7fd6d0"]];
    const spots = [[-150, 14], [-118, 30], [-36, 40], [-60, 40], [-48, -14], [20, 30], [44, 4], [70, 34], [96, 12], [122, 36], [186, 26], [-190, 36], [208, 0]];
    spots.forEach(([x, y], i) => {
        const set = umbrellaSets[i % umbrellaSets.length];
        const u = W.put(K.umbrella("umb" + i, set, {seed: i + 1}), x, y, 1.2, {fold: "grow", r: 5.6});
        if (!u) return;
        const [ux, uy] = u.at;
        W.flat(K.towel("towel" + i, i + 3), ux + 5 + jitter(3), uy - 6 + jitter(3), 1.4, {rot: jitter(0.8), r: 5});
        if (i % 3 === 0) W.put(K.lounger("lounge" + i, set[0]), ux - 9, uy + 1, 1.2, {yaw: jitter(0.12), fold: "grow", rect: [3.2, 8.5]});
    });
    for (let i = 0; i < 4; i++) W.put(K.surfboard("surf" + i, i + 2), -104 + i * 5.4, 10 + jitter(1), 1.2, {yaw: jitter(0.2), r: 2.5});
    const beachPeople = [
        [-104, 18, "neonBikini"], [-52, 26, "campShirt"], [-10, -18, "shirtlessTats", {pose: "wave"}], [30, 18, "sunhatLady"],
        [38, 21, "greenTrunks"], [60, -14, "detectorGuy"], [108, 22, "fishnetFit"], [140, -6, "jerseyGuy"], [-160, -10, "hoodieKid"],
        [-128, 2, "cropCargo"], [82, -4, "neonBikini", {top: {kind: "bikini", color: "#ff4fa3"}, bottom: {kind: "bikini", color: "#ff4fa3"},
            hair: {kind: "bun", color: "#2a1b2c"}, pose: "selfie", prop: "phone", skin: "#b97a58"}],
        [-26, 8, "leonidaTank", {pose: "stand", prop: "cup"}], [170, 30, "tankDreads", {prop: "speaker"}],
    ];
    beachPeople.forEach(([x, y, look, extra], i) => W.put(K.streetPerson("bp" + i, 100 + i, look, extra), x, y, 1.2, {yaw: jitter(0.5), r: 3.8}));
    for (let i = 0; i < 12; i++) {
        const x = -230 + i * 40 + jitter(14), w = 14 + R() * 10;
        W.put(K.bushes("dune" + i, {w, h: 5 + R() * 3, seed: 200 + i, base: "#5a9a6a"}), x, dune(x) - 2, 1.2, {yaw: jitter(0.12), rect: [w * 0.55 + 0.8, 4.2]});
    }

    // ---------- Grass and walkways ----------
    // Palms: tall and short alternate, spacing based on crown radius - two of the same height are at least 2 crown radii apart,
    // crowns of neighboring tall and short palms sit one high and one low, and a short tree's crown never touches a tall tree's trunk (the Ocean Drive palms in the official screenshots are uneven in height anyway)
    let pi = 0;
    for (let x = -238; x < 240; x += 28) {
        const tall = pi % 2 === 0;
        const h = tall ? 60 + R() * 6 : 33 + R() * 4;
        // blind review (11-24): the crown of the tall palm at x -14 covers the "E C" of the VICE CITY sign behind it at 35 s. Do not plant it, but still consume its random numbers
        if (pi === 8) { R(); jitter(3); jitter(3); pi++; continue; }
        W.put(K.palm("palm" + pi, {h, bend: 1 + R() * 2, seed: 300 + pi, fronds: tall ? 9 : 8, reach: tall ? 1 : 0.9}),
            x + jitter(3), (tall ? 72 : 88) + jitter(3), 2.2, {freq: 1.3, damp: 5.5, fold: "grow", r: 2.2});
        pi++;
    }
    for (let i = 0; i < 9; i++) W.put(K.lamp("lamp" + i), -210 + i * 52, 78, 2.2, {r: 1.6});
    for (let i = 0; i < 10; i++) {
        const x = -230 + i * 48 + jitter(8), w = 10 + R() * 6;
        W.put(K.bushes("hib" + i, {w, h: 4.5 + R() * 2, seed: 400 + i, flowers: i % 2 ? "#ff4f7a" : "#ff8fb8", base: "#4f9a6e"}),
            x, 82 + jitter(4), 2.2, {rect: [w * 0.55 + 0.8, 4.2]});
    }
    W.put(K.flamingo("fl1", 1), -134, 76, 2.2, {yaw: 0.3, r: 4.6});
    W.put(K.flamingo("fl2", 2, {pose: "feed"}), -124, 80, 2.2, {yaw: -0.4, r: 4.6});
    W.put(K.flamingo("fl3", 3), -114, 76, 2.2, {yaw: 0.9, r: 4.6});
    const walkers = [
        [-80, 80, "cropCargo"], [-20, 76, "tankDreads", {pose: "walk"}], [46, 80, "leonidaTank", {pose: "walk"}],
        [118, 78, "jeansJacketGirl", {pose: "walk"}], [4, 86, "fishingShirt"], [160, 82, "sparkleDress"],
    ];
    walkers.forEach(([x, y, look, extra], i) => W.put(K.streetPerson("wk" + i, 150 + i, look, extra), x, y, 2.2, {yaw: jitter(0.6), r: 3.8}));
    W.put(standUp(cutout(paintSign(22, "1A"), {id: "sign1a", ppm: 22, thickness: 0.8, trace: {cell: 2, dilate: 1}})), 8, 101, 2.8, {r: 2});
    W.put(K.sportbike("bike_parked", {color: "#2f8a4a", number: "76", riderOn: false}), 62, 100.5, 2.8, {yaw: 0.25, fold: "grow", r: 3});

    // ---------- Ocean Drive traffic: cars in the same lane share one speed and keep their spacing, so no rear-ending or clipping ----------
    const east = W.lane("east", LANES.east, 20);
    east.add(K.car("widebody", "widebody", {body: "#ff5fb0", livery: "wrap", wrap1: "#8a3ad0", wrap2: "#ffffff", modern: true, rim: "#c9a060", caliper: "#ffd36a", seed: 4}), -150);
    east.add(K.wheelie("wheelie0", 60, {color: "#ff7a2a"}), -186);
    east.add(K.wheelie("wheelie1", 61, {color: "#3fb8b0"}), -208);
    east.add(K.car("cop", "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), -246, {late: 2.0});
    const west = W.lane("west", LANES.west, -15);
    west.add(K.car("suv", "suv", {body: "#1e1b26", modern: true, rim: "#d0d0e0", chrome: "#1e1628"}), 95);
    west.add(K.car("super", "supercar", {body: "#f5c518", livery: "supercar", modern: true, roof: "#1e1628", rim: "#2a2236", spoke: "#111018", caliper: "#d8343f"}), 150);
    west.add(K.car("taxi", "buffalo", {body: "#f5c043", modern: true, rim: "#c9c3dc", text: "TAXI"}), 215);
    // roadside parking lane: the Vice Beach police black sports car is parked in front of OCEAN VIEW with its light bar on
    W.put(K.car("vbpd", "supercar", {body: "#1b1a24", livery: "vbpd", modern: true, roof: "#111018", rim: "#c9c3dc"}, {lightbar: true}), 38, LANES.park, 2.2, {yaw: Math.PI, fold: "grow"});
    W.put(K.car("parked1", "widebody", {body: "#f4f2ff", livery: "wrap", wrap1: "#3fb8b0", wrap2: "#5b8cff", modern: true, rim: "#2a2236", seed: 9}), -64, LANES.park, 2.2, {yaw: Math.PI, fold: "grow"});

    // ---------- Hotel ----------
    const HOTELS = [
        {key: "sunset", W: 46, D: 34, H: 46, floors: 4, ground: 10, wall: "#a8dccb", trim: "#ffffff", accent: "#f28cb1", neon: "#ff4fa3",
            windows: 4, stripes: true, bandName: "Sunset Arms", bandFont: "Segoe Script", neonEdge: true, litRatio: 0.3, seed: 12,
            roofSign: {text: "Sunset", w: 30, h: 9, font: "Segoe Script", neon: "#ff6fb8", x: 5}, cornerTower: {r: 7, x: -17, extra: 9}},
        {key: "dixon", W: 44, D: 32, H: 50, floors: 4, ground: 10, wall: "#3d3550", trim: "#efe6f6", accent: "#6a5ea6", neon: "#f4f0ff",
            windows: 3, pilasters: [0.33, 0.67], eyebrows: true, bandName: "THE DIXON", finText: "DIXON", finH: 36, finW: 6.5, finX: 0, finZ: 12,
            finColor: "#2a2433", finInner: "#1e1628", finNeon: "#ffffff", crownW: 20, crownH: 9, crownSteps: 3, crownNeon: true, litRatio: 0.45, seed: 11,
            pool: true, pilasterNeon: true, roofColor: "#8f86a8"},
        {key: "paloma", W: 40, D: 30, H: 42, floors: 3, ground: 10, wall: "#fff1d6", trim: "#f3b8cf", accent: "#3fb8b0", neon: "#3ff0e0",
            windows: 3, porthole: true, eyebrows: true, bandName: "PALOMA", crownW: 14, crownH: 14, crownSteps: 4, crownNeon: true, crownDepth: 8,
            finText: "HOTEL", finH: 24, finW: 5.5, finX: -14, finZ: 14, finColor: "#f3b8cf", finNeon: "#3ff0e0", litRatio: 0.4, seed: 13},
        {key: "oceanview", W: 42, D: 32, H: 44, floors: 3, ground: 10, wall: "#f59ac0", trim: "#fff4f8", accent: "#ff4fa3", neon: "#ff4fa3",
            windows: 3, pilasters: [0.25, 0.75], eyebrows: true, bandName: "OCEAN VIEW", finText: "HOTEL", finH: 30, finW: 6, finX: 0, finZ: 12,
            finColor: "#fff4f8", finInner: "#5a1f45", finNeon: "#ff4fa3", litRatio: 0.4, seed: 15, pilasterNeon: true,   /* blind review: the stepped crown in the middle of the roof covers the N of OCEAN VIEW, removed (the sign itself is the star of the roof) */
            neonEdge: true, roofSign: {text: "OCEAN VIEW", w: 34, h: 7, font: "Bahnschrift", neon: "#ff6fb8"}},
        {key: "flamingo", W: 44, D: 32, H: 38, floors: 3, ground: 10, wall: "#c3cdf3", trim: "#fff6ec", accent: "#7b5fb0", neon: "#5b8cff",
            windows: 4, pilasters: [0.5], bandName: "the Flamingo", bandFont: "Segoe Script", awning: "#7b5fb0", neonEdge: true, litRatio: 0.3, seed: 14,
            crownW: 26, crownH: 6, crownSteps: 2, pool: true},
    ];
    let hx = -114;
    HOTELS.forEach((spec, i) => {
        const cx = hx + spec.W / 2;
        hx += spec.W + 3;
        spec.neonDt = 1.4 + i * 0.16;   // how long after popping up the neon switches on (replaced with an absolute time once the world has computed the pop-up time)
        W.reserve(cx, 160 + spec.D / 2, spec.W / 2 + 0.5, spec.D / 2 + 0.5);
        W.put(K.hotel("hotel_" + spec.key, spec), cx, 160, 2.8, {freq: 1.1, damp: 5, neon: spec, sink: true});   // version 12: tipping toward the camera when the camera rises at 38 s would cover the lower half of the screen, so it now sinks straight down
    });
    for (let i = 0; i < 8; i++) {
        const x = -100 + i * 28 + jitter(6);
        W.put(K.umbrella("cafe" + i, i % 2 ? ["#fff6ec", "#7b5fb0"] : ["#fff6ec", P.pinkHot], {r: 3.4, h: 7, tilt: 0, seed: i}), x, 149, 2.8, {fold: "grow", r: 3.5});
    }
    // Behind: white modern apartment blocks (both sides) + giant VICE CITY sign (middle)
    [[-160, 226, 32, 96, 1], [-98, 262, 28, 118, 2], [104, 262, 30, 112, 3], [165, 226, 30, 88, 4]].forEach(([x, y, w, h, sd]) => {
        W.reserve(x, y + 11, w / 2 + 1, 12);   // building footprint (22 deep from the front)
        W.put(K.condoTower("condo" + sd, {W: w, D: 22, H: h, seed: sd, glass: sd % 2 ? "#8f9ad8" : "#7fb0d8"}), x, y, 2.8, {freq: 1.0, damp: 4.5});
    });
    W.put(K.viceCitySign("vcsign", {wMm: 132, letterH: 26, scaffold: 34}), 6, 262, 2.8, {freq: 1.0, damp: 4.5, dt: 0.4, stay: -80, onBar: true, sink: true});   // when the camera rises it sinks first to clear the view (before version 12 it tipped toward the camera, and the flattened back side filled the lower half of the screen at 38-40 s)
    W.reserve(6, 262, 68, 1.4);

    // ---------- Version 8: the beach is no longer empty - parasails and banana boats near the shore, a volleyball game on the sand ----------
    // placed at the very end of the region, no footprint registered, people all attached to groups (no separate light sway): no extra random numbers are drawn, so the later downtown random positions stay the same
    {
        const ps = S.parasail("parasail", {boat: {deck: "#fff6ec", hull: "#fff6ec", stripe: "#ff4fa3", stripe2: "#ffd36a", top: "#ffffff"},
            rider: K.streetPerson("psRider", 790, "greenTrunks", {pose: "wave"})});
        const p = W.put(ps, -15, -130, 0, {fold: "grow"});
        const wk = K.wake("psWake", 13, 70);
        wk.position.set(-15, 0, 0.3);
        p.holder.add(wk);
        W.mover({kind: "boat", obj: p.pivot, x0: -15, v: 9, atY: -150});
    }
    {
        const riders = [["neonBikini", {top: {kind: "bikini", color: "#3fb8b0"}, bottom: {kind: "bikini", color: "#3fb8b0"}, pose: "wave"}], ["shirtlessTats", {}],
            ["sparkleDress", {top: {kind: "bikini", color: "#ffd36a"}, bottom: {kind: "bikini", color: "#ffd36a"}, pose: "handsup"}]]
            .map(([look, extra], k) => K.streetPerson("bnR" + k, 792 + k, look, extra));
        const ski = Wd.jetski("bnSki", {color: "#ffd36a", rider: K.streetPerson("bnDriver", 796, "leonidaTank")});
        const b = W.put(S.bananaBoat("banana", {riders, ski}), 40, -117, 0, {fold: "grow", yaw: Math.PI});
        const wk = K.wake("bnWake", 14, 50);
        wk.position.set(-8, 0, 0.3);
        b.holder.add(wk);
        W.mover({kind: "boat", obj: b.pivot, x0: 40, v: -7, atY: -150});
    }
    {
        const pl = [[K.streetPerson("vbA", 800, "greenTrunks", {back: true, pose: "handsup"}), -5, -6.5],
            [K.streetPerson("vbB", 801, "neonBikini", {back: true, top: {kind: "bikini", color: "#ff7f6a"}, bottom: {kind: "bikini", color: "#ff7f6a"}}), 5, -7.5],
            [K.streetPerson("vbC", 802, "shirtlessTats", {pose: "handsup"}), -3, 6, 1.2],
            [K.streetPerson("vbD", 803, "neonBikini", {top: {kind: "bikini", color: "#3fb8b0"}, bottom: {kind: "bikini", color: "#3fb8b0"}, pose: "run"}), 6, 7.5]];
        W.put(S.volleyCourt("volley", pl), -4, 32, 1.2, {fold: "grow"});
    }
    // ---------- Version 10: the lower half of the open sea is no longer empty - a container ship has just left Port Gellhorn and is slowly heading east ----------
    // placed on the camera side of the chase boats (y -220 to -238), on the inner side of the distant speedboat (-292) and sailboat (-300); ship height ~23, so it does not block the chase behind it.
    // Also placed at the end of the region with no footprint registered: no extra random numbers are drawn.
    {
        const ship = Wd.containerShip("cargoShip", {L: 80, B: 14, seed: 11});
        const p = W.put(ship, -30, -275, 0, {fold: "grow", lead: 110});   // raise it early: it is already in the upper half of the frame at 22 s
        const wk = K.wake("cargoWake", 17, 70);
        wk.position.set(-39, 0, 0.3);
        p.holder.add(wk);
        W.mover({kind: "boat", obj: p.pivot, x0: -30, v: 1.2, atY: -330});   // the big ship is slow; any faster and it would sail into the large yacht at the check camera position (the 48 s position)
    }
    return {name: "vicebeach", y0: Y0, y1: Y1};
}
