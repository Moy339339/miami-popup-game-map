// Vice City downtown, night. Region-local y runs from 236 (the back street joining Vice Beach) to 1100 (the farthest skyline).
// Based on official screenshots: VC_22 gas station with the tire sign, VC_09 overpass mural pillars and bikelife, VC_17 police chase + helicopter searchlight,
// VC_11/27 towers and rooftop lights at night, VC_08 stadium LED and Ferris wheel, VC_06 how the crowd dresses at night, VC_13 nightclub.
// Round 4: the portrait frame is very narrow (with the camera 250 above the ground only about x = +/-60 is visible left to right), so things are concentrated along this corridor;
// the corridor ends in a central avenue running off into the distance (towers on both sides, traffic driving in), the tallest tower in the whole city stands at the end of the avenue, and the closing camera rises over the avenue to look at it.
import * as THREE from "three";
import {paintCityGround} from "../paint_city.js";
import * as K from "../props.js";
import * as C from "../props_city.js";
import * as S from "../props_story.js";
import * as Lv from "../props_lovers.js";
import {BEAT, EIGHTH, BAR} from "../beat.js";
import {sheet} from "../paint.js";
import {rectSheet, standUp} from "../kit.js";

export const Y0 = 236, Y1 = 1100;
const GY0 = 236, GY1 = 860;     // extent of the downtown ground paper
export const LANES = {east: 312, west: 328, under: [372, 391]};
const AVE = {x: 0, w: 24, y0: 540, y1: 752};   // central avenue (along +Y, going north from FLAGLER)
const STAY = 2000;                             // things in the closing section do not fall over
// The closing mini-story (batches 16, 17): starts once the camera has settled at 21 bars (48 s); the big heart pops up on the bar-22 downbeat;
// on beat 3 of bar 22 the two jump apart and reach out; on the bar-23 downbeat the kid jumps up and takes both their hands; on the bar-24 downbeat all three hop once and "HOT TOGETHER" lights up; bar 25 (57.14 s) is the end of the film
const T21 = 21 * BAR;
const LOVE = {pop: T21, hop: T21 + BEAT, kiss: T21 + 2 * BEAT, flip0: T21 + 2.5 * BEAT, heart: 22 * BAR, iconsOff: 22 * BAR + EIGHTH,
    apart: 22 * BAR + 2 * BEAT, kid: 23 * BAR, cheer: 24 * BAR, end: 25 * BAR};
// Batch 18 (author, 11-24: "the core of those last seconds is looking at the whole city, not at these two people" "they are a bit big now" "a very small one, somewhere, just a finishing touch"):
// the heart and the people shrink while the city, camera and moon stay exactly as they were. A few size tiers (heart: width of the big heart, mm; sc: scale of the people; lift: how high the tip of the heart sits above the top of the sign - the smaller the heart, the higher it is lifted,
// so that it still shows, while staying behind the two people's heads; float: one small floating heart every few beats). To make comparison renders, switch tiers with the love_*.js entry files; batch 17 was heart 42, sc 1.4
export const LOVE_SIZES = {
    large: {heart: 28, sc: 1.2, lift: 2, float: 2},
    medium: {heart: 23, sc: 1.1, lift: 4, float: 2},
    small: {heart: 19, sc: 1.0, lift: 5.5, float: 3},
};
const loveSize = () => LOVE_SIZES[globalThis.LEONIDA_LOVE ?? "medium"];

