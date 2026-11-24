// The finishing touch of the ending (batch 16, author 11-24: "a man and a woman ... embracing and kissing, a heart pops up ... the final freeze-frame has a finishing touch").
// The two people who have appeared all along (outlines of the clothing of jasonHeist / luciaHeist: backward cap, tank top, cargo shorts / high ponytail, big hoop earrings, denim shorts),
// step onto the wanted sign on the rooftop for the ending, drawn as silhouettes only - no faces, and no likeness of the official characters.
// The silhouettes are dark purple paper (not pure black), with a ring of pink rim light (emissive) around the edge so they read against the night sky; once the big heart behind them lights up, they become backlit silhouettes.
// Drawing: millimeter coordinates, y up, people facing +x; the woman is mirrored left-right after drawing (facing -x). All in one color, so overlapping pieces make one whole silhouette.
import * as THREE from "three";
import {cutout, standUp, makeCanvas} from "./kit.js";
import {sheet, lit, rgba, finish, grain, ellipse, capsule, poly, fitFont} from "./paint.js";
import {neonText} from "./paint_city.js";
import {WANTED, paintHeatIcons} from "./props_story.js";

const PPM = 30;
// Rim light v1 (0.32 mm, intensity 1.7) went past the bloom threshold: a ring of pink haze around the people and the silhouettes turned into two glowing lines; now half as thin and held below the threshold
const INK = "#2a1d40", RIM = "#ff9fd8", RIM_W = 0.17, RIM_I = 0.95;

// ---------- Helpers: draw in millimeter, y-up coordinates ----------
// Per person: feet = midpoint of the soles (mm, x in the canvas coordinate system), mirror = -1 faces left; lean = the whole body leaning forward about the soles (radians, positive = toward the face side)
function figure(ctx, ppm, baseY, feet, mirror, lean, draw) {
    ctx.save();
    ctx.translate(feet * ppm, baseY);
    ctx.scale(mirror * ppm, -ppm);
    ctx.rotate(-lean);
    draw(ctx);
    ctx.restore();
}
// Rotate around a point (head lowered, chin raised)
function about(ctx, x, y, a, draw) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.translate(-x, -y);
    draw();
    ctx.restore();
}
const fillAll = (ctx, ...paths) => paths.forEach(p => ctx.fill(p));
function curve(pts) {   // polyline -> closed smooth shape joined by quadratic curves through the midpoints
    const p = new Path2D();
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
        const c = pts[i], nx = mid(c, pts[(i + 1) % n]);
        p.quadraticCurveTo(c[0], c[1], nx[0], nx[1]);
    }
    p.closePath();
    return p;
}

// ---------- Profile face (mm, facing +x): forehead, brow ridge, nose tip, upper lip, lower lip, chin; NECK is the point the head pivots about when lowering / raising; LIPS is where the two meet ----------
const MAN_NECK = [0.2, 14.35], WOMAN_NECK = [0.12, 12.85];
const MAN_FACE = [[0.4, 16.85], [0.98, 16.5], [1.15, 16.05], [1.08, 15.85], [1.55, 15.38], [1.2, 15.22], [1.3, 15.05], [1.18, 14.95], [1.27, 14.83],
    [1.12, 14.66], [1.17, 14.45], [0.8, 14.22], [0.2, 14.35], [-0.2, 15.2]];   // slightly thicker chin: stubble
const WOMAN_FACE = [[0.45, 15.15], [0.88, 14.85], [1.02, 14.45], [0.98, 14.25], [1.35, 13.86], [1.07, 13.7], [1.16, 13.53], [1.04, 13.44], [1.12, 13.31],
    [0.98, 13.17], [0.94, 12.98], [0.55, 12.84], [0.1, 12.95], [-0.2, 13.8]];
const MAN_LIPS = [1.3, 14.97], WOMAN_LIPS = [1.16, 13.47];
const rotP = ([x, y], a, [cx, cy] = [0, 0]) => {
    const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
};

