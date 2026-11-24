// Leonida papercraft map: one tabletop map, with the camera sweeping through the regions along +Y in a single continuous shot.
// Each region has its own file under regions/ (region-local coordinates); this file handles: joining them together, the camera, time of day (day -> night), the sky dome, pop-up and fall-over, traffic lanes, footprint collision avoidance.
// t >= 200: fixed check cameras (one per whole second), with every object already standing.
import * as THREE from "three";
import {rng, lerp, clamp, smooth, snapUp, PopRegistry, polySheet, place} from "./kit.js";
import {sheet, lin, grain} from "./paint.js";
import * as K from "./props.js";
import {todParams} from "./tod.js";
import * as keys from "./regions/keys.js";
import * as grassrivers from "./regions/grassrivers.js";
import * as gellhorn from "./regions/gellhorn.js";
import * as vicebeach from "./regions/vicebeach.js";
import * as downtown from "./regions/downtown.js";
import {wire as wireMesh} from "./props_town.js";
import {preloadAtlases} from "./atlas.js";

// ---------- Map: region order and position (world y = region-local y + oy) ----------
// the Keys (day) -> Grassrivers (golden afternoon) -> Port Gellhorn (evening) -> Vice Beach (sunset) -> Vice City downtown (night)
const MAP = [
    {mod: keys, oy: -1480, tod: 0},
    {mod: grassrivers, oy: -1080, tod: 1},
    {mod: gellhorn, oy: -700, tod: 1.6},
    {mod: vicebeach, oy: 0, tod: 2},
    {mod: downtown, oy: 0, tod: 3},
];

// ---------- Beat: soundtrack is M83 "Midnight City", 105 BPM, 4/4 (constants live in beat.js; the regions need them too) ----------
// Camera keyframes land on half-bars, things pop up in groups on eighth notes, and the big region-name lettering lands on bar downbeats.
// The film is 25 bars long (render --t1 1714/30 = about 57.13 s): the camera travels for 21 bars (48 s) to settle on the skyline, then holds there for the last 4 bars
// (author, 11-24: "the tail holds a bit too short" -> 23 bars; then the closing mini-story was added: two people kiss on the rooftop, stars turn into hearts, a family of three, HOT TOGETHER -> 25 bars, see LOVE in downtown.js).
import {BEAT, EIGHTH, BAR, HALF, VERSE} from "./beat.js";
export {BEAT, EIGHTH, BAR, HALF};

// ---------- Camera keyframes (world coordinates) ----------
// fo: how far ahead of the target point (along the ground) the focus sits - things pop up in front of the target point, so the focus has to land on "the patch that just stood up", not the center of the frame;
// band: depth of the sharp band (larger = wider)
const KEYS = [
    {t: 0, pos: [0, -1700, 230], tgt: [0, -1450, 0], fov: 34, fo: -20, band: 170},        // flat tourist map
    {t: 3 * HALF, pos: [-20, -1605, 160], tgt: [-22, -1362, 8], fov: 33, fo: 5, band: 150},   // the Keys: first look off to the left at the shack bar, the two on a jet ski, the boat party (v12: shifted less, focus pulled back to the big lettering and the shack, so the lettering is not blurred on the push-in)
    {t: 7 * HALF, pos: [16, -1470, 150], tgt: [18, -1200, 12], fov: 33},                  // then shift right: the sea bridge, seaplane, Brian's boatyard
    {t: 10 * HALF, pos: [5, -1250, 130], tgt: [5, -980, 8], fov: 33},                     // Grassrivers: airboat, alligator
    {t: 13 * HALF, pos: [-10, -1100, 150], tgt: [-20, -820, 14], fov: 33},                // stilt-house restaurant, fishing camp
    {t: 16 * HALF, pos: [-6, -872, 142], tgt: [-6, -600, 16], fov: 33},                   // Port Gellhorn: the drums come in, drop lower to look at the heist, police car, wanted stars
    {t: 19 * HALF, pos: [-5, -740, 165], tgt: [-8, -470, 12], fov: 33},                   // motel, nightclub, trailer park campfire, water tower, pier
    {t: 22 * HALF, pos: [-15, -470, 205], tgt: [-15, -140, 2], fov: 31},                  // fly past the open sea (yacht, sailboat), the sky turns to sunset
    {t: 25 * HALF, pos: [-12, -172, 178], tgt: [-5, 66, 6], fov: 31.5},                   // Vice Beach
    {t: 28 * HALF, pos: [-15, -130, 128], tgt: [0, 125, 18], fov: 32.5, fo: 40},
    {t: 31 * HALF, pos: [-20, -106, 95], tgt: [5, 162, 30], fov: 33, fo: 10},
    {t: 34 * HALF, pos: [-5, 30, 185], tgt: [0, 320, 12], fov: 33, fo: 30},               // Vice City downtown: car chase
    {t: 37 * HALF, pos: [4, 220, 150], tgt: [0, 470, 25], fov: 34, fo: 30},
    {t: 39 * HALF, pos: [0, 330, 62], tgt: [0, 700, 70], fov: 40, fo: -150, band: 160},
    {t: 42 * HALF, pos: [0, 380, 150], tgt: [0, 800, 160], fov: 42, fo: -20, band: 150},
];
const T_END = KEYS.at(-1).t;
// Rack focus: on a given beat, pull the focus from the camera's focal plane onto a specified point, hold it for a while, then return it (the camera path is unchanged, pop-up times are unchanged).
// Blind review (11-24): the VICE CITY sign at 35 s was only blurred lettering in the background - on the beat where the verse comes in (36.6 s), pull the focus onto the sign.
const PULLS = [{at: VERSE - 0.2, in: 0.45, hold: 0.85, out: 0.5, point: [6, 262, 46], band: 110},
    // Batch 16: on the beat when the closing couple step onto the wanted sign, the focal plane moves from about 400 to about 320 and the sharp band widens to 200 - the two people (about 290 away) are sharp, while the distant skyline blurs by less than 1 pixel
    {at: 21 * BAR - 0.3, in: 0.6, hold: 30, out: 0.5, point: [38, 700, 200], band: 200}];
const FO = 70, BAND = 125;   // blind review (11-24): from 10-21 s, roughly the top and bottom 1/3 blurred into one wash; sharp band 100 -> 125

