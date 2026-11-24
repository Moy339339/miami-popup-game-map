// Parts for small towns and countryside (shared by the archipelago, Grassrivers and Port Gellhorn). Based on official screenshots:
// Leonida_Keys_03 THE RUSTY ANCHOR log-cabin bar, picnic tables; Grassrivers_02 stilt-house restaurant on the water (red roof, wooden deck), Grassrivers_05 fishing camp;
// Port_Gellhorn_01 STARLET MOTEL sign and the ground-floor motel; Port_Gellhorn_04 DELIGHTS nightclub light box; Port_Gellhorn_05 trailer-park campfire;
// Port_Gellhorn_06 water tower, utility poles, run-down bungalows. The big district-name lettering on the official "Visit Leonida" postcard (a bold serif like Bookman / bold black face, dark outline, pulled downward for thickness).
import * as THREE from "three";
import {rng, lerp, toTexture, cutout, rectSheet, polySheet, customPaper, standUp} from "./kit.js";
import {P, sheet, lit, lin, grain, finish, rgba, mix, roundRect, ellipse, poly, fitFont} from "./paint.js";
import {neonText, neonLine} from "./paint_city.js";

const PPM = 16;

// =====================================================================
// Generic small house: printed facade + pitched roof / flat roof / single-slope, optional stilts, porch, sign
// Origin at the midpoint of the front bottom edge, front faces -Y, the house extends D toward +Y
// =====================================================================
function paintHouseFace(spec, w, side) {
    const r = rng((spec.seed ?? 1) + (side ? 17 : 0));
    const H = spec.H;
    const s = sheet(w, H, PPM), e = sheet(w, H, PPM);
    const {ctx, mm, W: px, H: py} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, px, py);
    ctx.fillStyle = spec.wall;
    ctx.fillRect(0, 0, px, py);
    if (spec.siding) {   // plank walls: horizontal strips
        for (let y = mm(0.6); y < py; y += mm(1.1)) {
            ctx.fillStyle = rgba("#ffffff", 0.16);
            ctx.fillRect(0, y, px, mm(0.14));
            ctx.fillStyle = rgba(P.shadeDeep, 0.22);
            ctx.fillRect(0, y + mm(0.14), px, mm(0.12));
        }
    }
    if (spec.block) {    // cinder block walls
        ctx.strokeStyle = rgba(P.shadeDeep, 0.18);
        ctx.lineWidth = mm(0.08);
        for (let y = 0, k = 0; y < py; y += mm(1.2), k++) for (let x = (k % 2) * mm(1.4); x < px; x += mm(2.8)) ctx.strokeRect(x, y, mm(2.8), mm(1.2));
    }
    // Light comes from the upper left: left bright, right dark, a bit of grime along the bottom edge
    ctx.fillStyle = lin(ctx, 0, 0, px, 0, [[0, rgba("#fff1e0", side ? 0 : 0.2)], [1, rgba(P.shadeDeep, side ? 0.3 : 0.1)]]);
    ctx.fillRect(0, 0, px, py);
    ctx.fillStyle = lin(ctx, 0, py - mm(3), 0, py, [[0, "rgba(0,0,0,0)"], [1, rgba("#5a3d48", spec.dirt ?? 0.3)]]);
    ctx.fillRect(0, py - mm(3), px, mm(3));
    if (spec.weathered) {
        for (let i = 0; i < 40; i++) {
            ctx.fillStyle = rgba(r() < 0.5 ? "#6a5050" : "#ffffff", 0.08 + r() * 0.1);
            ctx.fillRect(r() * px, r() * py, mm(0.5 + r() * 3), mm(0.4 + r() * 4));
        }
    }
    const win = (x, y, ww, wh) => {
        const on = r() < (spec.lit ?? 0.3);
        ctx.fillStyle = spec.trim;
        ctx.fillRect(x - mm(0.3), y - mm(0.3), ww + mm(0.6), wh + mm(0.6));
        if (on) {
            ctx.fillStyle = lin(ctx, 0, y, 0, y + wh, [[0, "#ffe2a8"], [1, "#ffb878"]]);
            ctx.fillRect(x, y, ww, wh);
            em.fillStyle = "#b8864a";
            em.fillRect(x, y, ww, wh);
        } else {
            ctx.fillStyle = lin(ctx, x, y, x + ww * 0.4, y + wh, [[0, "#7f8ac0"], [0.6, "#b49ac4"], [1, "#e8b8a0"]]);
            ctx.fillRect(x, y, ww, wh);
            ctx.fillStyle = rgba("#ffffff", 0.3);
            ctx.beginPath(); ctx.moveTo(x + ww * 0.2, y + wh); ctx.lineTo(x + ww * 0.5, y); ctx.lineTo(x + ww * 0.65, y); ctx.lineTo(x + ww * 0.35, y + wh); ctx.fill();
        }
        ctx.fillStyle = spec.trim;
        ctx.fillRect(x + ww / 2 - mm(0.08), y, mm(0.16), wh);
        ctx.fillRect(x, y + wh / 2 - mm(0.08), ww, mm(0.16));
        if (spec.shutters) {
            ctx.fillStyle = spec.shutters;
            for (const sx of [x - mm(1.5), x + ww + mm(0.4)]) {
                ctx.fillRect(sx, y - mm(0.2), mm(1.1), wh + mm(0.4));
                ctx.fillStyle = rgba(P.shadeDeep, 0.3);
                for (let k = 1; k < 6; k++) ctx.fillRect(sx, y + wh * k / 6, mm(1.1), mm(0.1));
                ctx.fillStyle = spec.shutters;
            }
        }
        if (spec.awnings && !side) {
            ctx.fillStyle = spec.awnings;
            ctx.beginPath(); ctx.moveTo(x - mm(0.8), y - mm(0.4)); ctx.lineTo(x + ww + mm(0.8), y - mm(0.4)); ctx.lineTo(x + ww + mm(0.4), y - mm(1.6)); ctx.lineTo(x - mm(0.4), y - mm(1.6)); ctx.fill();
        }
    };
    const door = (x, wd, num) => {
        const dh = Math.min(6.4, H - 1.2);
        ctx.fillStyle = spec.trim;
        ctx.fillRect(mm(x) - mm(0.35), py - mm(dh) - mm(0.35), mm(wd) + mm(0.7), mm(dh) + mm(0.35));
        lit(ctx, roundRect(mm(x), py - mm(dh), mm(wd), mm(dh), mm(0.15)), spec.doorColor ?? mix(spec.wall, "#3a2a40", 0.5), {sw: mm(0.4), rw: mm(0.12)});
        ctx.fillStyle = "#e8c060";
        ctx.beginPath(); ctx.arc(mm(x + wd * 0.8), py - mm(dh * 0.45), mm(0.22), 0, Math.PI * 2); ctx.fill();
        if (num) {
            ctx.fillStyle = "#ffffff";
            ctx.font = `700 ${mm(1.0)}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(num, mm(x + wd / 2), py - mm(dh) - mm(0.6));
        }
    };
    if (side) {
        const n = Math.max(1, Math.round(w / 9));
        for (let k = 0; k < n; k++) win(mm((k + 0.5) * w / n - 1.6), py * 0.3, mm(3.2), mm(Math.min(3.6, H * 0.35)));
    } else if (spec.doors) {
        // Motel: a row of doors, a window beside each door, numbers on the doors
        const n = spec.doors, cell = w / n;
        for (let k = 0; k < n; k++) {
            const x0 = k * cell;
            door(x0 + cell * 0.18, 2.6, String(101 + k));
            win(mm(x0 + cell * 0.5), py - mm(5.6), mm(cell * 0.38), mm(3.2));
            if (spec.chairs && k % 2 === 0) {
                ctx.fillStyle = spec.chairs;
                ctx.fillRect(mm(x0 + cell * 0.55), py - mm(1.6), mm(1.4), mm(1.6));
            }
        }
    } else {
        const n = spec.windows ?? 2;
        const dx = spec.door === null ? null : (spec.doorX ?? 0.5) * w - 1.6;
        const slots = [];
        for (let k = 0; k < n; k++) slots.push((k + 0.5) * w / n);
        for (const cx of slots) {
            if (dx !== null && Math.abs(cx - (dx + 1.6)) < 3.4) continue;
            win(mm(cx - 1.7), py - mm(H * 0.72), mm(3.4), mm(Math.min(4, H * 0.42)));
        }
        if (dx !== null) door(dx, 3.2);
    }
    // Sign band
    if (spec.sign && !side) {
        const sg = spec.sign;
        const sh = sg.h ?? 3.2, sy = py - mm(sg.y ?? (H - 0.6)) ;
        ctx.fillStyle = sg.bg ?? "#2a3a4a";
        ctx.fillRect(mm(w * 0.08), sy, px - mm(w * 0.16), mm(sh));
        ctx.strokeStyle = sg.edge ?? "#f4ecd8";
        ctx.lineWidth = mm(0.3);
        ctx.strokeRect(mm(w * 0.08), sy, px - mm(w * 0.16), mm(sh));
        const bandW = (px - mm(w * 0.16)) * 0.92;   // if the text is wider than the sign band, shrink the font size (the PORT GELLHORN PAWN & GUN strip at the pawn shop used to be cut off at both ends)
        if (sg.neon) neonText(ctx, em, sg.text, px / 2, sy + mm(sh * 0.74), mm(sh * 0.62), sg.color, sg.font ?? "Bahnschrift", "700", {glow: 0.5, maxW: bandW});
        else {
            fitFont(ctx, sg.text, mm(sh * 0.62), bandW, s => `700 ${s}px "${sg.font ?? "Bahnschrift"}", serif`);
            ctx.textAlign = "center";
            ctx.fillStyle = sg.color ?? "#f4ecd8";
            ctx.fillText(sg.text, px / 2, sy + mm(sh * 0.74));
        }
    }
    grain(ctx, 0.08);
    return {canvas: s.canvas, emissive: e.canvas};
}

function paintRoofSheet(wMm, hMm, color, kind, seed) {
    const r = rng(seed);
    const s = sheet(wMm, hMm, 10);
    const {ctx, mm, W, H} = s;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    if (kind === "tin") {   // corrugated tin: vertical strips
        for (let x = 0; x < W; x += mm(1.2)) {
            ctx.fillStyle = rgba("#ffffff", 0.09);
            ctx.fillRect(x, 0, mm(0.3), H);
            ctx.fillStyle = rgba(P.shadeDeep, 0.1);
            ctx.fillRect(x + mm(0.6), 0, mm(0.3), H);
        }
        for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba("#a85a3a", 0.25); ctx.fillRect(r() * W, r() * H, mm(1 + r() * 4), mm(0.6 + r() * 2)); }   // rust
    } else {                // asphalt shingles: staggered rows
        for (let y = 0, k = 0; y < H; y += mm(1.0), k++) {
            ctx.fillStyle = rgba(P.shadeDeep, 0.25);
            ctx.fillRect(0, y, W, mm(0.12));
            for (let x = (k % 2) * mm(0.9); x < W; x += mm(1.8)) {
                ctx.fillStyle = rgba(r() < 0.5 ? "#ffffff" : "#000000", 0.05 + r() * 0.06);
                ctx.fillRect(x, y + mm(0.12), mm(1.7), mm(0.88));
            }
        }
    }
    grain(ctx, 0.08);
    return s.canvas;
}

export function house(id, spec) {
    const g = new THREE.Group();
    const {W, D, H} = spec;
    const z0 = spec.stilts ?? 0;
    const body = new THREE.Group();
    body.position.z = z0;
    g.add(body);
    const front = paintHouseFace(spec, W, false), side = paintHouseFace(spec, D, true);
    const wall = (sv, w, x, y, rz, part) => {
        const m = standUp(rectSheet(sv.canvas, {id: `${id}.${part}`, width: w, height: H, thickness: 0.6, emissive: sv.emissive, emissiveIntensity: 1.0,
            back: spec.wall}));
        m.position.set(x, y, 0);
        m.rotation.z = rz;
        body.add(m);
    };
    wall(front, W, 0, 0, 0, "f");
    wall(side, D, -W / 2, D / 2, -Math.PI / 2, "l");
    wall(side, D, W / 2, D / 2, Math.PI / 2, "r");
    const bk = standUp(rectSheet(null, {id: id + ".b", width: W, height: H, thickness: 0.6, back: spec.wall}));
    bk.children[0].userData.paper.meta.mat.front.color = mix(spec.wall, P.shadeDeep, 0.25);
    bk.position.set(0, D, 0);
    bk.rotation.z = Math.PI;
    body.add(bk);
    // Roof
    const roofC = spec.roof ?? "#8a5a4a", kind = spec.roofKind ?? "shingle", oh = spec.overhang ?? 1.4;
    const type = spec.roofType ?? "gable";
    if (type === "flat") {
        const roof = rectSheet(paintRoofSheet(W + 1, D + 1, roofC, kind, spec.seed ?? 1), {id: id + ".roof", width: W + 1, height: D + 1, thickness: 0.8, origin: "center"});
        roof.position.set(0, D / 2, H);
        body.add(roof);
        if (spec.parapet !== false) {
            const par = customPaper(new THREE.BoxGeometry(W + 1, 0.6, 1.4), id + ".par", {color: spec.trim});
            par.position.set(0, -0.2, H + 0.6);
            body.add(par);
        }
    } else {
        // Pitched roof: ridge along x; two roof faces slope from the eaves to the ridge
        // The eaves are slightly lower than the wall (overhang), the roof is exactly at H at the wall line; ridge height = H + riseG
        const rise = spec.pitch ?? D * 0.35;
        const half = D / 2 + oh;
        const slope = Math.hypot(half, rise);
        const ang = Math.atan2(rise, half);
        const riseG = (D / 2) * rise / half;
        for (const sgn of [-1, 1]) {
            const rs = rectSheet(paintRoofSheet(W + oh * 2, slope, roofC, kind, (spec.seed ?? 1) + sgn), {id: `${id}.roof${sgn}`, width: W + oh * 2, height: slope,
                thickness: 0.7, origin: "bottom", back: mix(roofC, "#2a2030", 0.4)});
            // Local +y points to the ridge: rotate about x by ang; the back slope is first turned around (rotate about z by π), the print face still facing up
            rs.rotation.x = ang;
            const hold = new THREE.Group();
            hold.position.set(0, sgn < 0 ? -oh : D + oh, H - oh * rise / half);
            hold.rotation.z = sgn < 0 ? 0 : Math.PI;
            hold.add(rs);
            body.add(hold);
        }
        for (const [x, rz] of [[-W / 2, -Math.PI / 2], [W / 2, Math.PI / 2]]) {
            const tri = polySheet([[-D / 2, 0], [D / 2, 0], [0, riseG]], {id: id + ".gable", color: mix(spec.wall, "#ffffff", 0.05), thickness: 0.6});
            const holder = new THREE.Group();
            tri.rotation.x = Math.PI / 2;
            holder.add(tri);
            holder.position.set(x, D / 2, H);
            holder.rotation.z = rz;
            body.add(holder);
        }
    }
    // Porch: a single-slope awning at the front + a few posts
    if (spec.porch) {
        const pd = spec.porch.depth ?? 5, ph = spec.porch.h ?? H * 0.82;
        const pr = rectSheet(paintRoofSheet(W + 1, pd + 0.6, spec.porch.roof ?? roofC, "tin", 9), {id: id + ".porch", width: W + 1, height: pd + 0.6, thickness: 0.5, origin: "center"});
        pr.position.set(0, -pd / 2, ph);
        pr.rotation.x = -0.12;
        body.add(pr);
        const n = spec.porch.posts ?? 3;
        for (let k = 0; k < n; k++) {
            const x = lerp(-W / 2 + 0.6, W / 2 - 0.6, n === 1 ? 0.5 : k / (n - 1));
            const post = customPaper(new THREE.BoxGeometry(0.5, 0.5, ph), id + ".ppost", {color: spec.trim});
            post.position.set(x, -pd + 0.4, ph / 2);
            body.add(post);
        }
        // A sign stands on top of the porch (like THE RUSTY ANCHOR: cream base, dark green letters, dark border), readable even from a high angle
        if (spec.porch.sign) {
            const sg = spec.porch.sign, sw = sg.w ?? W * 0.8, sh = sg.h ?? 4;
            const s = sheet(sw, sh, 18);
            const {ctx, mm, W: px, H: py} = s;
            lit(ctx, roundRect(mm(0.2), mm(0.2), px - mm(0.4), py - mm(0.4), mm(0.6)), sg.bg ?? "#f4ecd0", {sw: mm(0.5), rw: mm(0.2)});
            ctx.strokeStyle = sg.edge ?? "#3a6a4a";
            ctx.lineWidth = mm(0.35);
            ctx.strokeRect(mm(0.7), mm(0.7), px - mm(1.4), py - mm(1.4));
            ctx.font = `700 ${mm(sh * 0.5)}px "${sg.font ?? "Bookman Old Style"}", serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = sg.color ?? "#2a6a4a";
            ctx.fillText(sg.text, px / 2, py * 0.54);
            finish(s.canvas, {inkW: mm(0.08), ink: "#2a3a30"});
            const board = standUp(cutout(s.canvas, {id: id + ".psign", ppm: 18, thickness: 0.6, trace: {cell: 2, dilate: 0}, back: "#8a7a60"}));
            board.position.set(0, -pd + 1.2, ph + 0.4);
            board.rotation.x = -0.12;
            body.add(board);
        }
        if (spec.porch.lights) {
            for (let k = 0; k < 9; k++) {
                const bulb = customPaper(new THREE.SphereGeometry(0.28, 6, 4), id + ".bulb", {color: "#fff2c0", emissiveColor: "#ffd890", emissive: 3});
                bulb.position.set(lerp(-W / 2, W / 2, k / 8), -pd + 0.5, ph - 0.6 - Math.sin(k / 8 * Math.PI) * 0.8);
                body.add(bulb);
            }
        }
    }
    // Stilts: posts + deck (a bit larger than the house) + railing
    if (z0 > 0) {
        const dw = W + (spec.deck ?? 6) * 2, dd = D + (spec.deck ?? 6) * 2;
        const ds = sheet(dw, dd, 8);
        ds.ctx.fillStyle = "#b08a6a";
        ds.ctx.fillRect(0, 0, ds.W, ds.H);
        for (let x = 0; x < ds.W; x += ds.mm(1.2)) { ds.ctx.fillStyle = rgba("#5a3a30", 0.35); ds.ctx.fillRect(x, 0, ds.mm(0.15), ds.H); }
        grain(ds.ctx, 0.1);
        const deck = rectSheet(ds.canvas, {id: id + ".deck", width: dw, height: dd, thickness: 0.8, origin: "center", back: "#6a4a3a"});
        deck.position.set(0, D / 2, z0 - 0.4);
        g.add(deck);
        for (const fx of [-0.5, -0.17, 0.17, 0.5]) for (const fy of [-0.5, 0, 0.5]) {
            const p = customPaper(new THREE.BoxGeometry(0.9, 0.9, z0 + 1.5), id + ".stilt", {color: "#6a5048"});
            p.position.set(fx * (dw - 1), D / 2 + fy * (dd - 1), (z0 - 1.5) / 2);
            g.add(p);
        }
        for (const [x, y, w, d] of [[0, D / 2 - dd / 2 + 0.3, dw, 0.3], [-dw / 2 + 0.3, D / 2, 0.3, dd], [dw / 2 - 0.3, D / 2, 0.3, dd]]) {
            const rail = customPaper(new THREE.BoxGeometry(w, d, 0.4), id + ".rail", {color: "#efe4d8"});
            rail.position.set(x, y, z0 + 2.4);
            g.add(rail);
            const n = Math.round(Math.max(w, d) / 3);
            for (let k = 0; k <= n; k++) {
                const bal = customPaper(new THREE.BoxGeometry(0.3, 0.3, 2.4), id + ".bal", {color: "#efe4d8"});
                bal.position.set(w > d ? x - w / 2 + k * w / n : x, w > d ? y : y - d / 2 + k * d / n, z0 + 1.2);
                g.add(bal);
            }
        }
    }
    g.userData.core = body;
    return g;
}