// ---------- Man: backward cap, short beard, tank top (broad shoulders, thick arms), below-the-knee cargo shorts, sneakers ----------
// pose: stand (standing, one foot forward) / kiss (leaning forward, head lowered, one hand around her waist: hand = position of the hand in his own coordinates)
function drawMan(ctx, {pose = "stand", headTilt = 0, hand = null} = {}) {
    // Legs: back leg, front leg (the shorts reach below the knee, trouser legs a size thicker than the shins)
    // v1 was too thin: shrunk into the frame they looked like two matchsticks - limbs thickened, stride widened, head slightly bigger (a big head is what makes a small figure read as a person)
    const legs = pose === "kiss" ? [[-0.25, -0.5, -0.85], [0.25, 0.6, 0.55]] : [[-0.2, -0.6, -1.05], [0.25, 0.95, 0.9]];
    for (const [hx, kx, ax] of legs) {
        fillAll(ctx, capsule(hx, 8.7, kx, 4.9, 0.92, 0.8), capsule(kx, 4.9, ax, 0.75, 0.6, 0.34));
        ctx.fill(poly([[kx - 0.84, 5.6], [kx + 0.84, 5.6], [kx + 0.9, 4.6], [kx - 0.9, 4.6]]));   // trouser cuff
    }
    ctx.fill(roundFoot(legs[0][2] - 0.65, 1.8));
    ctx.fill(roundFoot(legs[1][2] - 0.3, 1.85));
    // Hips, top edge of the shorts
    ctx.fill(curve([[-0.95, 9.9], [0.8, 9.9], [0.95, 8.0], [-1.0, 7.9]]));
    // Torso: back slightly arched, chest bulging
    ctx.fill(curve([[-0.85, 9.5], [-0.8, 10.4], [-1.0, 11.4], [-1.1, 12.7], [-0.8, 13.75], [-0.15, 14.05], [0.5, 13.9], [1.0, 13.25],
        [1.15, 12.35], [0.9, 11.85], [0.85, 10.6], [0.72, 9.5]]));
    // Neck (thick)
    ctx.fill(capsule(0.05, 13.6, 0.25, 14.6, 0.52, 0.48));
    // Head: rotates about the neck when lowered. In v1 the center of the skull circle was too far forward, so the face barely stuck out of the skull circle, and when the two came close the whole profile was swallowed up -
    // now the skull sits further back, so the whole profile - forehead, nose, lips, chin - sticks out
    about(ctx, ...MAN_NECK, -headTilt, () => {
        ctx.fill(curve([[0.25, 14.35], [-0.45, 14.5], [-1.1, 14.95], [-1.32, 15.7], [-1.12, 16.5], [-0.45, 16.92], [0.45, 16.88], [1.0, 16.5], [1.15, 15.9], [0.9, 14.6]]));
        ctx.fill(poly(MAN_FACE));
        // Backward baseball cap: the crown covers the top of the head, the brim sticks out backward
        const cap = new Path2D();
        cap.ellipse(-0.2, 16.1, 1.2, 0.92, 0, 0, Math.PI);
        cap.closePath();
        ctx.fill(cap);
        ctx.fill(poly([[-1.1, 16.4], [-2.15, 16.2], [-2.15, 15.98], [-1.15, 16.05]]));
    });
    // Arms (thick): a deltoid bump at the shoulder
    ctx.fill(ellipse(0.0, 13.15, 0.8, 0.86));
    if (pose === "kiss" && hand) {
        // Forearm reaches over to hold her waist: palm vertical against the small of her back (fingers pointing down)
        fillAll(ctx, capsule(0.0, 13.1, 0.95, 11.3, 0.7, 0.56), capsule(0.95, 11.3, hand[0] - 0.2, hand[1] + 0.1, 0.54, 0.4), ellipse(hand[0], hand[1] - 0.15, 0.32, 0.55, 0.25));
    } else if (pose === "hold" && hand) {
        // Family of three: arm reaches forward and down, holding the kid's raised hand
        const el = [hand[0] * 0.42 + 0.1, (13.1 + hand[1]) / 2 - 0.15];
        fillAll(ctx, capsule(0.0, 13.1, el[0], el[1], 0.7, 0.56), capsule(el[0], el[1], hand[0], hand[1], 0.52, 0.38), ellipse(hand[0], hand[1], 0.42, 0.4));
    } else {
        // Arm reaches toward her (hand in front of the waist, empty space below): a hanging arm leaves a small hole between arm and torso, which looks like noise when scaled down
        fillAll(ctx, capsule(0.0, 13.1, 0.85, 11.6, 0.7, 0.56), capsule(0.85, 11.6, 2.05, 11.15, 0.52, 0.38), ellipse(2.35, 11.1, 0.5, 0.36, 0.2));
    }
}
function roundFoot(x0, len) {   // sneaker: round at the front, a squarer heel
    const p = new Path2D();
    p.roundRect(x0, 0, len, 0.78, [0.15, 0.4, 0.3, 0.1]);
    return p;
}