// Check cameras (t >= 200)
const VIEWS = [
    [[-25, -138, 140], [5, 137, 22], 32],      // 200 overview
    [[-60, -60, 60], [-40, 40, 8], 34],        // 201 beach close-up
    [[10, 52, 70], [10, 177, 22], 34],         // 202 hotel close-up
    [[-120, -230, 60], [-110, -118, 2], 34],   // 203 speedboat close-up
    [[-150, 20, 70], [-130, 85, 25], 36],      // 204 palms and flamingos
    [[-20, -108, 92], [5, 157, 26], 32],       // 205 low angle
    [[-10, -83, 200], [0, 117, 8], 32],        // 206 high angle
    [[-40, 122, 95], [-40, 432, 45], 40],      // 207 distant view
    [[-110, -40, 45], [-80, 22, 10], 36],      // 208 lifeguard tower
    [[-62, -22, 34], [-50, 20, 7], 34],        // 209 beach pedestrians
    [[90, -40, 34], [110, 15, 7], 34],         // 210 beach pedestrians (right)
    [[-40, 70, 48], [-10, 125, 4], 34],        // 211 Ocean Drive traffic
    [[-60, 230, 70], [-20, 320, 8], 36],       // 212 BISCAYNE BLVD car chase
    [[-40, 300, 40], [-20, 385, 18], 38],      // 213 overpass and mural pillars
    [[-40, 380, 45], [-20, 450, 10], 36],      // 214 gas station
    [[0, 380, 150], [0, 800, 160], 42],        // 215 end point
    [[60, 360, 70], [80, 460, 15], 38],        // 216 stadium and Ferris wheel
    [[-15, 440, 30], [-15, 490, 8], 34],       // 217 nightclub queue
    [[0, 330, 62], [0, 700, 70], 40],          // 218 central avenue
    [[4, 220, 150], [0, 470, 25], 34],         // 219 gas station + nightclub + stadium (at 39.5 s in the film)
    [[0, -1700, 230], [0, -1450, 0], 34],      // 220 the Keys opening (everything standing)
    [[-62, -1430, 50], [-62, -1365, 12], 36],  // 221 THE RUSTY ANCHOR
    [[50, -1385, 30], [50, -1340, 10], 36],    // 222 iguana
    [[0, -1330, 60], [0, -1230, 20], 38],      // 223 sea bridge, seaplane
    [[0, -1110, 60], [0, -1000, 10], 36],      // 224 GRASSRIVERS + airboat
    [[60, -950, 50], [60, -884, 14], 38],      // 225 stilt-house restaurant
    [[-90, -860, 45], [-90, -790, 12], 38],    // 226 fishing camp + seaplane
    [[0, -700, 60], [0, -560, 20], 38],        // 227 PORT GELLHORN + highway + signs
    [[-80, -580, 50], [-80, -470, 18], 38],    // 228 motel
    [[60, -580, 50], [60, -480, 18], 38],      // 229 DELIGHTS
    [[-120, -500, 60], [-60, -400, 20], 40],   // 230 trailer park, water tower
    [[-5, -690, 48], [-10, -612, 10], 40],     // 231 heist: Uncle Jack's, the two masked figures, police car, wanted stars
    [[-10, -528, 42], [-10, -455, 8], 40],     // 232 dancing on the car roof, burnout in front of the pawn shop
    [[-10, -12, 30], [-4, 32, 6], 38],         // 233 beach volleyball (v8)
    [[-42, -930, 48], [-42, -868, 6], 40],     // 234 Thrillbilly Mud Club (v10)
    [[-20, -335, 40], [2, -275, 8], 40],       // 235 container ship (v10; in the check cameras it sits at its 48 s position)
    [[20, 560, 175], [38, 668, 172], 40],      // 236 the third wanted sign on top of tw9 (v10)
    [[0, -1062, 62], [0, -960, 4], 40],        // 237 the water behind the big GRASSRIVERS lettering: spoonbill, egret, water lily, alligator warning sign (v11)
];

// Fix item 13: wind blows toward +x and slightly toward +y; two gust fronts sweep along the wind direction (spacing 260 / 170, speed 55 / 75 mm per second), a pure function of time, deterministic frame by frame
const WIND = [0.894, 0.447];
function gust(x, y, t) {
    const s = x * WIND[0] + y * WIND[1];
    const front = (L, v, w, off) => { const u = ((((s - v * t + off) % L) + L) % L) - L / 2; return Math.exp(-((u / w) ** 2)); };
    return Math.min(1, front(260, 55, 45, 0) + 0.6 * front(170, 75, 30, 90));
}

function easeIn(f) { return f * f * (2 - f); }
function easeOut(f) { return 1 - easeIn(1 - f); }
function makeTrack(keys) {
    const pos = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.pos)), false, "catmullrom", 0.5);
    const tgt = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.tgt)), false, "catmullrom", 0.5);
    const n = keys.length;
    return t => {
        const tt = clamp(t, keys[0].t, keys[n - 1].t);
        let i = 0;
        while (i < n - 2 && tt > keys[i + 1].t) i++;
        let f = (tt - keys[i].t) / (keys[i + 1].t - keys[i].t);
        if (i === 0) f = easeIn(f);
        if (i === n - 2) f = easeOut(f);
        const u = (i + f) / (n - 1);
        const kv = (k, key, def) => lerp(keys[k][key] ?? def, keys[k + 1][key] ?? def, f);
        return {pos: pos.getPoint(u), tgt: tgt.getPoint(u), fov: kv(i, "fov", 33), fo: kv(i, "fo", FO), band: kv(i, "band", BAND)};
    };
}