// =====================================================================
// Postcard district-name lettering (the official Visit Leonida postcard): thick letters laid out along an arc, dark outline, pulled down to the lower right for thickness, gradient on the letter faces
// All letters are joined into one piece by a thick outline (the automatic outline tracing keeps only the largest connected component)
// =====================================================================
export function postcardTitle(id, lines, {font = "Bookman Old Style", weight = "700", fill = ["#ffe27a", "#f0a020"], outline = "#2a1a20",
        depth = "#7a3a20", size = 16, arc = 0.18, gap = 0.82, hi = "#fff6c8"} = {}) {
    const pad = size * 0.5;
    const probe = sheet(10, 10, 6).ctx;
    probe.font = `${weight} ${size * 6}px "${font}", serif`;
    const widths = lines.map(t => probe.measureText(t).width / 6);
    const wMm = Math.max(...widths) * 1.05 + pad * 2, hMm = size * (1 + gap * (lines.length - 1)) + pad * 2 + size * arc;
    const ppm = 10;
    const s = sheet(wMm, hMm, ppm);
    const {ctx, mm, W, H} = s;
    const sizePx = mm(size);
    ctx.font = `${weight} ${sizePx}px "${font}", serif`;
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    // Each letter is placed along the arc: x determines the angle, high in the middle and low at the sides
    const glyphs = [];
    lines.forEach((text, li) => {
        const tw = ctx.measureText(text).width;
        let x = W / 2 - tw / 2;
        const baseY = mm(pad) + sizePx * (0.86 + li * gap) + mm(size * arc);
        for (const ch of text) {
            const cw = ctx.measureText(ch).width;
            const cxp = x + cw / 2;
            const u = (cxp - W / 2) / (W / 2);
            glyphs.push({ch, x: cxp, y: baseY - mm(size * arc) * (1 - u * u), rot: u * arc * 0.9});
            x += cw;
        }
    });
    const each = fn => glyphs.forEach(gl => { ctx.save(); ctx.translate(gl.x, gl.y); ctx.rotate(gl.rot); fn(gl); ctx.restore(); });
    ctx.textAlign = "center";
    // Thickness: stack dark layers one by one toward the lower right
    for (let k = 6; k >= 1; k--) each(gl => {
        ctx.fillStyle = k === 6 ? outline : depth;
        ctx.lineWidth = sizePx * 0.16;
        ctx.strokeStyle = outline;
        ctx.strokeText(gl.ch, mm(0.22) * k, mm(0.26) * k);
        ctx.fillText(gl.ch, mm(0.22) * k, mm(0.26) * k);
    });
    // Outer outline (thick, joins the letters)
    each(gl => { ctx.lineWidth = sizePx * 0.2; ctx.strokeStyle = outline; ctx.strokeText(gl.ch, 0, 0); });
    // Letter-face gradient + upper-half highlight
    each(gl => {
        const gr = ctx.createLinearGradient(0, -sizePx * 0.8, 0, 0);
        gr.addColorStop(0, fill[0]);
        gr.addColorStop(1, fill[1]);
        ctx.fillStyle = gr;
        ctx.fillText(gl.ch, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.restore();
    });
    // Draw a thin bright line inside
    each(gl => { ctx.lineWidth = sizePx * 0.025; ctx.strokeStyle = rgba(hi, 0.8); ctx.strokeText(gl.ch, -mm(0.1), -mm(0.12)); });
    grain(ctx, 0.07);
    // A thin crossbar under the letters joins the multiple rows and separated letters into one piece (covered by the thickness, almost invisible)
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = outline;
    ctx.fillRect(W * 0.12, H - mm(pad) - mm(size * 0.15), W * 0.76, mm(size * 0.12));
    for (let li = 0; li < lines.length - 1; li++) ctx.fillRect(W * 0.3, mm(pad) + sizePx * (0.6 + li * gap), W * 0.4, sizePx * gap);
    ctx.restore();
    const mesh = cutout(s.canvas, {id, ppm, thickness: 1.4, trace: {cell: 3, dilate: 1}, back: depth, edge: mix(depth, "#000000", 0.2)});
    const g = new THREE.Group();
    const st = standUp(mesh);
    st.position.z = 2.4;
    g.add(st);
    // Two thin support legs + a small base
    for (const x of [-wMm * 0.25, wMm * 0.25]) {
        const leg = customPaper(new THREE.BoxGeometry(0.8, 0.8, 4), id + ".leg", {color: outline});
        leg.position.set(x, 1, 2);
        g.add(leg);
    }
    g.userData.size = [wMm, hMm];
    return g;
}

// =====================================================================
// Water tower (Port_Gellhorn_06)
// =====================================================================
export function waterTower(id, {text = "PORT GELLHORN", h = 46, r = 9, color = "#a8c4d8"} = {}) {
    const g = new THREE.Group();
    const legs = [];
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = customPaper(new THREE.CylinderGeometry(0.5, 0.6, h, 6), id + ".leg", {color: "#8a8aa0"});
        leg.rotation.x = Math.PI / 2;
        leg.position.set(dx * r * 0.62, dy * r * 0.62, h / 2);
        g.add(leg);
        legs.push(leg);
    }
    for (let k = 1; k <= 3; k++) {
        const z = h * k / 4;
        for (const [x, y, w, d] of [[0, -r * 0.62, r * 1.24, 0.3], [0, r * 0.62, r * 1.24, 0.3], [-r * 0.62, 0, 0.3, r * 1.24], [r * 0.62, 0, 0.3, r * 1.24]]) {
            const b = customPaper(new THREE.BoxGeometry(w, d, 0.3), id + ".brace", {color: "#8a8aa0"});
            b.position.set(x, y, z);
            g.add(b);
        }
    }
    const s = sheet(2 * Math.PI * r, 12, 8);
    const {ctx, mm, W, H} = s;
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, mix(color, "#ffffff", 0.3)], [1, mix(color, "#5a6a8a", 0.3)]]);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = rgba("#8a6a5a", 0.15); ctx.fillRect((i * 37 % 100) / 100 * W, mm(2), mm(0.6), H - mm(2)); }   // rain rust streaks
    // v12: each copy of the text takes only 0.44 of a half circle (before, it was wider than a half circle: the two copies overlapped in the middle, and the two ends were cut off by the texture seam)
    fitFont(ctx, text, mm(3.4), W * 0.44, s => `900 ${s}px "Arial Black", Impact, sans-serif`);
    ctx.textAlign = "center";
    ctx.fillStyle = "#2a3a5a";
    for (const u of [0.25, 0.75]) ctx.fillText(text, W * u, H * 0.62);
    grain(ctx, 0.08);
    const tank = customPaper(new THREE.CylinderGeometry(r, r, 12, 32, 1, false), id + ".tank", {map: toTexture(s.canvas), rough: 0.6});
    tank.rotation.x = Math.PI / 2;
    tank.rotation.y = Math.PI;
    tank.position.z = h + 6;
    g.add(tank);
    const cone = customPaper(new THREE.ConeGeometry(r * 1.05, 6, 32), id + ".cone", {color: mix(color, "#ffffff", 0.2), rough: 0.6});
    cone.rotation.x = Math.PI / 2;
    cone.position.z = h + 15;
    g.add(cone);
    const walk = customPaper(new THREE.TorusGeometry(r + 0.8, 0.25, 4, 32), id + ".walk", {color: "#6a6a80"});
    walk.position.z = h + 0.6;
    g.add(walk);
    g.userData.cores = [tank, ...legs];
    return g;
}