// ---------- Woman: high ponytail, big hoop earrings, tank top, denim shorts, sneakers ----------
// pose: stand / kiss (on tiptoe by raise, back leg kicked up behind, chin raised, one hand on his chest: hand = position of her hand in her own coordinates)
function drawWoman(ctx, {pose = "stand", headTilt = 0, raise = 0, hand = null, tail = 0} = {}) {
    const up = raise;
    if (pose === "kiss") {
        // Standing leg: on tiptoe
        fillAll(ctx, capsule(0.15, 7.7 + up, 0.25, 4.4 + up, 0.72, 0.52), capsule(0.25, 4.4 + up, 0.15, 0.75 + up * 0.55, 0.5, 0.3));
        ctx.fill(poly([[0.95, 0], [0.45, 0.02], [-0.3, 1.15 + up * 0.3], [-0.2, 1.6 + up * 0.35], [0.45, 1.4 + up * 0.3], [1.1, 0.35]]));
        // Leg kicked up behind (the classic "foot pop")
        fillAll(ctx, capsule(-0.15, 7.7 + up, -0.45, 4.7 + up, 0.7, 0.5), capsule(-0.45, 4.7 + up, -2.75, 5.9 + up, 0.5, 0.31));
        ctx.fill(poly([[-2.55, 6.3 + up], [-3.1, 6.1 + up], [-3.6, 4.95 + up], [-3.15, 4.78 + up], [-2.6, 5.6 + up]]));
    } else {
        for (const [hx, kx, ax] of [[-0.2, -0.5, -0.85], [0.2, 0.75, 0.7]]) fillAll(ctx, capsule(hx, 7.7, kx, 4.4, 0.72, 0.52), capsule(kx, 4.4, ax, 0.7, 0.5, 0.3));
        ctx.fill(roundFoot(-1.4, 1.6));
        ctx.fill(roundFoot(0.35, 1.6));
    }
    ctx.save();
    ctx.translate(0, up);
    // Denim shorts (very short)
    ctx.fill(curve([[-0.85, 9.25], [-1.1, 8.3], [-1.0, 7.05], [0.72, 7.05], [0.78, 8.4], [0.55, 9.25]]));
    // Torso: narrow waist
    ctx.fill(curve([[-0.62, 9.1], [-0.75, 10.4], [-0.82, 11.6], [-0.55, 12.3], [-0.1, 12.5], [0.32, 12.38], [0.62, 11.9], [0.98, 11.2], [0.78, 10.55], [0.5, 9.9], [0.5, 9.1]]));
    ctx.fill(capsule(0.0, 12.2, 0.15, 13.1, 0.31, 0.29));
    about(ctx, ...WOMAN_NECK, headTilt, () => {
        // Head (with hair): the back of the head is set further back so the whole profile sticks out; the high ponytail swings backward
        ctx.fill(curve([[0.15, 12.9], [-0.4, 13.05], [-1.02, 13.5], [-1.22, 14.25], [-1.0, 14.95], [-0.38, 15.35], [0.35, 15.3], [0.82, 14.98], [1.0, 14.4], [0.85, 13.1]]));
        ctx.fill(poly(WOMAN_FACE));
        ctx.fill(ellipse(-0.78, 15.12, 0.36, 0.32));
        const sw = tail;   // how far the ponytail swings out (0 hanging, 1 blowing backward)
        const p = new Path2D();
        p.moveTo(-0.66, 15.38);
        p.bezierCurveTo(-1.6, 15.65 + sw * 0.2, -2.5 - sw * 0.5, 14.4 + sw * 0.5, -1.9 - sw * 1.1, 11.95 + sw * 1.4);
        p.bezierCurveTo(-2.0 - sw * 0.6, 13.3 + sw * 0.9, -1.5 - sw * 0.2, 14.55, -0.78, 14.82);
        p.closePath();
        ctx.fill(p);
        // Big hoop earrings: hang below the earlobe; the part that shows behind the chin reads as a hoop (hollow in the middle)
        ctx.lineWidth = 0.15;
        ctx.beginPath();
        ctx.ellipse(-0.32, 13.15, 0.42, 0.48, 0, 0, Math.PI * 2);
        ctx.stroke();
    });
    // Arms (slim)
    if (pose === "kiss" && hand) {
        // Hand on his chest: the arm hangs from the shoulder with the elbow forward, the hand raised to his chest (between the two chests, without touching the empty space under his chin)
        fillAll(ctx, capsule(-0.05, 11.95, 0.55, 10.55, 0.42, 0.35), capsule(0.55, 10.55, hand[0], hand[1] - up, 0.34, 0.26), ellipse(hand[0], hand[1] - up, 0.3, 0.4, 0.4));
    } else if (pose === "hold" && hand) {
        // Family of three: arm reaches forward and down, holding the kid's hand
        const el = [hand[0] * 0.45 + 0.05, (11.95 + hand[1] - up) / 2 - 0.1];
        fillAll(ctx, capsule(-0.05, 11.95, el[0], el[1], 0.42, 0.35), capsule(el[0], el[1], hand[0], hand[1] - up, 0.34, 0.27), ellipse(hand[0], hand[1] - up, 0.32, 0.3));
    } else {
        // One hand on hip: elbow sticks out backward, so the arm still reads in profile
        fillAll(ctx, capsule(-0.05, 11.95, -1.15, 10.45, 0.42, 0.35), capsule(-1.15, 10.45, -0.5, 9.15, 0.34, 0.27), ellipse(-0.42, 9.1, 0.32, 0.26));
    }
    ctx.restore();
}