// Sky dome: a large dome that follows the camera, with a gradient by direction and height; the setting sun and clouds hang in front of it
function makeSky() {
    const group = new THREE.Group();
    const uniforms = {top: {value: new THREE.Color()}, mid: {value: new THREE.Color()}, horizon: {value: new THREE.Color()}};
    const mat = new THREE.ShaderMaterial({
        uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 top, mid, horizon; varying vec3 vDir;
            void main() {
                float e = vDir.z;
                vec3 c = e < 0.08 ? mix(horizon, mid, smoothstep(-0.12, 0.08, e)) : mix(mid, top, smoothstep(0.08, 0.5, e));
                gl_FragColor = vec4(c, 1.0);
                #include <colorspace_fragment>
            }`,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), mat);
    dome.renderOrder = -10;
    group.add(dome);
    return {group, uniforms};
}

export async function build() {
    const root = new THREE.Group();
    const R = rng(20261123);
    const jitter = a => (R() - 0.5) * a;
    const pending = [];        // wait until the camera route is computed, then set pop-up times
    const movers = [];
    const taken = [];          // footprints: [x, y, r] or [x, y, hw, hh, "rect"]
    await document.fonts.load('700 20px "Segoe Script"');
    for (const f of ['700 20px "Bookman Old Style"', '900 20px "Arial Black"', '20px Impact', '700 20px Bahnschrift']) await document.fonts.load(f);

    // Footprint: circle [x, y, r] or rectangle [x, y, hw, hh, "rect"]; a new object may not overlap any existing one
    const hitOne = (a, b) => {
        const ar = a[4] === "rect", br = b[4] === "rect";
        if (!ar && !br) return Math.hypot(a[0] - b[0], a[1] - b[1]) < a[2] + b[2];
        const [hwA, hhA] = ar ? [a[2], a[3]] : [a[2], a[2]];
        const [hwB, hhB] = br ? [b[2], b[3]] : [b[2], b[2]];
        return Math.abs(a[0] - b[0]) < hwA + hwB && Math.abs(a[1] - b[1]) < hhA + hhB;
    };
    function claim(x, y, r, rect = null) {
        for (let k = 0; k < 60; k++) {
            const nx = x + (k ? (R() - 0.5) * (2 + k * 0.9) : 0), ny = y + (k ? (R() - 0.5) * (1.5 + k * 0.6) : 0);
            const shape = rect ? [nx, ny, rect[0], rect[1], "rect"] : [nx, ny, r];
            if (taken.every(s => !hitOne(shape, s))) { taken.push(shape); return [nx, ny]; }
        }
        return null;
    }

    function api(oy) {
        const X0 = -260, X1 = 260;
        return {
            R, jitter, oy,
            band(yFront, yBack, step = 4) {
                const pts = [];
                for (let x = X0; x <= X1 + 0.01; x += step) pts.push([x, typeof yFront === "function" ? yFront(x) : yFront]);
                for (let x = X1; x >= X0 - 0.01; x -= step) pts.push([x, typeof yBack === "function" ? yBack(x) : yBack]);
                return pts;
            },
            ground(id, outline, canvas, rect, top, thickness = 1, opts = {}) {
                const m = polySheet(outline.map(([x, y]) => [x, y + oy]), {id, canvas, thickness, uvFrame: {...rect, y: rect.y + oy}, castShadow: false, ...opts});
                m.position.z = top - thickness / 2;
                m.userData.paper.meta.mat.front.ground = true;   // fix item 8, B version: ground paper desaturates by time of day (read by the art style)
                if (opts.gloss) Object.assign(m.userData.paper.meta.mat.front, opts.gloss);   // fix item 29, B version: varnish on water and on the night road
                root.add(m);
                return m;
            },
            reserve(x, y, hw, hh) { taken.push([x, y + oy, hw, hh, "rect"]); },
            flat(obj, x, y, z, {rot = 0, r = 0} = {}) {
                let at = [x, y + oy];
                if (r > 0) { at = claim(x, y + oy, r); if (!at) return null; }
                obj.position.set(at[0], at[1], z);
                obj.rotation.z = rot;
                root.add(obj);
                return obj;
            },
            put(obj, x, y, z, opts = {}) {
                let at = [x, y + oy];
                if (opts.r || opts.rect) { at = claim(x, y + oy, opts.r ?? 0, opts.rect); if (!at) return null; }
                const {pivot, holder} = place(root, obj, {x: at[0], y: at[1], z, yaw: opts.yaw ?? 0});
                pending.push({pivot, obj, y: at[1], lead: opts.lead ?? 0, dt: opts.dt ?? 0, fold: opts.fold ?? "back",
                    freq: opts.freq, damp: opts.damp, neon: opts.neon, stay: opts.stay, onBar: opts.onBar, at: opts.at, sink: opts.sink,
                    hide: opts.hide, unfold: opts.unfold});
                if (obj.userData.person) movers.push({kind: "sway", obj: holder, phase: R() * 6.28});
                return {pivot, holder, at: [at[0], at[1] - oy]};
            },
            // atY (region-local): the moment the camera focus reaches here counts as second 0 of this mover (boats, planes), so nothing needs changing when the film length changes
            mover(m) { if (m.atY !== undefined) m.atYw = m.atY + oy; movers.push(m); },
            // Lane: all cars in a lane share one speed; x(t) = x0 + v*(t - lane start time), wrapping around once out of frame
            // at: absolute time the lane starts; atY: the lane starts when the camera focus reaches this y (region-local) (no change needed when the film length changes); z: road height (lanes on a bridge)
            // driveIn (fix item 36): instead of growing out of the ground, cars drive in from one side of the frame at the right time (see the start position of lane below)
            lane(name, y, v, {at = null, atY = null, z = 2.2, driveIn = false} = {}) {
                const laneItems = [];
                const lane = {y: y + oy, v, items: laneItems, at, atY: atY === null ? null : atY + oy, driveIn};
                movers.push({kind: "lane", lane});
                return {
                    add(obj, x0, {late = null} = {}) {
                        const {pivot} = place(root, obj, {x: x0, y: y + oy, z, yaw: v < 0 ? Math.PI : 0});
                        pending.push({pivot, obj, y: y + oy, lead: 0, dt: 0, fold: driveIn ? "drive" : "grow"});
                        laneItems.push({pivot, x0, late});
                    },
                };
            },
            // Power lines: only shown once both poles are standing (world coordinates)
            wire(a, b, sag, poles) {
                const m = wireMesh(a, b, sag);
                root.add(m);
                movers.push({kind: "wire", obj: m, poles});
            },
            // Longitudinal lane (an avenue along +Y): y(t) = y0 + v*(t - at), looping within [ya, yb]; within 8 mm of each end it grows out of / shrinks back into the ground, so nothing pops out of thin air
            ylane(name, x, v, {ya, yb, at = 0}) {
                const laneItems = [];
                movers.push({kind: "ylane", x, v, at, ya: ya + oy, yb: yb + oy, items: laneItems});
                return {
                    add(obj, y0) {
                        const {pivot, holder} = place(root, obj, {x, y: y0 + oy, z: 2.8, yaw: v > 0 ? Math.PI / 2 : -Math.PI / 2});
                        pending.push({pivot, obj, y: y0 + oy, lead: 0, dt: 0, fold: "grow", stay: 2000});
                        laneItems.push({pivot, holder, y0: y0 + oy});
                    },
                };
            },
        };
    }

    await preloadAtlases();   // fix item 17: atlases (generated image sheets) are only loaded when the atlas switch is on
    const regions = MAP.map(({mod, oy, tod}) => ({...mod.build(api(oy)), oy, tod}));

    // ---------- Camera and pop-up front ----------
    const track = makeTrack(KEYS);
    const samples = [];
    for (let t = 0; t <= T_END + 1e-6; t += 0.02) samples.push([t, track(t).tgt.y]);
    // Pop-up front: at the start it pushes up from the bottom edge of the frame (one beat of flat map first); after catching up to the area ahead of the camera it follows the camera.
    // LEAD changed from 175 to 130: things stand up in the upper-middle of the frame and go straight into the sharp band (the focus is FO ahead of the target point), so there is no waiting for the camera to push over before the focus catches up
    // Fix item 44: the fully flat opening shortened from about 1.7 s to about 0.7 s - the start of the front moved from 140 behind the target point to 40 behind, and it starts pushing forward on beat 2 (the first wanted star flips on)
    const LEAD = 130, START = samples[0][1] - 40, CASCADE = 105;
    const front = t => Math.min(track(t).tgt.y + LEAD, START + CASCADE * Math.max(0, t - BEAT));
    const frontSamples = [];
    for (let t = 0; t <= T_END + 30; t += 0.02) frontSamples.push([t, front(Math.min(t, T_END)) + (t > T_END ? (t - T_END) * CASCADE : 0)]);
    const popAt = y => (frontSamples.find(([, f]) => f >= y) ?? [T_END + 30])[0];
    // Fall over: only once the focus is 95 mm past it and it has already left the bottom edge of the frame (when the camera flies low and forward, nearby things do not fall over right in front of the viewer).
    // Items with stay < 0 fall over early on purpose (to clear the view); only the focus matters for them.
    const PASS = 95;
    const bottomY = t => {
        const k = track(t);
        const dx = k.tgt.x - k.pos.x, dy = k.tgt.y - k.pos.y, dz = k.tgt.z - k.pos.z;
        const hd = Math.hypot(dx, dy);
        const ang = Math.atan2(-dz, hd) + (k.fov / 2) * Math.PI / 180;
        return ang <= 0.02 ? k.pos.y : k.pos.y + (k.pos.z / Math.tan(ang)) * (dy / hd);
    };
    for (const s of samples) s.push(bottomY(s[0]));
    const downAt = (y, early = false) => {
        const hit = samples.find(([, ty, by]) => ty > y + PASS && (early || by > y + 4));
        return hit ? hit[0] : null;
    };
    const pops = new PopRegistry();
    const laneStart = new Map();
    // Snap pop-up times to the beat: ordinary things land on eighth notes (a group popping up on the same beat differs by only a few tens of ms within the group); region-name lettering lands on bar downbeats
    const onGrid = (raw, bar) => bar ? Math.max(BEAT, Math.round(raw / BAR) * BAR) : Math.round(raw / EIGHTH) * EIGHTH + R() * 0.035;
    for (const p of pending) {
        // at: an explicit absolute time (aimed at a beat in the song, e.g. the moment the drums come in); otherwise follow the pop-up front and snap to the beat
        p.t0 = p.at !== undefined ? p.at : onGrid(popAt(p.y - p.lead) + p.dt, p.onBar);
        p.down = downAt(p.y + (p.stay ?? 0), (p.stay ?? 0) < 0);
        pops.add(p.pivot, {t0: p.t0, fold: p.fold, freq: p.freq, damp: p.damp, down: p.down, sink: p.sink, hide: p.hide});
        // Neon switch-on time = neonDt seconds after this building stands up (the material reads this value when the art style initializes)
        if (p.neon && p.obj.userData.neon) p.obj.userData.neon.flicker = p.t0 + (p.neon.neonDt ?? 1.2);
    }
    // Fix item 13: wind field - things marked userData.wind (palms, shrubs, grass, cypress, umbrellas) sway gradually in the wind once settled; buildings, cars and boats stay still
    // Fix item 36: leaves open and umbrellas unfurl (starting 0.18 s after standing up, fully open at 0.35 s, with a little overshoot). Things without this flag stay open as they are
    for (const p of pending) if (p.obj.userData.unfold) {
        if (p.unfold) movers.push({kind: "unfold", fn: p.obj.userData.unfold, t0: p.t0});
        else p.obj.userData.unfold(1);
    }
    // Cars drive in from off screen: cars in one lane queue up off screen in order (start point 100 from the center line, 30 between cars) and catch up to their original positions within 1.4 s of the set time, keeping their order
    for (const m of movers) if (m.kind === "lane" && m.lane.driveIn) {
        const s = Math.sign(m.lane.v);
        const need = m.lane.items.filter(it => s * it.x0 < 90).sort((a, b) => s * (b.x0 - a.x0));
        need.forEach((it, j) => { it.start = -s * (100 + 30 * j); });
    }
    for (const p of pending) {
        const w = p.obj.userData.wind;
        if (!w) continue;
        const x = p.pivot.position.x, y = p.pivot.position.y;
        const ph = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        movers.push({kind: "wind", holder: p.pivot.children[0], t0: p.t0, down: p.down, x, y, amp: w.amp * Math.PI / 180,
            crown: w.crown ? p.obj.userData.crownGroup : null, crownAmp: (w.crown ?? 0) * Math.PI / 180, fronds: w.fronds ?? null,
            phase: (ph - Math.floor(ph)) * 6.28, w: 2.2 + (ph - Math.floor(ph)) * 1.6});
    }
    for (const m of movers) if (m.atYw !== undefined) m.at = (samples.find(([, ty]) => ty >= m.atYw) ?? [T_END])[0];
    // Movers that follow a given object's pop-up time (running out of a shop door, a police car rushing in, stars hopping to the beat): m.of = that object's pivot
    const t0Of = new Map(pending.map(p => [p.pivot, p.t0]));
    for (const m of movers) if (m.of) m.at = (t0Of.get(m.of) ?? 0) + (m.delay ?? 0);
    for (const m of movers) if (m.kind === "lane") {
        m.t0 = onGrid(popAt(m.lane.y), false);
        if (m.lane.atY !== null) m.lane.at = (samples.find(([, ty]) => ty >= m.lane.atY) ?? [T_END])[0] + 0.1;
    }

    // ---------- Time of day ----------
    const todAt = y => {
        let tod = regions[0].tod;
        for (let i = 0; i < regions.length - 1; i++) {
            const b = regions[i].y1 + regions[i].oy;
            tod = lerp(tod, regions[i + 1].tod, clamp((y - (b - 60)) / 150));
        }
        return tod;
    };

    // ---------- Sky dome, setting sun, clouds: follow the camera ----------
    const sky = makeSky();
    root.add(sky.group);
    const sun = K.sunDisc("sun", 110);
    sun.position.set(-70, 760, -60);
    sky.group.add(sun);
    const moon = K.moonDisc("moon", 40);
    moon.position.set(120, 900, 250);
    sky.group.add(moon);
    [[-200, 740, 80, 22, 10, 1], [110, 730, 105, 26, 40, 2], [-20, 750, 64, 18, 70, 3], [230, 700, 66, 18, -10, 4]].forEach(([x, y, w, h, z, s]) => {
        const c = K.cloud("cloud" + s, w, h, s);
        c.position.set(x, y, z);
        sky.group.add(c);
    });
    // Table (the wooden table outside the map paper, almost never visible)
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4000, 6000, 4), new THREE.MeshStandardMaterial({color: 0x6b4a5a, roughness: 0.8}));
    desk.position.set(0, 1000, -2.6);
    desk.receiveShadow = true;
    root.add(desk);
    const fog = new THREE.Fog(0xd8a2c2, 650, 1900);

    // ---------- Dust motes ----------
    const N = 420;
    const dust = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) seeds.push([R() * 360 - 180, R() * 420 - 200, 3 + R() * 70, R() * 6.28, 0.5 + R()]);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dot = sheet(1, 1, 32);
    const g = dot.ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    dot.ctx.fillStyle = g;
    dot.ctx.fillRect(0, 0, 32, 32);
    const dustMat = new THREE.PointsMaterial({color: new THREE.Color("#ffd6a8").multiplyScalar(2.2), size: 0.9, map: new THREE.CanvasTexture(dot.canvas),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false});
    root.add(new THREE.Points(dustGeo, dustMat));
    void [lin, grain];

    // ---------- Per frame ----------
    function view(t) {
        if (t >= 200) {
            const [position, target, fov] = VIEWS[clamp(Math.floor(t - 200), 0, VIEWS.length - 1)];
            return {pos: new THREE.Vector3(...position), tgt: new THREE.Vector3(...target), fov, band: 26, fo: 0};
        }
        return track(t);
    }
    // Focal plane: the point fo ahead of the target along the ground; take its depth along the view direction (the shader compares view-space depth, not straight-line distance)
    const _dir = new THREE.Vector3(), _f = new THREE.Vector3(), _h = new THREE.Vector3();
    function focusDepth(v) {
        _dir.subVectors(v.tgt, v.pos).normalize();
        _h.set(v.tgt.x - v.pos.x, v.tgt.y - v.pos.y, 0).normalize();
        _f.copy(v.tgt).addScaledVector(_h, v.fo).sub(v.pos);
        return Math.max(20, _f.dot(_dir));
    }
    const _p = new THREE.Vector3();
    function pulled(t, v) {
        let distance = focusDepth(v), band = v.band;
        if (t >= 200) return {distance, band};
        for (const p of PULLS) {
            const a = t - p.at;
            if (a < 0 || a > p.in + p.hold + p.out) continue;
            const f = a < p.in ? a / p.in : a < p.in + p.hold ? 1 : 1 - (a - p.in - p.hold) / p.out;
            const w = f * f * (3 - 2 * f);
            _dir.subVectors(v.tgt, v.pos).normalize();
            const d1 = _p.set(...p.point).sub(v.pos).dot(_dir);
            distance = lerp(distance, Math.max(20, d1), w);
            band = lerp(band, p.band ?? band, w);
        }
        return {distance, band};
    }
    function camera(t) {
        const v = view(t);
        const position = v.pos.toArray();
        position[2] += t < 200 ? Math.sin(t * 0.7) * 0.8 : 0;
        const target = v.tgt.toArray();
        const {distance, band} = pulled(t, v);
        return {position, target, up: [0, 0, 1], fov: v.fov, near: 2, far: 4000,
            focus: {distance, band, tilt: 0, maxBlur: 8}};   // blind review: max blur 10 -> 8
    }
    function state(t) {
        const v = view(t);
        return {t, tod: todAt(v.tgt.y), focus: v.tgt.toArray()};
    }
    function update({t, state: st, camera: cam}) {
        const tt = t >= 200 ? T_END : t;
        pops.update(t >= 200 ? 1e4 : t, {noDown: t >= 200});
        for (const m of movers) {
            if (m.kind === "lane") {
                for (const it of m.lane.items) {
                    let x = m.lane.at !== null ? it.x0 + m.lane.v * (tt - m.lane.at) : it.x0 + m.lane.v * Math.max(0, tt - m.t0);
                    if (it.start !== undefined) x += (it.start - it.x0) * (1 - smooth((tt - m.t0) / 1.4));
                    it.pivot.position.x = ((x + 290) % 580 + 580) % 580 - 290;
                    if (it.late !== null) it.pivot.visible = it.pivot.visible && tt >= m.t0 + it.late;
                }
            } else if (m.kind === "ylane") {
                const L = m.yb - m.ya;
                for (const it of m.items) {
                    const y = m.ya + (((it.y0 - m.ya + m.v * (tt - m.at)) % L) + L) % L;
                    it.pivot.position.y = y;
                    const edge = Math.min(y - m.ya, m.yb - y);
                    it.holder.scale.setScalar(Math.max(0.001, Math.min(1, edge / 8)));
                }
            } else if (m.kind === "dash") {
                // Dash along +Y over a stretch of road (no looping): at time "at" the car's nose is "gap" behind ya; within 8 mm of each end it grows out of / shrinks back into the ground
                const y = m.ya + m.v * (tt - m.at) - m.gap;
                m.obj.position.y = clamp(y, m.ya, m.yb);
                m.holder.scale.setScalar(Math.max(0.001, Math.min(1, Math.min(y - m.ya, m.yb - y) / 8)));
                if (y <= m.ya || y >= m.yb) m.obj.visible = false;   // not yet on the avenue / already driven out (the pop-up animation sets it visible again every frame)
            } else if (m.kind === "sway") {
                // Standee figures sway gently (the kind of unsteadiness a paper cutout has), so a row of people no longer looks nailed to the ground
                m.obj.rotation.y = Math.sin(tt * 1.7 + m.phase) * 0.035;
            } else if (m.kind === "fly") {
                // Low fly-by: a straight line along +x, with gentle bobbing and a slight wing tilt
                m.obj.position.x = m.x0 + m.v * (tt - (m.at ?? 0));
                m.obj.position.z = m.z0 + Math.sin(tt * 0.9) * 1.6;
                m.obj.rotation.x = Math.sin(tt * 0.7) * 0.05;
            } else if (m.kind === "flicker") {
                m.flames.forEach((f, k) => { f.scale.set(1, 1, 0.85 + 0.2 * Math.sin(tt * 11 + k * 2) + 0.08 * Math.sin(tt * 23 + k)); });
            } else if (m.kind === "wire") {
                m.obj.visible = m.poles.every(p => p.visible && Math.abs(p.rotation.x) < 0.06 && p.scale.z > 0.9);
            } else if (m.kind === "hover") {
                const a = tt * m.w + m.phase;
                m.obj.position.set(m.c[0] + Math.cos(a) * m.r, m.c[1] + Math.sin(a) * m.r * 0.6, m.c[2] + Math.sin(tt * 1.1) * 1.5);
                m.obj.rotation.z = a + Math.PI / 2;
                if (m.exit && t < 200) {
                    // Fly away: from at, accelerating from slow to fast (starting at speed 0 so it joins the circling smoothly), constant speed after dur; the nose turns toward the right as it goes
                    const f = (tt - m.exit.at) / m.exit.dur;
                    const e = f <= 0 ? 0 : f < 1 ? f * f : 2 * f - 1;
                    m.obj.position.x += m.exit.dx * e;
                    m.obj.position.z += m.exit.dz * e;
                    const hd = ((m.obj.rotation.z + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;   // nose heading 0 = facing +x
                    m.obj.rotation.z = lerp(hd, 0, smooth(f));
                }
                m.heli.userData.blades.rotation.z = tt * 41;
            } else if (m.kind === "heli") {
                const car = m.follow.parent.parent;   // follow is the car body; the two layers outside it are holder and pivot
                car.updateMatrixWorld(true);
                // maxY: stops and hangs in mid-air once it reaches here (after the ending was lengthened, past 48 s it still followed the car inward and at 50.3 s crashed into the tower at the end of the avenue, as reported by web_audit)
                const cx = car.position.x, cyy = Math.min(car.position.y, m.maxY ?? Infinity);
                const sway = Math.sin(tt * 0.9) * 3;
                m.obj.position.set(cx + m.offset[0] + sway, cyy + m.offset[1], m.offset[2] + Math.sin(tt * 1.3) * 1.2);
                m.obj.rotation.z = (m.yaw ?? 0.25) + Math.sin(tt * 0.5) * 0.08;
                m.heli.userData.blades.rotation.z = tt * 41;
                // Light cone points from the helicopter's belly at the car
                // The cone extends along its own -Y: first aim +Z at the car, then rotate -90 deg about X, and -Y points at the car
                const beam = m.heli.userData.beam;
                m.obj.updateMatrixWorld(true);
                beam.lookAt(cx + 2, cyy, 3);
                beam.rotateX(-Math.PI / 2);
                m.spot.position.set(cx + 2, cyy, 3.0);
                m.spot.visible = m.obj.visible && m.obj.scale.z > 0.5;
            } else if (m.kind === "boat") {
                m.obj.position.x = m.x0 + m.v * (tt - (m.at ?? 0));
                m.obj.position.z = Math.sin(tt * 3.1) * 0.35;
                m.obj.rotation.y = Math.sin(tt * 2.3) * 0.03;
            } else if (m.kind === "bob") {
                m.obj.position.z = 0.4 + Math.sin(tt * 1.7 + m.phase) * 0.2;
                // Swim rings spin with the water; boats (keepYaw) only sway gently around their original heading
                m.yaw0 ??= m.obj.rotation.z;
                m.obj.rotation.z = m.keepYaw ? m.yaw0 + Math.sin(tt * 0.4 + m.phase) * 0.04 : Math.sin(tt * 0.4 + m.phase) * 0.3;
            } else if (m.kind === "run") {
                // Run from a to b (leaving delay seconds after pop-up), hopping all the way
                const f = clamp((tt - m.at) / m.dur);
                m.obj.position.x = lerp(m.a[0], m.b[0], f);
                m.obj.position.y = lerp(m.a[1], m.b[1], f);
                m.holder.position.z = f > 0 && f < 1 ? Math.abs(Math.sin(f * m.dur * 9)) * 0.9 : 0;
            } else if (m.kind === "arrive") {
                // Police car rushes in: x0 -> x1, fast then slow, ending with a tail-flick sideways
                const f = clamp((tt - m.at) / m.dur), e = 1 - Math.pow(1 - f, 3);
                m.obj.position.x = lerp(m.x0, m.x1, e);
                m.obj.position.y = lerp(m.y0 ?? m.obj.position.y, m.y1 ?? m.obj.position.y, e);
                m.holder.rotation.z = lerp(m.yaw0, m.yaw1, Math.pow(f, 2.2));
            } else if (m.kind === "follow") {
                // Helicopter chases a target (airboat, fleeing speedboat)
                const tp = m.target.position;
                const sway = Math.sin(tt * 0.9 + m.phase) * 3;
                m.obj.position.set(tp.x + m.offset[0] + sway, tp.y + m.offset[1], m.offset[2] + Math.sin(tt * 1.3) * 1.2);
                m.obj.rotation.z = m.yaw + Math.sin(tt * 0.5) * 0.06;
                m.heli.userData.blades.rotation.z = tt * 41;
            } else if (m.kind === "flutter") {
                // Banknotes: thrown up from the mouth of the bag, flutter down spinning, and lie flat once landed
                const dt = tt - m.at;
                m.obj.visible = dt > 0;
                if (dt > 0) {
                    const tLand = m.tLand;
                    const d = Math.min(dt, tLand);
                    m.obj.position.set(m.p0[0] + m.v[0] * d + Math.sin(dt * 5 + m.phase) * 0.8 * (dt < tLand), m.p0[1] + m.v[1] * d,
                        Math.max(m.zg, m.p0[2] + m.v[2] * d - 4.5 * d * d));
                    const spin = dt < tLand ? dt : tLand;
                    m.obj.rotation.set(dt < tLand ? Math.sin(spin * 7 + m.phase) * 1.2 : 0, dt < tLand ? spin * 4 + m.phase : m.phase, spin * 2 + m.phase);
                }
            } else if (m.kind === "puffs") {
                // Burnout smoke: puffs come out of the rear wheel, drift backward, grow, then dissipate
                m.items.forEach((pf, k) => {
                    const u = ((tt * m.rate + k / m.items.length) % 1 + 1) % 1;
                    pf.position.set(m.base[0] - u * m.drift, m.base[1] + Math.sin(k * 2.3) * 1.5 * u, m.base[2] + u * m.rise);
                    pf.scale.setScalar(Math.max(0.001, Math.sin(Math.PI * Math.min(1, u * 1.15)) * m.size));
                });
            } else if (m.kind === "shake") {
                m.obj.rotation.z = m.yaw + Math.sin(tt * 37) * 0.025 + Math.sin(tt * 23) * 0.02;
                m.obj.position.y = Math.sin(tt * 31) * 0.15;
            } else if (m.kind === "dance") {
                // Dancing on a car roof (Leonida Man): a dip on every beat
                const ph = ((tt / BEAT) % 1 + 1) % 1;
                m.obj.position.z = m.z0 + Math.abs(Math.sin(ph * Math.PI)) * 0.7;
                m.obj.rotation.y = Math.sin(tt * Math.PI / BEAT) * 0.12;
            } else if (m.kind === "pulse") {
                // Wanted stars: once lit, a small hop on every beat
                const since = tt - m.at;
                const ph = since > 0 ? (since % BEAT) / BEAT : 1;
                m.obj.scale.setScalar(1 + 0.16 * Math.max(0, 1 - ph * 5));
            } else if (m.kind === "lovers") {
                // The closing couple (batch 16): hop0 -> hop1, each hopping hops times to get together (moving forward in the air, pausing on landing); from at, swap to the single sheet of the kiss,
                // the swap gets a gentle vertical squash-and-bounce, then the two sway slowly left and right together. The check cameras (t >= 200) show the kissing pose directly
                const kissing = t >= 200 || tt >= m.at;
                const f = clamp((tt - m.hop0) / (m.hop1 - m.hop0));
                const u = f * m.hops, n = Math.min(Math.floor(u), m.hops - 1), fr = f >= 1 ? 1 : u - n;
                for (const p of [m.man, m.woman]) {
                    p.holder.visible = !kissing;
                    p.pivot.position.x = lerp(p.x0, p.x1, (n + smooth(fr)) / m.hops);
                    p.holder.position.z = f > 0 && f < 1 ? 1.5 * 4 * fr * (1 - fr) : 0;
                }
                // Batch 17: from apart.at the kiss ends and they part - swap to the two hand-holding sheets, each hopping outward to x1; the kid hops up when kid.at pops up; on the cheer beat all three hop together
                const apart = m.apart && (t >= 200 || tt >= m.apart.at);
                m.kiss.visible = kissing && !apart;
                const since = t >= 200 ? 10 : tt - m.at;
                m.kiss.scale.set(1, 1, since > 0 ? 1 - 0.07 * Math.exp(-since * 7) * Math.cos(since * 22) : 1);
                m.kiss.rotation.y = since > 0 ? Math.sin(since * 1.6) * 0.025 * Math.min(1, since) : 0;
                if (m.apart) {
                    const g = t >= 200 ? 1 : clamp((tt - m.apart.at) / m.apart.dur);
                    const hopAt = (at, dur, h) => { const u = t >= 200 ? -1 : (tt - at) / dur; return u > 0 && u < 1 ? h * 4 * u * (1 - u) : 0; };
                    const cheer = hopAt(m.cheer, 0.32, 1.4);
                    for (const p of [m.apart.man, m.apart.woman]) {
                        p.holder.visible = apart;
                        p.pivot.position.x = lerp(p.x0, p.x1, smooth(g));
                        p.holder.position.z = (g > 0 && g < 1 ? 1.6 * 4 * g * (1 - g) : 0) + cheer;
                    }
                    m.kid.holder.position.z = hopAt(m.kid.at, 0.42, 3.2) + cheer;
                }
            } else if (m.kind === "cardSwap") {
                // Card flip: a is squashed horizontally into a line -> b unfolds from the line (star -> heart). If it really rotated about the vertical axis, when the star turned sideways its back half would poke into the sign behind it (reported by web_audit)
                const f = t >= 200 ? 1 : (tt - m.at) / m.dur;
                m.a.visible = f < 0.5;
                m.b.visible = f >= 0.5;
                m.a.userData.sx ??= m.a.scale.y;
                m.b.userData.sx ??= m.b.scale.y;
                m.a.scale.x = m.a.userData.sx * Math.max(0.02, f <= 0 ? 1 : Math.cos(smooth(f * 2) * Math.PI / 2));
                m.b.scale.x = m.b.userData.sx * Math.max(0.02, f >= 1 ? 1 : Math.sin(smooth((f - 0.5) * 2) * Math.PI / 2));
            } else if (m.kind === "halo") {
                // Glow behind the big heart (batch 18): from at0 it fades up softly to low over 0.6 s; from at1 (the big heart pops up) it is fully lit over 0.3 s, then swells gently with the heartbeat
                const f = t >= 200 ? 1 : tt < m.at1 ? m.low * smooth((tt - m.at0) / 0.6) : lerp(m.low, 1, smooth((tt - m.at1) / 0.3));
                const since = tt - m.at1 - 0.3, ph = since > 0 && t < 200 ? (since % BEAT) / BEAT : -1;
                m.mat.opacity = f * (1 + (ph >= 0 ? 0.12 * Math.exp(-ph * 16) : 0));
            } else if (m.kind === "blinkOn") {
                // Blink twice, then stay on (the light goes out / the dark patch covers it)
                const k = t >= 200 ? 1 : tt - m.at;
                m.obj.visible = k >= 0 && !(k > 0.08 && k < 0.16) && !(k > 0.24 && k < 0.3);
            } else if (m.kind === "heartbeat") {
                // The big heart goes "thump-thump" on every beat (one strong, one weak)
                const since = t >= 200 ? -1 : tt - m.at - 0.3;
                const ph = since > 0 ? (since % BEAT) / BEAT : -1;
                const env = x => x < 0 ? 0 : Math.exp(-x * 16);
                m.obj.scale.setScalar(since > 0 ? 1 + 0.06 * env(ph) + 0.035 * env(ph - 0.2) : 1);
            } else if (m.kind === "floatHeart") {
                // Small hearts: float up by rise from p0, swaying left and right, growing in first and shrinking away at the end
                const a = t >= 200 ? -1 : (tt - m.at) / m.life;
                m.obj.visible = a > 0 && a < 1;
                if (m.obj.visible) {
                    const e = 1 - (1 - a) * (1 - a);
                    m.obj.position.set(m.p0[0] + Math.sin(a * 5 + m.phase) * m.sway, m.p0[1], m.p0[2] + m.rise * e);
                    m.obj.scale.setScalar(Math.max(0.001, Math.min(1, a / 0.12) * (1 - smooth((a - 0.7) / 0.3))));
                    m.obj.rotation.y = Math.sin(a * 7 + m.phase) * 0.25;
                }
            } else if (m.kind === "leap") {
                // Dolphin leaps out of the water: jumps once every period seconds, in the air for air seconds, tracing an arc along x (head up first, pointing down on re-entry); a ring of splash on exit and on entry
                const {inner, splashes} = m.obj.userData.leap;
                const ph = ((tt + m.phase) % m.period + m.period) % m.period;
                const s = ph / m.air;
                inner.visible = s < 1;
                if (s < 1) {
                    inner.position.set(m.dir * m.len * (s - 0.5), 0, m.h * 4 * s * (1 - s) - 1.8);
                    inner.rotation.set(0, -m.dir * Math.atan2(m.h * 4 * (1 - 2 * s), m.len), m.dir < 0 ? Math.PI : 0);
                }
                splashes.forEach((c, k) => {
                    const d = ph - k * m.air, e = d > 0 && d < 0.45 ? Math.sin(d / 0.45 * Math.PI) : 0.001;
                    c.scale.set(e, e, e * 1.3);
                    c.position.x = m.dir * m.len * (k ? 0.5 : -0.5);
                });
            } else if (m.kind === "kayak") {
                // Kayak: paddling slowly forward, paddle alternating left and right
                const a = tt * 3.2 + m.phase;
                m.obj.position.x = m.x0 + m.v * tt;
                m.obj.position.z = Math.sin(tt * 2.2 + m.phase) * 0.12;
                m.paddle.rotation.x = Math.sin(a) * 0.55;
                m.paddle.position.z = 3.6 + Math.abs(Math.sin(a)) * 0.3;
            } else if (m.kind === "glide") {
                // Pelicans glide in a line: fly along x, flap a few times, then glide a while
                m.obj.position.x = m.x0 + m.v * tt;
                m.obj.position.z = m.z0 + Math.sin(tt * 0.8 + m.phase) * 1.2;
                const flap = (Math.sin(tt * 0.9 + m.phase) > 0.2 ? 0.5 : 0.06) * Math.sin(tt * 4.2 + m.phase);
                m.wings[0].rotation.x = flap;
                m.wings[1].rotation.x = -flap;
            } else if (m.kind === "siren") {
                // Police lights wash the city: from at, red and blue alternate on the beat (two quick flashes per beat), the lights follow the car and light the building faces on both sides of the avenue alternately red and blue
                const since = tt - m.at;
                const k = Math.floor(since / BEAT), ph = (since - k * BEAT) / BEAT;
                const env = x => x < 0 ? 0 : Math.exp(-x * 5);
                const flash = env(ph) + 0.8 * env(ph - 0.33);
                const p = m.follow.position;
                m.lights.forEach((L, i) => {
                    L.position.set(p.x + L.userData.off[0], p.y + L.userData.off[1], L.userData.off[2]);
                    L.intensity = t < 200 && since >= 0 && k % 2 === i ? m.I * flash : 0;
                });
            } else if (m.kind === "wind") {
                // tilt = amplitude x (steady wind 0.3 + gusts 0.7) x (its own small sway); fades in over 1.2 s starting 0.45 s after settling, and is removed as soon as it starts falling over
                const on = t >= 200 ? 1 : smooth((tt - m.t0 - 0.45) / 1.2) * (m.down === null ? 1 : 1 - smooth((tt - m.down) / 0.25));
                const G = gust(m.x, m.y, tt);
                const sway = (0.3 + 0.7 * G) * (1 + 0.35 * Math.sin(tt * m.w + m.phase));
                const th = m.amp * on * sway;
                m.holder.rotation.y = th * WIND[0];
                m.holder.rotation.x = -th * WIND[1];
                if (m.crown) {
                    const c = m.crownAmp * on * sway;
                    m.crown.rotation.y = c * WIND[0];
                    m.crown.rotation.x = -c * WIND[1];
                }
                if (m.fronds) m.fronds.forEach((f, k) => { f.rotation.y = (f.userData.base ?? f.userData.pitch0) + on * (0.025 + 0.05 * G) * Math.sin(tt * (2.4 + (k % 3) * 0.5) + k * 1.9 + m.phase); });
            } else if (m.kind === "unfold") {
                m.fn(t >= 200 ? 1 : Math.max(0, snapUp(tt - m.t0 - 0.18, {dur: 0.35, amp: 0.06, hz: 3.2})));
            } else if (m.kind === "ripple") {
                // Water ring: appears together with the thing it surrounds (opens over 0.45 s), then swells and shrinks gently
                const k = smooth((tt - m.at) / 0.45);
                m.obj.visible = k > 0.01;
                const sc = Math.max(0.001, k * (1 + 0.07 * Math.sin(tt * 1.7 + m.phase)));
                m.obj.scale.set(sc, sc, 1);
            } else if (m.kind === "glints") {
                // Paper-cut short-line sparkles: each extends and retracts on its own period, visible about 40% of the time
                for (const g of m.items) {
                    const e = Math.sin(2 * Math.PI * (tt / g.P + g.ph));
                    const k = e > 0 ? e * e * e : 0;
                    g.obj.visible = k > 0.03;
                    g.obj.scale.set(Math.max(0.001, k), 0.55 + 0.45 * k, 1);
                }
            } else if (m.kind === "flip") {
                // Star-shaped small flipper (the opening wanted bar): from at, over dur seconds it flips from back to front, lifting up as it flips (so it does not scrape the card underneath), wobbles slightly once settled, then hops gently on every beat
                const f = clamp((tt - m.at) / m.dur);
                const e = 1 - (1 - f) * (1 - f);
                const after = tt - m.at - m.dur;
                const tremor = after > 0 ? -0.16 * Math.exp(-after * 7) * Math.sin(after * 2 * Math.PI * 4.5) : 0;
                m.obj.rotation.y = Math.PI * (1 - e) + tremor;
                m.obj.position.z = m.z0 + Math.sin(Math.PI * f) * m.hop;
                const ph = after > 0 ? (after % BEAT) / BEAT : 1;
                m.obj.scale.setScalar(1 + 0.18 * Math.max(0, 1 - ph * 5));
            } else if (m.kind === "wave") {
                m.obj.position.x = Math.sin(tt * 0.6 + m.phase) * m.amp;
                m.obj.position.z = Math.sin(tt * 1.3 + m.phase) * 0.25;
            }
        }
        const p = todParams(st.tod);
        sky.group.position.copy(cam.position);
        sky.uniforms.top.value.setRGB(...p.sky[0], THREE.SRGBColorSpace);
        sky.uniforms.mid.value.setRGB(...p.sky[1], THREE.SRGBColorSpace);
        sky.uniforms.horizon.value.setRGB(...p.sky[2], THREE.SRGBColorSpace);
        sun.visible = st.tod > 0.8 && st.tod < 2.8;
        moon.visible = st.tod > 2.6;
        fog.color.setRGB(...p.fog, THREE.SRGBColorSpace);
        fog.near = p.fogNear;
        fog.far = p.fogFar;
        if (root.parent && root.parent.fog !== fog) root.parent.fog = fog;
        dustMat.color.setRGB(...p.dust, THREE.SRGBColorSpace).multiplyScalar(2.2);
        const [fx, fy] = st.focus;
        const pos = dustGeo.attributes.position;
        for (let i = 0; i < N; i++) {
            const [x, y, z, ph, sp] = seeds[i];
            pos.setXYZ(i, fx + x + Math.sin(tt * 0.3 * sp + ph) * 6, fy + y - 60 + tt * 2 * sp, z + Math.sin(tt * 0.5 + ph) * 3);
        }
        pos.needsUpdate = true;
    }
    // ---------- Clipping check: compare bounding boxes of standing objects pairwise (traffic sampled over time) ----------
    const nameOf = obj => {
        let n = obj.name;
        obj.traverse(o => { if (!n && o.userData?.paper?.id) n = o.userData.paper.id; });
        return n || "?";
    };
    const laneOf = new Map();
    for (const m of movers) if (m.kind === "lane") for (const it of m.lane.items) laneOf.set(it.pivot, m);
    const items = pending.flatMap(p => (p.obj.userData.cores ?? [p.obj.userData.core ?? p.obj]).map((core, k, all) =>
        ({pivot: p.pivot, name: nameOf(p.obj) + (all.length > 1 ? "#" + k : ""), t0: p.t0, down: p.down, core, soft: !!p.obj.userData.soft})));
    for (const p of pending) if (p.obj.userData.crownGroup) items.push({pivot: p.pivot, name: nameOf(p.obj) + ".crown", t0: p.t0, down: p.down, core: p.obj.userData.crownGroup, crown: true});
    // Debug: each object's pop-up / fall-over time (filter by name)
    window.leonidaTimes = (pat = "") => pending.map(p => [nameOf(p.obj), +p.t0.toFixed(2), p.down === null ? null : +p.down.toFixed(2)]).filter(([n]) => n.includes(pat));
    window.leonidaAudit = (times, shrink = 0.35) => {
        const hits = new Map();
        const dummy = {position: new THREE.Vector3()};
        for (const t of times) {
            update({t, state: state(t), camera: dummy});
            root.updateMatrixWorld(true);
            const boxes = [];
            for (const it of items) {
                if (!it.pivot.visible || t < it.t0 + 1.4 || (t < 200 && it.down !== null && t > it.down - 0.05)) continue;
                // Count only solid parts: things with userData.noAudit (light cones, light spots and the like) are not counted
                const b = new THREE.Box3();
                it.core.traverse(o => {
                    if (!o.isMesh || o.userData.noAudit || !o.visible) return;
                    o.geometry.computeBoundingBox();
                    b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
                });
                if (b.isEmpty()) continue;   // the whole thing is marked noAudit (buoys and the like): no solid to compare
                if (![b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite)) {
                    hits.set("NaN " + it.name, {t, overlap: [b.min.x, b.max.x], at: [0, 0, 0]});
                    continue;
                }
                const sz = b.getSize(new THREE.Vector3());
                const sh = new THREE.Vector3(Math.min(shrink, sz.x * 0.25), Math.min(shrink, sz.y * 0.25), Math.min(shrink, sz.z * 0.25));
                b.min.add(sh); b.max.sub(sh);
                boxes.push([it, b]);
            }
            for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
                const [a, A] = boxes[i], [b, B] = boxes[j];
                if (a.pivot === b.pivot) continue;
                if (a.soft && b.soft) continue;   // grass clumps poking into each other is natural
                if (!A.intersectsBox(B)) continue;
                const I = A.clone().intersect(B), s = I.getSize(new THREE.Vector3());
                const key = a.name + " × " + b.name;
                if (!hits.has(key)) hits.set(key, {t, overlap: [s.x, s.y, s.z].map(v => +v.toFixed(2)), at: I.getCenter(new THREE.Vector3()).toArray().map(v => +v.toFixed(1))});
            }
        }
        return [...hits].map(([k, v]) => ({pair: k, ...v}));
    };
    // Debug: do things that fall over (flip toward the camera, ending flat with their back showing) remain in frame during the fall and after they lie flat.
    // Returns each object's maximum fraction of the frame it occupies (bounding box projected to the screen and clipped to the frame) and the moment of that. Only counts things that fall over; things that grow (grow) and sink are not counted.
    window.leonidaFallView = (times, aspect = 0.75, minFrac = 0.004) => {
        const cam = new THREE.PerspectiveCamera(40, aspect, 2, 4000);
        const dummy = {position: new THREE.Vector3()};
        const worst = new Map();
        const v3 = new THREE.Vector3();
        for (const t of times) {
            update({t, state: state(t), camera: dummy});
            root.updateMatrixWorld(true);
            const c = camera(t);
            cam.fov = c.fov; cam.position.fromArray(c.position); cam.up.set(0, 0, 1);
            cam.lookAt(...c.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
            for (const p of pending) {
                if (p.fold === "grow" || p.sink || p.down === null || t <= p.down || !p.pivot.visible) continue;
                const b = new THREE.Box3();
                p.obj.traverse(o => {
                    if (!o.isMesh || !o.visible) return;
                    o.geometry.computeBoundingBox();
                    b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
                });
                if (b.isEmpty()) continue;
                let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, behind = false;
                for (let k = 0; k < 8; k++) {
                    v3.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z);
                    const d = v3.clone().applyMatrix4(cam.matrixWorldInverse);
                    if (d.z > -2) { behind = true; continue; }
                    v3.project(cam);
                    x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
                }
                if (x1 < x0) continue;
                const w = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)), h = Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
                const frac = (w * h) / 4;
                if (frac < minFrac) continue;
                const key = nameOf(p.obj) + "@" + p.y.toFixed(0);
                const prev = worst.get(key);
                if (!prev || frac > prev.frac) worst.set(key, {frac: +frac.toFixed(3), t: +t.toFixed(2), down: +p.down.toFixed(2),
                    first: prev?.first ?? +t.toFixed(2), behind, bottom: +Math.max(-1, y0).toFixed(2), top: +Math.min(1, y1).toFixed(2)});
                else prev.last = +t.toFixed(2);
            }
        }
        return [...worst].map(([k, v]) => ({name: k, ...v})).sort((a, b) => b.frac - a.frac);
    };
    // Fix item 3: object density - frame by frame, count the things standing in the frame (more than 0.3 s after settling, not yet fallen, bounding box projected into the frame) and the area they cover
    // (each clipped to the frame and then summed, mutual occlusion not de-duplicated, so area can exceed 1); sharp = number of items whose center falls inside the sharp band. Design rule C4: a frame must have no fewer than 30 items
    window.leonidaDensity = (times, aspect = 0.75) => {
        const cam = new THREE.PerspectiveCamera(40, aspect, 2, 4000);
        const dummy = {position: new THREE.Vector3()};
        const v3 = new THREE.Vector3(), dir = new THREE.Vector3(), ctr = new THREE.Vector3();
        return times.map(t => {
            update({t, state: state(t), camera: dummy});
            root.updateMatrixWorld(true);
            const c = camera(t);
            cam.fov = c.fov; cam.position.fromArray(c.position); cam.up.set(0, 0, 1);
            cam.lookAt(...c.target); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
            dir.fromArray(c.target).sub(cam.position).normalize();
            let n = 0, sharp = 0, area = 0;
            for (const p of pending) {
                if (t < 200 && (t < p.t0 + 0.3 || (p.down !== null && t > p.down))) continue;
                if (!p.pivot.visible) continue;
                const b = new THREE.Box3();
                p.obj.traverse(o => {
                    if (!o.isMesh || !o.visible) return;
                    o.geometry.computeBoundingBox();
                    b.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
                });
                if (b.isEmpty()) continue;
                let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
                for (let k = 0; k < 8; k++) {
                    v3.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z);
                    if (v3.clone().applyMatrix4(cam.matrixWorldInverse).z > -2) continue;
                    v3.project(cam);
                    x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
                }
                if (x1 < x0) continue;
                const w = Math.max(0, Math.min(1, x1) - Math.max(-1, x0)), h = Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
                const frac = (w * h) / 4;
                if (frac < 0.0003) continue;
                n++;
                area += frac;
                b.getCenter(ctr);
                if (Math.abs(ctr.sub(cam.position).dot(dir) - c.focus.distance) < c.focus.band) sharp++;
            }
            return {t, n, sharp, area: +area.toFixed(3)};
        });
    };
    return {root, camera, update, state};
}