// =====================================================================
// STARLET MOTEL sign (Port_Gellhorn_01): post + boomerang arrow + handwriting-style Starlet on a star-shaped plate + white-background MOTEL + VACANCY
// =====================================================================
export function starletSign(id) {
    const s = sheet(26, 64, 12), e = sheet(26, 64, 12);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    // Post: runs from the middle of the star all the way to the ground, joining the arrow, star, MOTEL plate and VACANCY into one piece (the automatic outline tracing keeps only the largest piece)
    ctx.fillStyle = "#5a5070";
    ctx.fillRect(W / 2 - mm(0.9), mm(20), mm(1.8), H - mm(20));
    // Boomerang arrow
    const boom = new Path2D();
    boom.moveTo(mm(4), mm(9));
    boom.quadraticCurveTo(mm(13), mm(1), mm(23), mm(4));
    boom.lineTo(mm(24.5), mm(1.6));
    boom.lineTo(mm(25.5), mm(7.4));
    boom.lineTo(mm(20), mm(7.6));
    boom.lineTo(mm(21.6), mm(5.8));
    boom.quadraticCurveTo(mm(13), mm(3.8), mm(5.4), mm(10.4));
    boom.closePath();
    lit(ctx, boom, "#e0283a", {sw: mm(0.4), rw: mm(0.15)});
    em.fillStyle = "#601018";
    em.fill(boom);
    neonLine(ctx, em, [[mm(5), mm(9.4)], [mm(13), mm(2.8)], [mm(22.6), mm(4.6)]], "#ff6a7a", mm(0.3));
    // Star-shaped plate
    const board = new Path2D();
    const cx = W / 2, cy = mm(19);
    for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? mm(7.6) : mm(12.4);
        if (k === 0) board.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.78);
        else board.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.78);
    }
    board.closePath();
    lit(ctx, board, "#1e2240", {sw: mm(0.6), rw: mm(0.2)});
    ctx.save(); ctx.clip(board);
    ctx.strokeStyle = "#f4ecf6"; ctx.lineWidth = mm(0.4); ctx.stroke(board);
    ctx.restore();
    em.strokeStyle = "#806080"; em.lineWidth = mm(0.3); em.stroke(board);
    neonText(ctx, em, "Starlet", cx, cy + mm(2.4), mm(6.8), "#ff8fd0", "Segoe Script", "700", {glow: 0.8, maxW: mm(15)});   // v12: pulled inside the star, no longer sticking out on both sides
    // MOTEL white plate (v12: the text scales to the plate width, 1 mm left on each side; before, the M and L stuck out of the plate)
    const mb = roundRect(mm(4), mm(29), W - mm(8), mm(7), mm(0.6));
    lit(ctx, mb, "#f8f4ec", {sw: mm(0.5), rw: mm(0.15)});
    em.fillStyle = "#3a3830";
    em.fill(mb);
    fitFont(ctx, "MOTEL", mm(5), W - mm(10), s => `900 ${s}px "Bookman Old Style", serif`);
    ctx.textAlign = "center";
    ctx.fillStyle = "#1e2240";
    ctx.fillText("MOTEL", W / 2, mm(34.6));
    // VACANCY
    const vb = roundRect(mm(6), mm(38), W - mm(12), mm(3.6), mm(0.4));
    ctx.fillStyle = "#1e1628";
    ctx.fill(vb);
    neonText(ctx, em, "VACANCY", W / 2, mm(40.8), mm(2.4), "#3fff9a", "Bahnschrift", "800", {glow: 0.6});
    finish(s.canvas, {inkW: mm(0.1), ink: "#1e1628"});
    return standUp(cutout(s.canvas, {id, ppm: 12, thickness: 1.0, emissive: e.canvas, emissiveIntensity: 2.0, trace: {cell: 3, dilate: 1}, back: "#3a3450"}));
}

