// v12: things added to the archipelago opening (author on v11: "this part looks sparse overall, too few elements, and crude").
// Daily life in the Florida island chain: dolphins leaping out of the water, a dive boat and snorkelers, kayakers, pelicans on wooden dock posts and anglers, flocks of gliding pelicans,
// lobster-trap buoys, channel markers (red triangle / green square). All small pieces; the count and the detail fill up the sea.
import * as THREE from "three";
import {rng, toTexture, cutout, rectSheet, polySheet, customPaper, standUp, bendGeometry} from "./kit.js";
import {sheet, lit, grain, finish, rgba, mix, ellipse, poly, capsule} from "./paint.js";

const PPM = 22;

// Solid of revolution about the x axis (fuselage, dolphin, kayak): prof = [[x, radius]...] from tail to head; v runs linearly along the length, the seam is below
// u: 0 bottom, 0.25 +y side, 0.5 top, 0.75 -y side
export function latheX(prof, seg = 20) {
    const X0 = prof[0][0], XL = prof.at(-1)[0] - X0;
    const geo = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(Math.max(0.05, r), x)), seg, Math.PI);
    geo.rotateZ(-Math.PI / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setY(i, (p.getX(i) - X0) / XL);
    return geo;
}

// A rod: from a to b
function rod(g, id, a, b, t, color, rough = 0.6) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const m = customPaper(new THREE.CylinderGeometry(t / 2, t / 2, va.distanceTo(vb), 6), id, {color, rough});
    m.position.copy(va).add(vb).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.add(m);
    return m;
}

// ---------- Dolphin: gray-blue back, pale belly, dorsal fin, pectoral fins, tail flukes; body slightly arched (leaping pose) ----------
// The model lives in inner (the animation piece makes it jump along an arc); the outer group is left for the pop-up
export function dolphin(id, {back = "#7f93b8", belly = "#eef0f6"} = {}) {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    const prof = [[-6.2, 0.22], [-5.2, 0.45], [-3.8, 0.85], [-2, 1.3], [0, 1.6], [1.8, 1.6], [3.0, 1.45], [3.8, 1.2], [4.3, 0.85], [4.55, 0.42], [5.1, 0.32], [5.45, 0.2], [5.6, 0.06]];   // rounded melon, short beak (the head used to be too pointed, like a shark)
    const geo = latheX(prof, 22);
    geo.scale(1, 0.9, 1);
    bendGeometry(geo, x => -0.035 * x * x + 0.6);
    const s = sheet(24, 24, 12);
    {
        const {ctx, W, H} = s;
        // u wraps all the way around: belly (u=0, 1) light, back (u=0.5) dark, smooth transition on the sides
        const gr = ctx.createLinearGradient(0, 0, W, 0);
        gr.addColorStop(0, belly); gr.addColorStop(0.2, belly); gr.addColorStop(0.33, back); gr.addColorStop(0.67, back); gr.addColorStop(0.8, belly); gr.addColorStop(1, belly);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
        // Eyes: on both sides of the head
        const V = x => (1 - (x + 6.2) / 11.95) * H;
        ctx.fillStyle = "#1e1a2a";
        for (const u of [0.29, 0.71]) { ctx.beginPath(); ctx.arc(u * W, V(3.7), W * 0.012, 0, Math.PI * 2); ctx.fill(); }
        // Mouth line
        ctx.strokeStyle = rgba("#3a4060", 0.6);
        ctx.lineWidth = W * 0.006;
        for (const u of [0.22, 0.78]) { ctx.beginPath(); ctx.moveTo(u * W, V(5.6)); ctx.lineTo(u * W + (u < 0.5 ? 1 : -1) * W * 0.04, V(4.3)); ctx.stroke(); }
        grain(ctx, 0.05);
    }
    const body = customPaper(geo, id + ".body", {map: toTexture(s.canvas), rough: 0.35});
    inner.add(body);
    // Dorsal fin: a swept-back curved triangle, standing on the back
    const fin = polySheet([[0.9, 0], [-1.7, 0], [-1.9, 2.3], [-1.2, 2.0]], {id: id + ".fin", color: back, thickness: 0.25, edge: mix(back, "#2a3050", 0.3), back: {color: back, rough: 0.4}});
    fin.rotation.x = Math.PI / 2;
    fin.position.set(0, 0.12, 1.55 + 0.6 - 0.035 * 0.25);
    inner.add(fin);
    // Tail flukes: two horizontal lobes
    const fl = polySheet([[-5.6, 0], [-6.9, 2.4], [-7.4, 2.2], [-6.6, 0], [-7.4, -2.2], [-6.9, -2.4]], {id: id + ".fluke", color: back, thickness: 0.22, edge: mix(back, "#2a3050", 0.3), back: {color: back, rough: 0.4}});
    fl.position.z = 0.6 - 0.035 * 36 - 0.1;
    inner.add(fl);
    // Pectoral fins
    for (const sgn of [-1, 1]) {
        const pf = polySheet([[2.2, 0], [0.6, 0], [0.2, 2.0], [1.0, 1.8]].map(([x, y]) => [x, y * sgn]), {id: id + ".pec", color: back, thickness: 0.2, edge: back, back: {color: belly, rough: 0.4}});
        pf.position.set(0, sgn * 1.0, 0.1);
        pf.rotation.x = -sgn * 0.5;
        inner.add(pf);
    }
    // Splash: a ring of white crown, opening wide as it leaps out and as it re-enters the water (the animation piece controls the scale)
    const crown = () => {
        const c = customPaper(new THREE.CylinderGeometry(1.4, 2.4, 1.6, 12, 1, true), id + ".splash", {color: "#f4fbff", rough: 0.3, side: "double"});
        c.rotation.x = Math.PI / 2;
        c.position.z = 0.6;
        c.userData.noAudit = true;
        c.scale.set(0.001, 0.001, 0.001);
        g.add(c);
        return c;
    };
    g.userData.leap = {inner, splashes: [crown(), crown()]};
    g.userData.core = body;
    return g;
}