// Silhouette -> paper canvas (dark purple + slightly lighter on top and darker below + paper grain) and emissive canvas (a ring of pink rim light along the outer edge)
function finishSilhouette(s, rimW) {
    const {canvas, ctx, W, H} = s;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a1e42");
    g.addColorStop(1, "#18112a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    grain(ctx, 0.05);
    // rim light = silhouette - the silhouette shrunk inward by one ring
    const em = makeCanvas(W, H), e = em.getContext("2d");
    e.drawImage(canvas, 0, 0);
    e.globalCompositeOperation = "source-in";
    e.fillStyle = RIM;
    e.fillRect(0, 0, W, H);
    const inner = makeCanvas(W, H), n = inner.getContext("2d");
    n.drawImage(canvas, 0, 0);
    n.globalCompositeOperation = "destination-in";
    for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2;
        n.drawImage(canvas, Math.cos(a) * rimW, Math.sin(a) * rimW);
    }
    e.globalCompositeOperation = "destination-out";
    e.drawImage(inner, 0, 0);
    // The base color of the emissive canvas must be black
    const out = makeCanvas(W, H), o = out.getContext("2d");
    o.fillStyle = "#000";
    o.fillRect(0, 0, W, H);
    o.drawImage(em, 0, 0);
    return out;
}
function silhouetteCard(id, s) {
    const emissive = finishSilhouette(s, s.mm(RIM_W));
    const m = cutout(s.canvas, {id, ppm: PPM, thickness: 0.7, emissive, emissiveIntensity: RIM_I, trace: {cell: 2, dilate: 1}, back: INK, edge: "#efe3d3"});
    m.userData.noAudit = true;
    const g = standUp(m);
    g.userData.size = m.userData.size;
    return g;
}

// ---------- Placement (mm): the lips touch exactly when the two sets of soles are GAP apart (see kissLayout) ----------
export const LOVERS = {
    man: {lean: 0.06, tilt: 0.3},           // leans forward about 3.5 deg, head lowered about 17 deg
    woman: {lean: 0.09, tilt: 0.3},         // leans forward about 5 deg, chin raised 17 deg; how high the tiptoe is and how far apart the soles are is computed by kissLayout
};
// Kiss placement: computed from the two profiles - tiptoe until the two mouths are at the same height, with the soles apart by exactly the amount that makes the lips touch (overlap of 0.08); where each hand lands on the other person is also converted here
function kissLayout() {
    const {man: M, woman: F} = LOVERS;
    const manAt = (p, head) => rotP(head ? rotP(p, -M.tilt, MAN_NECK) : p, -M.lean);
    const womanAt = (p, head, up) => { const q = head ? rotP(p, F.tilt, WOMAN_NECK) : [...p]; q[1] += up; return rotP(q, -F.lean); };
    const lm = manAt(MAN_LIPS, true);
    const raise = Math.min(1.4, Math.max(0.3, lm[1] - womanAt(WOMAN_LIPS, true, 0)[1]));
    const lw = womanAt(WOMAN_LIPS, true, raise);
    const gap = lm[0] + lw[0] - 0.08;
    // World coordinates (origin at the midpoint of the two) <-> each person's own coordinates
    const fromMan = p => { const q = manAt(p, false); return [q[0] - gap / 2, q[1]]; };
    const fromWoman = p => { const q = womanAt(p, false, raise); return [gap / 2 - q[0], q[1]]; };
    const toMan = ([x, y]) => rotP([x + gap / 2, y], M.lean);
    const toWoman = ([x, y]) => rotP([gap / 2 - x, y], F.lean);
    const manHand = toMan(fromWoman([-0.62 - 0.1, 10.3]));    // his hand: wraps around her lower back, only one hand shows (v1 stuck out 0.4 and looked like a stick lying across her back)
    const womanHand = toWoman(fromMan([1.0, 12.5]));            // her hand: on his chest
    return {gap, raise, manHand, womanHand};
}
const LAYOUT = kissLayout();
LOVERS.gap = LOVERS.standGap = LAYOUT.gap;   // when standing close they also stop at this distance: feet do not shift when swapping to the kissing pose
const CANVAS_H = 18.2, MARGIN = 0.4;