// =====================================================================
// DELIGHTS light-box sign (Port_Gellhorn_04): white-bordered pink-field big light box + pink handwritten Delights + CABARET + a white-field black-text event board below
// =====================================================================
export function delightsSign(id) {
    const s = sheet(34, 46, 12), e = sheet(34, 46, 12);
    const {ctx, mm, W, H} = s, em = e.ctx;
    em.fillStyle = "#000";
    em.fillRect(0, 0, W, H);
    ctx.fillStyle = "#4a4458";
    for (const x of [W * 0.3, W * 0.7]) ctx.fillRect(x - mm(0.8), mm(14), mm(1.6), H - mm(14));
    // v12 redrawn from the official screenshot (before, it was pink text on a pink field, the text blurred into the field and stuck out of the light box): dark frame + white glowing light-box face,
    // pink bold handwriting Delights (dark pink outline, white inner line) + a pink arc under the text + CABARET in serif; pink neon vertical strips on both sides spelling GIRLS
    const box = roundRect(mm(0.6), mm(0.6), W - mm(1.2), mm(15.4), mm(1.2));
    lit(ctx, box, "#3a3040", {sw: mm(0.4), rw: mm(0.15)});
    const face = roundRect(mm(4.4), mm(1.7), W - mm(8.8), mm(13.2), mm(0.8));
    ctx.fillStyle = lin(ctx, 0, mm(2), 0, mm(15), [[0, "#fbfff8"], [1, "#e4efe6"]]);
    ctx.fill(face);
    em.fillStyle = "#6a706a";
    em.fill(face);
    for (const sx of [mm(2.5), W - mm(2.5)]) {
        const col = roundRect(sx - mm(1.5), mm(1.5), mm(3), mm(13.6), mm(0.6));
        ctx.fillStyle = "#2a1828"; ctx.fill(col);
        em.fillStyle = "#1a0810"; em.fill(col);
        "GIRLS".split("").forEach((ch, k) => neonText(ctx, em, ch, sx, mm(4.3 + k * 2.5), mm(2.3), "#ff3f9f", "Bahnschrift", "800", {glow: 0.7}));
    }
    {
        const tx = W / 2 - mm(1.4), ty = mm(9.6), faceW = W - mm(8.8);
        const size = fitFont(ctx, "Delights", mm(7.4), faceW * 0.82, s => `700 ${s}px "Segoe Script", cursive`);
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#8a1a4a"; ctx.lineWidth = size * 0.16;
        ctx.strokeText("Delights", tx, ty);
        ctx.fillStyle = "#ff4f9f";
        ctx.fillText("Delights", tx, ty);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = size * 0.025;
        ctx.strokeText("Delights", tx, ty);
        em.font = ctx.font; em.textAlign = "center";
        em.fillStyle = "#b02a6a";
        em.fillText("Delights", tx, ty);
        // Arc under the text: swung from under the D to the right, getting thinner toward the right
        const sw = new Path2D();
        sw.moveTo(tx - faceW * 0.36, ty + mm(1.0));
        sw.quadraticCurveTo(tx, ty + mm(3.2), tx + faceW * 0.34, ty + mm(0.2));
        sw.quadraticCurveTo(tx, ty + mm(2.2), tx - faceW * 0.36, ty + mm(1.0));
        ctx.fillStyle = "#ff4f9f"; ctx.fill(sw);
        ctx.strokeStyle = "#8a1a4a"; ctx.lineWidth = mm(0.12); ctx.stroke(sw);
        em.fillStyle = "#b02a6a"; em.fill(sw);
        fitFont(ctx, "CABARET", mm(2.1), faceW * 0.4, s => `700 ${s}px "Bookman Old Style", serif`);
        ctx.fillStyle = "#3a3040";
        ctx.fillText("CABARET", W / 2 + faceW * 0.22, mm(14.2));
    }
    ctx.textAlign = "center";
    // Event board: black text on a white field + a ring of small bulbs
    const mq = roundRect(mm(3), mm(18), W - mm(6), mm(11), mm(0.6));
    lit(ctx, mq, "#f4f0e8", {sw: mm(0.4), rw: mm(0.15)});
    em.fillStyle = "#585048";
    em.fill(mq);
    ctx.font = `800 ${mm(2.6)}px "Bahnschrift Condensed", Bahnschrift, sans-serif`;
    ctx.fillStyle = "#1e1628";
    ctx.fillText("OPEN LATE", W / 2, mm(22.2));
    ctx.fillText("LIVE MUSIC · DRINKS", W / 2, mm(26.2));
    for (let k = 0; k < 18; k++) {
        const x = mm(3.6) + (W - mm(7.2)) * k / 17;
        for (const y of [mm(18.6), mm(28.4)]) {
            ctx.fillStyle = "#fff4c0";
            ctx.fill(ellipse(x, y, mm(0.3), mm(0.3)));
            em.fillStyle = "#ffe090";
            em.fill(ellipse(x, y, mm(0.32), mm(0.32)));
        }
    }
    finish(s.canvas, {inkW: mm(0.1), ink: "#2a1b2c"});
    return standUp(cutout(s.canvas, {id, ppm: 12, thickness: 1.0, emissive: e.canvas, emissiveIntensity: 1.8, trace: {cell: 3, dilate: 1}, back: "#4a4458"}));
}