export function build(W) {
    const {R, jitter} = W;
    // Ground: top edge of the canvas = far (GY1), so canvas y = GY1 - world y
    const cy = y => GY1 - y, cx = x => x + 260;
    const rectC = (x0, y0, x1, y1) => ({x: cx(x0), y: cy(y1), w: x1 - x0, h: y1 - y0});
    const ground = C.paintDowntownGround(520, GY1 - GY0, 5, 31, {
        streets: [[cy(320), 34], [cy(381.5), 32], [cy(530), 18], [cy(645), 18], [cy(752), 16]],
        avenues: [[cx(-150), 16, cy(530), cy(236)], [cx(AVE.x), AVE.w, cy(AVE.y1 + 8), cy(AVE.y0 - 20)]],
        parks: [rectC(92, 412, 196, 516), rectC(-250, 560, -214, 640), rectC(-6, 244, 26, 282), rectC(-130, 244, -80, 262)],
        lots: [rectC(-138, 418, -72, 470)],
        plazas: [rectC(-40, 478, 14, 489), rectC(-34, 541, -10, 548), rectC(10, 541, 34, 548), rectC(-66, 246, -14, 288)],
        labels: [
            {text: "BISCAYNE BLVD", x: cx(-60), y: cy(320) + 10.5, size: 3.4}, {text: "BISCAYNE BLVD", x: cx(170), y: cy(320) + 10.5, size: 3.4},
            {text: "DOWNTOWN", x: cx(-170), y: cy(600), size: 9}, {text: "VICE CITY", x: cx(-170), y: cy(588), size: 5},
            {text: "FLAGLER ST", x: cx(-60), y: cy(530) + 6, size: 3}, {text: "FLAGLER ST", x: cx(80), y: cy(530) + 6, size: 3},
            {text: "2ND AVE", x: cx(-150) + 5, y: cy(470), size: 3}, {text: "NE 4TH ST", x: cx(-70), y: cy(645) + 6, size: 3},
        ],
    });
    // Ground lighting: warm pools under street lamps, white light at the gas station, magenta at the nightclub, cyan-pink at the stadium, sodium lamps along both sides of the avenue
    const pools = [];
    for (let x = -240; x <= 240; x += 40) {
        pools.push({x: cx(x + 9), y: cy(305), r: 18, color: "#ffc27a", a: 0.9}, {x: cx(x - 17), y: cy(335), r: 18, color: "#ffc27a", a: 0.9});
    }
    for (let x = -234; x < 260; x += 52) pools.push({x: cx(x), y: cy(372), r: 14, color: "#ffb060", a: 0.45});
    pools.push({x: cx(-16), y: cy(446), r: 34, color: "#fff0d8", a: 0.75}, {x: cx(-56), y: cy(446), r: 18, color: "#ff3050", a: 0.6});
    pools.push({x: cx(-16), y: cy(458), r: 26, color: "#ff3050", a: 0.35}, {x: cx(-16), y: cy(462), r: 16, color: "#fff2d0", a: 0.4});
    pools.push({x: cx(-13), y: cy(484), r: 26, color: "#ff4fa3", a: 0.75}, {x: cx(-13), y: cy(480), r: 14, color: "#3ff0e0", a: 0.35});
    pools.push({x: cx(58), y: cy(452), r: 44, color: "#3ff0e0", a: 0.3}, {x: cx(58), y: cy(452), r: 36, color: "#ff4fa3", a: 0.24});
    pools.push({x: cx(118), y: cy(476), r: 30, color: "#ff8fc0", a: 0.3});
    for (let y = AVE.y0 + 10; y < AVE.y1; y += 22) pools.push({x: cx(-11), y: cy(y), r: 12, color: "#ffb870", a: 0.7}, {x: cx(11), y: cy(y + 11), r: 12, color: "#ffb870", a: 0.7});
    for (const x of [-98, -52, 52, 98, -152, 152]) pools.push({x: cx(x), y: cy(544), r: 16, color: "#ffd8a0", a: 0.55});
    for (const x of [-98, -52, 52, 98, -150, 150]) pools.push({x: cx(x), y: cy(656), r: 14, color: "#ffd8a0", a: 0.45});
    for (let x = -130; x < -72; x += 20) pools.push({x: cx(x), y: cy(444), r: 16, color: "#ffa850", a: 0.55});
    pools.push({x: cx(-104), y: cy(440), r: 10, color: "#2fff8a", a: 0.5});
    pools.push({x: cx(-40), y: cy(268), r: 22, color: "#5fe8ff", a: 0.5}, {x: cx(38), y: cy(286), r: 12, color: "#fff0d8", a: 0.6});
    for (let x = -230; x < 240; x += 60) pools.push({x: cx(x), y: cy(266), r: 14, color: "#ffc27a", a: 0.4});
    const glow = C.paintGroundGlow(520, GY1 - GY0, 3, pools);
    W.ground("downtown", W.band(GY0, GY1, 40), ground, {x: -260, y: GY0, width: 520, height: GY1 - GY0}, 2.8, 1.2, {emissive: glow, emissiveIntensity: 1,
        gloss: {gloss: "varnish", glossTier: 2}});   // fix item 29, B version: varnish on the night road, catching the police lights and neon
    W.ground("cityfar", W.band(GY1, Y1, 60), paintCityGround(520, Y1 - GY1, 2, 8), {x: -260, y: GY1, width: 520, height: Y1 - GY1}, 2.8, 1.2);

    // ---------- Bay park south of the boulevard: fountain, bus shelter, hibiscus hedge, strolling people (all low, so they do not block the chase behind) ----------
    W.put(C.fountain("fountain", 10), -40, 276.5, 2.8, {fold: "grow", r: 10.5});
    W.put(C.busShelter("busstop"), 38, 283, 2.8, {rect: [8.5, 4]});
    [[33, 280, "jeansJacketGirl"], [42, 280.5, "leonidaTank", {pose: "stand", prop: "phone"}]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("bus" + i, 430 + i, look, extra), x, y, 2.8, {yaw: jitter(0.3)}));
    for (let i = 0; i < 9; i++) {
        const x = -220 + i * 52 + jitter(6), w = 12 + R() * 6;
        if (Math.abs(x - 38) < 22 || Math.abs(x + 40) < 20) continue;   // nothing planted in front of or behind the bus shelter and fountain
        W.put(K.bushes("bh" + i, {w, h: 4 + R() * 2, seed: 640 + i, flowers: i % 2 ? "#ff4f7a" : "#ffd36a", base: "#3f7a5a"}), x, 291 + jitter(1.5), 2.8,
            {rect: [w * 0.55 + 0.8, 3.2]});
    }
    [[-70, 252, "sparkleDress", {pose: "walk"}], [-14, 256, "tankDreads", {pose: "walk"}], [-2, 268, "fishnetFit"], [70, 256, "campShirt", {pose: "walk"}],
        [-18, 278, "hoodieKid", {prop: "speaker"}], [12, 248, "cropCargo"]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("bf" + i, 450 + i, look, extra), x, y, 2.8, {yaw: jitter(0.6), r: 2.6}));

    // ---------- BISCAYNE BLVD: police cars chase a sports car, the helicopter searchlight follows ----------
    const chase = W.lane("chase", LANES.east, 32, {atY: 320});   // when the camera focus reaches BISCAYNE, the fleeing car is right in the middle of the frame
    // The pursued car is the red-and-black muscle car that got away from the robbery at Port Gellhorn: the story runs on from the port to Vice City
    const runner = K.car("runner", "muscle", {body: "#c0202c", modern: false, rim: "#f0f0ff", stripes: "#1e1b26"});
    chase.add(runner, 10);
    chase.add(K.car("cop2", "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), -30);
    chase.add(K.car("vbpd2", "supercar", {body: "#1b1a24", livery: "vbpd", modern: true, roof: "#111018", rim: "#c9c3dc"}, {lightbar: true}), -66);
    chase.add(K.car("cop3", "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), -102);
    chase.add(K.car("cop4", "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), -138);
    const west = W.lane("blvdW", LANES.west, -16);
    west.add(K.car("suv2", "suv", {body: "#e9e6f2", modern: true, rim: "#2a2236", chrome: "#1e1628"}), 120);
    west.add(K.car("taxi2", "buffalo", {body: "#f5c043", modern: true, rim: "#c9c3dc", text: "TAXI"}), 180);
    west.add(K.car("wide2", "widebody", {body: "#3fb8b0", livery: "wrap", wrap1: "#ff4fa3", wrap2: "#1e1628", modern: true, rim: "#c9c3dc", seed: 12}), 240);
    const h = C.heli("heli");
    const hp = W.put(h, 0, LANES.east, 72, {fold: "grow", lead: 40, stay: STAY});
    const spot = C.spotDecal("spot", 13);
    W.flat(spot, 0, LANES.east, 3.0);
    W.mover({kind: "heli", obj: hp.pivot, follow: runner, heli: h, spot, offset: [-16, 14, 96]});
    // News helicopter: circling slowly beside the tallest tower at the end of the avenue (there is a helicopter in the sky in VC_10/11/27)
    const news = C.heli("heli2");
    news.userData.beam.visible = false;
    {
        // v8: sign made taller, letters bolder, the whole helicopter scaled up 1.7 (in the closing frame it is more than 360 mm from the camera, and it used to be only a red dot)
        const s = sheet(12, 3.2, 24);
        s.ctx.fillStyle = "#d8203a";
        s.ctx.fillRect(0, 0, s.W, s.H);
        s.ctx.fillStyle = "#ffffff";
        s.ctx.font = `900 ${s.mm(2.5)}px "Arial Black", sans-serif`;
        s.ctx.textAlign = "center";
        s.ctx.textBaseline = "middle";
        s.ctx.fillText("WEAZEL NEWS", s.W / 2, s.H / 2 + s.mm(0.1), s.W - s.mm(0.6));
        for (const side of [-1, 1]) {
            const pl = standUp(rectSheet(s.canvas, {id: "weazel" + side, width: 12, height: 3.2, thickness: 0.2, origin: "center", back: "#d8203a"}));
            pl.position.set(-1, side * 3.3, -0.4);
            if (side > 0) pl.rotation.z = Math.PI;
            news.add(pl);
        }
    }
    // v10: raised to 205 (a wanted sign was added on top of tw9 for the ending, and the old height of 196 would press down on the top edge of the sign)
    const np = W.put(news, 60, 740, 205, {fold: "grow", stay: STAY});
    if (np) {
        np.holder.scale.setScalar(1.7);
        // Batch 16: when the closing couple stand on the wanted sign it is right beside her - from 47.4 s it slowly accelerates toward the upper right and out of frame, clearing the sky
        W.mover({kind: "hover", obj: np.pivot, heli: news, c: np.pivot.position.toArray(), r: 34, w: 0.22, phase: 0.6,
            exit: {at: T21 - 0.6, dur: 2.0, dx: 95, dz: 14}});
    }
    for (let x = -240; x <= 240; x += 40) {
        W.put(C.streetLight("sl" + x), x + 6, 301, 2.8, {r: 1.5});
        W.put(C.streetLight("slb" + x), x - 14, 340, 2.8, {yaw: Math.PI, r: 1.2});
    }

    // ---------- Palms on the south side of the boulevard; a row of small neon shops on the north side (official screenshots: LIQUOR BAR, CHECKS CASH, TIRES signs) ----------
    for (let x = -222, k = 0; x <= 230; x += 44, k++) {
        if (Math.abs(x + 20 + 98) < 40 || Math.abs(x + 20 - 104) < 41) continue;   // nothing planted in front of the apartment buildings (the tree crowns would sweep into the buildings)
        W.put(K.palm("bp" + k, {h: k % 2 ? 34 + R() * 3 : 56 + R() * 5, bend: 1 + R() * 1.5, seed: 600 + k, fronds: k % 2 ? 8 : 9, reach: k % 2 ? 0.9 : 1}), x + 20 + jitter(2), 298, 2.8,
            {freq: 1.3, damp: 5.5, fold: "grow", r: 2.2});
    }
    const SHOPS = [
        {key: "checks", W: 30, wall: "#f5c043", trim: "#2a2433", accent: "#2a7a4a", neon: "#3ff07a", bandName: "CHECKS CASH", finText: "CASH"},
        {key: "jack", W: 26, wall: "#2a1830", trim: "#ffd36a", accent: "#ff3a5a", neon: "#ff3a5a", bandName: "JACK OF HEARTS", finText: "CLUB"},   // Boobie Ike's club
        {key: "tattoo", W: 24, wall: "#2f6a7a", trim: "#f4ecf6", accent: "#ff4fa3", neon: "#ff4fa3", bandName: "TATTOO", bandFont: "Segoe Script"},
        {key: "botanica", W: 28, wall: "#f3b8cf", trim: "#ffffff", accent: "#7b5fb0", neon: "#b48cff", bandName: "BOTANICA", finText: "OPEN"},
        {key: "tires", W: 30, wall: "#e9e4f4", trim: "#e0283a", accent: "#e0283a", neon: "#ff3a50", bandName: "LLANTAS · TIRES", finText: "24H"},
        {key: "cuban", W: 28, wall: "#a8dccb", trim: "#ffffff", accent: "#e0283a", neon: "#ffd36a", bandName: "CAFE CUBANO", bandFont: "Segoe Script"},
        {key: "nails", W: 24, wall: "#ff9fc8", trim: "#ffffff", accent: "#c0307a", neon: "#ff6fc8", bandName: "NAILS · UÑAS", bandFont: "Segoe Script"},
        {key: "farmacia", W: 28, wall: "#f4f0e8", trim: "#2a8a5a", accent: "#2a8a5a", neon: "#4fff9a", bandName: "FARMACIA", finText: "+"},
        {key: "pawn", W: 26, wall: "#3a4a6a", trim: "#f5c043", accent: "#f5c043", neon: "#ffd36a", bandName: "PAWN · EMPEÑO", finText: "GOLD"},
    ];
    let sx = -138;
    SHOPS.forEach((sp, i) => {
        const spec = {...sp, D: 14, H: 22, floors: 1, ground: 11, windows: 2, litRatio: 0.7, seed: 70 + i, neonEdge: true, cornice: 1.4,
            finH: sp.finText ? 16 : undefined, finW: 4.4, finX: sp.W / 2 - 4, finZ: 6, finInner: "#1e1628", awning: i % 2 ? sp.accent : null};
        const x = sx + sp.W / 2;
        sx += sp.W + 4;
        W.reserve(x, 345 + 7, sp.W / 2 + 0.5, 7.5);
        const shop = K.hotel("shop_" + sp.key, spec);
        shop.add(C.roofClutter("shopRoof" + i, sp.W, 14, 90 + i, {tank: i % 4 === 1}).translateZ(22));
        W.put(shop, x, 345, 2.8, {freq: 1.1, damp: 5, neon: spec});
    });
    // Sidewalk in front of the shops: a few people out at night
    [[-114, 337.9, "cropCargo"], [-34, 337.9, "jeansJacketGirl", {pose: "walk"}], [6, 337.9, "hoodieKid"], [86, 337.9, "campShirt"]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("sw" + i, 440 + i, look, extra), x, y, 2.8, {yaw: jitter(0.5)}));

    // ---------- Overpass (mural pillars) and the bikelife under it ----------
    // The overpass and the sign on it sink straight down when they fall (v11): at 42.4 s when they fall they are still at the bottom edge of the frame, and flipping toward the camera would reveal a large blank back
    W.put(C.overpass("i395", {h: 30, w: 36, every: 52, seed: 3, pillarR: 3.4}), 0, 381.5, 2.8, {freq: 0.9, damp: 4.5, sink: true});
    // A wanted sign stands on the overpass deck (like a gantry sign on a highway): the first 3 stars light up together with the sign (the tally from the heist at the port), and after the chase car drives past, stars 4 and 5 light up on the beat
    {
        const legs = 5, zDeck = 2.8 + 33.1;
        W.put(S.wantedPanel("wanted2", {legs}), -6, 381.5, zDeck, {freq: 1.1, damp: 5, dt: 0.45, sink: 2.8});
        for (let k = 0; k < 5; k++) {
            const [sx, sz] = S.starSlot(k, legs);
            const late = k >= 3;
            const s = W.put(S.wantedStar("star2_" + k), -6 + sx, 380.1, zDeck + sz, {fold: "grow", freq: 1.6, damp: 6, dt: 0.5 + k * 0.08, sink: 2.8,
                ...(late ? {at: 17 * BAR + (k - 3) * 2 * BEAT} : {})});
            W.mover({kind: "pulse", obj: s.holder, of: s.pivot, delay: 0});
        }
    }
    const under = W.lane("under", LANES.under[0], 24);
    under.add(K.wheelie("bl0", 80, {color: "#ff4fa3"}), -120);
    under.add(K.wheelie("bl1", 81, {color: "#ffd36a"}), -148);
    under.add(K.wheelie("bl2", 82, {color: "#3fb8b0"}), -176);
    under.add(K.atv("bl3"), -204);
    const under2 = W.lane("under2", LANES.under[1], -14);
    under2.add(K.car("donk", "buffalo", {body: "#5ab4e6", modern: false, rim: "#f0f0ff", chrome: "#f1ecff"}), 90);
    under2.add(K.car("suv3", "suv", {body: "#1e1b26", modern: true, rim: "#d0d0e0", chrome: "#1e1628"}), 160);
    [[-60, 405, "hoodieKid"], [-70, 407, "tankDreads"], [30, 406, "jerseyGuy"], [40, 405, "fishnetFit"], [120, 406, "cropCargo"]].forEach(([x, y, look], i) =>
        W.put(K.streetPerson("ul" + i, 400 + i, look), x, y, 2.8, {yaw: Math.PI + jitter(0.6), r: 3.8}));

    // ---------- Gas station (RICARDO TIRES / GAS) + a car with green underglow, motorcyclists ----------
    W.reserve(-16, 470, 18.5, 7);
    W.reserve(-24, 446, 33, 11);
    // v10: from the gas station onward (gas station, parking lot, stadium, Ferris wheel, park) nothing falls over - when the camera at 43 s drops from height toward the mouth of the avenue,
    // under the rule "fall over once the focus has passed" they would flip backward in the frame, and the blank back flipped over would cover the nightclub entrance (pointed out by the author, v10); if they do not fall, they leave the bottom edge of the frame on their own once the camera rises.
    W.put(C.gasStation("gas"), -30, 440, 2.8, {freq: 1.0, damp: 4.8, stay: STAY});
    W.put(K.car("gascar", "widebody", {body: "#2fd07a", livery: "wrap", wrap1: "#1e1628", wrap2: "#ffffff", modern: true, rim: "#c9c3dc", seed: 22}), -16, 452, 2.8,
        {fold: "grow", stay: STAY});
    W.put(K.sportbike("gasbike", {color: "#2f8a4a", number: "76", riderOn: true}), 14, 431, 2.8, {yaw: -0.3, fold: "grow", stay: STAY});
    [[-2, 433, "leonidaTank"], [10, 459, "sparkleDress"], [19, 462, "tankDreads", {pose: "walk"}]].forEach(([x, y, look, extra], i) =>
        W.put(K.streetPerson("gp" + i, 420 + i, look, extra), x, y, 2.8, {yaw: jitter(0.6), stay: STAY}));
    // Parking lot: cars parked under street lamps, one with green underglow (VC_22)
    [[-130, 428, "suv", {body: "#2a2236", modern: true, rim: "#d0d0e0", chrome: "#1e1628"}], [-115, 428, "buffalo", {body: "#d8343f", modern: true, rim: "#c9c3dc"}],
        [-104, 460, "widebody", {body: "#1e1b26", livery: "wrap", wrap1: "#2fff8a", wrap2: "#1e1628", modern: true, rim: "#2fff8a", seed: 31}],
        [-86, 460, "supercar", {body: "#ff6a2a", livery: "supercar", modern: true, roof: "#1e1628", rim: "#2a2236", spoke: "#111018", caliper: "#ffd36a"}]].forEach(([x, y, type, col], i) => {
        const p = W.put(K.car("lot" + i, type, col), x, y, 2.8, {yaw: Math.PI / 2 + (i % 2 ? Math.PI : 0), fold: "grow", rect: [3.2, 7.5], stay: STAY});
        if (p && i === 2) p.holder.add(C.underglow("glow" + i, "#2fff8a", 18, 10).translateZ(0.35));
    });
    W.put(C.streetLight("lotL1"), -140, 444, 2.8, {r: 1.2, stay: STAY});
    W.put(C.streetLight("lotL2"), -72, 444, 2.8, {yaw: Math.PI, r: 1.2, stay: STAY});

    // ---------- Stadium and Ferris wheel (the park by the bay) ----------
    W.put(C.arena("arena", {r: 28, h: 16}), 58, 452, 2.8, {freq: 0.9, damp: 4.5, r: 31, stay: STAY});
    W.put(K.ferrisWheel("wheel", 52), 128, 470, 2.8, {freq: 0.9, damp: 4.5, r: 6, stay: STAY});
    // Palms in the park keep a full tree crown's distance from the Ferris wheel (the standees around y 470) and from each other
    [[122, 428, 52], [176, 436, 46], [146, 506, 42]].forEach(([x, y, hh], i) =>
        W.put(K.palm("pk" + i, {h: hh, bend: 1 + R() * 2, seed: 700 + i, fronds: 8, reach: 0.9}), x, y, 2.8, {freq: 1.3, damp: 5.5, fold: "grow", r: 2.5, stay: STAY}));
    [[100, 498], [188, 502], [100, 422], [196, 414]].forEach(([x, y], i) =>
        W.put(C.shadeTree("pt" + i, {h: 16 + R() * 5, w: 14 + R() * 4, seed: 30 + i}), x, y, 2.8, {fold: "grow", r: 7, stay: STAY}));

    // ---------- Nightclub (VC_13): queue at the door, rope barrier, bouncers; next to it a small building topped with a lawyer billboard ----------
    {
        const spec = {key: "club", W: 46, D: 22, H: 20, floors: 1, ground: 11, wall: "#241a36", trim: "#ff4fa3", accent: "#1e1628", neon: "#ff4fa3",
            windows: 3, litRatio: 0.9, seed: 81, neonEdge: true, pilasters: [0.2, 0.8], pilasterNeon: true, cornice: 1.4, bandName: "VIP · ENTRADA",
            roofSign: {text: "Club Vice", w: 40, h: 11, font: "Segoe Script", neon: "#ff4fa3", back: "#2a1838"}, neonDt: 1.0};
        W.reserve(-13, 501, 24, 12);
        const club = K.hotel("club", spec);
        W.put(club, -13, 490, 2.8, {freq: 1.1, damp: 5, neon: spec, stay: STAY});
        W.put(C.velvetRope("rope", 7, 3.6), -38, 482.2, 2.8, {stay: STAY});
        // The two rows of the queue are staggered front and back (7 mm between people in the same row, so the standees do not poke into each other)
        const queue = [["fishnetFit"], ["sparkleDress"], ["jerseyGuy"], ["cropCargo", {pose: "stand"}], ["tankDreads"], ["jeansJacketGirl"], ["campShirt"]];
        queue.forEach(([look, extra], i) => W.put(K.streetPerson("q" + i, 460 + i, look, extra), -16 - i * 3.6, i % 2 ? 483.7 : 486.6, 2.8, {yaw: jitter(0.4), stay: STAY}));
        W.put(K.streetPerson("bouncer", 470, {sex: "m", build: "muscle", top: {kind: "tee", color: "#1a1824"}, bottom: {kind: "jeans", color: "#2a2a3a"},
            hair: {kind: "buzz", color: "#2a1b2c"}, chain: 1, shades: true, shoes: {kind: "sneaker", color: "#1a1824", c2: "#1a1824"}}), -8, 485.6, 2.8, {yaw: -0.2, stay: STAY});
        W.reserve(28, 500, 12.5, 8.5);
        W.put(withRoof(K.hotel("lowrise_law", {key: "law", W: 24, D: 16, H: 18, floors: 2, ground: 7, wall: "#c9b8a8", trim: "#f4ecf6", accent: "#3a3450", neon: "#ffd36a",
            windows: 3, litRatio: 0.5, seed: 83, cornice: 1.6}), C.roofClutter("lawRoof", 24, 16, 83), 18), 28, 492, 2.8, {freq: 1.1, damp: 5, stay: STAY});
        W.put(C.billboard("bb_law", {kind: "lawyer", w: 22, h: 9, legs: 6}), 28, 503, 2.8 + 18.8, {dt: 0.5, stay: STAY});
    }
    // Two low-rise buildings west of the parking lot, one topped with a Visit Leonida sign and one with a nightclub show sign
    [[-190, 430, 40, 24, 30, "#b8a8c8", 84, "leonida"], [-232, 470, 30, 20, 24, "#d8b0a0", 85, "dj"]].forEach(([x, y, w, d, hh, wall, sd, kind], i) => {
        const b = K.hotel("lowrise" + i, {key: "lr" + i, W: w, D: d, H: hh, floors: 3, ground: 7, wall, trim: "#f4ecf6", accent: "#3a3450", neon: "#ffd36a",
            windows: 4, litRatio: 0.45, seed: sd, cornice: 1.6, pilasters: [0.5]});
        W.reserve(x, y + d / 2, w / 2 + 0.5, d / 2 + 0.5);
        W.put(withRoof(b, C.roofClutter("lrRoof" + i, w, d, sd, {tank: i === 0}), hh), x, y, 2.8, {freq: 1.1, damp: 5});
        W.put(C.billboard("bb" + i, {kind, w: w - 6, h: 11, legs: 6}), x, y + d * 0.5, 2.8 + hh + 0.8, {dt: 0.5});
    });

    // ---------- Towers: the first row flanks the avenue, the second is taller, the third is at the end of the avenue (footprints are claimed first, so the avenue's trees and lamps go into the open spots afterwards) ----------
    const towers = [
        // x, y (front edge), width, height, glass, rooftop light color, rooftop, type
        [-98, 552, 30, 100, "#2f3f6a", "#3ff0e0", "flat", "office"], [-52, 552, 34, 128, "#3a2f5a", "#ff4fa3", "crown", "resi"],
        [52, 552, 32, 118, "#3a6a78", "#9fff6a", "spire", "office"], [98, 552, 30, 92, "#40305a", "#ffd36a", "flat", "resi"],
        [-150, 556, 28, 112, "#2a2f58", "#ff8fc0", "crown", "office"], [150, 556, 30, 105, "#6a5060", "#3ff0e0", "flat", "office"],
        [-200, 560, 32, 86, "#3a3a6a", "#ffd36a", "flat", "resi"], [200, 560, 30, 95, "#26365e", "#b48cff", "crown", "resi"],
        [-36, 664, 30, 172, "#26365e", "#9fff6a", "spire", "office"], [38, 664, 30, 155, "#40305a", "#3ff0e0", "crown", "office"],
        [-82, 668, 34, 140, "#2a3a62", "#ff8fc0", "crown", "resi"], [84, 668, 34, 182, "#7a7898", "#ffd36a", "spire", "office"],
        [-128, 664, 30, 165, "#6a5060", "#3ff0e0", "spire", "office"], [130, 664, 30, 148, "#3a2f5a", "#ff4fa3", "flat", "resi"],
        [-178, 670, 34, 128, "#33325c", "#ffd36a", "crown", "office"], [182, 670, 32, 136, "#2f3f6a", "#b48cff", "spire", "office"],
        [0, 772, 38, 215, "#2a3660", "#ff4fa3", "spire", "office"], [-58, 776, 32, 165, "#3a6a78", "#3ff0e0", "crown", "office"],
        [60, 776, 32, 178, "#26365e", "#ffd36a", "crown", "resi"], [-112, 780, 30, 140, "#2a3a62", "#9fff6a", "flat", "office"],
        [116, 780, 30, 152, "#40305a", "#3ff0e0", "spire", "office"],
    ];
    towers.forEach(([x, y, w, hgt, glass, crown, top, kind], i) => {
        W.reserve(x, y + 12, w / 2 + 0.6, 12.6);
        W.put(C.glassTower("tw" + i, {W: w, D: 24, H: hgt, seed: 40 + i, glass, crown, top, band: hgt > 200 ? 2 : hgt > 150 ? 1 : 0, kind}), x, y, 2.8,
            {freq: 0.85, damp: 4.2, lead: y > 700 ? 60 : 0, stay: STAY});
    });

    // ---------- Central avenue: traffic drives off into the distance; street trees and lamps on both sides (lamp arms reach over the road, trees and lamps staggered front to back) ----------
    const away = W.ylane("aveN", AVE.x + 5.8, 14, {ya: AVE.y0, yb: AVE.y1, at: 0});
    const toward = W.ylane("aveS", AVE.x - 5.8, -12, {ya: AVE.y0, yb: AVE.y1, at: 0});
    const aveCars = [["suv", {body: "#1e1b26", modern: true, rim: "#d0d0e0", chrome: "#1e1628"}], ["buffalo", {body: "#f5c043", modern: true, rim: "#c9c3dc", text: "TAXI"}],
        ["widebody", {body: "#ff5fb0", livery: "wrap", wrap1: "#8a3ad0", wrap2: "#ffffff", modern: true, rim: "#c9a060", seed: 41}], ["supercar", {body: "#e9e6f2", livery: "supercar", modern: true, roof: "#1e1628", rim: "#2a2236", spoke: "#111018", caliper: "#3ff0e0"}],
        ["buffalo", {body: "#2a3a6a", modern: true, rim: "#c9c3dc"}], ["suv", {body: "#e9e6f2", modern: true, rim: "#2a2236", chrome: "#1e1628"}]];
    // The lane going into the city (x +5.8) is left to the chase cars in the ending, so only the oncoming cars remain (v8)
    void away;
    for (let i = 1; i < 6; i += 2) {
        const [type, col] = aveCars[i];
        toward.add(K.car("ave" + i, type, col), AVE.y0 + 20 + i * 44);
    }
    const crossing = y => Math.abs(y - 530) < 13 || Math.abs(y - 645) < 13 || y > AVE.y1 - 10 || (y > 658 && y < 694);
    for (let y = AVE.y0 + 66; y < AVE.y1; y += 24) {
        for (const s of [-1, 1]) {
            const ly = y + (s > 0 ? 12 : 0), ty = ly + 6;
            if (!crossing(ly)) W.put(C.streetLight(`av${s}_${y}`), AVE.x + s * 25, ly, 2.8, {yaw: s > 0 ? Math.PI : 0, r: 1, stay: STAY});
            if (!crossing(ty)) W.put(C.shadeTree(`avT${s}_${y}`, {h: 13 + R() * 3, w: 10 + R() * 3, seed: 50 + y + s}), AVE.x + s * 18.5, ty, 2.8, {fold: "grow", r: 4.2, stay: STAY});
        }
    }
    // People waiting at the red light at the intersection
    [[-17, 518, "fishnetFit"], [-20, 519, "hoodieKid"], [18, 518, "sparkleDress"], [20.5, 519.5, "jerseyGuy"], [-17, 632, "campShirt"], [17, 633, "cropCargo"]].forEach(([x, y, look], i) =>
        W.put(K.streetPerson("cn" + i, 480 + i, look), x, y, 2.8, {yaw: jitter(0.8), r: 3.4, stay: STAY}));
    // Small park between the towers (west side)
    for (let i = 0; i < 4; i++) W.put(C.shadeTree("wp" + i, {h: 15 + R() * 4, w: 12 + R() * 3, seed: 90 + i}), -240 + (i % 2) * 18, 575 + Math.floor(i / 2) * 36, 2.8,
        {fold: "grow", r: 6, stay: STAY});
    // Three layers of silhouettes in the distance
    W.put(K.skylineFlat("sky_near", 520, 70, 21, 0.85), 0, 870, 2.8, {lead: 260, stay: STAY});
    W.put(K.skylineFlat("sky_mid", 600, 110, 22, 0.5), 20, 960, 2.8, {lead: 330, stay: STAY});
    W.put(K.skylineFlat("sky_far", 700, 150, 23, 0.12), -10, 1060, 2.8, {lead: 420, stay: STAY});

    // ---------- Ending (v8): the chase is not over - the red-and-black muscle car turns into the central avenue and rushes into the city, two police cars on its tail, a police helicopter following with its searchlight on ----------
    // When the camera flies low to the mouth of the avenue (44.6 s) they rush into the avenue right then; at the end the camera rises to rooftop height, the cars are hidden behind the front-row towers, and only the helicopter and the light beam keep going inward between the two rows of towers.
    // Placed last in the region: so the random placement in the earlier regions is unaffected
    {
        const at = 19 * BAR, v = 30, x = AVE.x + 5.8;
        const runner2 = K.car("runner2", "muscle", {body: "#c0202c", modern: false, rim: "#f0f0ff", stripes: "#1e1b26"});
        const train = [[runner2, 0],
            [K.car("cop5", "buffalo", {body: "#f6f6f2", livery: "police", modern: true, pushbar: true, rim: "#9a9ab0"}, {lightbar: true}), 27],
            [K.car("vbpd5", "supercar", {body: "#1b1a24", livery: "vbpd", modern: true, roof: "#111018", rim: "#c9c3dc"}, {lightbar: true}), 54]];
        const pivots = [];
        for (const [car, gap] of train) {
            const p = W.put(car, x, AVE.y0 + 30, 2.8, {fold: "grow", yaw: Math.PI / 2, stay: STAY});
            W.mover({kind: "dash", obj: p.pivot, holder: p.holder, ya: AVE.y0 + W.oy, yb: AVE.y1 + W.oy, v, at, gap});
            pivots.push(p.pivot);
        }
        // v12: from the beat when the 6th star drops (bar 20), the two police cars' lights wash the towers on both sides of the avenue alternately red and blue, alternating on the beat, moving into the city with the cars.
        // The lights are lifted to mid-air (26 above the ground) and offset a little to each side: red lights the left row of buildings more, blue the right, so the alternation looks like light sweeping back and forth between the two rows
        const sirens = [["#ff2a3c", -9], ["#2f6bff", 9]].map(([c, dx]) => {
            const L = new THREE.PointLight(new THREE.Color(c), 0, 230, 2);
            L.userData.off = [dx, -14, 26];
            return W.flat(L, x + dx, AVE.y0, 26);
        });
        W.mover({kind: "siren", lights: sirens, follow: pivots[1], at: 20 * BAR, I: 36000});
        const h3 = C.heli("heli3");
        const hp3 = W.put(h3, x - 10, AVE.y0 + 46, 88, {fold: "grow", stay: STAY});
        const spot3 = C.spotDecal("spot3", 11);
        W.flat(spot3, x, AVE.y0 + 30, 3.0);
        // maxY: stops and hangs before reaching the end of the avenue (tower front edge about 771), so it does not fly into a tower (batch 16; only showed up after the film was lengthened to 52.6 s)
        W.mover({kind: "heli", obj: hp3.pivot, follow: runner2, heli: h3, spot: spot3, offset: [-10, 16, 88], yaw: Math.PI / 2 - 0.45, maxY: AVE.y1 - 16 - 8});
    }
    // ---------- Ending (v10): the 6th star - a third wanted sign on top of the tower on the right of the avenue (tw9) ----------
    // The first 5 stars are the tally from the two earlier signs and light up together with the sign; on the first beat of the last bar the 6th lights up (GTA VI uses a 6-star system), and in the closing frame it hops on every beat on top of the tower.
    // The sign is shrunk to 0.7 and is wider than the roof; its two poles are pulled to the middle and stand on the upper roof; the bottom of the sign sits above the roof light boxes and the beacon, and the poles are excluded from the clipping check.
    {
        const s = 0.7, legs = 16, x = 38, y = 668.6, z = 2.8 + 155;   // tw9 upper roof: front edge y 667.4, light boxes start at 670, top height 165.8
        const panel = S.wantedPanel("wanted3", {legs, legX: 0.18, legsAudit: false, glow: "#b8b0ff", truss: true});   // blind review: the two dark poles were invisible at night and the sign looked like it was floating, so switch to a light steel frame
        panel.scale.setScalar(s);
        W.put(panel, x, y, z, {freq: 1.1, damp: 5, dt: 0.3, stay: STAY});
        for (let k = 0; k < 6; k++) {
            const [sx, sz] = S.starSlot(k, legs);
            const star = S.wantedStar("star3_" + k);
            star.scale.setScalar(s);
            const st = W.put(star, x + sx * s, y - 1.0, z + sz * s, {fold: "grow", freq: 1.6, damp: 6, stay: STAY,
                ...(k < 5 ? {dt: 0.8 + k * 0.08} : {at: 20 * BAR})});
            // The first 5 stay lit and still; from the beat when the 6th drops, all six hop together on the beat
            W.mover({kind: "pulse", obj: st.holder, at: 20 * BAR});
            // Batch 16: after the two kiss, the six stars flip into hearts one by one from left to right on sixteenth notes (wanted level -> heart level). Hearts and stars share one holder, so they hop together
            const heart = Lv.signHeart("sheart3_" + k);
            heart.scale.setScalar(s);
            heart.visible = false;
            st.holder.add(heart);
            W.mover({kind: "cardSwap", a: star, b: heart, at: LOVE.flip0 + k * BEAT / 4, dur: 0.2});
        }
        lovers(x, y, z + (legs + S.WANTED.h) * s, z);
        // Batch 18: once all the stars have turned into hearts, the red heat-icon row on the little tab goes dark (a dark patch covers it, blinking twice as it covers)
        const off = Lv.heatOff("heatoff3");
        off.scale.setScalar(s);
        W.flat(off, x, y - 1.2, z + (legs + S.WANTED.tabH / 2) * s);
        off.visible = false;
        W.mover({kind: "blinkOn", obj: off, at: LOVE.iconsOff});
    }
    // ---------- Ending (batch 16, author 11-24): a man and a woman step onto this wanted sign, jump together, embrace and kiss, and a big heart pops up behind them ----------
    // The two bars after the camera settles at 48 s (bar 21): on beat 1 he stands up, on the second half of the beat she stands up; on beat 2 each hops twice to get close; on beat 3 swap to the kissing pose;
    // then the stars flip into hearts; on the bar-22 downbeat the big heart pops up behind them (the two become backlit silhouettes), and after that a small heart floats up on every beat. Moon, big heart, the two people and the sign are on one vertical line.
    function lovers(cx, cy, top, roof) {
        const {standGap} = Lv.LOVERS;
        const yy = cy - 0.5;   // standing on the top edge of the sign (sign thickness 0.9)
        const hop = 6;          // how far each person hops toward the middle
        const size = loveSize();
        const sc = size.sc;     // scale of the people (1.4 in batch 16; in batch 18 the author found it too big, so it was reduced, see LOVE_SIZES)
        const pair = [["man", -1], ["woman", 1]].map(([who, side], i) => {
            const fig = Lv.loverStanding("lover_" + who, who);
            fig.scale.setScalar(sc);
            const p = W.put(fig, cx + side * (standGap / 2 + hop) * sc, yy, top, {freq: 1.3, damp: 5, stay: STAY, at: LOVE.pop + i * EIGHTH});
            return {pivot: p.pivot, holder: p.holder, x0: p.pivot.position.x, x1: cx + side * (standGap / 2) * sc};
        });
        const kiss = Lv.loversKiss("lovers_kiss");
        kiss.scale.setScalar(sc);
        const kp = W.put(kiss, cx, yy, top, {fold: "drive", stay: STAY, at: LOVE.kiss});
        // Batch 17: after the kiss each steps outward and reaches out one hand (still in profile, facing the middle); the kid pops up from the middle and takes their hands, so the three stand inside the big heart
        const {spread} = Lv.FAMILY;
        const hold = [["man", -1], ["woman", 1]].map(([who, side]) => {
            const fig = Lv.loverHolding("lover_" + who + "_hold", who);
            fig.scale.setScalar(sc);
            const p = W.put(fig, cx + side * (standGap / 2) * sc, yy, top, {fold: "drive", stay: STAY, at: LOVE.apart});
            return {pivot: p.pivot, holder: p.holder, x0: cx + side * (standGap / 2) * sc, x1: cx + side * spread * sc};
        });
        const kid = Lv.kidCard("lover_kid");
        kid.scale.setScalar(sc);
        const kd = W.put(kid, cx, yy - 0.4, top, {freq: 2.0, damp: 5, stay: STAY, at: LOVE.kid, hide: true});
        W.mover({kind: "lovers", man: pair[0], woman: pair[1], kiss: kp.holder, hop0: LOVE.hop, hop1: LOVE.kiss, hops: 2, at: LOVE.kiss,
            apart: {at: LOVE.apart, dur: EIGHTH, man: hold[0], woman: hold[1]}, kid: {holder: kd.holder, at: LOVE.kid}, cheer: LOVE.cheer});
        // "HOT TOGETHER": a row of neon letters on the front edge of the roof (below the sign, in front of the light boxes), flipped up 0.3 s before the bar-24 downbeat and lit on the downbeat
        W.put(Lv.hotTogetherSign("hot_together", LOVE.cheer), cx, cy - 0.7, roof, {freq: 1.6, damp: 5, stay: STAY, at: LOVE.cheer - 0.3, hide: true});
        // Big heart: 2.5 mm behind the two people, growing out of its tip; afterwards it goes "thump-thump" to the beat. The tip of the heart sits lift above the top of the sign (the smaller the heart, the higher it is lifted, so it shows up behind the two heads)
        const hw = size.heart, heartZ = top + size.lift, k = hw / 42;
        const big = Lv.bigHeart("bigheart", hw);
        const hb = W.put(big, cx, cy + 2.5, heartZ, {fold: "grow", freq: 1.1, damp: 5, stay: STAY, at: LOVE.heart});
        W.mover({kind: "heartbeat", obj: hb.holder, at: LOVE.heart});
        // Batch 18: a glow patch behind the heart - it lights up softly at the moment of the kiss (giving a little light behind the two before the heart appears, so the silhouettes are no longer dark against a dark night sky), and goes fully lit with the big heart on the bar-22 downbeat
        const halo = Lv.loveHalo("lovehalo", hw * 2.1);
        W.flat(halo, cx, cy + 4.0, heartZ + hw * 0.46);
        W.mover({kind: "halo", mat: halo.material, at0: LOVE.kiss, at1: LOVE.heart, low: 0.55});
        // Floating small hearts: come out from both sides of the top of the big heart and drift toward the moon; one every float beats, alternating left and right, all the way to the end of the film
        const floats = [];
        for (let j = 0; LOVE.heart + 0.15 + j * size.float * BEAT < LOVE.end - 0.8; j++) floats.push([[-9, 8, -4, 10, -11, 5][j % 6] * k * 1.1, 0.15 + j * size.float * BEAT]);
        floats.forEach(([dx, dt], i) => {
            const fh = Lv.floatHeart("fheart" + i, (2.4 + (i % 2) * 0.6) * Math.max(0.75, k));
            const p0 = [cx + dx, cy + 1.2, heartZ + hw * 0.78];
            W.flat(fh, ...p0);
            W.mover({kind: "floatHeart", obj: fh, at: LOVE.heart + dt, life: 1.9, p0, rise: 26 * Math.max(0.7, k), sway: 1.6 * k, phase: i * 1.7});
        });
    }
    void THREE;
    return {name: "downtown", y0: Y0, y1: Y1};
}

// Buildings + rooftop clutter: the clipping check only looks at the building body (billboards on the roof stand among the clutter, so they do not count as collisions); the neon switch-on time still hangs on the building as before
function withRoof(building, clutter, H) {
    const g = new THREE.Group();
    g.add(building, clutter.translateZ(H));
    g.userData.core = building;
    g.userData.neon = building.userData.neon;
    return g;
}