// One standing person (a single sheet): canvas 8 mm wide, soles at the midpoint of the bottom edge
export function standingSheet(who) {
    const s = sheet(8, CANVAS_H, PPM);
    const base = s.H - s.mm(MARGIN);
    s.ctx.fillStyle = INK;
    s.ctx.strokeStyle = INK;
    if (who === "man") figure(s.ctx, PPM, base, 4, 1, 0, c => drawMan(c));
    else figure(s.ctx, PPM, base, 4, -1, 0, c => drawWoman(c, {tail: 0.15}));
    return s;
}
export function loverStanding(id, who) {
    // The canvas bottom edge has a MARGIN: the origin of the cutout is at the bottom edge of the canvas, so shift down to the soles
    const g = silhouetteCard(id, standingSheet(who));
    g.children[0].position.z = -MARGIN;
    return g;
}
export function kissSheet() {
    const {gap, man: M, woman: F} = LOVERS;
    const w = 16;
    const s = sheet(w, CANVAS_H, PPM);
    const base = s.H - s.mm(MARGIN);
    s.ctx.fillStyle = INK;
    s.ctx.strokeStyle = INK;
    const xm = w / 2 - gap / 2, xf = w / 2 + gap / 2;
    // His hand wraps behind her (her back is on the +x side); her hand hooks around the back of his neck. Both hand positions are converted into each person's own coordinates
    figure(s.ctx, PPM, base, xm, 1, M.lean, c => drawMan(c, {pose: "kiss", headTilt: M.tilt, hand: LAYOUT.manHand}));
    figure(s.ctx, PPM, base, xf, -1, F.lean, c => drawWoman(c, {pose: "kiss", headTilt: F.tilt, raise: LAYOUT.raise, hand: LAYOUT.womanHand, tail: 0.8}));
    return s;
}
// The kissing pair (one whole sheet): origin between the two, at sole height
export function loversKiss(id) {
    const g = silhouetteCard(id, kissSheet());
    g.children[0].position.z = -MARGIN;
    return g;
}