// =====================================================================
// Utility poles + power lines (Port_Gellhorn_06, Leonida_Keys_02)
// =====================================================================
export function powerPole(id, h = 34) {
    const g = new THREE.Group();
    const pole = customPaper(new THREE.CylinderGeometry(0.5, 0.7, h, 7), id + ".pole", {color: "#7a6050", rough: 0.95});
    pole.rotation.x = Math.PI / 2;
    pole.position.z = h / 2;
    g.add(pole);
    const arm = customPaper(new THREE.BoxGeometry(9, 0.6, 0.6), id + ".arm", {color: "#7a6050"});
    arm.position.z = h - 2;
    g.add(arm);
    for (const x of [-4, 0, 4]) {
        const ins = customPaper(new THREE.CylinderGeometry(0.25, 0.3, 1, 6), id + ".ins", {color: "#5a9a7a"});
        ins.rotation.x = Math.PI / 2;
        ins.position.set(x, 0, h - 1.2);
        g.add(ins);
    }
    const tr = customPaper(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 10), id + ".tx", {color: "#9a98a8"});
    tr.rotation.x = Math.PI / 2;
    tr.position.set(0, 1.4, h - 6);
    g.add(tr);
    g.userData.core = pole;
    g.userData.wireTop = h - 0.8;
    return g;
}
// Power line sagging between two points (excluded from the intersection check)
export function wire(a, b, sag = 3, color = "#2a2433") {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
        const f = k / 12;
        pts.push(new THREE.Vector3(lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f) - Math.sin(f * Math.PI) * sag));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.12, 4), new THREE.MeshStandardMaterial({color, roughness: 0.8}));
    m.userData.noAudit = true;
    m.castShadow = true;
    return m;
}