// ---------- Kayak: pointed-ended hull + black cockpit opening + seated person (lower body underwater, hidden by the hull) + double-bladed paddle ----------
export function kayak(id, color, person) {
    const g = new THREE.Group();
    const prof = [[-6.4, 0.08], [-5, 0.65], [-2.5, 1.15], [0, 1.3], [2.5, 1.15], [5, 0.65], [6.4, 0.08]];
    const geo = latheX(prof, 16);
    geo.scale(1, 1, 0.5);
    bendGeometry(geo, x => 0.012 * x * x);
    const hull = customPaper(geo, id + ".hull", {color, rough: 0.35});
    hull.position.z = 0.35;
    g.add(hull);
    const pit = polySheet(Array.from({length: 16}, (_, k) => [Math.cos(k / 16 * Math.PI * 2) * 1.7, Math.sin(k / 16 * Math.PI * 2) * 0.75]),
        {id: id + ".pit", color: "#22202c", thickness: 0.12, edge: "#22202c"});
    pit.position.set(-0.4, 0, 0.98);
    g.add(pit);
    person.scale.setScalar(0.72);
    person.position.set(-0.4, 0, -2.6);
    g.add(person);
    const paddle = new THREE.Group();
    rod(paddle, id + ".shaft", [0, -5, 0], [0, 5, 0], 0.22, "#2a2a34");
    for (const s of [-1, 1]) {
        const b = customPaper(new THREE.BoxGeometry(0.9, 1.6, 0.12), id + ".blade", {color: "#f5c518", rough: 0.4});
        b.position.set(0, s * 5.4, 0);
        paddle.add(b);
    }
    paddle.position.set(0.6, 0, 3.6);
    g.add(paddle);
    g.userData.paddle = paddle;
    g.userData.core = hull;
    return g;
}