// ---------- Family of three (batch 17, author 11-24: continuing from the "best ending" - the two reunite, a family of three, no spoilers) ----------
// The two adults stay in profile, facing the kid, each reaching one hand forward and down; the kid is front-facing, with both hands raised in a V to hold theirs (the "one, two, three, swing!" kind of pose).
// The kid must read at a glance as a kid, not a small animal: big head (about a quarter of body height), short legs, T-shirt, shorts, sneakers, small ears on the sides of the head, a tuft of hair sticking up on top.
export const FAMILY = {kidHand: [3.3, 9.1], adultHand: [2.2, 9.1]};
FAMILY.spread = FAMILY.kidHand[0] + FAMILY.adultHand[0];   // how far the adults' soles are from the kid's center line: the two hands overlap exactly
export function holdingSheet(who) {
    const s = sheet(8, CANVAS_H, PPM);
    const base = s.H - s.mm(MARGIN);
    s.ctx.fillStyle = INK;
    s.ctx.strokeStyle = INK;
    if (who === "man") figure(s.ctx, PPM, base, 4, 1, 0, c => drawMan(c, {pose: "hold", headTilt: 0.22, hand: FAMILY.adultHand}));
    else figure(s.ctx, PPM, base, 4, -1, 0, c => drawWoman(c, {pose: "hold", headTilt: -0.18, hand: FAMILY.adultHand, tail: 0.3}));
    return s;
}
export function loverHolding(id, who) {
    const g = silhouetteCard(id, holdingSheet(who));
    g.children[0].position.z = -MARGIN;
    return g;
}
export function kidSheet() {
    const s = sheet(8.6, 12, PPM);
    const base = s.H - s.mm(MARGIN);
    s.ctx.fillStyle = INK;
    figure(s.ctx, PPM, base, 4.3, 1, 0, c => {
        for (const sx of [-1, 1]) {
            fillAll(c, capsule(sx * 0.55, 4.0, sx * 0.72, 0.6, 0.56, 0.42), ellipse(sx * 0.9, 0.32, 0.66, 0.36));   // legs, sneakers (toes pointing slightly outward)
            fillAll(c, capsule(sx * 1.25, 6.85, sx * 2.25, 7.85, 0.4, 0.34), capsule(sx * 2.25, 7.85, sx * 3.2, 8.95, 0.34, 0.3), ellipse(sx * 3.3, 9.1, 0.38, 0.4));   // arms raised in a V
            c.fill(poly([[sx * 1.2, 7.25], [sx * 1.95, 6.85], [sx * 1.75, 6.25], [sx * 1.35, 6.4]]));   // T-shirt short sleeve
            c.fill(ellipse(sx * 1.33, 8.8, 0.28, 0.36));   // ear (small, on the side of the head)
        }
        c.fill(poly([[-1.4, 4.85], [1.4, 4.85], [1.55, 2.95], [0.12, 2.95], [0, 3.6], [-0.12, 2.95], [-1.55, 2.95]]));   // shorts
        c.fill(curve([[-1.3, 4.6], [1.3, 4.6], [1.45, 6.4], [1.15, 7.3], [-1.15, 7.3], [-1.45, 6.4]]));   // T-shirt
        c.fill(capsule(0, 7.1, 0, 7.7, 0.4, 0.38));
        c.fill(ellipse(0, 8.85, 1.36, 1.44));   // big head
        // a tuft of hair sticking up on top
        const tuft = new Path2D();
        tuft.moveTo(-0.35, 10.1);
        tuft.quadraticCurveTo(0.0, 10.95, 0.65, 10.75);
        tuft.quadraticCurveTo(0.25, 10.55, 0.4, 10.1);
        tuft.closePath();
        c.fill(tuft);
    });
    return s;
}
export function kidCard(id) {
    const g = silhouetteCard(id, kidSheet());
    g.children[0].position.z = -MARGIN;
    return g;
}
// "HOT TOGETHER": a row of neon 3D letters on the rooftop below the wanted sign (done the same way as the OCEAN VIEW one: Bahnschrift letters + a crossbar underneath joining them into one piece).
// The title of the second trailer's song, and also the name of the top tier of the two people's relationship. neonT: switch-on time (before that the tubes are dark; they flash a few times over 0.75 s and then stay lit)
export function hotTogetherSign(id, neonT, {w = 30, h = 6.2, color = "#ff6fb8"} = {}) {
    const ppm = 24;
    const rs = sheet(w, h, ppm), re = sheet(w, h, ppm);
    re.ctx.fillStyle = "#000";
    re.ctx.fillRect(0, 0, re.W, re.H);
    rs.ctx.fillStyle = "#5b4f7a";
    rs.ctx.fillRect(rs.mm(1), rs.H - rs.mm(1.2), rs.W - rs.mm(2), rs.mm(0.6));
    for (let x = rs.mm(2); x < rs.W - rs.mm(1); x += rs.mm(4)) rs.ctx.fillRect(x, rs.H - rs.mm(1.2), rs.mm(0.4), rs.mm(1.2));
    const text = "HOT  TOGETHER", font = s => `800 ${s}px "Bahnschrift", sans-serif`;   // two spaces: with one space the two words nearly stick together
    const size = fitFont(rs.ctx, text, rs.mm(h * 0.66), rs.W - rs.mm(2.4), font);
    neonText(rs.ctx, re.ctx, text, rs.W / 2, rs.H - rs.mm(1.6), size, color, "Bahnschrift", "800", {glow: 0.6});
    const solid = makeCanvas(rs.W, rs.H), sc = solid.getContext("2d");
    sc.font = font(size);
    sc.textAlign = "center";
    sc.lineJoin = "round";
    sc.lineWidth = rs.mm(1.1);
    sc.strokeStyle = "#3c2a48";
    sc.strokeText(text, rs.W / 2, rs.H - rs.mm(1.6));
    sc.fillStyle = "#3c2a48";
    sc.fillText(text, rs.W / 2, rs.H - rs.mm(1.6));
    sc.drawImage(rs.canvas, 0, 0);
    const mesh = cutout(solid, {id, ppm, thickness: 0.8, emissive: re.canvas, emissiveIntensity: 2.4, trace: {cell: 2, dilate: 1}});
    mesh.userData.paper.meta.mat.front.neon = {flicker: neonT};
    mesh.userData.noAudit = true;
    return standUp(mesh);
}

