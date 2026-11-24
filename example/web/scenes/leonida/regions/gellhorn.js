// Port Gellhorn - evening (golden turning to dusk, the neon starting to light up). Region-local y runs from -12 (joins Grassrivers) to 352 (joins the open sea off Vice Beach).
// Based on official screenshots: Port_Gellhorn_01 (STARLET MOTEL sign + single-story motel + pickup parked at the door), Port_Gellhorn_04 (DELIGHTS light box, changeable-letter sign),
// Port_Gellhorn_05 (trailer camp, campfire, pickup), Port_Gellhorn_06 (water tower, utility pole, run-down bungalow, palms); official postcard PORT GELLHORN (water tower, railway, small town at night).
import * as THREE from "three";
import {rng} from "../kit.js";
import {sheet, rgba, grain, lin} from "../paint.js";
import * as K from "../props.js";
import * as T from "../props_town.js";
import * as C from "../props_city.js";
import * as Wd from "../props_wild.js";
import * as S from "../props_story.js";
import {BEAT, EIGHTH, DROP} from "../beat.js";

export const Y0 = -12, Y1 = 352;
const X0 = -260, X1 = 260;
export const LANES = {east: 150, west: 162};

// The town's ground: sun-faded ochre, sparse dry grass, a gravel parking lot, a two-lane highway (with the Highway 98 shield printed on it), a stretch of rail track
function paintTown(wMm, hMm, ppm, y0) {
    const r = rng(91);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    const Y = y => H - mm(y - y0), X = x => mm(x - X0);
    ctx.fillStyle = "#c8a888";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = rgba(r() < 0.4 ? "#a89060" : r() < 0.7 ? "#d8b898" : "#8a9a5a", 0.3);
        ctx.beginPath(); ctx.ellipse(r() * W, r() * H, mm(2 + r() * 10), mm(1 + r() * 6), r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 1600; i++) {
        ctx.strokeStyle = rgba(r() < 0.5 ? "#8a8a4a" : "#c8b070", 0.5);
        ctx.lineWidth = mm(0.15);
        const x = r() * W, y = r() * H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + mm(0.3), y - mm(0.9)); ctx.stroke();
    }
    // gravel parking lot of the motel, asphalt in front of the nightclub
    ctx.fillStyle = "#a89a98";
    ctx.fillRect(X(-150), Y(238), mm(140), mm(32));
    for (let i = 0; i < 400; i++) { ctx.fillStyle = rgba(r() < 0.5 ? "#8a7a78" : "#d0c4c0", 0.5); ctx.fillRect(X(-150) + r() * mm(140), Y(238) + r() * mm(32), mm(0.4), mm(0.4)); }
    ctx.fillStyle = "#6a6478";
    ctx.fillRect(X(20), Y(236), mm(110), mm(30));
    ctx.fillStyle = rgba("#ffffff", 0.7);
    for (let x = 24; x < 128; x += 9) ctx.fillRect(X(x), Y(236), mm(0.3), mm(10));
    // highway
    ctx.fillStyle = "#6e6880";
    ctx.fillRect(0, Y(LANES.west + 8), W, mm(LANES.west - LANES.east + 16));
    ctx.fillStyle = "#f5c86a";
    ctx.fillRect(0, Y((LANES.east + LANES.west) / 2) - mm(0.4), W, mm(0.3));
    ctx.fillRect(0, Y((LANES.east + LANES.west) / 2) + mm(0.1), W, mm(0.3));
    ctx.fillStyle = rgba("#ffffff", 0.75);
    ctx.fillRect(0, Y(LANES.east - 7), W, mm(0.25));
    ctx.fillRect(0, Y(LANES.west + 7), W, mm(0.25));
    for (const x of [-210, 150]) {
        const cx = X(x), cy = Y(LANES.east - 12);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.moveTo(cx - mm(4), cy - mm(4)); ctx.lineTo(cx + mm(4), cy - mm(4)); ctx.lineTo(cx + mm(4), cy + mm(1.5)); ctx.quadraticCurveTo(cx, cy + mm(5.5), cx - mm(4), cy + mm(1.5)); ctx.fill();
        ctx.strokeStyle = "#1e1628"; ctx.lineWidth = mm(0.4); ctx.stroke();
        ctx.fillStyle = "#1e1628";
        ctx.font = `800 ${mm(4)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("98", cx, cy + mm(1.6));
    }
    // railway track (the stretch on the postcard)
    const ry = Y(330);
    ctx.fillStyle = "#8a7a70";
    ctx.fillRect(0, ry - mm(4), W, mm(8));
    ctx.fillStyle = "#5a4038";
    for (let x = 0; x < W; x += mm(2.2)) ctx.fillRect(x, ry - mm(3.4), mm(1), mm(6.8));
    ctx.fillStyle = "#b8b0c0";
    ctx.fillRect(0, ry - mm(2.2), W, mm(0.5));
    ctx.fillRect(0, ry + mm(1.7), W, mm(0.5));
    // place names
    ctx.font = `700 ${mm(5)}px "Bookman Old Style", serif`;
    ctx.fillStyle = rgba("#fff6e4", 0.85);
    ctx.textAlign = "center";
    ctx.fillText("PORT GELLHORN", X(-170), Y(110));
    ctx.font = `700 ${mm(3)}px Bahnschrift, sans-serif`;
    ctx.fillText("POP. 4,200", X(-170), Y(104));
    grain(ctx, 0.09, 2);
    return canvas;
}

export function build(W) {
    const {R, jitter, band} = W;
    const front = x => -6 + 5 * Math.sin(x / 15 + 2) + 2 * Math.sin(x / 7.7);
    const back = x => 346 + 5 * Math.sin(x / 18 + 1) + 2 * Math.sin(x / 6.1);
    W.ground("town", band(front, back, 6), paintTown(X1 - X0, Y1 - Y0 + 10, 5, Y0 - 6), {x: X0, y: Y0 - 6, width: X1 - X0, height: Y1 - Y0 + 10}, 1.6, 1.2,
        {edge: "#e8d0b0"});

    // ---------- Postcard lettering: PORT GELLHORN ----------
    W.put(T.postcardTitle("title_port", ["PORT", "GELLHORN"], {font: "Bookman Old Style", fill: ["#ffd070", "#e8701a"], outline: "#2a1a20", depth: "#7a2a20",
        size: 15, arc: 0.14}), 0, 0, 1.6, {freq: 1.0, damp: 4.2, lead: 30, rect: [48, 3], at: DROP});   // lands on the beat where the drums come in (16.0 s)

    // ---------- Robbery (T1 at about 1:09: two masked people rob Uncle Jack's Liquor): on the drum entrance, the wanted stars light up one per beat ----------
    // The official characters' faces are not drawn: the two wear scarves over their heads; no guns appear (Xiaohongshu is strict about images of firearms)
    W.reserve(-44, 92, 19, 9);
    const store = T.house("uncleJacks", {W: 36, D: 16, H: 11, wall: "#efe2c8", trim: "#7a1a24", roof: "#8a7a70", roofKind: "tin", roofType: "flat", windows: 3, doorX: 0.5,
        lit: 0.9, seed: 81, dirt: 0.4, sign: {text: "UNCLE JACK'S LIQUOR · BEER · LOTTO", h: 2.6, y: 10.4, bg: "#7a1a24", color: "#ffe9a8"}});
    const roofSign = S.postSign("ujSign", {lines: ["UNCLE JACK'S", "LIQUOR"], w: 30, h: 10, legs: 9,   // blind review: the clerk raising his hands at the door covers LIQUOR, so the posts are raised above head height bg: "#f4e8c8", colors: ["#7a1a24", "#d8343f"], edge: "#3a1a20",
        font: "Bookman Old Style", sizes: [3.4, 4.4]});
    roofSign.position.set(0, 9, 11);
    store.add(roofSign);
    W.put(store, -44, 84, 1.6, {freq: 1.0, damp: 4.8, at: DROP});
    const clerk = W.put(K.streetPerson("clerk", 801, "clerk"), -44, 80.6, 1.6, {at: DROP + EIGHTH});
    clerk.holder.scale.setScalar(1.3);
    // getaway car: the red-and-black muscle car Lucia rides in T1
    W.put(K.car("getaway", "muscle", {body: "#c0202c", modern: false, rim: "#f0f0ff", stripes: "#1e1b26"}), 16, 68, 1.6, {fold: "grow", rect: [12.5, 5], at: DROP});
    const robbers = [
        ["lucia", "luciaHeist", {prop: "moneybag", pose: "run"}, [-26, 76], [-8, 70], 0.25],
        ["jason", "jasonHeist", {prop: "duffel", cashPeek: true, pose: "run"}, [-35, 81.5], [-18, 76], 0.45],
    ];
    for (const [key, look, extra, a, b, delay] of robbers) {
        const p = W.put(K.streetPerson(key, 810 + key.length, look, extra), a[0], a[1], 1.6, {at: DROP + EIGHTH});
        p.holder.scale.setScalar(1.35);   // the protagonists are one size bigger than passersby (the "protagonist scale" of papercraft), so the masks and duffel bag still read from far away
        W.mover({kind: "run", obj: p.pivot, holder: p.holder, of: p.pivot, delay, dur: 1.7, a: [a[0], a[1] + W.oy], b: [b[0], b[1] + W.oy]});
        if (key === "jason") {
            // banknotes thrown out of the bag, fluttering down spinning
            for (let k = 0; k < 9; k++) {
                const bill = S.cashBill("bill" + k, 40 + k);
                W.flat(bill, a[0], a[1], 6);
                W.mover({kind: "flutter", obj: bill, of: p.pivot, delay: delay + 0.3 + k * 0.12, p0: [a[0] + 3 + W.jitter(2), a[1] + W.oy + W.jitter(2), 6],
                    v: [6 + W.R() * 8, -2 - W.R() * 5, 5 + W.R() * 4], tLand: 1.1 + W.R() * 0.5, zg: 1.75, phase: W.R() * 6});
            }
        }
    }
    // the police car rushes in and slides to a stop sideways (red and blue lights flashing)
    [["cop1", 150, 52, 70, Math.PI - 0.5, 0.5], ["cop2", 196, 68, 94, Math.PI + 0.45, 0.85]].forEach(([key, x0, x1, y, yaw1, delay]) => {
        const c = W.put(K.car(key, "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), x0, y, 1.6,
            {fold: "grow", yaw: Math.PI, at: DROP});
        W.mover({kind: "arrive", obj: c.pivot, holder: c.holder, of: c.pivot, delay, dur: 1.6, x0, x1, yaw0: Math.PI, yaw1});
    });
    // wanted level board: GTA VI has 6 stars; in the bar where the drums come in, one star lights up on each of beats 2, 3 and 4
    W.put(S.wantedPanel("wanted"), -8, 118, 1.6, {freq: 1.1, damp: 5, at: DROP});
    for (let k = 0; k < 3; k++) {
        const [sx, sz] = S.starSlot(k);
        const s = W.put(S.wantedStar("star" + k), -8 + sx, 116.6, 1.6 + sz, {fold: "grow", freq: 1.6, damp: 6, at: DROP + (k + 1) * BEAT});
        W.mover({kind: "pulse", obj: s.holder, of: s.pivot, delay: 0});
    }
    // a few people by the road (waiting for a ride, riding bikes)
    [[-52, 127, "hoodieKid"], [40, 127, "leonidaTank", {prop: "cup"}], [62, 126, "cropCargo"]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("pr" + i, 700 + i, look, extra), x, y, 1.6, {yaw: jitter(0.5), r: 2.6}));

    // ---------- Utility poles + wires: a row along the south side of the highway ----------
    const poles = [];
    for (let x = -240; x <= 240; x += 60) {
        const p = W.put(T.powerPole("pp" + x, 34), x + jitter(4), 136, 1.6, {r: 1.2});
        if (p) poles.push(p);
    }

    // ---------- STARLET MOTEL (PG_01): tall pole sign + flat-roofed motel with a row of room doors + a car parked at the door ----------
    // The portrait frame is narrow (camera corridor x ~ +/-70): the motel is on the left half, the nightclub on the right half, and the sign stands at the roadside
    W.put(T.starletSign("starlet"), -34, 176, 1.6, {freq: 1.2, damp: 5, r: 3});
    W.reserve(-64, 246, 41, 9);
    W.put(T.house("motel", {W: 80, D: 16, H: 11, wall: "#f4ece0", trim: "#3a8a8a", roof: "#9a8a88", roofKind: "tin", roofType: "flat", doors: 8, lit: 0.55, seed: 41,
        doorColor: "#3fb8b0", chairs: "#f5c518", sign: {text: "STARLET MOTEL · COLOR TV · POOL", h: 2.4, y: 10.8, bg: "#3a8a8a", color: "#ffffff"}}), -64, 238, 1.6,
    {freq: 1.0, damp: 4.8});
    [[-92, 222, "pickup", {body: "#e8e0d0", modern: false, rim: "#d0d0e0", cargo: "#8a7a5a"}], [-46, 222, "sedan", {body: "#c8202a", modern: false, rim: "#c9c3dc"}]].forEach(([x, y, type, col], i) => {
        const car = K.car("mc" + i, type, col);
        if (i === 1) {
            // Leonida Man (the short-video clip in T1): someone dancing on the roof of the red car
            const d = K.streetPerson("roofDancer", 725, "neonBikini", {top: {kind: "crop", color: "#ff4fa3"}, bottom: {kind: "denim_shorts", color: "#5b7fc4"}, pose: "wave", shades: "#3ff0e0"});
            d.position.set(-1.2, 0, 6.8);
            d.rotation.z = -Math.PI / 2;
            car.add(d);
            W.mover({kind: "dance", obj: d, z0: 6.8});
        }
        W.put(car, x, y, 1.6, {yaw: Math.PI / 2, fold: "grow", rect: [5.5, 13]});
    });
    W.put(K.streetPerson("motelGuy", 720, "campShirt", {prop: "phone", pose: "selfie"}), -70, 233.5, 1.6, {yaw: jitter(0.3)});
    W.put(K.streetPerson("motelGirl", 721, "fishnetFit"), -30, 233.8, 1.6, {yaw: jitter(0.3)});

    // ---------- DELIGHTS (PG_04): light box sign + a dark flat-roofed nightclub with pink neon along the edge ----------
    W.put(T.delightsSign("delights"), 30, 180, 1.6, {freq: 1.2, damp: 5, r: 3});
    W.reserve(62, 247, 28, 11);
    {
        const spec = {key: "delightsClub", W: 54, D: 20, H: 14, floors: 1, ground: 9, wall: "#3a2a48", trim: "#ff4fa3", accent: "#1e1628", neon: "#ff4fa3",
            windows: 0, litRatio: 0.0, seed: 43, neonEdge: true, pilasters: [0.15, 0.85], pilasterNeon: true, cornice: 1.4, bandName: "DELIGHTS · CABARET", neonDt: 1.2};
        W.put(K.hotel("delightsClub", spec), 62, 236, 1.6, {freq: 1.0, damp: 4.8, neon: spec});
    }
    [[30, 222, "supercar", {body: "#e9e6f2", livery: "supercar", modern: true, roof: "#1e1628", rim: "#2a2236", spoke: "#111018", caliper: "#ff4fa3"}],
        [50, 222, "widebody", {body: "#1e1b26", livery: "wrap", wrap1: "#ff4fa3", wrap2: "#1e1628", modern: true, rim: "#c9c3dc", seed: 61}],
        [92, 222, "pickup", {body: "#4a5a3a", modern: true, rim: "#c9c3dc", cargo: "#c8a060"}]].forEach(([x, y, type, col], i) =>
        W.put(K.car("dc" + i, type, col), x, y, 1.6, {yaw: Math.PI / 2, fold: "grow", rect: [5.5, 13]}));
    [[70, 231, "sparkleDress"], [76, 231.5, "jerseyGuy"]].forEach(([x, y, look], i) => W.put(K.streetPerson("dp" + i, 740 + i, look), x, y, 1.6, {yaw: jitter(0.4)}));

    // ---------- Highway traffic ----------
    const e = W.lane("gellE", LANES.east, 16);
    e.add(K.car("ge0", "pickup", {body: "#f4f2ff", modern: true, rim: "#2a2236", cargo: "#3fb8b0"}), -150);
    e.add(K.car("ge1", "muscle", {body: "#3a6ab0", modern: false, rim: "#f0f0ff", stripes: "#ffffff"}), -40);
    e.add(K.sportbike("ge2", {color: "#d8343f", number: "13", riderOn: true}), 60);
    const w = W.lane("gellW", LANES.west, -13);
    w.add(K.car("gw0", "suv", {body: "#2a2236", modern: true, rim: "#d0d0e0", chrome: "#1e1628"}), 100);
    w.add(K.car("gw1", "sedan", {body: "#c8b8a0", modern: false, rim: "#c9c3dc"}), 10);

    // ---------- Behind: trailer camp + campfire (PG_05), run-down bungalow, water tower (PG_06) ----------
    // the trailer camp is behind the motel (left), people gather around the campfire, and a pickup is parked to one side
    [[-84, 268, "#e8e0d0", "#5a9aa8"], [-126, 284, "#f0e0b8", "#c83a3a"], [-150, 262, "#d8e0e8", "#3a6aa8"]].forEach(([x, y, wall, trim], i) => {
        W.reserve(x, y + 6, 18, 6.6);
        W.put(T.house("trailer" + i, {W: 34, D: 12, H: 9, wall, trim: "#ffffff", roof: "#b8b0b0", roofKind: "tin", roofType: "flat", parapet: false, siding: true,
            windows: 4, doorX: 0.7, lit: 0.6, seed: 50 + i, awnings: trim, weathered: true}), x, y, 1.6, {freq: 1.1, damp: 5});
    });
    const fire = T.campfire("campfire");
    W.put(fire, -40, 296, 1.6, {fold: "grow", r: 4});
    W.mover({kind: "flicker", flames: fire.userData.flames});
    [[-50, 292.5, "campShirt", {prop: "cup"}], [-31, 292, "jeansJacketGirl"], [-42, 302.5, "leonidaTank"], [-24, 300, "fishingShirt", {prop: "cup"}]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("cf" + i, 730 + i, look, extra), x, y, 1.6, {yaw: jitter(0.4)}));
    W.put(K.car("campTruck", "pickup", {body: "#7a5a4a", modern: false, rim: "#d0d0e0", cargo: "#3fb8b0"}), -80, 304, 1.6, {yaw: 0.25, fold: "grow", rect: [13, 6]});
    // run-down bungalow behind the nightclub (right)
    // pawn shop + a red muscle car burning rubber at its door (T1: a red muscle car does a burnout in front of Port Gellhorn Pawn & Gun)
    W.reserve(8, 277, 14, 7.6);
    {
        const pawn = T.house("pawn", {W: 28, D: 14, H: 10, wall: "#e8e0c8", trim: "#2a2a3a", roof: "#9a8a88", roofKind: "tin", roofType: "flat", windows: 2, doorX: 0.5,
            lit: 0.7, seed: 83, weathered: true, sign: {text: "PORT GELLHORN PAWN & GUN", h: 2.4, y: 9.6, bg: "#f5c518", color: "#1e1b26"}});
        const ps = S.postSign("pawnSign", {lines: ["PAWN"], w: 20, h: 7, legs: 1.2, bg: "#f5c518", color: "#1e1b26", edge: "#1e1b26", sizes: [5]});
        ps.position.set(0, 8, 10);
        pawn.add(ps);
        W.put(pawn, 8, 270, 1.6, {freq: 1.1, damp: 5});
        const mc = K.car("burnout", "muscle", {body: "#d02030", modern: false, rim: "#f0f0ff", stripes: "#ffffff"});
        const puffs = [];
        for (let k = 0; k < 7; k++) {
            const pf = S.puff("smoke" + k, 60 + k, {w: 10, h: 8});
            mc.add(pf);
            puffs.push(pf);
        }
        const b = W.put(mc, 6, 258, 1.6, {fold: "grow", rect: [12.5, 5]});
        W.mover({kind: "puffs", items: puffs, base: [-11, 0, 3], drift: 22, rise: 7, size: 1.2, rate: 0.9});
        W.mover({kind: "shake", obj: b.holder, yaw: 0});
    }
    [[44, 280, "#c8d8c8", "#5a6a7a", 1], [150, 262, "#f0d0c0", "#8a5a4a", 2], [196, 272, "#d8d0e8", "#6a5a7a", 3]].forEach(([x, y, wall, roof, i]) => {
        W.reserve(x, y + 7, 12, 7.6);
        W.put(T.house("shack" + i, {W: 22, D: 14, H: 9, wall, trim: "#f4ecd8", roof, roofKind: i % 2 ? "tin" : "shingle", block: i % 2 === 0, siding: i % 2 === 1, windows: 2,
            doorX: 0.5, lit: 0.5, seed: 70 + i, pitch: 6, weathered: true, porch: i === 1 ? {depth: 4, posts: 2} : null}), x, y, 1.6, {freq: 1.1, damp: 5});
    });
    W.put(T.waterTower("wtower", {h: 44, r: 9}), 88, 306, 1.6, {freq: 0.9, damp: 4.5, r: 12});
    // harbor: two wooden piers reach into the sea, shrimp boats are moored alongside, and another is anchored farther out (this region is called a "port"; otherwise the back half of the frame would be all empty sea)
    const pierCanvas = (w, h) => {
        const s = sheet(w, h, 8);
        s.ctx.fillStyle = "#b8926e";
        s.ctx.fillRect(0, 0, s.W, s.H);
        for (let y = 0; y < s.H; y += s.mm(1.3)) { s.ctx.fillStyle = rgba("#5a3a30", 0.4); s.ctx.fillRect(0, y, s.W, s.mm(0.15)); }
        grain(s.ctx, 0.1);
        return s.canvas;
    };
    for (const [px, len] of [[-74, 44], [36, 40]]) {
        W.ground("pier" + px, [[px - 4, 334], [px + 4, 334], [px + 4, 334 + len], [px - 4, 334 + len]], pierCanvas(8, len), {x: px - 4, y: 334, width: 8, height: len}, 2.6, 0.7,
            {edge: "#8a6a50"});
        const piles = new THREE.Group();
        for (let k = 0; k <= len; k += 8) for (const s of [-1, 1]) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 5, 6), new THREE.MeshStandardMaterial({color: 0x6a5040, roughness: 0.9}));
            p.rotation.x = Math.PI / 2;
            p.position.set(s * 4.2, k, 1.2);
            p.castShadow = true;
            piles.add(p);
        }
        W.flat(piles, px, 334, 0);
    }
    [[-50, 362, Math.PI / 2, "#c83a3a"], [60, 360, -Math.PI / 2, "#2a6aa8"], [-6, 384, 0.35, "#e8a020"]].forEach(([x, y, yaw, c], i) => {
        const b = W.put(Wd.shrimpBoat("shrimp" + i, {stripe: c}), x, y, -0.6, {fold: "grow", yaw, r: 14});
        if (b) W.mover({kind: "bob", obj: b.holder, phase: i * 1.7, keepYaw: true});
    });
    // a freight train slowly passes on the track (the railway on the postcard)
    const rail = W.lane("rail", 330, 9, {z: 1.6});
    T.freightTrain("train").forEach(([car, dx]) => rail.add(car, -150 + dx));
    [[-100, 196, 40], [-6, 202, 34], [120, 200, 46], [180, 300, 38], [-240, 210, 30], [230, 210, 44], [124, 286, 32], [-170, 300, 36]].forEach(([x, y, h], i) =>
        W.put(K.palm("gpalm" + i, {h, bend: 2 + R() * 4, seed: 900 + i, fronds: 7, reach: 0.8}), x, y, 1.6, {freq: 1.3, damp: 5.5, fold: "grow", r: 2.4}));
    for (let i = 0; i < 8; i++) W.put(K.bushes("gbush" + i, {w: 9 + R() * 5, h: 3.5 + R() * 2, seed: 920 + i, base: "#6a8a4a"}), -230 + i * 62 + jitter(8), 128 + jitter(3), 1.6,
        {rect: [6, 3]});
    // wires: three between each pair of adjacent poles
    for (let i = 0; i < poles.length - 1; i++) {
        const a = poles[i].pivot.position, b = poles[i + 1].pivot.position;
        for (const dx of [-4, 0, 4]) W.wire([a.x + dx, a.y, a.z + 33.2], [b.x + dx, b.y, b.z + 33.2], 2.4, [poles[i].pivot, poles[i + 1].pivot]);
    }
    void [THREE, C, lin];
    return {name: "gellhorn", y0: Y0, y1: Y1};
}
