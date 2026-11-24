// Side-view standee vehicles: sport motorcycle (the green number 76 one from Jason_Duval_01), wheelie dirt bike (the bikelife one from Vice_City_09), lifeguard beach buggy (Vice_City_05).
import {rng, lerp} from "./kit.js";
import {P, sheet, lit, poly, capsule, ellipse, roundRect, rgba, mix, finish, rad} from "./paint.js";

function wheel(ctx, x, y, r, mm, {knobby = false, rim = "#c9c3dc", spokes = 6} = {}) {
    const tire = ellipse(x, y, r, r);
    lit(ctx, tire, "#2b2233", {sw: r * 0.2, rw: r * 0.08, rim: "#7a6a8a"});
    if (knobby) {
        ctx.fillStyle = "#2b2233";
        for (let k = 0; k < 18; k++) {
            const a = k * Math.PI * 2 / 18;
            ctx.fillRect(x + Math.cos(a) * r - mm(0.15), y + Math.sin(a) * r - mm(0.15), mm(0.3), mm(0.3));
        }
    }
    ctx.fillStyle = rad(ctx, x - r * 0.2, y - r * 0.2, 0, r * 0.7, [[0, "#ffffff"], [0.6, rim], [1, "#6e6488"]]);
    ctx.fill(ellipse(x, y, r * 0.62, r * 0.62));
    ctx.strokeStyle = "#3a2e48";
    ctx.lineWidth = mm(0.12);
    for (let k = 0; k < spokes; k++) {
        const a = k * Math.PI * 2 / spokes;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
        ctx.stroke();
    }
    ctx.fillStyle = "#4a4060";
    ctx.fill(ellipse(x, y, r * 0.14, r * 0.14));
}

function rider(ctx, mm, o) {
    // o: hip, knee, foot, shoulder, head, hand (all [x,y]), colors
    const L = (a, b, r1, r2, c) => lit(ctx, capsule(a[0], a[1], b[0], b[1], r1, r2), c, {sw: r1 * 0.8, rw: r1 * 0.3});
    L(o.hip, o.knee, mm(0.75), mm(0.6), o.pants);
    L(o.knee, o.foot, mm(0.6), mm(0.45), o.legLower ?? o.pants);
    lit(ctx, roundRect(o.foot[0] - mm(0.4), o.foot[1] - mm(0.3), mm(1.4), mm(0.7), mm(0.25)), o.shoe ?? "#ffffff", {sw: mm(0.2), rw: mm(0.08)});
    L(o.hip, o.shoulder, mm(1.05), mm(1.2), o.top);
    L(o.shoulder, o.elbow, mm(0.5), mm(0.45), o.sleeve ?? o.skin);
    L(o.elbow, o.hand, mm(0.42), mm(0.36), o.skin);
    if (o.helmet) {
        lit(ctx, ellipse(o.head[0], o.head[1], mm(1.25), mm(1.15)), o.helmet, {sw: mm(0.4), rw: mm(0.15)});
        ctx.fillStyle = "#1e1628";
        ctx.fill(roundRect(o.head[0] + mm(0.1), o.head[1] - mm(0.45), mm(1.15), mm(0.6), mm(0.25)));
        ctx.fillStyle = rgba("#ff9fd0", 0.6);
        ctx.fillRect(o.head[0] + mm(0.3), o.head[1] - mm(0.35), mm(0.6), mm(0.15));
    } else {
        lit(ctx, ellipse(o.head[0], o.head[1], mm(0.85), mm(1.0)), o.skin, {sw: mm(0.3), rw: mm(0.12)});
        const cap = new Path2D();
        cap.ellipse(o.head[0], o.head[1] - mm(0.3), mm(0.95), mm(0.7), 0, Math.PI, 0);
        cap.closePath();
        lit(ctx, cap, o.cap ?? "#2a2433", {sw: mm(0.2), rw: mm(0.1)});
        ctx.fillStyle = o.cap ?? "#2a2433";
        ctx.fillRect(o.head[0] - mm(1.6), o.head[1] - mm(0.45), mm(0.9), mm(0.25));   // the brim of the backwards-worn cap points back
    }
}