// =====================================================================
// Campfire (Port_Gellhorn_05, Grassrivers_07): a ring of stones, crossed logs, two crossed flames (emissive)
// =====================================================================
export function campfire(id) {
    const g = new THREE.Group();
    for (let k = 0; k < 9; k++) {
        const a = k * Math.PI * 2 / 9;
        const st = customPaper(new THREE.DodecahedronGeometry(0.9, 0), id + ".stone", {color: k % 2 ? "#8a8090" : "#a89aa8"});
        st.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0.5);
        g.add(st);
    }
    for (let k = 0; k < 3; k++) {
        const log = customPaper(new THREE.CylinderGeometry(0.45, 0.45, 5, 6), id + ".log", {color: "#5a3a30"});
        log.rotation.set(0, 0, k * Math.PI / 3);
        log.rotateX(Math.PI / 2 - 0.35);
        log.position.z = 1.2;
        g.add(log);
    }
    const s = sheet(5, 8, 16), e = sheet(5, 8, 16);
    const {ctx, mm, W, H} = s;
    const flame = new Path2D();
    flame.moveTo(W * 0.1, H);
    flame.bezierCurveTo(W * 0.0, H * 0.55, W * 0.35, H * 0.5, W * 0.3, H * 0.15);
    flame.bezierCurveTo(W * 0.55, H * 0.4, W * 0.6, H * 0.2, W * 0.62, 0);
    flame.bezierCurveTo(W * 0.95, H * 0.45, W * 1.0, H * 0.7, W * 0.9, H);
    flame.closePath();
    for (const [c2, cols] of [[ctx, ["#fff2a0", "#ffb040", "#ff5a2a"]], [e.ctx, ["#fff0a0", "#ffa030", "#e04020"]]]) {
        c2.fillStyle = lin(c2, 0, H, 0, 0, [[0, cols[0]], [0.5, cols[1]], [1, cols[2]]]);
        c2.fill(flame);
    }
    void mm;
    for (const rz of [0, Math.PI / 2]) {
        const f = standUp(cutout(s.canvas, {id: id + ".flame", ppm: 16, thickness: 0.3, emissive: e.canvas, emissiveIntensity: 2.6, trace: {cell: 2, dilate: 0},
            castShadow: false, edge: "#ffd070", back: "same"}));
        f.rotation.z = rz;
        f.position.z = 0.8;
        g.add(f);
    }
    g.userData.flames = g.children.slice(-2);
    return g;
}