// ---------- Snorkeler: seen from above, lying face down on the water (back of head, mask strap, arms against the body, legs and fins fading into the water color = submerged),
// yellow snorkel sticking out of the water, a ring of ripples around the head, an orange safety buoy trailing from the feet ----------
export function snorkeler(id, seed, {skin = "#c98d68", hair = "#2a1e1a", tube = "#f5d020", suit = "#ff5a7a", fins = "#2a6ad0"} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    const water = "#3ab8c8";
    const s = sheet(4.6, 10, PPM);
    {
        const {ctx, mm} = s;
        const cx = mm(2.3);
        const deep = (c, k) => mix(c, water, k);
        // Fins
        ctx.fillStyle = deep(fins, 0.45);
        for (const sx of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + sx * mm(0.45), mm(8.2)); ctx.lineTo(cx + sx * mm(1.35), mm(9.9)); ctx.lineTo(cx + sx * mm(0.2), mm(9.9)); ctx.lineTo(cx + sx * mm(0.15), mm(8.2));
            ctx.closePath(); ctx.fill();
        }
        // Legs: sink deeper into the water the lower they go
        for (const sx of [-1, 1]) {
            const gr = ctx.createLinearGradient(0, mm(5.4), 0, mm(8.4));
            gr.addColorStop(0, deep(skin, 0.15)); gr.addColorStop(1, deep(skin, 0.55));
            ctx.strokeStyle = gr;
            ctx.lineWidth = mm(0.62);
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(cx + sx * mm(0.42), mm(5.4)); ctx.lineTo(cx + sx * mm(0.5), mm(8.3)); ctx.stroke();
        }
        // Arms: against the body
        ctx.strokeStyle = deep(skin, 0.12);
        ctx.lineWidth = mm(0.42);
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sx * mm(0.95), mm(2.5)); ctx.quadraticCurveTo(cx + sx * mm(1.45), mm(4.0), cx + sx * mm(1.15), mm(5.4)); ctx.stroke(); }
        // Body (swimsuit)
        lit(ctx, ellipse(cx, mm(3.9), mm(0.95), mm(1.8)), suit, {sw: mm(0.25), rw: mm(0.1)});
        ctx.fillStyle = deep(skin, 0.05);
        ctx.fill(ellipse(cx, mm(2.35), mm(0.75), mm(0.4)));
        // Back of head + mask strap
        lit(ctx, ellipse(cx, mm(1.3), mm(0.78), mm(0.85)), hair, {sw: mm(0.2), rw: mm(0.1)});
        ctx.strokeStyle = "#1e1e26";
        ctx.lineWidth = mm(0.2);
        ctx.beginPath(); ctx.moveTo(cx - mm(0.8), mm(1.0)); ctx.quadraticCurveTo(cx, mm(1.35), cx + mm(0.8), mm(1.0)); ctx.stroke();
        ctx.fillStyle = "#2c4a7e";
        ctx.fill(ellipse(cx, mm(0.45), mm(0.62), mm(0.22)));
        finish(s.canvas, {inkW: mm(0.06), ink: "#2a3a48"});
    }
    const body = cutout(s.canvas, {id: id + ".body", ppm: PPM, thickness: 0.25, anchor: "center", trace: {cell: 2, dilate: 1}, back: "#3a8a9a", edge: "#5ac8d0"});
    body.position.z = 0.15;
    g.add(body);
    // Snorkel: sticks up out of the water from beside the back of the head, bent at the top
    rod(g, id + ".tube", [0.55, 3.8, 0.3], [0.65, 3.9, 2.6], 0.26, tube, 0.4);
    rod(g, id + ".tubeTop", [0.65, 3.9, 2.6], [0.65, 3.4, 2.9], 0.26, tube, 0.4);
    // Ripples around the head
    const rip = customPaper(new THREE.RingGeometry(1.5, 1.75, 24), id + ".ripple", {color: "#e8fbff", rough: 0.3});
    rip.position.set(0, 3.8, 0.1);
    rip.userData.noAudit = true;
    g.add(rip);
    // Safety buoy: trailing behind the feet
    const fx = (r() - 0.5) * 3, fy = -6.2 - r() * 1.5;
    const buoy = customPaper(new THREE.CapsuleGeometry(0.55, 1.6, 4, 8), id + ".float", {color: "#ff6a2a", rough: 0.4});
    buoy.rotation.z = Math.PI / 2 + (r() - 0.5);
    buoy.position.set(fx, fy, 0.2);
    g.add(buoy);
    rod(g, id + ".line", [0, -4.6, 0.12], [fx, fy + 0.4, 0.15], 0.06, "#f4f4f4");
    g.userData.core = body;
    return g;
}
// ---------- Dive flag (red field, white diagonal stripe): made as a small flag ----------
function diveFlag(id, w = 4.4, h = 3.0) {
    const s = sheet(w, h, 30);
    const {ctx, W, H, mm} = s;
    ctx.fillStyle = "#e0303a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = mm(0.7);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.stroke();
    grain(ctx, 0.05);
    const f = rectSheet(s.canvas, {id, width: w, height: h, thickness: 0.15, back: "same", edge: "#c82a32"});
    bendGeometry(f.geometry, x => 0.25 * Math.sin((x + w / 2) / w * Math.PI * 1.4));
    return standUp(f);
}

// ---------- Dive buoy: an orange float with a pole stuck in it, carrying a dive flag ----------
export function diveBuoy(id) {
    const g = new THREE.Group();
    const ball = customPaper(new THREE.SphereGeometry(1.3, 14, 10), id + ".ball", {color: "#ff6a2a", rough: 0.35});
    ball.scale.set(1, 1, 0.8);
    ball.position.z = 0.5;
    g.add(ball);
    rod(g, id + ".pole", [0, 0, 1], [0, 0, 7.5], 0.22, "#e8e4ee");
    const f = diveFlag(id + ".flag");
    f.position.set(2.3, 0, 4.2);
    g.add(f);
    g.userData.core = ball;
    return g;
}