// ---------- Heart ----------
export function heartPath(cx, cy, w) {
    // Classic parametric heart: x = 16 sin^3 t, y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t (width 32, height about 29); cy = vertical midpoint of the heart
    const p = new Path2D(), k = w / 32;
    for (let i = 0; i <= 96; i++) {
        const t = i / 96 * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const px = cx + x * k, py = cy - (y + 2.6) * k;
        if (i) p.lineTo(px, py); else p.moveTo(px, py);
    }
    p.closePath();
    return p;
}
// The big heart that pops up behind them: pink cardstock + a ring of neon tube; the cut edges show the white paper core
// Batch 18 (author: the silhouettes must be solid dark): the tube's original emissive 1.6 x night-time neon 1.6 went past the bloom threshold, and the bloom spilled over the people in front -
// the two looked washed with pink, and the tube looked like it was shining out of the man's body. Now the emissive is held below the threshold (no bloom spilling out), and the tube's glow is painted directly on the paper face of the heart
// (the people in front block it naturally); the glow outside the edge of the heart uses a separate glow patch behind it (loveHalo). The heart also no longer receives the shadow cast by the people (that pink shadow looked like a double image).
// (Batch 17 tried dimming the whole heart to make the silhouettes darker: the heart turned a dull gray-purple and the silhouettes stood out even less - the contrast of the silhouettes depends on the heart being bright enough)
export function bigHeart(id, w = 34) {
    const h = w * 0.93;
    const ppm = Math.max(16, Math.round(560 / w));   // when the heart is smaller the canvas precision goes up with it, so the tube does not blur
    const s = sheet(w + 2, h + 2, ppm), e = sheet(w + 2, h + 2, ppm);
    const {ctx, mm, W, H} = s;
    const path = heartPath(W / 2, H / 2, mm(w));
    // Make the dark-side crescent narrower: at 0.047 of the width it left a wide dark band along the lower right edge, which after shrinking looked like an extra ring of double image on the heart
    lit(ctx, path, "#ff5aa8", {shade: "#9a2a78", shadeA: 0.4, sw: mm(w * 0.022), rim: "#ffd0e4", rimA: 0.9, rw: mm(w * 0.015)});
    ctx.save();
    ctx.clip(path);
    const rg = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.55);
    rg.addColorStop(0, rgba("#ffe6f3", 0.45));
    rg.addColorStop(1, rgba("#ffe6f3", 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    // Neon tube: a thin tube in a heart shape shrunk inward by one ring; the glow is painted on the paper face (shadowBlur), only inside the heart
    const tube = heartPath(W / 2, H / 2 + mm(w * 0.009), mm(w * 0.84));
    const tubeW = mm(Math.max(0.55, w * 0.024));
    ctx.lineJoin = "round";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = tubeW * 4;
    ctx.strokeStyle = rgba("#ffd8ec", 0.85);
    ctx.lineWidth = tubeW * 1.6;
    ctx.stroke(tube);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff6fa";
    ctx.lineWidth = tubeW;
    ctx.stroke(tube);
    ctx.restore();
    finish(s.canvas, {inkW: mm(0.15), ink: "#b0306e", grainAmt: 0.05});   // a dark ink line makes the heart look like a sticker; the neon heart uses a slightly lighter thin edge
    // Emissive: the whole heart glows by itself (so it is not beaten down to dark pink at night), the tube is all white; the intensity is set so the tube just passes the bloom threshold - a ring of soft light, very little spilling onto the people
    e.ctx.fillStyle = "#000";
    e.ctx.fillRect(0, 0, W, H);
    e.ctx.globalAlpha = 0.6;
    e.ctx.drawImage(s.canvas, 0, 0);
    e.ctx.globalAlpha = 1;
    e.ctx.save();
    e.ctx.clip(path);
    e.ctx.lineJoin = "round";
    e.ctx.strokeStyle = "#ffffff";
    e.ctx.lineWidth = tubeW;
    e.ctx.stroke(tube);
    e.ctx.restore();
    const m = cutout(s.canvas, {id, ppm, thickness: 1.2, emissive: e.canvas, emissiveIntensity: 0.68, trace: {cell: 2, dilate: 1}, back: "#c8407e", edge: "#f4e8f0"});
    m.receiveShadow = false;
    m.userData.noAudit = true;
    return standUp(m);
}
// Glow patch behind the big heart: a soft pink glow facing the camera (additive, no depth write, not in the fog), with the people and the heart both in front of it.
// Opacity is driven over time by the mover: at the moment of the kiss it lights up softly (giving a little light behind the two), and goes fully lit when the big heart pops up
export function loveHalo(id, size) {
    const c = makeCanvas(256, 256), g = c.getContext("2d");
    const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    // Gaussian-like falloff: with a linear gradient the edge of a disc is visible
    for (let i = 0; i <= 10; i++) {
        const r = i / 10;
        rg.addColorStop(r, `rgba(255,${Math.round(120 - 40 * r)},${Math.round(190 - 20 * r)},${(0.5 * Math.exp(-r * r * 5.5) * (1 - r)).toFixed(4)})`);
    }
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false});
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    m.rotation.x = Math.PI / 2;
    m.name = id;
    m.userData.noAudit = true;
    return m;
}
// Heat icons go dark: a dark patch covering the little tab of the wanted sign (base color the same as the sign, the three icons drawn as unlit dark red); once the stars have all turned into hearts it flickers twice and covers them
export function heatOff(id) {
    const {tabW, tabH} = WANTED;
    const w = tabW - 1.6, h = tabH - 1.0, ppm = 24;
    const s = sheet(w, h, ppm);
    const {ctx, mm, W, H} = s;
    const box = new Path2D();
    box.roundRect(0, 0, W, H, mm(1.2));
    ctx.fillStyle = "#1c1a2a";
    ctx.fill(box);
    ctx.fillStyle = "#3a2434";
    paintHeatIcons(ctx, mm, W / 2, H / 2 - mm(0.5), "#1c1a2a");   // the icon row on the sign is 0.5 mm above the center line of the little tab
    grain(ctx, 0.05);
    const m = cutout(s.canvas, {id, ppm, thickness: 0.2, anchor: "center", trace: {cell: 2, dilate: 0}, back: "#1c1a2a", edge: "#1c1a2a", castShadow: false});
    m.userData.noAudit = true;
    return standUp(m);
}
// Small heart that replaces a star on the wanted sign: the canvas is the same size as a lit star, with the center of the heart aligned to the center of the star (starSlot needs no change)
export function signHeart(id) {
    const R = WANTED.R * 1.05;
    const s = sheet(R * 2 + 1.6, R * 2 + 1.6, 24), e = sheet(R * 2 + 1.6, R * 2 + 1.6, 24);
    const {ctx, mm, W, H} = s;
    const path = heartPath(W / 2, H / 2 + mm(0.4), mm(R * 2.05));
    lit(ctx, path, "#ff3d84", {sw: mm(0.5), rw: mm(0.25), shade: "#8a2060", shadeA: 0.6, rim: "#ffc6dc"});
    finish(s.canvas, {inkW: mm(0.4), ink: "#0e0c16", grainAmt: 0.04});
    e.ctx.fillStyle = "#000";
    e.ctx.fillRect(0, 0, W, H);
    e.ctx.fillStyle = "#c0306e";
    e.ctx.fill(path);
    const m = cutout(s.canvas, {id, ppm: 24, thickness: 1.0, emissive: e.canvas, emissiveIntensity: 1.3, trace: {cell: 2, dilate: 1}, back: "#f4d8e6"});
    m.userData.noAudit = true;
    Object.assign(m.userData.paper.meta.mat.front, {gloss: "foil", glossTier: 1});   // foil face, same as the wanted stars
    return standUp(m);
}
// Small heart that floats up: light pink, self-lit; origin at the midpoint of the heart
export function floatHeart(id, w = 3.2) {
    const s = sheet(w + 0.8, w + 0.8, 40), e = sheet(w + 0.8, w + 0.8, 40);
    const {ctx, mm, W, H} = s;
    const path = heartPath(W / 2, H / 2, mm(w));
    lit(ctx, path, "#ffc2e0", {sw: mm(0.25), rw: mm(0.12), shade: "#d0609a", shadeA: 0.5, rim: "#ffffff"});
    e.ctx.fillStyle = "#000";
    e.ctx.fillRect(0, 0, W, H);
    e.ctx.fillStyle = "#ff9ccc";
    e.ctx.fill(path);
    const m = cutout(s.canvas, {id, ppm: 40, thickness: 0.4, emissive: e.canvas, emissiveIntensity: 1.6, anchor: "center", trace: {cell: 2, dilate: 1}, back: "#ffd6ea", castShadow: false});
    m.userData.noAudit = true;
    return standUp(m);
}
void THREE;