// Sport motorcycle: green fairing, number 76
export function paintSportbike(ppm, {color = "#2f8a4a", accent = "#e9e4f4", number = "76", riderOn = true} = {}) {
    const {canvas, ctx, mm, W, H} = sheet(24, 15, ppm);
    const g = H - mm(0.4);
    const rw = mm(2.7);
    const back = [mm(4.4), g - rw], front = [mm(19.6), g - rw];
    wheel(ctx, back[0], back[1], rw, mm, {spokes: 5});
    wheel(ctx, front[0], front[1], rw, mm, {spokes: 5});
    // Front fork, swingarm
    ctx.strokeStyle = "#c9c3dc";
    ctx.lineWidth = mm(0.45);
    ctx.beginPath(); ctx.moveTo(front[0], front[1]); ctx.lineTo(front[0] - mm(2.4), g - mm(8.6)); ctx.stroke();
    ctx.strokeStyle = "#3a3448";
    ctx.beginPath(); ctx.moveTo(back[0], back[1]); ctx.lineTo(mm(10), g - mm(3.6)); ctx.stroke();
    // Fairing body
    const body = poly([[mm(6.4), g - mm(6.4)], [mm(10.5), g - mm(6.0)], [mm(13.2), g - mm(7.6)], [mm(17.6), g - mm(9.2)], [mm(20.6), g - mm(7.2)],
        [mm(19.2), g - mm(4.4)], [mm(14.5), g - mm(2.6)], [mm(10.4), g - mm(2.8)], [mm(8.0), g - mm(4.8)]]);
    lit(ctx, body, color, {sw: mm(0.9), rw: mm(0.3)});
    ctx.save(); ctx.clip(body);
    ctx.fillStyle = accent;
    ctx.fillRect(0, g - mm(5.6), W, mm(0.35));
    ctx.fillStyle = "#ffffff";
    ctx.font = `italic 800 ${mm(2.2)}px Bahnschrift, sans-serif`;
    ctx.fillText(number, mm(13.0), g - mm(3.6));
    ctx.restore();
    const tail = poly([[mm(3.2), g - mm(7.6)], [mm(7.6), g - mm(6.6)], [mm(6.4), g - mm(6.0)], [mm(3.6), g - mm(6.8)]]);
    lit(ctx, tail, color, {sw: mm(0.3), rw: mm(0.12)});
    ctx.fillStyle = "#1e1628";
    ctx.fill(poly([[mm(17.6), g - mm(9.2)], [mm(19.4), g - mm(10.6)], [mm(20.6), g - mm(7.2)]]));   // windscreen
    ctx.fillStyle = "#ff3a4a";
    ctx.fillRect(mm(3.1), g - mm(7.7), mm(0.6), mm(0.35));
    if (riderOn) {
        rider(ctx, mm, {hip: [mm(9.2), g - mm(7.6)], knee: [mm(12.6), g - mm(6.0)], foot: [mm(10.6), g - mm(3.6)],
            shoulder: [mm(13.6), g - mm(11.4)], elbow: [mm(16.0), g - mm(10.0)], hand: [mm(17.8), g - mm(9.6)], head: [mm(14.8), g - mm(12.9)],
            pants: "#2a2433", top: "#1e1e2a", sleeve: "#1e1e2a", skin: "#c98b6b", helmet: "#1e1628", shoe: "#ffffff"});
    }
    return finish(canvas, {inkW: mm(0.09)});
}