// ---------- Dive boat: adapted from the speedboat, dive flag on a mast at the stern, a row of yellow air tanks on the deck ----------
export function diveExtras(id, boat) {
    rod(boat, id + ".mast", [-12.4, 0, 3.6], [-12.4, 0, 14.6], 0.3, "#e8e4ee");
    const f = diveFlag(id + ".flag", 5.2, 3.5);
    f.position.set(-9.7, 0, 10.8);
    boat.add(f);
    for (let k = 0; k < 4; k++) {
        const t = customPaper(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 10), id + ".tank" + k, {color: k % 2 ? "#f5c518" : "#f0f0f6", rough: 0.3});
        t.rotation.x = Math.PI / 2;
        t.position.set(-3 + k * 1.4, 2.4, 5.3);
        boat.add(t);
    }
    return boat;
}

// ---------- Brown pelican (standing, side-view standee): gray-brown body, white neck, pale yellow crown, long bill resting on the chest ----------
export function pelican(id, seed = 1) {
    const s = sheet(6.6, 7.6, PPM);
    const {ctx, mm, H} = s;
    const flip = seed % 2 ? 1 : -1;
    ctx.save();
    if (flip < 0) { ctx.translate(s.W, 0); ctx.scale(-1, 1); }
    // Feet
    ctx.strokeStyle = "#3a3436";
    ctx.lineWidth = mm(0.3);
    ctx.beginPath(); ctx.moveTo(mm(2.6), H); ctx.lineTo(mm(2.8), H - mm(1.1)); ctx.moveTo(mm(3.4), H); ctx.lineTo(mm(3.2), H - mm(1.1)); ctx.stroke();
    // Body: a slanted long ellipse, with a darker patch for the wing
    lit(ctx, ellipse(mm(2.9), H - mm(2.7), mm(2.3), mm(1.5), -0.35), "#9a8f86", {sw: mm(0.5), rw: mm(0.15), rim: "#f0e0d0", shade: "#5a5058"});
    ctx.fillStyle = "#6a5e58";
    ctx.fill(ellipse(mm(2.4), H - mm(2.9), mm(1.6), mm(0.85), -0.45));
    ctx.strokeStyle = rgba("#f4eee4", 0.7);
    ctx.lineWidth = mm(0.12);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(mm(1.2 + k * 0.5), H - mm(2.4 + k * 0.1)); ctx.lineTo(mm(1.9 + k * 0.5), H - mm(3.2 + k * 0.1)); ctx.stroke(); }
    // Neck (white) + head
    ctx.strokeStyle = "#f4efe4";
    ctx.lineWidth = mm(0.9);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(mm(4.2), H - mm(3.6)); ctx.bezierCurveTo(mm(4.9), H - mm(4.6), mm(4.0), H - mm(5.4), mm(4.3), H - mm(6.2)); ctx.stroke();
    ctx.strokeStyle = "#7a4a3a";   // a chestnut stripe on the back of the neck (breeding season)
    ctx.lineWidth = mm(0.3);
    ctx.beginPath(); ctx.moveTo(mm(3.8), H - mm(3.9)); ctx.bezierCurveTo(mm(4.4), H - mm(4.7), mm(3.6), H - mm(5.3), mm(3.9), H - mm(6.0)); ctx.stroke();
    lit(ctx, ellipse(mm(4.4), H - mm(6.5), mm(0.85), mm(0.7)), "#fbf3d8", {sw: mm(0.2), rw: mm(0.1)});
    ctx.fillStyle = "#f5dc78";
    ctx.fill(ellipse(mm(4.3), H - mm(6.95), mm(0.6), mm(0.28)));
    // Long bill + throat pouch: from the head, running forward and down against the chest
    ctx.fillStyle = "#7a6a62";
    ctx.beginPath(); ctx.moveTo(mm(4.9), H - mm(6.4)); ctx.quadraticCurveTo(mm(5.4), H - mm(4.6), mm(5.6), H - mm(3.5)); ctx.lineTo(mm(5.1), H - mm(4.6)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d8a860";
    ctx.beginPath(); ctx.moveTo(mm(4.8), H - mm(6.7)); ctx.lineTo(mm(5.3), H - mm(6.5)); ctx.quadraticCurveTo(mm(5.9), H - mm(4.8), mm(5.9), H - mm(3.4)); ctx.lineTo(mm(5.6), H - mm(3.5)); ctx.quadraticCurveTo(mm(5.5), H - mm(5), mm(4.8), H - mm(6.3)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e8603a";
    ctx.beginPath(); ctx.arc(mm(5.8), H - mm(3.45), mm(0.18), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e1a22";
    ctx.beginPath(); ctx.arc(mm(4.65), H - mm(6.55), mm(0.12), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    finish(s.canvas, {inkW: mm(0.07), ink: "#3a3038"});
    return standUp(cutout(s.canvas, {id, ppm: PPM, thickness: 0.6, trace: {cell: 2, dilate: 1}}));
}

// ---------- Gliding pelican (silhouette seen from above, lying flat): one piece for the body + one piece for each wing (the animation piece makes the wings flap slowly) ----------
export function pelicanFlying(id) {
    const g = new THREE.Group();
    const piece = (w, h, draw, name, anchor) => {
        const s = sheet(w, h, PPM);
        draw(s);
        finish(s.canvas, {inkW: s.mm(0.07), ink: "#3a3038"});
        const m = cutout(s.canvas, {id: id + "." + name, ppm: PPM, thickness: 0.4, anchor, trace: {cell: 2, dilate: 1}, back: "#8a7e76", edge: "#c8bcb0"});
        return m;
    };
    // Body: head toward +x (right of the canvas), long bill pointing forward
    const body = piece(10, 3, ({ctx, mm, H}) => {
        lit(ctx, ellipse(mm(4), H / 2, mm(3), mm(1.1)), "#9a8f86", {sw: mm(0.3), rw: mm(0.1), rim: "#f0e0d0"});
        ctx.fillStyle = "#f4efe4";
        ctx.fill(ellipse(mm(6.6), H / 2, mm(0.9), mm(0.6)));
        ctx.fillStyle = "#d8a860";
        ctx.beginPath(); ctx.moveTo(mm(7.2), H / 2 - mm(0.35)); ctx.lineTo(mm(9.8), H / 2 - mm(0.12)); ctx.lineTo(mm(9.8), H / 2 + mm(0.12)); ctx.lineTo(mm(7.2), H / 2 + mm(0.35)); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#6a5e58";
        ctx.beginPath(); ctx.moveTo(mm(1.4), H / 2); ctx.lineTo(mm(0.1), H / 2 - mm(0.9)); ctx.lineTo(mm(0.1), H / 2 + mm(0.9)); ctx.closePath(); ctx.fill();
    }, "body", "center");
    g.add(body);
    for (const s of [-1, 1]) {
        // Wings: extending outward from the body by 8, straight leading edge, a row of flight feathers on the trailing edge, dark wing tips
        const wing = piece(4.6, 8.4, ({ctx, mm, W, H}) => {
            const pts = [[mm(0.6), H], [mm(4.2), H], [mm(4.0), H - mm(5.5)], [mm(3.0), mm(0.2)], [mm(1.8), mm(0.6)], [mm(1.2), mm(2.6)], [mm(0.4), H - mm(4.5)]];
            lit(ctx, poly(pts), "#9a8f86", {sw: mm(0.3), rw: mm(0.1), rim: "#f0e0d0"});
            ctx.save(); ctx.clip(poly(pts));
            ctx.fillStyle = "#4a4048";
            ctx.fillRect(0, 0, W, mm(2.8));
            ctx.strokeStyle = rgba("#2a2428", 0.6);
            ctx.lineWidth = mm(0.12);
            for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(mm(0.4), H - mm(1 + k * 1.2)); ctx.lineTo(mm(1.6), H - mm(1.4 + k * 1.2)); ctx.stroke(); }
            ctx.restore();
        }, "wing" + (s > 0 ? "L" : "R"), [0.5, 0]);
        const hold = new THREE.Group();
        if (s < 0) wing.scale.y = -1;
        hold.add(wing);
        hold.position.set(-0.4, s * 0.9, 0);
        g.add(hold);
        g.userData["wing" + (s > 0 ? "L" : "R")] = hold;
    }
    g.userData.wings = [g.userData.wingL, g.userData.wingR];
    g.traverse(o => { o.userData.noAudit = true; });
    return g;
}

// ---------- Wooden pier: a plank walkway + two rows of posts (the posts on both sides stick up above the deck, pelicans stand on them) ----------
// Extends along -y (from the island edge toward the camera), length len, width w
export function dock(id, {len = 26, w = 5.4, deck = 1.8} = {}) {
    const g = new THREE.Group();
    const s = sheet(w, len, 14);
    {
        const {ctx, W, H, mm} = s;
        const r = rng(7);
        for (let y = 0; y < H; y += mm(1.1)) {
            ctx.fillStyle = mix("#c8a27a", "#a8805a", r() * 0.6);
            ctx.fillRect(0, y, W, mm(1.0));
            ctx.fillStyle = rgba("#5a4030", 0.7);
            ctx.fillRect(0, y + mm(1.0), W, mm(0.1));
            ctx.fillStyle = rgba("#3a2a20", 0.5);
            ctx.fillRect(mm(0.5), y + mm(0.45), mm(0.12), mm(0.12));
            ctx.fillRect(W - mm(0.62), y + mm(0.45), mm(0.12), mm(0.12));
        }
        grain(ctx, 0.08);
    }
    const top = polySheet([[-w / 2, -len], [w / 2, -len], [w / 2, 0], [-w / 2, 0]], {id: id + ".deck", canvas: s.canvas, thickness: 0.6,
        uvFrame: {x: -w / 2, y: -len, width: w, height: len}, edge: "#8a6a4a", back: {color: "#6a5040", rough: 0.9}});
    top.position.z = deck - 0.6;
    g.add(top);
    const posts = [];
    for (let k = 0; k <= Math.round(len / 6.5); k++) {
        const y = -k * len / Math.round(len / 6.5);
        for (const sx of [-1, 1]) {
            const tall = k > 0 && k % 2 === 0;
            const h = deck + (tall ? 2.6 : 0.5) + 0.8;
            const p = customPaper(new THREE.CylinderGeometry(0.55, 0.6, h, 8), id + ".post", {color: "#7a5a42", rough: 0.9});
            p.rotation.x = Math.PI / 2;
            p.position.set(sx * (w / 2 + 0.2), Math.min(-0.6, y), h / 2 - 0.8);
            g.add(p);
            if (tall) posts.push([sx * (w / 2 + 0.2), Math.min(-0.6, y), h - 0.8]);
        }
    }
    g.userData.posts = posts;
    g.userData.core = top;
    return g;
}

// Fishing rod: slanting out from the hand, a line hanging down to the water, a red-and-white bobber
export function fishingRod(g, id, from, len = 9) {
    const tip = [from[0] + len * 0.25, from[1] - len * 0.75, from[2] + len * 0.55];
    rod(g, id + ".rod", from, tip, 0.18, "#2a2a30", 0.4);
    rod(g, id + ".line", tip, [tip[0], tip[1] - 1.5, 0.2], 0.05, "#f4f4f4");
    const bob = customPaper(new THREE.SphereGeometry(0.4, 10, 8), id + ".bobber", {color: "#e0303a", rough: 0.3});
    bob.position.set(tip[0], tip[1] - 1.5, 0.3);
    g.add(bob);
}

// ---------- Lobster-trap buoys: a small patch of sea scattered with a few two-tone foam floats (each fisherman has their own color scheme) ----------
export function trapBuoys(id, seed, {n = 6, spread = 9, colors = [["#f5c518", "#e0303a"], ["#ffffff", "#2a7ad0"], ["#ff8a2a", "#ffffff"]]} = {}) {
    const r = rng(seed);
    const g = new THREE.Group();
    for (let k = 0; k < n; k++) {
        const [a, b] = colors[k % colors.length];
        const x = (r() - 0.5) * spread * 2, y = (r() - 0.5) * spread;
        const lo = customPaper(new THREE.CylinderGeometry(0.75, 0.65, 0.9, 10), `${id}.lo${k}`, {color: a, rough: 0.4});
        lo.rotation.x = Math.PI / 2;
        lo.position.set(x, y, 0.45);
        g.add(lo);
        const hi = customPaper(new THREE.CylinderGeometry(0.55, 0.75, 0.9, 10), `${id}.hi${k}`, {color: b, rough: 0.4});
        hi.rotation.x = Math.PI / 2;
        hi.position.set(x, y, 1.3);
        g.add(hi);
        rod(g, `${id}.stick${k}`, [x, y, 1.7], [x, y, 3.2], 0.16, "#3a3a44");
    }
    g.traverse(o => { o.userData.noAudit = true; });
    return g;
}

// ---------- Channel marker: a sign on top of a post - red triangle (even numbers) / green square (odd numbers), white border and white lettering ----------
export function channelMarker(id, kind, num) {
    const g = new THREE.Group();
    const p = customPaper(new THREE.CylinderGeometry(0.5, 0.55, 12, 8), id + ".pile", {color: "#6a5a4e", rough: 0.9});
    p.rotation.x = Math.PI / 2;
    p.position.z = 6;
    g.add(p);
    const red = kind === "red";
    const s = sheet(5, 5, 40);
    const {ctx, W, H, mm} = s;
    const shape = red ? poly([[W / 2, mm(0.2)], [W - mm(0.2), H - mm(0.4)], [mm(0.2), H - mm(0.4)]]) : poly([[mm(0.4), mm(0.4)], [W - mm(0.4), mm(0.4)], [W - mm(0.4), H - mm(0.4)], [mm(0.4), H - mm(0.4)]]);
    ctx.fillStyle = "#ffffff";
    ctx.fill(shape);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(0.84, 0.84); ctx.translate(-W / 2, -H / 2 + (red ? mm(0.25) : 0));
    ctx.fillStyle = red ? "#d8303a" : "#2a9a5a";
    ctx.fill(shape);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${mm(red ? 1.7 : 2.1)}px Bahnschrift, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(num), W / 2, H / 2 + (red ? mm(0.7) : 0));
    grain(ctx, 0.04);
    const sign = standUp(cutout(s.canvas, {id: id + ".sign", ppm: 40, thickness: 0.3, trace: {cell: 2, dilate: 1}, back: "#9a9090", edge: "#e8e4e0"}));
    sign.position.set(0, -0.6, 6.2);   // the post top is left for the pelican
    g.add(sign);
    g.userData.core = p;
    return g;
}

// ---------- Fix item 20: a dog in goggles steering a jet ski (the most viral animal clip after launch: Kotaku 2026-11-18, Gulf News) ----------
// Side-view standee, head toward +x (bow): sitting on the seat, both front paws on the handlebars, ears blown back by the wind, tongue out; wearing an orange life vest.
// The breed has no source; drawn as an ordinary tan-brown medium-sized dog, not tied to any official shot.
export function jetDog(id) {
    const s = sheet(9.4, 8.2, PPM);
    const {ctx, mm, H} = s;
    const X = v => mm(v), Y = v => H - mm(v);
    const fur = "#c98a4a", furDark = "#8a5428", chest = "#f2dcb4";
    const o = {sw: mm(0.45), rw: mm(0.18), shade: "#6a4a7a", shadeA: 0.55};
    // Handlebars: an upright post + crossbar (the paws rest on it, so it reads as "steering")
    ctx.strokeStyle = "#2a2836";
    ctx.lineCap = "round";
    ctx.lineWidth = mm(0.55);
    ctx.beginPath(); ctx.moveTo(X(8.0), Y(0.1)); ctx.lineTo(X(8.3), Y(3.9)); ctx.stroke();
    ctx.lineWidth = mm(0.7);
    ctx.beginPath(); ctx.moveTo(X(7.6), Y(4.0)); ctx.lineTo(X(9.0), Y(3.8)); ctx.stroke();
    // Tail (curling up toward the back)
    ctx.fillStyle = furDark;
    ctx.fill(capsule(X(0.5), Y(3.4), X(1.6), Y(1.9), mm(0.32), mm(0.42)));
    // Hindquarters (seated)
    lit(ctx, ellipse(X(2.8), Y(1.7), mm(2.1), mm(1.55)), fur, o);
    // Body: slanting from the hind legs up to the right
    lit(ctx, ellipse(X(4.3), Y(3.1), mm(2.4), mm(1.45), -0.75), fur, o);
    // Life vest
    ctx.save();
    ctx.clip(ellipse(X(4.3), Y(3.1), mm(2.4), mm(1.45), -0.75));
    lit(ctx, ellipse(X(4.4), Y(3.0), mm(1.7), mm(1.6), -0.75), "#ff7a2a", {sw: mm(0.35), rw: mm(0.15), shade: "#8a3a4a", shadeA: 0.5});
    ctx.strokeStyle = "#1e1a2a";
    ctx.lineWidth = mm(0.22);
    ctx.beginPath(); ctx.moveTo(X(3.4), Y(1.9)); ctx.lineTo(X(5.0), Y(4.3)); ctx.stroke();
    ctx.restore();
    // Front legs: reaching to the handlebars
    lit(ctx, capsule(X(5.3), Y(3.9), X(7.9), Y(4.0), mm(0.42), mm(0.36)), fur, {...o, sw: mm(0.25)});
    ctx.fillStyle = chest;
    ctx.fill(ellipse(X(8.0), Y(4.05), mm(0.42), mm(0.34)));
    // Hind legs (seated pose, feet in front)
    lit(ctx, capsule(X(3.2), Y(0.9), X(4.6), Y(0.45), mm(0.4), mm(0.34)), fur, {...o, sw: mm(0.25)});
    // A light patch on the chest
    ctx.fillStyle = chest;
    ctx.fill(ellipse(X(5.6), Y(4.3), mm(0.55), mm(0.75), -0.4));
    // Head + muzzle + nose
    lit(ctx, ellipse(X(6.2), Y(5.9), mm(1.3), mm(1.15)), fur, o);
    lit(ctx, ellipse(X(7.45), Y(5.45), mm(0.95), mm(0.58), 0.12), chest, {sw: mm(0.25), rw: mm(0.1), shade: "#6a4a7a", shadeA: 0.4});
    ctx.fillStyle = "#1e1620";
    ctx.fill(ellipse(X(8.35), Y(5.6), mm(0.3), mm(0.24)));
    // Tongue
    ctx.fillStyle = "#ff6f8f";
    ctx.fill(ellipse(X(7.55), Y(4.85), mm(0.3), mm(0.42), 0.3));
    // Ears: blown back by the wind
    lit(ctx, ellipse(X(4.95), Y(6.35), mm(1.15), mm(0.42), 0.25), furDark, {sw: mm(0.2), rw: mm(0.1), shade: "#4a2a3a", shadeA: 0.5});
    // Goggles: dark strap around the head + one round lens (only one is visible from the side), the lens teal-blue with a white glint
    ctx.strokeStyle = "#24202e";
    ctx.lineWidth = mm(0.42);
    ctx.beginPath(); ctx.moveTo(X(5.0), Y(6.55)); ctx.quadraticCurveTo(X(6.0), Y(6.75), X(6.75), Y(6.35)); ctx.stroke();
    ctx.fillStyle = "#24202e";
    ctx.fill(ellipse(X(6.95), Y(6.3), mm(0.72), mm(0.6)));
    ctx.fillStyle = lin2(ctx, X(6.5), Y(6.8), X(7.3), Y(5.8));
    ctx.fill(ellipse(X(6.97), Y(6.3), mm(0.52), mm(0.42)));
    ctx.strokeStyle = rgba("#ffffff", 0.9);
    ctx.lineWidth = mm(0.13);
    ctx.beginPath(); ctx.moveTo(X(6.7), Y(6.5)); ctx.lineTo(X(6.95), Y(6.62)); ctx.stroke();
    finish(s.canvas, {inkW: mm(0.08), ink: "#2a2030", grainAmt: 0.05});
    return standUp(cutout(s.canvas, {id, ppm: PPM, thickness: 0.6, trace: {cell: 2, dilate: 1}}));
}
function lin2(ctx, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#9ff4ff");
    g.addColorStop(0.5, "#3ac0e8");
    g.addColorStop(1, "#1a5a9a");
    return g;
}

// ---------- Fix item 5: paper-cut short-line sparkles - a small pointed-ended strip of white paper lying flat on the water (the animation piece makes it extend and contract, appearing and disappearing) ----------
export function glint(id, len, wid) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
        const u = k / 8, x = (u - 0.5) * len;
        pts.push([x, (wid / 2) * Math.sin(Math.PI * u) ** 0.7]);
    }
    for (let k = 7; k >= 1; k--) {
        const u = k / 8, x = (u - 0.5) * len;
        pts.push([x, -(wid / 2) * Math.sin(Math.PI * u) ** 0.7 * 0.6]);
    }
    const m = polySheet(pts, {id, color: "#ffffff", thickness: 0.12, castShadow: false, receiveShadow: false, rough: 0.9, edge: "#ffffff"});
    m.userData.noAudit = true;
    return m;
}