// =====================================================================
// Freight train (the railway on the Port Gellhorn postcard): locomotive + boxcar + tank car + container flatcar; returns [[car, x relative to the locomotive], ...]
// =====================================================================
function paintCarSideBox(L, H, kind, seed) {
    const r = rng(seed);
    const s = sheet(L, H, 12);
    const {ctx, mm, W, H: ph} = s;
    if (kind === "box") {
        ctx.fillStyle = ["#9a4a3a", "#5a6a8a", "#c8a040"][seed % 3];
        ctx.fillRect(0, 0, W, ph);
        ctx.fillStyle = rgba("#000000", 0.15);
        for (let x = mm(1.5); x < W; x += mm(1.6)) ctx.fillRect(x, 0, mm(0.15), ph);
        ctx.strokeStyle = rgba("#2a1a20", 0.6);
        ctx.lineWidth = mm(0.25);
        ctx.strokeRect(W * 0.38, mm(0.8), W * 0.24, ph - mm(1.6));
        fitFont(ctx, "LEONIDA RAIL", mm(2.2), W * 0.34, s => `800 ${s}px Bahnschrift, sans-serif`);   // v12: before, the left end went off the canvas
        ctx.textAlign = "center";
        ctx.fillStyle = rgba("#ffffff", 0.85);
        ctx.fillText("LEONIDA RAIL", W * 0.2, ph * 0.45);
        ctx.font = `700 ${mm(1.2)}px Bahnschrift, sans-serif`;
        ctx.fillText("LRX " + (40000 + Math.floor(r() * 9999)), W * 0.2, ph * 0.66);
        // Graffiti
        ctx.fillStyle = ["#ff4fa3", "#3ff0e0", "#ffd36a"][seed % 3];
        ctx.font = `900 ${mm(3)}px Impact, sans-serif`;
        ctx.save(); ctx.translate(W * 0.8, ph * 0.6); ctx.rotate(-0.12); ctx.fillText("VC", 0, 0); ctx.restore();
    } else if (kind === "loco") {
        ctx.fillStyle = "#2f3a5a";
        ctx.fillRect(0, 0, W, ph);
        ctx.fillStyle = "#f5c518";
        ctx.fillRect(0, ph * 0.62, W, mm(1));
        ctx.fillRect(0, ph * 0.62 + mm(1.5), W, mm(0.4));
        ctx.fillStyle = "#c9d8f0";
        ctx.fillRect(W * 0.78, mm(1), W * 0.16, ph * 0.3);
        ctx.font = `800 ${mm(2.4)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#f5c518";
        ctx.fillText("LEONIDA", W * 0.42, ph * 0.5);
    } else {
        ctx.fillStyle = "#3a6aa8";
        ctx.fillRect(0, 0, W / 2, ph);
        ctx.fillStyle = "#e07a2a";
        ctx.fillRect(W / 2, 0, W / 2, ph);
        ctx.fillStyle = rgba("#000000", 0.18);
        for (let x = 0; x < W; x += mm(0.9)) ctx.fillRect(x, 0, mm(0.2), ph);
    }
    ctx.fillStyle = rgba("#000000", 0.25);
    ctx.fillRect(0, ph - mm(0.8), W, mm(0.8));
    grain(ctx, 0.08);
    return s.canvas;
}
export function freightTrain(id) {
    const out = [];
    const mk = (k, kind, L, H) => {
        const g = new THREE.Group();
        const Wd = 7.6;
        const side = paintCarSideBox(L, H, kind, k);
        const body = customPaper(new THREE.BoxGeometry(L, Wd, H), `${id}.${k}`, {color: "#5a5060", rough: 0.8});
        body.position.z = 3 + H / 2;
        g.add(body);
        for (const s of [-1, 1]) {
            const p = standUp(rectSheet(side, {id: `${id}.${k}s`, width: L, height: H, thickness: 0.2, back: "#5a5060"}));
            p.position.set(0, s * (Wd / 2 + 0.15), 3);
            if (s > 0) p.rotation.z = Math.PI;
            g.add(p);
        }
        if (kind === "tank") body.visible = false;
        if (kind === "tank") {
            const t = customPaper(new THREE.CapsuleGeometry(3.4, L - 7, 6, 14), `${id}.tank${k}`, {color: "#c8c4d0", rough: 0.5});
            t.rotation.z = Math.PI / 2;
            t.position.z = 6.6;
            g.add(t);
        }
        for (const x of [-L * 0.32, L * 0.32]) {
            const bogie = customPaper(new THREE.BoxGeometry(6, 6.8, 2.2), `${id}.bogie`, {color: "#2a2433"});
            bogie.position.set(x, 0, 1.4);
            g.add(bogie);
        }
        g.userData.core = kind === "tank" ? g.children.at(-3) : body;
        return g;
    };
    out.push([mk(0, "loco", 26, 9), 120]);
    out.push([mk(1, "box", 28, 9), 91]);
    out.push([mk(2, "tank", 26, 7), 63]);
    out.push([mk(3, "cont", 28, 7), 35]);
    out.push([mk(4, "box", 28, 9), 6]);
    return out;
}

// =====================================================================
// Picnic table (the yellow and blue tables in Leonida_Keys_03)
// =====================================================================
export function picnicTable(id, color = "#f5c518") {
    const g = new THREE.Group();
    const top = customPaper(new THREE.BoxGeometry(9, 4, 0.5), id + ".top", {color});
    top.position.z = 4.2;
    g.add(top);
    for (const y of [-3.4, 3.4]) {
        const b = customPaper(new THREE.BoxGeometry(9, 1.4, 0.4), id + ".bench", {color: mix(color, "#3a6aa8", 0.6)});
        b.position.set(0, y, 2.4);
        g.add(b);
    }
    for (const x of [-3.4, 3.4]) {
        const leg = customPaper(new THREE.BoxGeometry(0.5, 7.4, 0.5), id + ".leg", {color: "#8a7060"});
        leg.position.set(x, 0, 2.1);
        leg.rotation.x = 0;
        g.add(leg);
        for (const s of [-1, 1]) {
            const l2 = customPaper(new THREE.BoxGeometry(0.4, 0.4, 4.4), id + ".l2", {color: "#8a7060"});
            l2.position.set(x, s * 1.6, 2.1);
            l2.rotation.x = s * 0.5;
            g.add(l2);
        }
    }
    g.userData.core = top;
    return g;
}

void [poly, P, rectSheet];