// Wheelie dirt bike: front wheel off the ground by 22°, rider standing
export function paintWheelie(ppm, seed, {color = "#ff7a2a"} = {}) {
    const r = rng(seed);
    const {canvas, ctx, mm, W, H} = sheet(20, 19, ppm);
    const g = H - mm(0.4);
    const rw = mm(2.4);
    const back = [mm(4.2), g - rw];
    const ang = -0.42;
    const rot = (dx, dy) => [back[0] + dx * Math.cos(ang) - dy * Math.sin(ang), back[1] + dx * Math.sin(ang) + dy * Math.cos(ang)];
    const front = rot(mm(12.5), 0);
    wheel(ctx, back[0], back[1], rw, mm, {knobby: true, spokes: 10});
    wheel(ctx, front[0], front[1], rw, mm, {knobby: true, spokes: 10});
    ctx.strokeStyle = "#c9c3dc";
    ctx.lineWidth = mm(0.4);
    const forkTop = rot(mm(10.4), -mm(6.2));
    ctx.beginPath(); ctx.moveTo(front[0], front[1]); ctx.lineTo(forkTop[0], forkTop[1]); ctx.stroke();
    const frame = poly([rot(mm(2.6), -mm(4.4)), rot(mm(7.6), -mm(4.2)), rot(mm(10.6), -mm(6.2)), rot(mm(9.6), -mm(3.2)), rot(mm(6.6), -mm(1.6)), rot(mm(3.6), -mm(2.6))]);
    lit(ctx, frame, color, {sw: mm(0.6), rw: mm(0.25)});
    const plate = poly([rot(mm(10.0), -mm(5.0)), rot(mm(11.4), -mm(5.6)), rot(mm(11.0), -mm(3.6)), rot(mm(9.8), -mm(3.4))]);
    lit(ctx, plate, "#fff6ec", {sw: mm(0.2), rw: mm(0.1)});
    const fender = poly([rot(mm(11.0), -mm(3.6)), rot(mm(14.6), -mm(3.4)), rot(mm(14.4), -mm(3.0)), rot(mm(11.2), -mm(3.1))]);
    ctx.fillStyle = color;
    ctx.fill(fender);
    const seatTop = rot(mm(5.4), -mm(4.8));
    const hand = rot(mm(10.0), -mm(6.6));
    rider(ctx, mm, {hip: [seatTop[0] - mm(0.4), seatTop[1] - mm(2.6)], knee: [seatTop[0] + mm(1.8), seatTop[1] - mm(0.6)],
        foot: rot(mm(6.2), -mm(1.6)), shoulder: [seatTop[0] - mm(0.8), seatTop[1] - mm(7.0)], elbow: [hand[0] - mm(1.6), hand[1] - mm(0.8)], hand,
        head: [seatTop[0] - mm(0.4), seatTop[1] - mm(8.6)], pants: "#1e1e2a", top: r() < 0.5 ? "#ffffff" : "#d8343f", sleeve: null,
        skin: ["#8d5a40", "#6a4030", "#c98b6b"][Math.floor(r() * 3)], cap: r() < 0.5 ? "#1e1e2a" : "#ff4fa3", shoe: "#ffffff"});
    return finish(canvas, {inkW: mm(0.09)});
}

// Lifeguard beach buggy: red body, white cross
export function paintATV(ppm) {
    const {canvas, ctx, mm, W, H} = sheet(14, 9, ppm);
    const g = H - mm(0.4);
    const rw = mm(1.9);
    wheel(ctx, mm(3.0), g - rw, rw, mm, {knobby: true, spokes: 6, rim: "#ff6a6a"});
    wheel(ctx, mm(11.0), g - rw, rw, mm, {knobby: true, spokes: 6, rim: "#ff6a6a"});
    const body = poly([[mm(1.0), g - mm(4.2)], [mm(4.6), g - mm(4.6)], [mm(6.0), g - mm(5.6)], [mm(9.2), g - mm(5.6)], [mm(13.2), g - mm(4.6)],
        [mm(12.8), g - mm(3.0)], [mm(9.0), g - mm(2.4)], [mm(5.0), g - mm(2.4)], [mm(1.2), g - mm(3.0)]]);
    lit(ctx, body, "#e0283a", {sw: mm(0.6), rw: mm(0.25)});
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mm(7.2), g - mm(4.8), mm(1.4), mm(0.45));
    ctx.fillRect(mm(7.68), g - mm(5.25), mm(0.45), mm(1.35));
    ctx.strokeStyle = "#2a2433";
    ctx.lineWidth = mm(0.3);
    ctx.strokeRect(mm(0.8), g - mm(5.4), mm(3.2), mm(0.8));
    ctx.strokeRect(mm(10.2), g - mm(5.4), mm(3.2), mm(0.8));
    ctx.beginPath(); ctx.moveTo(mm(9.4), g - mm(5.6)); ctx.lineTo(mm(10.0), g - mm(7.2)); ctx.lineTo(mm(11.2), g - mm(7.2)); ctx.stroke();
    return finish(canvas, {inkW: mm(0.08)});
}

// Flamingo pool float (the kind in Leonida_Keys_05): a ring seen from above + an upright neck
export function paintFloatRing(ppm) {
    const {canvas, ctx, mm, W, H} = sheet(9, 9, ppm);
    const ring = new Path2D();
    ring.ellipse(W / 2, H / 2, W / 2 - mm(0.3), H / 2 - mm(0.3), 0, 0, Math.PI * 2);
    ring.ellipse(W / 2, H / 2, W / 2 - mm(2.6), H / 2 - mm(2.6), 0, 0, Math.PI * 2, true);
    lit(ctx, ring, "#ff8fc0", {sw: mm(0.9), rw: mm(0.5), rim: "#ffe0ec"});
    ctx.fillStyle = rgba("#ffffff", 0.5);
    ctx.fill(ellipse(W * 0.32, H * 0.22, mm(1.0), mm(0.4), -0.6));
    return finish(canvas, {inkW: mm(0.08), ink: "#a0406a"});
}
void [lerp, mix];