// ---------- Fix item 30: a water ring at the foot of things standing in the water (a cut-out white paper ring with slightly uneven edges) ----------
export function waterRing(id, rx, ry, w = 0.7, seed = 1) {
    const r = rng(seed);
    const ph = [r() * 6, r() * 6];
    const n = 40, pos = [], idx = [];
    for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        const f = 1 + 0.06 * Math.sin(a * 3 + ph[0]) + 0.04 * Math.sin(a * 7 + ph[1]);
        const ww = w * (0.75 + 0.5 * (0.5 + 0.5 * Math.sin(a * 2 + ph[1])));
        pos.push(Math.cos(a) * rx * f, Math.sin(a) * ry * f, 0, Math.cos(a) * (rx * f + ww), Math.sin(a) * (ry * f + ww), 0);
        const i0 = k * 2, i1 = ((k + 1) % n) * 2;
        idx.push(i0, i0 + 1, i1 + 1, i0, i1 + 1, i1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(Array(pos.length / 3).fill([0, 0, 1]).flat(), 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(Array(pos.length / 3 * 2).fill(0), 2));
    geo.setIndex(idx);
    const m = customPaper(geo, id, {color: "#e6f8f4", rough: 0.9}, {castShadow: false});
    m.userData.noAudit = true;
    return m;
}
