// Pedestrian standees: what people wear on the streets / beaches of Miami in GTA6 right now (based on official screenshots Vice_City_04/05/06/09/19/24, Jason_Duval_*, Lucia_Caminos_*).
// Print tank tops, camo cargo shorts, backwards caps, bucket hats, gold chains, sport sunglasses, jerseys, fishnet tops, bright bikinis, cargo pants with cropped tops, braids and dreadlocks, tattoos.
// Round 6 redraw: 7 heads tall (slightly bigger head, so the head and hat read at a distance), sloped shoulders + deltoids, upper arm and forearm of different thickness, hands, hats hugging the head shape;
// added back view (back), masked (mask: bandana / hood), poses for hands up / running / carrying a bag, items in hand: duffel bag, money bag, gas can, a stack of cash.
import {rng, lerp} from "./kit.js";
import {P, sheet, lit, poly, capsule, ellipse, roundRect, rgba, mix, finish} from "./paint.js";

export const SKIN = ["#f1c4a4", "#dca07e", "#b97a58", "#8d5a40", "#6a4030", "#4e2f24"];

// Camo / print: lay a pattern inside an already clipped region
function pattern(ctx, kind, x, y, w, h, c1, c2, c3, U, r) {
    if (kind === "camo") {
        for (let i = 0; i < 26; i++) {
            ctx.fillStyle = [c1, c2, c3][i % 3];
            ctx.beginPath();
            ctx.ellipse(x + r() * w, y + r() * h, U * (0.12 + r() * 0.2), U * (0.08 + r() * 0.14), r() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (kind === "tropical") {      // Hawaiian shirt: big leaves + flowers
        for (let i = 0; i < 14; i++) {
            ctx.fillStyle = i % 3 === 0 ? c3 : c2;
            ctx.beginPath();
            const cx = x + r() * w, cy = y + r() * h, a = r() * 3;
            ctx.ellipse(cx, cy, U * 0.22, U * 0.08, a, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (kind === "fishnet") {
        ctx.strokeStyle = rgba(c1, 0.85);
        ctx.lineWidth = U * 0.03;
        for (let k = -h; k < w + h; k += U * 0.14) {
            ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k - h, y + h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); ctx.stroke();
        }
    } else if (kind === "sparkle") {
        for (let i = 0; i < 60; i++) {
            ctx.fillStyle = [c1, c2, "#ffffff"][i % 3];
            ctx.fillRect(x + r() * w, y + r() * h, U * 0.05, U * 0.05);
        }
    } else if (kind === "paisley") {       // small pattern on the bandana
        for (let i = 0; i < 18; i++) {
            ctx.fillStyle = i % 2 ? c2 : c3;
            ctx.beginPath();
            ctx.ellipse(x + r() * w, y + r() * h, U * 0.05, U * 0.035, r() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function tattoo(ctx, path, U, r) {
    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = rgba("#2c2440", 0.55);
    ctx.lineWidth = U * 0.035;
    for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        const x = r() * ctx.canvas.width, y = r() * ctx.canvas.height;
        ctx.arc(x, y, U * (0.05 + r() * 0.12), r() * 6, r() * 6 + 3);
        ctx.stroke();
    }
    ctx.restore();
}

// A limb with varying thickness: thick at the start, thin at the end, the middle section (muscle) slightly bulging
function limb(x1, y1, x2, y2, r1, r2, bulge = 1.08) {
    const p = new Path2D();
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, rm = (r1 + r2) / 2 * bulge;
    p.arc(x1, y1, r1, a + Math.PI / 2, a - Math.PI / 2 + Math.PI * 2);
    p.quadraticCurveTo(mx - nx * rm * 1.05, my - ny * rm * 1.05, x2 - nx * r2, y2 - ny * r2);
    p.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2);
    p.quadraticCurveTo(mx + nx * rm * 1.05, my + ny * rm * 1.05, x1 + nx * r1, y1 + ny * r1);
    p.closePath();
    return p;
}

// o: {pose, sex, build, skin, top:{kind,color,c2,c3,print}, bottom:{kind,color,c2,c3}, shoes:{kind,color,c2},
//     hair:{kind,color}, hat:{kind,color,c2}, chain, shades, tattoo, prop, propColor, heightMm, back, mask:{kind,color,c2}, earrings}
// pose: stand / walk / run / selfie / wave / hips / handsup / carry
// prop: phone / cup / speaker / detector / duffel / moneybag / gascan / cash
export function paintStreetPerson(ppm, seed, o = {}) {
    const r = rng(seed);
    const sex = o.sex ?? "m";
    const build = o.build ?? "avg";
    const skin = o.skin ?? SKIN[Math.floor(r() * SKIN.length)];
    const top = o.top ?? {kind: "tank", color: "#f4f0ea"};
    const bottom = o.bottom ?? {kind: "cargo", color: "#6f6a48"};
    const shoes = o.shoes ?? {kind: "sneaker", color: "#ffffff", c2: P.red};
    const hair = o.hair ?? {kind: "short", color: "#2a1b2c"};
    const hat = o.hat ?? null;
    const pose = o.pose ?? "stand";
    const back = !!o.back;
    const mask = o.mask ?? null;
    const heightMm = o.heightMm ?? (sex === "f" ? 13.2 : 14);
    const armsUp = pose === "handsup";
    const {canvas, ctx, mm, W, H} = sheet(12, heightMm + (armsUp ? 4.2 : 1.6), ppm);
    const U = mm(heightMm) / 7;          // 7 heads tall
    const cx = W / 2, feet = H - mm(0.5);
    const headC = feet - U * 6.5, chin = headC + U * 0.52;
    const neckB = feet - U * 5.82, shY = feet - U * 5.66;
    const hip = feet - U * 3.45, kneeY = feet - U * 1.78;
    const wide = {slim: 0.9, avg: 1, muscle: 1.13, heavy: 1.16}[build];
    const sh = U * (sex === "f" ? 0.7 : 0.84) * wide;                                     // half shoulder width
    const wa = U * (sex === "f" ? 0.47 : 0.6) * (build === "heavy" ? 1.42 : build === "muscle" ? 1.02 : wide);   // waist
    const hi = U * (sex === "f" ? 0.76 : 0.64) * (build === "heavy" ? 1.2 : 1);         // hips
    const limbR = U * (build === "muscle" ? 0.24 : build === "heavy" ? 0.25 : sex === "f" ? 0.17 : 0.2);
    const skinParts = [];
    const L = (x1, y1, x2, y2, r1, r2, c, extra = {}, bulge = 1.08) => {
        const p = limb(x1, y1, x2, y2, r1, r2, bulge);
        lit(ctx, p, c, {sw: r1 * 0.9, rw: r1 * 0.35, blur: r1 * 0.12, ...extra});
        return p;
    };

    // ---- Pose: shoulders, elbows, wrists; hips, knees, ankles ----
    const sL = [cx - sh + limbR * 0.55, shY + U * 0.18], sR = [cx + sh - limbR * 0.55, shY + U * 0.18];
    const arm = (side, kind) => {
        const s = side < 0 ? sL : sR, out = side;
        if (kind === "up") return [s, [s[0] + out * U * 0.62, shY - U * 0.55], [s[0] + out * U * 0.42, shY - U * 1.7]];
        if (kind === "wave") return [s, [s[0] + out * U * 0.7, shY + U * 0.35], [s[0] + out * U * 0.95, shY - U * 0.75]];
        if (kind === "selfie") return [s, [s[0] + out * U * 0.55, shY + U * 1.0], [s[0] + out * U * 0.32, headC + U * 0.05]];
        if (kind === "hip") return [s, [s[0] + out * U * 0.72, shY + U * 1.15], [cx + out * (wa + U * 0.12), hip - U * 0.55]];
        if (kind === "run") return [s, [s[0] + out * U * 0.38, shY + U * 1.2], [s[0] + out * U * 0.05, shY + U * 0.55]];
        if (kind === "carry") return [s, [s[0] + out * U * 0.3, shY + U * 1.4], [s[0] + out * U * 0.42, hip + U * 0.25]];
        // Hanging naturally: elbows slightly out, forearms tucked in a bit
        const sw = pose === "walk" ? side * 0.18 : 0;
        return [s, [s[0] + out * U * (0.3 + sw), shY + U * 1.36], [s[0] + out * U * (0.36 - sw * 1.6), hip + U * 0.06]];
    };
    const kindL = armsUp ? "up" : pose === "wave" ? "wave" : pose === "selfie" ? "selfie" : pose === "run" ? "run" : "down";
    const kindR = armsUp ? "up" : pose === "hips" ? "hip" : pose === "run" ? "run" : (pose === "carry" || ["duffel", "moneybag", "gascan"].includes(o.prop)) ? "carry" : "down";
    const armL = arm(-1, kindL), armR = arm(1, kindR);
    const stride = pose === "run" ? 1 : pose === "walk" ? 0.5 : 0;
    const legs = [-1, 1].map(side => {
        const h0 = [cx + side * hi * 0.46, hip];
        const kn = [cx + side * (hi * 0.5 + stride * U * 0.25), kneeY - (side < 0 ? stride * U * 0.35 : 0)];
        const an = [cx + side * (hi * 0.46 + stride * U * 0.55), feet - U * 0.16 - (side < 0 ? stride * U * 0.5 : 0)];
        return [h0, kn, an];
    });

    // ---- Long hair / dreadlocks at the back (behind the body in front view, laid over the back in back view; drawn afterwards) ----
    const longHair = () => {
        if (hair.kind === "long" || hair.kind === "braids" || hair.kind === "dreads") {
            const n = hair.kind === "long" ? 1 : hair.kind === "braids" ? 2 : 7;
            for (let i = 0; i < n; i++) {
                const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * U * 0.9;
                const len = hair.kind === "long" ? U * 1.7 : U * (1.3 + r() * 0.5);
                const w = hair.kind === "long" ? U * 0.5 : U * 0.11;
                L(cx + off, headC, cx + off * 1.25, headC + len, w, w * 0.78, hair.color, {rw: w * 0.2}, 1.02);
            }
        }
        if (hair.kind === "pony") L(cx + U * (back ? 0 : 0.38), headC - U * 0.25, cx + U * (back ? 0.05 : 0.58), headC + U * 0.95, U * 0.18, U * 0.07, hair.color, {}, 1.15);
    };
    if (!back) longHair();

    // ---- Legs ----
    const covered = ["cargo_pants", "jeans", "baggy", "joggers", "jumpsuit"].includes(bottom.kind);
    const legColor = covered ? bottom.color : skin;
    for (const [[x1, y1], [kx, ky], [x2, y2]] of legs.slice().reverse()) {
        const baggy = bottom.kind === "baggy" || bottom.kind === "cargo_pants" || bottom.kind === "jumpsuit";
        const lower = limb(kx, ky, x2, y2, limbR * (baggy ? 1.22 : 1.0), limbR * (baggy ? 1.1 : 0.62), baggy ? 1 : 1.2);
        const upper = limb(x1, y1, kx, ky, limbR * (baggy ? 1.4 : 1.4), limbR * (baggy ? 1.25 : 1.02), 1.04);
        const leg = new Path2D();
        leg.addPath(upper);
        leg.addPath(lower);
        lit(ctx, leg, legColor, {sw: limbR * 1.0, rw: limbR * 0.35, blur: limbR * 0.12});
        if (legColor === skin) skinParts.push(leg);
        // Shorts / swim trunks / camo cargo: reach above the knee
        if (["cargo", "shorts", "trunks", "denim_shorts"].includes(bottom.kind)) {
            const len = bottom.kind === "trunks" ? 0.62 : bottom.kind === "denim_shorts" ? 0.42 : 0.92;
            const p = L(x1, y1, lerp(x1, kx, len), lerp(y1, ky, len), limbR * 1.6, limbR * (bottom.kind === "denim_shorts" ? 1.35 : 1.5), bottom.color, {rw: limbR * 0.3}, 1);
            if (bottom.kind === "cargo" || bottom.c2) {
                ctx.save(); ctx.clip(p);
                pattern(ctx, bottom.pattern ?? "camo", x1 - U, y1 - U * 0.2, U * 2, U * 2, bottom.c2 ?? "#4d4a30", bottom.c3 ?? "#9b9060", "#3a3826", U, r);
                ctx.restore();
                if (bottom.kind === "cargo") {   // side pocket
                    ctx.fillStyle = rgba("#2a2418", 0.35);
                    ctx.fill(roundRect(lerp(x1, kx, 0.5) + (x1 < cx ? -limbR * 1.45 : limbR * 0.55), lerp(y1, ky, 0.45), limbR * 0.85, limbR * 1.0, limbR * 0.15));
                }
            }
            // a turned-up cuff at the hem
            ctx.strokeStyle = rgba(P.shadeDeep, 0.45);
            ctx.lineWidth = U * 0.04;
            const ex = lerp(x1, kx, len), ey = lerp(y1, ky, len);
            ctx.beginPath(); ctx.moveTo(ex - limbR * 1.4, ey - U * 0.08); ctx.lineTo(ex + limbR * 1.4, ey - U * 0.08); ctx.stroke();
        }
        if (bottom.kind === "cargo_pants" || bottom.kind === "baggy") {
            ctx.fillStyle = rgba("#2a2418", 0.3);
            ctx.fill(roundRect(kx + (x1 < cx ? -limbR * 1.7 : limbR * 0.5), ky - U * 0.4, limbR * 0.95, limbR * 1.15, limbR * 0.15));
        }
        if (bottom.kind === "jeans") {
            ctx.save(); ctx.clip(upper);
            ctx.fillStyle = rgba("#c9d8ff", 0.35);
            ctx.fillRect(kx - limbR * 1.4, ky - U * 0.6, limbR * 2.8, U * 0.4);
            ctx.restore();
        }
        // Shoes: seen from the front, a round toe wide at the front and narrow at the back, a white stripe on the sole
        if (shoes.kind === "slides") {
            ctx.fillStyle = "#2a2433";
            ctx.fill(roundRect(x2 - U * 0.3, y2 + U * 0.08, U * 0.62, U * 0.12, U * 0.05));
            ctx.fillStyle = shoes.color;
            ctx.fill(roundRect(x2 - U * 0.24, y2 - U * 0.05, U * 0.5, U * 0.15, U * 0.06));
        } else if (shoes.kind !== "none") {
            const out = x2 < cx ? -1 : 1;
            const s = new Path2D();
            s.moveTo(x2 - U * 0.2, y2 - U * 0.18);
            s.quadraticCurveTo(x2 + out * U * 0.05, y2 - U * 0.26, x2 + U * 0.2, y2 - U * 0.18);
            s.quadraticCurveTo(x2 + U * 0.38 + out * U * 0.06, y2 + U * 0.02, x2 + U * 0.36 + out * U * 0.06, y2 + U * 0.2);
            s.lineTo(x2 - U * 0.36 + out * U * 0.06, y2 + U * 0.2);
            s.quadraticCurveTo(x2 - U * 0.38 + out * U * 0.06, y2 + U * 0.02, x2 - U * 0.2, y2 - U * 0.18);
            s.closePath();
            lit(ctx, s, shoes.color, {sw: U * 0.12, rw: U * 0.05});
            ctx.fillStyle = shoes.c2 ?? P.red;
            ctx.fill(ellipse(x2 + out * U * 0.08, y2 - U * 0.02, U * 0.16, U * 0.06, out * 0.3));
            ctx.fillStyle = "#e9e4f4";
            ctx.fillRect(x2 - U * 0.36 + out * U * 0.06, y2 + U * 0.13, U * 0.72, U * 0.07);
        }
    }

    // ---- Torso: sloped shoulders (trapezius) -> deltoids -> armpits -> waist -> hips ----
    const torso = new Path2D();
    const nk = U * (build === "muscle" ? 0.24 : 0.2);
    torso.moveTo(cx - nk, neckB - U * 0.14);
    torso.quadraticCurveTo(cx - sh * 0.62, neckB - U * 0.04, cx - sh, shY + U * 0.1);
    torso.quadraticCurveTo(cx - sh * 1.08, shY + U * 0.48, cx - sh * 0.9, shY + U * 0.9);
    torso.quadraticCurveTo(cx - wa * 1.04, hip - U * 1.25, cx - wa, hip - U * 0.6);
    torso.quadraticCurveTo(cx - hi * 1.05, hip - U * 0.25, cx - hi, hip + U * 0.16);
    torso.lineTo(cx + hi, hip + U * 0.16);
    torso.quadraticCurveTo(cx + hi * 1.05, hip - U * 0.25, cx + wa, hip - U * 0.6);
    torso.quadraticCurveTo(cx + wa * 1.04, hip - U * 1.25, cx + sh * 0.9, shY + U * 0.9);
    torso.quadraticCurveTo(cx + sh * 1.08, shY + U * 0.48, cx + sh, shY + U * 0.1);
    torso.quadraticCurveTo(cx + sh * 0.62, neckB - U * 0.04, cx + nk, neckB - U * 0.14);
    torso.closePath();
    lit(ctx, torso, skin, {sw: U * 0.5, rw: U * 0.18, blur: U * 0.1});
    skinParts.push(torso);
    if (build === "muscle" && top.kind === "none" && !back) {
        ctx.strokeStyle = rgba("#5a3040", 0.35);
        ctx.lineWidth = U * 0.04;
        ctx.beginPath();
        ctx.moveTo(cx, shY + U * 0.35); ctx.lineTo(cx, hip - U * 0.3);
        ctx.moveTo(cx - sh * 0.7, shY + U * 0.8); ctx.quadraticCurveTo(cx, shY + U * 1.0, cx + sh * 0.7, shY + U * 0.8);
        ctx.stroke();
    }
    // Waistband
    if (["cargo", "shorts", "trunks", "denim_shorts", "cargo_pants", "jeans", "baggy", "joggers", "jumpsuit"].includes(bottom.kind)) {
        ctx.save(); ctx.clip(torso);
        ctx.fillStyle = bottom.color;
        ctx.fillRect(cx - hi * 1.3, hip - U * 0.28, hi * 2.6, U * 0.6);
        if (bottom.kind === "cargo" || bottom.c2) pattern(ctx, bottom.pattern ?? "camo", cx - hi * 1.3, hip - U * 0.28, hi * 2.6, U * 0.6, bottom.c2 ?? "#4d4a30", bottom.c3 ?? "#9b9060", "#3a3826", U, r);
        ctx.fillStyle = rgba(P.shadeDeep, 0.35);
        ctx.fillRect(cx - hi * 1.3, hip - U * 0.3, hi * 2.6, U * 0.05);
        ctx.restore();
    }
    // Top
    ctx.save();
    ctx.clip(torso);
    const tk = top.kind;
    const band = (y0, y1, color) => { ctx.fillStyle = color; ctx.fillRect(cx - sh * 1.3, y0, sh * 2.6, y1 - y0); };
    if (["tank", "tee", "jersey", "camp", "hoodie", "crop", "polo", "jumpsuit", "uniform", "vest"].includes(tk)) {
        const y0 = neckB - U * 0.3;
        const y1 = tk === "crop" ? hip - U * 1.1 : hip + U * 0.05;
        band(y0, y1, top.color);
        if (tk === "tank" || tk === "vest") {
            // Tank top: narrow straps, large armholes, deep neckline
            ctx.fillStyle = skin;
            ctx.fill(ellipse(cx - sh * 0.98, shY + U * 0.4, sh * 0.36, U * 0.66));
            ctx.fill(ellipse(cx + sh * 0.98, shY + U * 0.4, sh * 0.36, U * 0.66));
            if (!back) ctx.fill(ellipse(cx, neckB - U * 0.08, sh * 0.34, U * 0.42));
            else ctx.fill(ellipse(cx, neckB - U * 0.12, sh * 0.3, U * 0.24));
        } else if (!back) {
            ctx.fillStyle = skin;
            ctx.fill(ellipse(cx, neckB - U * 0.18, nk * 1.25, U * 0.24));
            if (tk === "uniform" || tk === "polo") {   // collar
                ctx.fillStyle = mix(top.color, "#ffffff", 0.25);
                ctx.fill(poly([[cx - nk * 1.4, neckB - U * 0.1], [cx, neckB + U * 0.22], [cx - nk * 0.3, neckB - U * 0.14]]));
                ctx.fill(poly([[cx + nk * 1.4, neckB - U * 0.1], [cx, neckB + U * 0.22], [cx + nk * 0.3, neckB - U * 0.14]]));
            }
        }
        if (!back && top.print === "leonida") {   // a print on the chest: sunset + palm + text (Jason's Leonida tank top)
            const px = cx - sh * 0.48, py = shY + U * 0.42, pw = sh * 0.96, ph = U * 0.78;
            ctx.fillStyle = top.c2 ?? "#ffb35a";
            ctx.beginPath(); ctx.arc(px + pw * 0.5, py + ph * 0.55, pw * 0.3, Math.PI, 0); ctx.fill();
            ctx.fillStyle = top.c3 ?? "#2f8a8a";
            ctx.fillRect(px + pw * 0.12, py + ph * 0.55, pw * 0.76, ph * 0.1);
            ctx.fillStyle = "#3a2a40";
            ctx.font = `700 ${U * 0.24}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("LEONIDA", cx, py + ph * 0.95);
        } else if (!back && top.print === "logo") {
            ctx.fillStyle = top.c2 ?? P.red;
            ctx.fill(roundRect(cx - sh * 0.3, shY + U * 0.5, sh * 0.6, U * 0.35, U * 0.08));
        } else if (top.print === "text") {      // a line of text on the back / chest (POLICE, LDOC inmate number)
            ctx.fillStyle = top.c2 ?? "#ffffff";
            ctx.font = `800 ${U * (top.textSize ?? 0.3)}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(top.text ?? "", cx, shY + U * (back ? 0.95 : 0.75));
        }
        if (tk === "jersey") {
            ctx.fillStyle = top.c2 ?? "#ff8a3a";
            ctx.fillRect(cx - sh * 1.3, neckB - U * 0.3, sh * 0.42, U * 3.5);
            ctx.fillRect(cx + sh * 0.88, neckB - U * 0.3, sh * 0.42, U * 3.5);
            ctx.fillStyle = "#ffffff";
            ctx.font = `800 ${U * 0.75}px Bahnschrift, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(String(top.number ?? 13), cx, shY + U * 1.45);
        }
        if (tk === "camp") {
            pattern(ctx, "tropical", cx - sh * 1.3, y0, sh * 2.6, y1 - y0, top.color, top.c2 ?? "#2f7a5a", top.c3 ?? "#ff7fa8", U, r);
            if (!back) {
                ctx.strokeStyle = rgba("#2a1b2c", 0.4);
                ctx.lineWidth = U * 0.04;
                ctx.beginPath(); ctx.moveTo(cx, shY + U * 0.1); ctx.lineTo(cx, y1); ctx.stroke();
                if (top.open) { ctx.fillStyle = skin; ctx.fill(poly([[cx - sh * 0.22, y0], [cx + sh * 0.22, y0], [cx, y1 - U * 0.4]])); }
            }
        }
        if (tk === "hoodie") {
            if (!back) { ctx.fillStyle = mix(top.color, "#000000", 0.25); ctx.fillRect(cx - sh * 0.5, hip - U * 1.1, sh, U * 0.55); }
            ctx.fillStyle = mix(top.color, "#000000", 0.15);
            ctx.fillRect(cx - sh * 1.3, hip - U * 0.12, sh * 2.6, U * 0.2);
        }
        if (tk === "vest") {   // Tactical vest / bulletproof vest: a few magazine pouches on the front
            ctx.fillStyle = mix(top.color, "#000000", 0.25);
            for (const dx of [-0.45, 0, 0.45]) ctx.fill(roundRect(cx + dx * sh - U * 0.17, shY + U * 1.1, U * 0.34, U * 0.5, U * 0.05));
        }
    } else if (tk === "bikini") {
        if (!back) {
            ctx.fillStyle = top.color;
            ctx.fill(ellipse(cx - sh * 0.38, shY + U * 0.62, sh * 0.32, U * 0.25));
            ctx.fill(ellipse(cx + sh * 0.38, shY + U * 0.62, sh * 0.32, U * 0.25));
            if (top.pattern) pattern(ctx, top.pattern, cx - sh, shY + U * 0.35, sh * 2, U * 0.55, top.c2 ?? "#ffffff", top.c3 ?? P.pinkHot, "#fff", U, r);
        } else {
            ctx.fillStyle = top.color;
            ctx.fillRect(cx - sh, shY + U * 0.55, sh * 2, U * 0.12);
        }
    } else if (tk === "fishnet") {
        pattern(ctx, "fishnet", cx - sh * 1.3, neckB - U * 0.3, sh * 2.6, U * 3.3, top.color, top.color, top.color, U, r);
        ctx.fillStyle = top.c2 ?? P.pinkHot;
        ctx.fill(ellipse(cx - sh * 0.38, shY + U * 0.62, sh * 0.32, U * 0.25));
        ctx.fill(ellipse(cx + sh * 0.38, shY + U * 0.62, sh * 0.32, U * 0.25));
    } else if (tk === "sparkle") {
        band(shY + U * 0.2, hip + U * 0.6, top.color);
        pattern(ctx, "sparkle", cx - sh * 1.3, shY + U * 0.2, sh * 2.6, U * 3, mix(top.color, "#ffffff", 0.5), top.c2 ?? "#ffd36a", "#fff", U, r);
    }
    if (bottom.kind === "bikini" || bottom.kind === "trunks_low") {
        ctx.fillStyle = bottom.color;
        ctx.fill(poly([[cx - hi * 1.05, hip - U * 0.15], [cx + hi * 1.05, hip - U * 0.15], [cx + hi * 0.3, hip + U * 0.5], [cx - hi * 0.3, hip + U * 0.5]]));
    }
    if (bottom.kind === "mini") band(hip - U * 0.35, hip + U * 0.75, bottom.color);
    ctx.restore();
    if (bottom.kind === "mini") {
        ctx.fillStyle = bottom.color;
        ctx.fill(poly([[cx - hi * 1.08, hip - U * 0.2], [cx + hi * 1.08, hip - U * 0.2], [cx + hi * 1.25, hip + U * 0.85], [cx - hi * 1.25, hip + U * 0.85]]));
    }
    lit(ctx, torso, null, {fill: false, sw: U * 0.5, rw: U * 0.16, blur: U * 0.1, shadeA: 0.5});

    // ---- Gold chain ----
    if (o.chain && !back) {
        for (const [rr, lw] of [[U * 0.42, U * 0.07], [U * 0.58, U * 0.09]].slice(0, o.chain === 2 ? 2 : 1)) {
            ctx.strokeStyle = "#ffd36a";
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.arc(cx, neckB - U * 0.2, rr, 0.22 * Math.PI, 0.78 * Math.PI);
            ctx.stroke();
        }
        ctx.fillStyle = "#ffe08a";
        ctx.fill(ellipse(cx, neckB - U * 0.2 + U * 0.6, U * 0.12, U * 0.15));
    }
    // ---- Crossbody bag strap (Jason's crossbody strap) ----
    if (o.strap) {
        ctx.strokeStyle = o.strap === true ? "#2a2433" : o.strap;
        ctx.lineWidth = U * 0.1;
        ctx.beginPath(); ctx.moveTo(cx + sh * 0.55, neckB - U * 0.02); ctx.lineTo(cx - wa * 0.9, hip - U * 0.35); ctx.stroke();
    }

    // ---- Arms: thick upper arm (deltoid, biceps) -> elbow -> forearm tapering -> hand ----
    const sleeve = ["tee", "jersey", "camp", "polo", "uniform"].includes(tk) ? 0.5 : (tk === "hoodie" || tk === "jumpsuit") ? 1 : 0;
    const hands = [];
    for (const [s, e, w] of [armL, armR]) {
        const out = s[0] < cx ? -1 : 1;
        // Upper arm + forearm + deltoid merged into one shape, shaded only once (shading them separately would look like a jointed doll)
        const armP = new Path2D();
        armP.addPath(limb(s[0], s[1], e[0], e[1], limbR * 1.1, limbR * 0.78, 1.12));
        armP.addPath(limb(e[0], e[1], w[0], w[1], limbR * 0.84, limbR * 0.56, 1.1));
        if (sleeve === 0) armP.addPath(ellipse(s[0] + out * limbR * 0.1, s[1] - U * 0.02, limbR * 1.18, limbR * 1.3));
        lit(ctx, armP, skin, {sw: limbR * 0.9, rw: limbR * 0.32, blur: limbR * 0.12});
        skinParts.push(armP);
        if (sleeve > 0) {
            const sx = lerp(s[0], e[0], sleeve >= 1 ? 1 : sleeve), sy = lerp(s[1], e[1], sleeve >= 1 ? 1 : sleeve);
            const sp = L(s[0] + out * limbR * 0.1, s[1] - U * 0.04, sx, sy, limbR * 1.3, limbR * 1.12, top.color, {rw: limbR * 0.3}, 1.02);
            if (tk === "camp") { ctx.save(); ctx.clip(sp); pattern(ctx, "tropical", s[0] - U, s[1] - U, U * 2, U * 2, top.color, top.c2 ?? "#2f7a5a", top.c3 ?? "#ff7fa8", U, r); ctx.restore(); }
            if (sleeve >= 1) {
                L(e[0], e[1], lerp(e[0], w[0], 0.9), lerp(e[1], w[1], 0.9), limbR * 1.15, limbR * 0.9, top.color, {rw: limbR * 0.3}, 1.04);
                L(lerp(e[0], w[0], 0.84), lerp(e[1], w[1], 0.84), lerp(e[0], w[0], 0.94), lerp(e[1], w[1], 0.94), limbR * 0.92, limbR * 0.9, mix(top.color, "#000000", 0.18), {sw: 0, rw: 0});
            }
        }
        // Hand: a small rounded palm following the forearm direction
        const a = Math.atan2(w[1] - e[1], w[0] - e[0]);
        const hx = w[0] + Math.cos(a) * U * 0.16, hy = w[1] + Math.sin(a) * U * 0.16;
        lit(ctx, ellipse(hx, hy, U * 0.16, U * 0.2, a - Math.PI / 2), o.gloves ?? skin, {sw: U * 0.07, rw: U * 0.03});
        hands.push([hx, hy, a]);
    }
    // What is in the hand (left hand hands[0], right hand hands[1])
    const [hL, hR] = hands;
    if ((o.prop === "phone" || pose === "selfie") && !back) {
        ctx.fillStyle = "#1e1628";
        ctx.fill(roundRect(hL[0] - U * 0.15, hL[1] - U * 0.46, U * 0.3, U * 0.52, U * 0.06));
        ctx.fillStyle = rgba("#9fd8ff", 0.85);
        ctx.fillRect(hL[0] - U * 0.11, hL[1] - U * 0.42, U * 0.22, U * 0.36);
    }
    if (o.prop === "cup") {
        const cup = poly([[hR[0] - U * 0.17, hR[1] - U * 0.48], [hR[0] + U * 0.17, hR[1] - U * 0.48], [hR[0] + U * 0.13, hR[1] + U * 0.06], [hR[0] - U * 0.13, hR[1] + U * 0.06]]);
        lit(ctx, cup, o.propColor ?? "#e2283c", {sw: U * 0.08, rw: U * 0.04});
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(hR[0] - U * 0.17, hR[1] - U * 0.5, U * 0.34, U * 0.06);
    }
    if (o.prop === "speaker") {
        const sp = roundRect(hR[0] - U * 0.5, hR[1] - U * 0.1, U * 1.0, U * 0.45, U * 0.12);
        lit(ctx, sp, "#2a2433", {sw: U * 0.1, rw: U * 0.05});
        ctx.fillStyle = "#3ff0e0";
        ctx.fill(ellipse(hR[0] - U * 0.22, hR[1] + U * 0.12, U * 0.12, U * 0.12));
        ctx.fill(ellipse(hR[0] + U * 0.22, hR[1] + U * 0.12, U * 0.12, U * 0.12));
    }
    if (o.prop === "detector") {
        ctx.strokeStyle = "#6a6a80";
        ctx.lineWidth = U * 0.07;
        ctx.beginPath(); ctx.moveTo(hR[0], hR[1]); ctx.lineTo(hR[0] + U * 0.9, feet - U * 0.25); ctx.stroke();
        ctx.fillStyle = "#3a3a4a";
        ctx.fill(ellipse(hR[0] + U * 1.0, feet - U * 0.2, U * 0.32, U * 0.1));
    }
    if (o.prop === "duffel") {   // duffel bag: carried in the hand, two handles joined to the hand
        const bc = o.propColor ?? "#2a2433";
        const bx = hR[0] + U * 0.05, by = hR[1] + U * 0.55;
        ctx.strokeStyle = mix(bc, "#000000", 0.3);
        ctx.lineWidth = U * 0.08;
        ctx.beginPath(); ctx.moveTo(bx - U * 0.4, by - U * 0.25); ctx.lineTo(hR[0], hR[1]); ctx.lineTo(bx + U * 0.4, by - U * 0.25); ctx.stroke();
        const bag = roundRect(bx - U * 0.85, by - U * 0.3, U * 1.7, U * 0.78, U * 0.3);
        lit(ctx, bag, bc, {sw: U * 0.16, rw: U * 0.06});
        ctx.fillStyle = mix(bc, "#000000", 0.35);
        ctx.fillRect(bx - U * 0.7, by - U * 0.12, U * 1.4, U * 0.05);
        ctx.fillRect(bx - U * 0.55, by - U * 0.3, U * 0.08, U * 0.78);
        ctx.fillRect(bx + U * 0.47, by - U * 0.3, U * 0.08, U * 0.78);
        if (o.cashPeek) {   // a stack of green banknotes showing at the zipper opening
            ctx.fillStyle = "#7ac870";
            ctx.fill(roundRect(bx - U * 0.35, by - U * 0.45, U * 0.7, U * 0.2, U * 0.04));
            ctx.fillStyle = "#4a8a4a";
            ctx.fillRect(bx - U * 0.05, by - U * 0.45, U * 0.1, U * 0.2);
        }
    }
    if (o.prop === "moneybag") {   // money bag: a drawstring sack + a big $
        const bc = o.propColor ?? "#d8c8a0";
        const bx = hR[0] + U * 0.05, by = hR[1] + U * 0.72;
        const sack = new Path2D();
        sack.moveTo(bx - U * 0.16, by - U * 0.62);
        sack.quadraticCurveTo(bx - U * 0.72, by - U * 0.3, bx - U * 0.62, by + U * 0.18);
        sack.quadraticCurveTo(bx, by + U * 0.5, bx + U * 0.62, by + U * 0.18);
        sack.quadraticCurveTo(bx + U * 0.72, by - U * 0.3, bx + U * 0.16, by - U * 0.62);
        sack.closePath();
        lit(ctx, sack, bc, {sw: U * 0.16, rw: U * 0.06});
        lit(ctx, poly([[bx - U * 0.2, by - U * 0.62], [bx + U * 0.2, by - U * 0.62], [bx + U * 0.3, hR[1]], [bx - U * 0.3, hR[1]]]), bc, {sw: U * 0.06, rw: U * 0.03});
        ctx.fillStyle = "#3a7a3a";
        ctx.font = `900 ${U * 0.62}px "Arial Black", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("$", bx, by + U * 0.2);
    }
    if (o.prop === "gascan") {     // red gas can (Jason_and_Lucia_08)
        const bx = hR[0] + U * 0.05, by = hR[1] + U * 0.55;
        lit(ctx, roundRect(bx - U * 0.42, by - U * 0.3, U * 0.84, U * 0.95, U * 0.1), "#d8343f", {sw: U * 0.12, rw: U * 0.05});
        ctx.fillStyle = "#2a2433";
        ctx.fillRect(bx + U * 0.12, by - U * 0.48, U * 0.14, U * 0.22);
        ctx.strokeStyle = rgba("#2a2433", 0.5);
        ctx.lineWidth = U * 0.05;
        ctx.beginPath(); ctx.moveTo(bx - U * 0.3, by + U * 0.05); ctx.lineTo(bx + U * 0.3, by + U * 0.45); ctx.moveTo(bx + U * 0.3, by + U * 0.05); ctx.lineTo(bx - U * 0.3, by + U * 0.45); ctx.stroke();
    }
    if (o.prop === "cash") {       // holding up a stack of banknotes (fanned out)
        const [x, y] = armsUp ? hL : hR;
        for (let k = -2; k <= 2; k++) {
            ctx.save();
            ctx.translate(x, y - U * 0.15);
            ctx.rotate(k * 0.22);
            lit(ctx, roundRect(-U * 0.13, -U * 0.55, U * 0.26, U * 0.55, U * 0.03), "#8ad07a", {sw: U * 0.04, rw: U * 0.02});
            ctx.fillStyle = "#3a7a3a";
            ctx.fillRect(-U * 0.06, -U * 0.4, U * 0.12, U * 0.12);
            ctx.restore();
        }
    }
    if (o.tattoo) for (const p of skinParts) tattoo(ctx, p, U, r);

    // ---- Neck, head ----
    L(cx, neckB, cx, headC + U * 0.25, nk * 0.85, U * 0.16, skin, {rw: 0}, 1);
    const hr = U * 0.47;   // half head width
    for (const s of [-1, 1]) lit(ctx, ellipse(cx + s * hr * 0.95, headC + U * 0.04, U * 0.09, U * 0.14), skin, {sw: U * 0.05, rw: U * 0.02});
    const head = new Path2D();
    head.moveTo(cx, headC - U * 0.56);
    head.bezierCurveTo(cx + hr * 1.08, headC - U * 0.56, cx + hr * 1.04, headC + U * 0.14, cx + hr * 0.5, chin - U * 0.1);
    head.quadraticCurveTo(cx, chin + U * 0.06, cx - hr * 0.5, chin - U * 0.1);
    head.bezierCurveTo(cx - hr * 1.04, headC + U * 0.14, cx - hr * 1.08, headC - U * 0.56, cx, headC - U * 0.56);
    head.closePath();
    if (o.earrings && !back) {     // big hoop earrings (Lucia)
        ctx.strokeStyle = "#ffd36a";
        ctx.lineWidth = U * 0.05;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + s * hr * 0.98, headC + U * 0.3, U * 0.13, 0, Math.PI * 2); ctx.stroke(); }
    }
    lit(ctx, head, skin, {sw: U * 0.2, rw: U * 0.09, blur: U * 0.05});
    // Hair outline: expand a ring along the top of the head, leaving a hairline at the forehead
    const hairCap = (thick, hairline, sides = 0.05) => {
        const p = new Path2D();
        p.moveTo(cx - hr * (1.0 + thick), headC + U * sides);
        p.bezierCurveTo(cx - hr * (1.12 + thick), headC - U * (0.62 + thick), cx + hr * (1.12 + thick), headC - U * (0.62 + thick), cx + hr * (1.0 + thick), headC + U * sides);
        p.lineTo(cx + hr * 0.86, headC + U * sides);
        p.quadraticCurveTo(cx + hr * 0.75, headC - U * hairline, cx, headC - U * (hairline + 0.04));
        p.quadraticCurveTo(cx - hr * 0.75, headC - U * hairline, cx - hr * 0.86, headC + U * sides);
        p.closePath();
        return p;
    };
    if (back) {
        // Back view: the whole back of the head is hair (bald / buzz cut is skin + a layer of short stubble)
        if (hair.kind !== "bald") {
            const full = new Path2D();
            full.addPath(head);
            lit(ctx, full, hair.kind === "buzz" ? mix(skin, hair.color, 0.6) : hair.color, {sw: U * 0.16, rw: U * 0.09, rim: P.peach, rimA: 0.6});
        }
        longHair();
    } else if (mask?.kind === "ski") {
        // Hood: the whole head one color, with only an eye slit left
        lit(ctx, head, mask.color ?? "#1e1b26", {sw: U * 0.18, rw: U * 0.08});
        ctx.fillStyle = skin;
        ctx.fill(roundRect(cx - hr * 0.72, headC - U * 0.14, hr * 1.44, U * 0.2, U * 0.08));
        ctx.fillStyle = "#2a1b2c";
        ctx.fill(ellipse(cx - U * 0.17, headC - U * 0.04, U * 0.045, U * 0.05));
        ctx.fill(ellipse(cx + U * 0.17, headC - U * 0.04, U * 0.045, U * 0.05));
    } else {
        // Facial features are only touched in with the shadow color, no more than that: nose shadow, brows, mouth (that is how distant figures in illustrations are drawn)
        ctx.fillStyle = rgba("#5a2e3a", 0.35);
        ctx.fill(ellipse(cx + U * 0.06, headC + U * 0.14, U * 0.05, U * 0.1));
        ctx.strokeStyle = rgba("#3a1f2a", 0.55);
        ctx.lineWidth = U * 0.045;
        ctx.lineCap = "round";
        ctx.beginPath();
        if (!mask) { ctx.moveTo(cx - U * 0.09, headC + U * 0.33); ctx.quadraticCurveTo(cx, headC + U * 0.36, cx + U * 0.11, headC + U * 0.32); }
        if (!o.shades) {
            ctx.moveTo(cx - U * 0.28, headC - U * 0.13); ctx.lineTo(cx - U * 0.09, headC - U * 0.16);
            ctx.moveTo(cx + U * 0.09, headC - U * 0.16); ctx.lineTo(cx + U * 0.28, headC - U * 0.13);
        }
        ctx.stroke();
        if (!o.shades) {
            ctx.fillStyle = "#2a1b2c";
            ctx.fill(ellipse(cx - U * 0.17, headC - U * 0.02, U * 0.045, U * 0.055));
            ctx.fill(ellipse(cx + U * 0.17, headC - U * 0.02, U * 0.045, U * 0.055));
        }
        if (o.grill && !mask) { ctx.fillStyle = "#ffd36a"; ctx.fillRect(cx - U * 0.14, headC + U * 0.25, U * 0.28, U * 0.06); }
        // Hair (front)
        if (hair.kind !== "bald") {
            let hp;
            if (hair.kind === "curly" || hair.kind === "afro") {
                const big = hair.kind === "afro" ? 1.35 : 1;
                hp = new Path2D();
                for (let i = 0; i < 12; i++) {
                    const a = Math.PI * (0.85 + 1.3 * i / 11);
                    hp.addPath(ellipse(cx + Math.cos(a) * U * 0.52 * big, headC - U * 0.1 + Math.sin(a) * U * 0.52 * big, U * 0.22 * big, U * 0.22 * big));
                }
                hp.addPath(ellipse(cx, headC - U * 0.32, U * 0.5 * big, U * 0.34 * big));
            } else if (hair.kind === "bun") {
                hp = hairCap(0.04, 0.3);
                hp.addPath(ellipse(cx, headC - U * 0.7, U * 0.24, U * 0.2));
            } else if (hair.kind === "buzz") {
                hp = hairCap(0.01, 0.34, -0.1);
            } else if (hair.kind === "long" || hair.kind === "pony") {
                hp = hairCap(0.08, 0.28, 0.1);
                if (hair.kind === "long") {   // hangs down on both sides, covering the ears
                    for (const s of [-1, 1]) hp.addPath(limb(cx + s * hr * 0.98, headC - U * 0.1, cx + s * hr * 1.0, shY + U * 0.35, U * 0.17, U * 0.12, 1.1));
                }
            } else {
                hp = hairCap(0.06, 0.26);
                if (hair.kind === "dreads" || hair.kind === "braids") {
                    for (let i = 0; i < 6; i++) hp.addPath(capsule(cx + (i / 5 - 0.5) * U * 0.78, headC - U * 0.55, cx + (i / 5 - 0.5) * U * 0.98, headC - U * 0.12, U * 0.08, U * 0.07));
                }
            }
            lit(ctx, hp, hair.color, {sw: U * 0.16, rw: U * 0.09, rim: P.peach, rimA: 0.6});
        }
        // Bandana mask: from under the eyes to below the chin, point facing down (Jason's black bandana, Lucia's red bandana)
        if (mask?.kind === "bandana") {
            const mc = mask.color ?? "#d8343f";
            const m = new Path2D();
            m.moveTo(cx - hr * 1.02, headC + U * 0.06);
            m.quadraticCurveTo(cx, headC + U * 0.0, cx + hr * 1.02, headC + U * 0.06);
            m.lineTo(cx + hr * 0.78, chin + U * 0.06);
            m.quadraticCurveTo(cx + U * 0.2, chin + U * 0.3, cx, chin + U * 0.48);
            m.quadraticCurveTo(cx - U * 0.2, chin + U * 0.3, cx - hr * 0.78, chin + U * 0.06);
            m.closePath();
            lit(ctx, m, mc, {sw: U * 0.12, rw: U * 0.05});
            ctx.save(); ctx.clip(m);
            pattern(ctx, "paisley", cx - hr, headC, hr * 2, U * 0.9, mc, mask.c2 ?? "#ffffff", mask.c2 ?? "#ffffff", U, r);
            ctx.restore();
        }
    }
    // Hat (hugging the head shape: the crown is a dome expanded a ring beyond the top of the head, the brim / visor drawn as seen from the front)
    if (hat && mask?.kind !== "ski") {
        const hc = hat.color, hc2 = hat.c2 ?? mix(hat.color, "#000000", 0.3);
        const dome = (thick, low) => {
            const p = new Path2D();
            p.moveTo(cx - hr * (1.02 + thick), headC - U * low);
            p.bezierCurveTo(cx - hr * (1.1 + thick), headC - U * (0.72 + thick), cx + hr * (1.1 + thick), headC - U * (0.72 + thick), cx + hr * (1.02 + thick), headC - U * low);
            p.quadraticCurveTo(cx, headC - U * (low + 0.06), cx - hr * (1.02 + thick), headC - U * low);
            p.closePath();
            return p;
        };
        if (hat.kind === "cap" || hat.kind === "cap_back") {
            lit(ctx, dome(0.06, 0.12), hc, {sw: U * 0.12, rw: U * 0.07});
            if (hat.kind === "cap" && !back) {
                // Brim facing forward: from the front, a flat arc pressed on the forehead, a shadow beneath
                ctx.fillStyle = rgba(P.shadeDeep, 0.35);
                ctx.fill(ellipse(cx, headC - U * 0.02, hr * 0.95, U * 0.08));
                lit(ctx, ellipse(cx, headC - U * 0.12, hr * 1.18, U * 0.11), hc2, {sw: U * 0.05, rw: U * 0.03});
            } else {
                // Backwards: the adjustment-strap opening shows on the forehead
                ctx.fillStyle = back ? hc2 : hair.kind === "bald" ? skin : hair.color;
                if (!back) ctx.fill(ellipse(cx, headC - U * 0.17, U * 0.17, U * 0.1));
                else lit(ctx, ellipse(cx, headC - U * 0.1, hr * 1.1, U * 0.1), hc2, {sw: U * 0.04, rw: U * 0.02});
                ctx.fillStyle = hc2;
                ctx.fillRect(cx - U * 0.17, headC - U * 0.2, U * 0.34, U * 0.04);
            }
            ctx.fillStyle = hc2;
            ctx.fill(ellipse(cx, headC - U * 0.66, U * 0.06, U * 0.04));
        } else if (hat.kind === "bucket") {
            // Bucket hat: round crown + a ring of soft brim slanting down
            lit(ctx, dome(0.04, 0.2), hc, {sw: U * 0.1, rw: U * 0.06});
            const b = new Path2D();
            b.moveTo(cx - hr * 1.05, headC - U * 0.24);
            b.quadraticCurveTo(cx, headC - U * 0.32, cx + hr * 1.05, headC - U * 0.24);
            b.quadraticCurveTo(cx + hr * 1.5, headC - U * 0.08, cx + hr * 1.52, headC + U * 0.02);
            b.quadraticCurveTo(cx, headC - U * 0.08, cx - hr * 1.52, headC + U * 0.02);
            b.quadraticCurveTo(cx - hr * 1.5, headC - U * 0.08, cx - hr * 1.05, headC - U * 0.24);
            b.closePath();
            lit(ctx, b, mix(hc, "#000000", 0.08), {sw: U * 0.08, rw: U * 0.05});
            if (hat.pattern) { ctx.save(); ctx.clip(b); pattern(ctx, hat.pattern, cx - U, headC - U, U * 2, U, hc2, hat.c3 ?? "#e8d36a", "#333", U, r); ctx.restore(); }
        } else if (hat.kind === "sunhat") {
            lit(ctx, dome(0.02, 0.24), hc, {sw: U * 0.1, rw: U * 0.06});
            lit(ctx, ellipse(cx, headC - U * 0.24, U * 1.1, U * 0.2), hc, {sw: U * 0.1, rw: U * 0.05});
            ctx.fillStyle = hc2;
            ctx.fillRect(cx - hr * 0.95, headC - U * 0.36, hr * 1.9, U * 0.1);
        } else if (hat.kind === "bandana") {
            lit(ctx, dome(0.04, 0.16), hc, {sw: U * 0.1, rw: U * 0.05});
            ctx.fillStyle = hc;
            ctx.fill(poly([[cx + hr * 0.9, headC - U * 0.2], [cx + hr * 1.5, headC + U * 0.15], [cx + hr * 1.2, headC + U * 0.2], [cx + hr * 0.95, headC - U * 0.05]]));
        } else if (hat.kind === "police") {
            // Police cap: hard crown + black brim + badge
            lit(ctx, dome(0.08, 0.18), hc, {sw: U * 0.1, rw: U * 0.05});
            lit(ctx, ellipse(cx, headC - U * 0.16, hr * 1.12, U * 0.09), "#1e1b26", {sw: U * 0.04, rw: U * 0.02});
            ctx.fillStyle = "#ffd36a";
            ctx.fill(ellipse(cx, headC - U * 0.36, U * 0.08, U * 0.08));
        }
    }
    // Sport sunglasses
    if (o.shades && !back && mask?.kind !== "ski") {
        const lens = o.shades === true ? "#1e1628" : o.shades;
        ctx.fillStyle = lens;
        ctx.fill(roundRect(cx - hr * 0.92, headC - U * 0.12, hr * 1.84, U * 0.21, U * 0.09));
        ctx.fillStyle = rgba("#ffd2b0", 0.7);
        ctx.fillRect(cx - U * 0.34, headC - U * 0.09, U * 0.16, U * 0.05);
    }
    return finish(canvas, {inkW: mm(0.09), ink: "#2a1b2c"});
}

// A few commonly used outfits (all from pedestrians / characters whose clothes can be seen in the official screenshots)
export const LOOKS = {
    leonidaTank: {sex: "m", build: "muscle", top: {kind: "tank", color: "#f2efe8", print: "leonida"}, bottom: {kind: "cargo", color: "#7a7350"},
        hat: {kind: "cap_back", color: "#2f3340"}, chain: 1, shades: true, shoes: {kind: "sneaker", color: "#ffffff", c2: "#2a2a2a"}},
    jerseyGuy: {sex: "m", build: "avg", top: {kind: "jersey", color: "#1fa6a0", c2: "#ff8a3a", number: 13}, bottom: {kind: "shorts", color: "#1e1e2a"},
        hair: {kind: "dreads", color: "#2a1b2c"}, chain: 2, grill: true, shoes: {kind: "sneaker", color: "#ffffff", c2: "#d8343f"}},
    tankDreads: {sex: "m", build: "slim", top: {kind: "tank", color: "#ffffff"}, bottom: {kind: "baggy", color: "#3a4a7a"},
        hair: {kind: "dreads", color: "#2a1b2c"}, hat: {kind: "cap", color: "#d8343f"}, chain: 2, shades: "#3a2a60", tattoo: true,
        shoes: {kind: "sneaker", color: "#1e1e2a", c2: "#ff4fa3"}},
    shirtlessTats: {sex: "m", build: "muscle", top: {kind: "none"}, bottom: {kind: "trunks", color: "#ff5a6a"}, hair: {kind: "buzz", color: "#2a1b2c"},
        tattoo: true, chain: 1, shades: true, shoes: {kind: "slides", color: "#1e1e2a"}},
    campShirt: {sex: "m", build: "heavy", top: {kind: "camp", color: "#2fae8a", c2: "#1f6a50", c3: "#ffd36a", open: true}, bottom: {kind: "shorts", color: "#cfc4a8"},
        hat: {kind: "bucket", color: "#d9cfa8"}, shades: true, prop: "cup", shoes: {kind: "slides", color: "#2a2433"}},
    cropCargo: {sex: "f", build: "slim", top: {kind: "crop", color: "#d8343f"}, bottom: {kind: "cargo_pants", color: "#b8b0a0"},
        hair: {kind: "pony", color: "#2a1b2c"}, chain: 1, prop: "phone", pose: "selfie", shoes: {kind: "sneaker", color: "#ffffff", c2: "#ffffff"}},
    neonBikini: {sex: "f", build: "avg", top: {kind: "bikini", color: "#d6ff3a"}, bottom: {kind: "bikini", color: "#d6ff3a"},
        hair: {kind: "braids", color: "#2a1b2c"}, shades: "#ff4fa3", shoes: {kind: "none"}},
    fishnetFit: {sex: "f", build: "avg", top: {kind: "fishnet", color: "#1e1e2a", c2: "#ff4fa3"}, bottom: {kind: "denim_shorts", color: "#5b7fc4"},
        hair: {kind: "long", color: "#7a3a6a"}, chain: 1, prop: "phone", pose: "selfie", shoes: {kind: "sneaker", color: "#ffffff", c2: "#ff4fa3"}},
    sparkleDress: {sex: "f", build: "avg", top: {kind: "sparkle", color: "#c06cff", c2: "#ffd36a"}, bottom: {kind: "mini", color: "#c06cff"},
        hair: {kind: "long", color: "#f0d080"}, shades: "#3a2a60", shoes: {kind: "sneaker", color: "#ff4fa3", c2: "#ffffff"}},
    sunhatLady: {sex: "f", build: "heavy", top: {kind: "bikini", color: "#7a2a3a"}, bottom: {kind: "bikini", color: "#7a2a3a"}, hat: {kind: "sunhat", color: "#e8d6b0", c2: "#3a2a20"},
        shades: true, skin: "#e6b08e", shoes: {kind: "none"}},
    greenTrunks: {sex: "m", build: "avg", top: {kind: "none"}, bottom: {kind: "trunks", color: "#6fd08a", c2: "#ffffff", pattern: "camo", c3: "#3a9a5a"},
        hair: {kind: "short", color: "#d8d8d8"}, skin: "#e8b090", shades: true, shoes: {kind: "none"}},
    detectorGuy: {sex: "m", build: "heavy", top: {kind: "none"}, bottom: {kind: "shorts", color: "#2f3f8f"}, hair: {kind: "short", color: "#6a4a30"},
        hat: {kind: "cap", color: "#ffffff"}, prop: "detector", skin: "#f0b89a", shoes: {kind: "slides", color: "#2a2433"}},
    hoodieKid: {sex: "m", build: "slim", top: {kind: "hoodie", color: "#7a5fd0"}, bottom: {kind: "joggers", color: "#2a2433"},
        hair: {kind: "braids", color: "#2a1b2c"}, prop: "speaker", shoes: {kind: "sneaker", color: "#ffffff", c2: "#3ff0e0"}},
    fishingShirt: {sex: "m", build: "avg", top: {kind: "tee", color: "#c9d8ff", print: "logo", c2: "#2f7a9a"}, bottom: {kind: "cargo", color: "#8a7f5a"},
        hat: {kind: "cap_back", color: "#ffffff", c2: "#d8343f"}, shades: "#2fd0d0", shoes: {kind: "sneaker", color: "#e8e0d0", c2: "#8a7f5a"}},
    jeansJacketGirl: {sex: "f", build: "slim", top: {kind: "tee", color: "#ffffff", print: "logo", c2: "#ff4fa3"}, bottom: {kind: "jeans", color: "#4a6fb0"},
        hair: {kind: "afro", color: "#3a2418"}, chain: 1, prop: "cup", shoes: {kind: "sneaker", color: "#ffd36a", c2: "#ffffff"}},

    // ---- Storyline characters (round 6): do not draw the official characters' faces - the leads appear only masked, from behind, or small enough that the features cannot be made out ----
    // Jason: Leonida print tank top, camo cargo shorts, backwards cap, crossbody strap (Jason_Duval_09/18, Jason_and_Lucia_09/17); a black bandana over the face during the robbery (Jason_and_Lucia_14)
    jasonHeist: {sex: "m", build: "muscle", skin: "#d9a07e", top: {kind: "tank", color: "#e8e4dc", print: "leonida", c2: "#ffc04a", c3: "#2f9a9a"},
        bottom: {kind: "cargo", color: "#7a7350"}, hat: {kind: "cap_back", color: "#2a2a34"}, mask: {kind: "bandana", color: "#26232e", c2: "#8a8494"},
        tattoo: true, strap: true, shoes: {kind: "sneaker", color: "#e8e4dc", c2: "#2a2a2a"}},
    // Lucia: dark long ponytail, big hoop earrings, tank top, denim shorts; a red bandana over the face during the robbery (Jason_and_Lucia_14), pink-purple duffel bag (Lucia_Caminos_02)
    luciaHeist: {sex: "f", build: "avg", skin: "#c98e6a", top: {kind: "tank", color: "#2a2633"}, bottom: {kind: "denim_shorts", color: "#4f72b8"},
        hair: {kind: "pony", color: "#1e1418"}, earrings: true, mask: {kind: "bandana", color: "#d8343f", c2: "#ffffff"},
        shoes: {kind: "sneaker", color: "#ffffff", c2: "#d8343f"}},
    // Convenience store clerk (hands up)
    clerk: {sex: "m", build: "heavy", top: {kind: "polo", color: "#3a8ad0"}, bottom: {kind: "jeans", color: "#3a4a6a"}, hair: {kind: "short", color: "#3a2a20"},
        pose: "handsup", shoes: {kind: "sneaker", color: "#e8e0d0", c2: "#3a3a4a"}},
    // Leonida police: dark blue uniform, police cap
    cop: {sex: "m", build: "avg", top: {kind: "uniform", color: "#2a3a6a"}, bottom: {kind: "jeans", color: "#1e2440"}, hat: {kind: "police", color: "#1e2a50"},
        shades: true, shoes: {kind: "sneaker", color: "#1e1b26", c2: "#1e1b26"}},
};
