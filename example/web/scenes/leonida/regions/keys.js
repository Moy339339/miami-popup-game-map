// Leonida Keys, daytime. The opening of the whole film: first a flat tourist map (compass rose, state-name title frame, lat/long grid), then once the camera arrives, the big postcard lettering and the things on the islands stand up.
// In-region coordinate y runs from -200 (bottom edge of the map paper) to 400 (joining Grassrivers).
// Based on official screenshots: Leonida_Keys_01 (turquoise shallows, small islands, sea-crossing bridge, yellow-and-white seaplane, jet ski), Leonida_Keys_03 (THE RUSTY ANCHOR wooden shack bar, picnic table),
// Leonida_Keys_05 (boat party: a row of outboard motors, flamingo pool floats), Leonida_Keys_02/06 (green iguana, roadside billboard); the official postcard LEONIDA KEYS.
import * as THREE from "three";
import {rng, rectSheet} from "../kit.js";
import {P, sheet, rgba, grain, mix, lin} from "../paint.js";
import * as K from "../props.js";
import * as C from "../props_city.js";
import * as T from "../props_town.js";
import * as Wd from "../props_wild.js";
import * as S from "../props_story.js";
import * as Q from "../props_keys.js";
import {BEAT} from "../beat.js";
import {ab} from "../ab.js";
import {atlasCanvas, hasAtlas} from "../atlas.js";
// Fix item 17 A/B (ab_atlas.js): when on, every person in the Keys segment is replaced by standees cut from the generated-image atlas (the same kind within a region is never mixed); cell = atlas cell index (the numbering in brief 03, minus 1)
const person = (id, seed, look, extra, cell) => hasAtlas("keysPeople") ? K.atlasPerson(id, atlasCanvas("keysPeople", cell)) : K.streetPerson(id, seed, look, extra);

export const Y0 = -200, Y1 = 400;
const X0 = -260, X1 = 260;
export const LANES = {bridge: 250, road: 336};

// Islands: center, radii, relief seed
const ISLANDS = [
    {x: -64, y: 112, rx: 62, ry: 34, seed: 3},     // The portrait frame is narrow: pull the two islands toward the middle; the shack bar and the iguana have to stay inside the camera corridor
    {x: 68, y: 150, rx: 44, ry: 26, seed: 5},
    {x: -12, y: 62, rx: 40, ry: 13, seed: 7, sandbar: true},   // v12: moved left together with the big lettering (the camera is off to the left at this point; with the lettering at x 0, its right side would be out of frame the moment it stands up)
    {x: 196, y: 70, rx: 30, ry: 18, seed: 9},
];
const islandOutline = ({x, y, rx, ry, seed}) => {
    const r = rng(seed);
    const ph = [r() * 6, r() * 6, r() * 6];
    const pts = [];
    for (let k = 0; k < 48; k++) {
        const a = k / 48 * Math.PI * 2;
        const f = 1 + 0.1 * Math.sin(a * 3 + ph[0]) + 0.06 * Math.sin(a * 5 + ph[1]) + 0.04 * Math.sin(a * 9 + ph[2]);
        pts.push([x + Math.cos(a) * rx * f, y + Math.sin(a) * ry * f]);
    }
    return pts;
};

// Sea: deep blue to turquoise, shallows patchily whitening, dark coral patches, a ring of white sand near the shore; letters and numbers of the lat/long grid are printed along the edges of the map paper
function paintKeysSea(wMm, hMm, ppm, y0) {
    const r = rng(41);
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    const Y = y => H - mm(y - y0);   // world (in-region) y -> canvas y
    const X = x => mm(x - X0);
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#2f8fb8"], [0.5, "#3aa8c4"], [1, "#2a7fb0"]]);
    ctx.fillRect(0, 0, W, H);
    // Shallows: a wide ring of turquoise around each island + whitish sandy bottom
    for (const isl of ISLANDS) {
        // Fix item 31: remove the two soft gradient rings inside and replace them with two real layers of depth-contour cut paper (see SHELF in build); keep only the faint outermost ring so there is a transition between the deep water and the first layer
        for (const [grow, col, a] of [[2.2, "#3fc4c8", 0.4]]) {
            const g = ctx.createRadialGradient(X(isl.x), Y(isl.y), 0, X(isl.x), Y(isl.y), mm(isl.rx * grow));
            g.addColorStop(0, rgba(col, a));
            g.addColorStop(1, rgba(col, 0));
            ctx.save();
            ctx.translate(X(isl.x), Y(isl.y));
            ctx.scale(1, isl.ry / isl.rx * 1.3);
            ctx.translate(-X(isl.x), -Y(isl.y));
            ctx.fillStyle = g;
            ctx.fillRect(X(isl.x - isl.rx * grow), Y(isl.y + isl.rx * grow * 2), mm(isl.rx * grow * 2), mm(isl.rx * grow * 4));
            ctx.restore();
        }
    }
    // Fix item 34 version B: the upper paper layer (the first shallows layer) casts a short indigo-purple shadow on the sea surface (light comes from the front left, so the shadow falls to the right and back)
    if (ab("print")) for (const isl of ISLANDS) layerShadow(ctx, islandOutline({...isl, rx: isl.rx + (isl.sandbar ? 9 : 16), ry: isl.ry + (isl.sandbar ? 9 : 16)}), X, Y, mm);
    // the band of shallows in front of the long island at the back
    ctx.fillStyle = lin(ctx, 0, Y(330), 0, Y(270), [[0, rgba("#8ae4d4", 0.8)], [1, rgba("#4ac8c8", 0)]]);
    ctx.fillRect(0, Y(330), W, mm(60));
    // Coral and seagrass dark patches
    for (let i = 0; i < 180; i++) {
        const x = r() * W, y = r() * H, rr = mm(1 + r() * 4);
        ctx.fillStyle = rgba(r() < 0.5 ? "#2a7a8a" : "#4a8a6a", 0.25);
        ctx.beginPath(); ctx.ellipse(x, y, rr * 1.6, rr, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // v12: a coral reef under the snorkeling spot (seen through the water: a few clusters of orange, pink, purple and yellow coral, branching staghorn coral, a few schools of small fish); two depth-contour rings outside the islands
    {
        const rr = rng(97);
        // Reef floor: a patch of whitish shallow sand (reef flat) with coral growing on it
        for (let i = 0; i < 9; i++) {
            const cx = X(-6 + (rr() - 0.5) * 56), cy = Y(15 + (rr() - 0.5) * 22), rx = mm(9 + rr() * 9);
            const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
            gr.addColorStop(0, rgba("#c8f4e4", 0.42)); gr.addColorStop(1, rgba("#c8f4e4", 0));
            ctx.fillStyle = gr;
            ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.6, rr() * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        // Coral: colors held to four (coral orange, pink, pale purple, sand yellow), growing in clusters; seen through the water, all made slightly transparent
        const CORAL = ["#f08a78", "#e880a8", "#a890d8", "#f0c078"];
        for (let i = 0; i < 34; i++) {
            const a = rr() * Math.PI * 2, d = Math.sqrt(rr());
            const cx = X(-6 + Math.cos(a) * d * 30), cy = Y(15 + Math.sin(a) * d * 12);
            const col = CORAL[i % 4], R0 = mm(0.9 + rr() * 1.3);
            ctx.fillStyle = rgba(col, 0.3);
            for (let k = 0, n = 4 + Math.floor(rr() * 4); k < n; k++) {
                const b = rr() * Math.PI * 2, e = R0 * (0.3 + rr() * 0.7);
                ctx.beginPath(); ctx.arc(cx + Math.cos(b) * e, cy + Math.sin(b) * e * 0.7, R0 * (0.35 + rr() * 0.35), 0, Math.PI * 2); ctx.fill();
            }
            if (i % 3 === 0) {
                ctx.strokeStyle = rgba(mix(col, "#5a3a5a", 0.25), 0.42);
                ctx.lineWidth = mm(0.24);
                ctx.lineCap = "round";
                for (let k = 0; k < 4; k++) {
                    const b = -Math.PI / 2 + (rr() - 0.5) * 1.8, l = R0 * (1.3 + rr());
                    const mx = cx + Math.cos(b) * l * 0.55, my = cy + Math.sin(b) * l * 0.55;
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my);
                    ctx.lineTo(mx + Math.cos(b - 0.5) * l * 0.5, my + Math.sin(b - 0.5) * l * 0.5);
                    ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(b + 0.5) * l * 0.45, my + Math.sin(b + 0.5) * l * 0.45);
                    ctx.stroke();
                }
            }
        }
        // Water light on the reef: a layer of fine white ripples (caustics)
        ctx.strokeStyle = rgba("#ffffff", 0.2);
        ctx.lineWidth = mm(0.16);
        for (let i = 0; i < 160; i++) {
            const x = X(-6 + (rr() - 0.5) * 64), y = Y(15 + (rr() - 0.5) * 28), l = mm(0.8 + rr() * 1.6);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y - mm(0.35), x + l, y + mm(0.1)); ctx.stroke();
        }        // school of small fish
        for (let s = 0; s < 4; s++) {
            const fx = -30 + s * 18 + rr() * 6, fy = 4 + rr() * 26, col = ["#ffb020", "#3a8ae0", "#ffe060", "#ff7a4a"][s];
            for (let k = 0; k < 6; k++) {
                const x = X(fx + (rr() - 0.5) * 7), y = Y(fy + (rr() - 0.5) * 4), L = mm(1.2 + rr() * 0.4);
                ctx.fillStyle = rgba(col, 0.75);
                ctx.beginPath(); ctx.ellipse(x, y, L * 0.5, L * 0.22, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(x - L * 0.45, y); ctx.lineTo(x - L * 0.8, y - L * 0.22); ctx.lineTo(x - L * 0.8, y + L * 0.22); ctx.closePath(); ctx.fill();
            }
        }
        // Depth contours: two thin white rings outside the islands
        ctx.strokeStyle = rgba("#ffffff", 0.24);
        ctx.lineWidth = mm(0.22);
        for (const isl of ISLANDS) if (!isl.sandbar) for (const k of [1.5, 2.0]) {
            const o = islandOutline({...isl, rx: isl.rx * k, ry: isl.ry * k * 1.2});
            ctx.beginPath();
            o.forEach(([x, y], j) => (j ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
            ctx.closePath(); ctx.stroke();
        }
    }
    // Light patterns on the water surface
    ctx.strokeStyle = rgba("#ffffff", 0.22);
    ctx.lineWidth = mm(0.18);
    for (let i = 0; i < 700; i++) {
        const x = r() * W, y = r() * H, l = mm(1 + r() * 3);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y - mm(0.3), x + l, y); ctx.stroke();
    }
    // Map elements: dashed lat/long grid lines, cell labels along the edges
    ctx.strokeStyle = rgba("#ffffff", 0.35);
    ctx.lineWidth = mm(0.25);
    ctx.setLineDash([mm(2), mm(1.5)]);
    for (let x = -240; x <= 240; x += 80) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); ctx.stroke(); }
    for (let y = -160; y <= 400; y += 80) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.font = `700 ${mm(4)}px Bahnschrift, sans-serif`;
    ctx.fillStyle = rgba("#ffffff", 0.75);
    ctx.textAlign = "center";
    "ABCDEF".split("").forEach((c, i) => ctx.fillText(c, X(-200 + i * 80), Y(-188)));
    for (let k = 0; k < 7; k++) { ctx.fillText(String(k + 1), X(-252), Y(-120 + k * 80)); ctx.fillText(String(k + 1), X(252), Y(-120 + k * 80)); }
    // Compass rose
    {
        const cx = X(70), cy = Y(22), R = mm(13);
        ctx.strokeStyle = rgba("#ffffff", 0.8);
        ctx.lineWidth = mm(0.4);
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, Math.PI * 2); ctx.stroke();
        for (let k = 0; k < 8; k++) {
            const a = -Math.PI / 2 + k * Math.PI / 4, l = k % 2 ? R * 0.55 : R * 1.05;
            ctx.fillStyle = k === 0 ? "#ff6a5a" : rgba("#ffffff", 0.85);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
            ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * mm(2.2), cy + Math.sin(a + Math.PI / 2) * mm(2.2));
            ctx.lineTo(cx - Math.cos(a + Math.PI / 2) * mm(2.2), cy - Math.sin(a + Math.PI / 2) * mm(2.2));
            ctx.fill();
        }
        ctx.font = `800 ${mm(5)}px "Bookman Old Style", serif`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("N", cx, cy - R * 1.2);
    }
    // State-name title frame (the title box of the tourist map)
    {
        const x = X(0), y = Y(-36), w = mm(130), h = mm(48);
        ctx.fillStyle = rgba("#fff6e4", 0.92);
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = "#2a6a8a";
        ctx.lineWidth = mm(0.8);
        ctx.strokeRect(x - w / 2 + mm(2), y - h / 2 + mm(2), w - mm(4), h - mm(4));
        ctx.lineWidth = mm(0.3);
        ctx.strokeRect(x - w / 2 + mm(3.4), y - h / 2 + mm(3.4), w - mm(6.8), h - mm(6.8));
        ctx.fillStyle = "#2a6a8a";
        ctx.font = `700 ${mm(5)}px "Bookman Old Style", serif`;
        ctx.fillText("OFFICIAL TOURIST MAP", x, y - mm(12));
        ctx.fillStyle = "#e8603a";
        ctx.font = `900 ${mm(17)}px "Bookman Old Style", serif`;
        ctx.fillText("LEONIDA", x, y + mm(8));
        ctx.fillStyle = "#2a6a8a";
        ctx.font = `700 ${mm(4.2)}px Bahnschrift, sans-serif`;
        ctx.fillText("THE SUNSHINE STATE · VISIT LEONIDA", x, y + mm(19));
    }
    // v8: on the opening beat the sea on the flat map is too empty - add things commonly printed on tourist maps: dashed cruise routes, a dive flag, line drawings of a dolphin and a turtle
    // (all printed on the paper, they do not stand up; positions avoid the big postcard lettering, the compass rose and the 3D wave strips)
    const at = (x, y, f) => { ctx.save(); ctx.translate(X(x), Y(y)); ctx.scale(mm(1), mm(1)); f(); ctx.restore(); };
    {
        const pts = [[-95, 22], [-40, 30], [0, 36], [38, 44], [46, 98]];
        ctx.strokeStyle = rgba("#ffffff", 0.85);
        ctx.lineWidth = mm(0.55);
        ctx.lineCap = "round";
        ctx.setLineDash([mm(2.2), mm(1.7)]);
        ctx.beginPath();
        ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
        for (let i = 1; i < pts.length - 1; i++) {
            const [mx, my] = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
            ctx.quadraticCurveTo(X(pts[i][0]), Y(pts[i][1]), X(mx), Y(my));
        }
        ctx.lineTo(X(pts.at(-1)[0]), Y(pts.at(-1)[1]));
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrow: toward the route's end point (up = toward the islands)
        at(46, 98, () => {
            ctx.fillStyle = rgba("#ffffff", 0.9);
            ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(2.2, 0.6); ctx.lineTo(-2.2, 0.6); ctx.closePath(); ctx.fill();
        });
        // Route start: small boat icon + text
        at(-95, 22, () => {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.moveTo(-3.6, -0.6); ctx.lineTo(3.6, -0.6); ctx.lineTo(2.4, 1.4); ctx.lineTo(-2.6, 1.4); ctx.closePath(); ctx.fill();
            ctx.fillRect(-0.8, -3.2, 2.6, 2.2);
        });
        ctx.font = `700 ${mm(3.4)}px Bahnschrift, sans-serif`;
        ctx.fillStyle = rgba("#ffffff", 0.92);
        ctx.textAlign = "left";
        ctx.fillText("BOAT TOURS · DAILY", X(-88), Y(17));
        ctx.textAlign = "center";
    }
    // Dive flag (red with a white diagonal stripe, the sign of snorkeling spots in the Florida Keys) + SNORKEL
    at(-6, 4, () => {   // Fix item 19: moved up by 2 to make room for the wanted strip on the top edge of the frame
        ctx.fillStyle = "#e8323a";
        ctx.fillRect(-3.6, -2.6, 7.2, 5.2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(-3.4, -2.4); ctx.lineTo(3.4, 2.4); ctx.stroke();
        ctx.lineWidth = 0.35;
        ctx.strokeRect(-3.6, -2.6, 7.2, 5.2);
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 3px Bahnschrift, sans-serif`;
        ctx.fillText("SNORKEL", 0, 6.4);
    });
    // Dolphin (leaping out of the water): white silhouette + two splashes
    at(-74, 4, () => {
        ctx.fillStyle = rgba("#ffffff", 0.88);
        ctx.beginPath();
        ctx.moveTo(-7, 1.6);
        ctx.quadraticCurveTo(-3, -4.6, 4, -3.4);
        ctx.quadraticCurveTo(6.6, -3, 8, -1.4);
        ctx.lineTo(5.6, -1.2);
        ctx.quadraticCurveTo(0, -1.6, -5.6, 2.6);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-0.4, -3.9); ctx.lineTo(-2.2, -6.4); ctx.lineTo(1.4, -4.1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6.4, 1.8); ctx.lineTo(-9.2, 0.4); ctx.lineTo(-8.2, 3.6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba("#ffffff", 0.7);
        ctx.lineWidth = 0.45;
        for (const [cx, w] of [[-7.5, 3], [7.5, 2.4]]) { ctx.beginPath(); ctx.ellipse(cx, 4.2, w, 0.9, 0, Math.PI, 2 * Math.PI); ctx.stroke(); }
    });
    // Turtle: line drawing, hexagonal pattern printed on the shell
    at(30, 40, () => {
        ctx.strokeStyle = rgba("#ffffff", 0.85);
        ctx.fillStyle = rgba("#ffffff", 0.18);
        ctx.lineWidth = 0.5;
        for (const [fx, fy, a] of [[-3.6, -2.4, -0.6], [3.6, -2.4, 0.6], [-2.8, 3, 0.5], [2.8, 3, -0.5]]) {
            ctx.beginPath(); ctx.ellipse(fx, fy, 2.6, 1.0, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(0, -4.6, 1.3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-1.4, -1.6); ctx.lineTo(1.4, -1.6); ctx.lineTo(2, 0.4); ctx.lineTo(0, 1.8); ctx.lineTo(-2, 0.4); ctx.closePath();
        ctx.moveTo(-1.4, -1.6); ctx.lineTo(-1.6, -4); ctx.moveTo(1.4, -1.6); ctx.lineTo(1.6, -4);
        ctx.moveTo(-2, 0.4); ctx.lineTo(-3.5, 0.8); ctx.moveTo(2, 0.4); ctx.lineTo(3.5, 0.8); ctx.moveTo(0, 1.8); ctx.lineTo(0, 4.3);
        ctx.stroke();
    });
    grain(ctx, 0.08, 2);
    return canvas;
}

function paintIsland(isl, ppm) {
    const r = rng(isl.seed * 13);
    const pad = 4;
    const wMm = isl.rx * 2.6 + pad, hMm = isl.ry * 2.6 + pad;
    const {canvas, ctx, mm, W, H} = sheet(wMm, hMm, ppm);
    ctx.fillStyle = "#f4dcb0";
    ctx.fillRect(0, 0, W, H);
    if (!isl.sandbar) {
        // Inner green ring: sea grape and grass, darker toward the middle
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.5);
        g.addColorStop(0, "#4f9a5a");
        g.addColorStop(0.62, "#6fb86a");
        g.addColorStop(0.78, "#b8c890");
        g.addColorStop(0.9, "rgba(244,220,176,0)");
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.scale(W / Math.min(W, H), H / Math.min(W, H));
        ctx.translate(-W / 2, -H / 2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        for (let i = 0; i < 120; i++) {
            const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.33;
            ctx.fillStyle = rgba(r() < 0.5 ? "#3f7a4a" : "#8ac878", 0.5);
            ctx.beginPath(); ctx.arc(W / 2 + Math.cos(a) * d * W, H / 2 + Math.sin(a) * d * H, mm(0.6 + r() * 1.4), 0, Math.PI * 2); ctx.fill();
        }
    }
    for (let i = 0; i < 260; i++) { ctx.fillStyle = rgba(r() < 0.5 ? "#e0c090" : "#fff0d0", 0.5); ctx.fillRect(r() * W, r() * H, mm(0.3), mm(0.3)); }
    if (isl.sandbar) {
        // v12: a trail of footprints on the sandbar (walking up out of the water on the left and back again), a few seashells, the wet sand edge left by the ebbing tide
        const rs = rng(31);
        ctx.strokeStyle = rgba("#c8a070", 0.45);
        ctx.lineWidth = mm(1.2);
        ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.36, H * 0.33, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = rgba("#b8905a", 0.55);
        for (let k = 0; k < 16; k++) {
            const t = k / 15, x = W * (0.14 + t * 0.62), y = H * (0.62 - Math.sin(t * Math.PI) * 0.22) + (k % 2 ? mm(0.7) : -mm(0.7));
            ctx.beginPath(); ctx.ellipse(x, y, mm(0.45), mm(0.25), 0.2, 0, Math.PI * 2); ctx.fill();
        }
        for (let k = 0; k < 9; k++) {
            ctx.fillStyle = ["#fff4ec", "#ffc8b8", "#f4d8a8"][k % 3];
            ctx.beginPath(); ctx.ellipse(W * (0.15 + rs() * 0.7), H * (0.25 + rs() * 0.5), mm(0.5), mm(0.4), rs() * 3, 0, Math.PI * 2); ctx.fill();
        }
    }
    grain(ctx, 0.08);
    return {canvas, frame: {x: isl.x - wMm / 2, y: isl.y - hMm / 2, width: wMm, height: hMm}};
}

// The long island at the back: beach edge + grass + Highway 1 (US-1)
function paintLongKey(ppm) {
    const r = rng(77);
    const {canvas, ctx, mm, W, H} = sheet(X1 - X0, 80, ppm);   // y 300..380
    const Y = y => H - mm(y - 300);
    ctx.fillStyle = "#7ab86a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = lin(ctx, 0, Y(300), 0, Y(318), [[0, "#f4dcb0"], [1, "rgba(244,220,176,0)"]]);
    ctx.fillRect(0, Y(318), W, mm(18));
    for (let i = 0; i < 400; i++) { ctx.fillStyle = rgba(r() < 0.5 ? "#4f9a5a" : "#a8d088", 0.5); ctx.fillRect(r() * W, r() * H * 0.7, mm(0.5), mm(1)); }
    // Road
    ctx.fillStyle = "#6e6884";
    ctx.fillRect(0, Y(345), W, mm(18));
    ctx.fillStyle = "#f5c86a";
    ctx.fillRect(0, Y(336.2), W, mm(0.3));
    ctx.fillRect(0, Y(335.6), W, mm(0.3));
    ctx.fillStyle = rgba("#ffffff", 0.8);
    ctx.fillRect(0, Y(327.6), W, mm(0.25));
    ctx.fillRect(0, Y(344.6), W, mm(0.25));
    // Highway shield US 1
    for (const x of [-180, 60]) {
        const cx = mm(x - X0), cy = Y(322);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.moveTo(cx - mm(4), cy - mm(4)); ctx.lineTo(cx + mm(4), cy - mm(4)); ctx.lineTo(cx + mm(4), cy + mm(1.5)); ctx.quadraticCurveTo(cx, cy + mm(5.5), cx - mm(4), cy + mm(1.5)); ctx.fill();
        ctx.strokeStyle = "#1e1628";
        ctx.lineWidth = mm(0.4);
        ctx.stroke();
        ctx.fillStyle = "#1e1628";
        ctx.font = `800 ${mm(4.4)}px Bahnschrift, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("1", cx, cy + mm(1.6));
    }
    grain(ctx, 0.08, 2);
    return canvas;
}

// ---------- Fix item 31: prints for the depth-contour cut-paper layers and the foam ring ----------
const SHELF = [
    {top: 0.5, th: 0.5, col: "#4cc6c8", lip: "#9ae8dc", dot: "#2f9fb0"},
    {top: 0.95, th: 0.45, col: "#8edccd", lip: "#d4f6e8", dot: "#5cbcb8"},
];
function inside(ring, x, y) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
}
function bbox(o, pad = 1) {
    const xs = o.map(p => p[0]), ys = o.map(p => p[1]);
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
    return {x, y, width: Math.max(...xs) + pad - x, height: Math.max(...ys) + pad - y};
}
// One layer: flat base color + fine dots (printed halftone dots on the paper) + a bright edge along the inside of the cut edge (the paper edge lit by the sun) + a few water highlights
function layerShadow(ctx, o, X, Y, mm) {
    const p = new Path2D();
    o.forEach(([x, y], j) => (j ? p.lineTo(X(x) + mm(0.9), Y(y) - mm(0.7)) : p.moveTo(X(x) + mm(0.9), Y(y) - mm(0.7))));
    p.closePath();
    ctx.save();
    ctx.filter = `blur(${mm(0.35)}px)`;
    ctx.fillStyle = "rgba(74,63,138,0.38)";
    ctx.fill(p);
    ctx.restore();
}
function paintShelf(o, sh, ppm, seed, upper = null) {
    const r = rng(seed);
    const frame = bbox(o);
    const {canvas, ctx, mm, W, H} = sheet(frame.width, frame.height, ppm);
    const X = x => mm(x - frame.x), Y = y => H - mm(y - frame.y);
    const path = new Path2D();
    o.forEach(([x, y], j) => (j ? path.lineTo(X(x), Y(y)) : path.moveTo(X(x), Y(y))));
    path.closePath();
    ctx.fillStyle = sh.col;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < frame.width * frame.height * 0.35; i++) {
        ctx.fillStyle = rgba(r() < 0.5 ? sh.dot : "#ffffff", 0.08 + r() * 0.06);
        ctx.fillRect(r() * W, r() * H, mm(0.35), mm(0.35));
    }
    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = rgba(sh.lip, 0.75);
    ctx.lineWidth = mm(2.4);
    ctx.stroke(path);
    ctx.strokeStyle = rgba("#ffffff", 0.22);
    ctx.lineWidth = mm(0.18);
    for (let i = 0; i < frame.width * frame.height * 0.012; i++) {
        const x = r() * W, y = r() * H, l = mm(1 + r() * 2.5);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + l / 2, y - mm(0.3), x + l, y); ctx.stroke();
    }
    ctx.restore();
    if (upper && ab("print")) layerShadow(ctx, upper, X, Y, mm);
    grain(ctx, 0.05);
    return {canvas, frame};
}
// Shore foam: white base + a few teal bubble dots (only a ring 2 mm wide shows outside the island)
function paintFoam(o, ppm, seed) {
    const r = rng(seed);
    const frame = bbox(o);
    const {canvas, ctx, mm, W, H} = sheet(frame.width, frame.height, ppm);
    ctx.fillStyle = "#f4fbf7";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < frame.width * frame.height * 0.5; i++) {
        ctx.fillStyle = rgba(r() < 0.6 ? "#bfeee6" : "#ffffff", 0.5);
        ctx.beginPath(); ctx.arc(r() * W, r() * H, mm(0.15 + r() * 0.3), 0, Math.PI * 2); ctx.fill();
    }
    return {canvas, frame};
}

export function build(W) {
    const {R, jitter, band} = W;
    // ---------- Ground: sea (whole sheet) -> islands (one layer higher) -> long island at the back ----------
    W.ground("keysSea", band(Y0, Y1 + 20, 20), paintKeysSea(X1 - X0, Y1 + 20 - Y0, 9, Y0), {x: X0, y: Y0, width: X1 - X0, height: Y1 + 20 - Y0}, 0, 1.2,
        {gloss: {gloss: "water", glossTier: 0}});
    ISLANDS.forEach((isl, i) => {
        const {canvas, frame} = paintIsland(isl, 11);   // Fix item 31: ground print resolution 7 -> 11 px/mm (the opening camera is close to the ground, and it used to look blurry when magnified)
        W.ground("island" + i, islandOutline(isl), canvas, frame, 1.4, 1.2, {edge: "#f4dcb0"});
    });
    // ---------- Fix item 31: two layers of depth-contour cut paper around the islands + a foam ring along the shore (replacing the soft gradient painted on the sea) ----------
    // Layer A is a turquoise one step lighter, layer B one more step lighter with a sand tint; each layer is a piece of card with thickness and a white paper-core cut edge, cut out by expanding the island outline outward
    const shelves = [];   // [{outline, top}]; things on the water (sparkles, water rings) get their height from the layer they sit on
    ISLANDS.forEach((isl, i) => {
        const e = isl.sandbar ? [9, 4, 1.6] : [16, 7, 2.2];
        SHELF.forEach((sh, k) => {
            const o = islandOutline({...isl, rx: isl.rx + e[k], ry: isl.ry + e[k]});
            const top = sh.top + i * 0.04;   // the same layer of two adjacent islands would overlap: offset each island by 0.04 so they do not z-fight
            const upper = islandOutline({...isl, rx: isl.rx + e[k + 1], ry: isl.ry + e[k + 1]});   // the upper layer (second shallows layer / foam ring)
            const {canvas, frame} = paintShelf(o, sh, 7, isl.seed * 7 + k, upper);
            W.ground(`shelf${i}_${k}`, o, canvas, frame, top, sh.th, {edge: "#eef6ee"});
            shelves.push({outline: o, top});
        });
        const fo = islandOutline({...isl, rx: isl.rx + e[2], ry: isl.ry + e[2]});
        const {canvas, frame} = paintFoam(fo, 7, isl.seed * 11);
        W.ground("foam" + i, fo, canvas, frame, 1.15, 0.3, {edge: "#ffffff"});
    });
    const rings = [];   // Fix item 30: [pivot, x, y, yaw, rx, ry]; water rings are all added at the end
    const waterTop = (x, y) => shelves.reduce((z, s) => (s.top > z && inside(s.outline, x, y) ? s.top : z), 0);
    const keyFront = x => 300 + 4 * Math.sin(x / 19) + 2 * Math.sin(x / 7 + 1);
    W.ground("longKey", band(keyFront, 380, 8), paintLongKey(6), {x: X0, y: 300, width: X1 - X0, height: 80}, 1.4, 1.2, {edge: "#f4dcb0"});

    // ---------- Big postcard lettering: LEONIDA KEYS (standing on the small sandbar in the middle) ----------
    W.put(T.postcardTitle("title_keys", ["LEONIDA", "KEYS"], {font: "Bookman Old Style", fill: ["#ffe98a", "#f0a828"], outline: "#2a2440", depth: "#3a5a8a",
        size: 14, arc: 0.16}), -12, 64, 1.4, {freq: 1.0, damp: 4.2, lead: 30, rect: [41, 3], at: 2 * BEAT});   // Fix item 44: after the flat segment is shortened, the big lettering lands on beat 3 of the first bar (the secondary strong beat)

    // ---------- Fix item 19: a 6-star wanted strip lies flat on the top edge of the frame (a GTA marker from frame 0), and on beat 2 the first star flips to a white star ----------
    {
        const yS = -12, zS = 0.45;
        W.flat(S.wantedStrip("kWantedStrip"), 0, yS, zS, {rot: 0.02});
        for (let k = 0; k < S.STRIP.n; k++) {
            const tile = S.starTile("kStar" + k);
            const x = S.STRIP.slot(k) * Math.cos(0.02), y = S.STRIP.slot(k) * Math.sin(0.02);
            W.flat(tile, x, yS + y, zS + 0.75, {rot: 0.02});
            tile.rotation.y = Math.PI;   // back side up = dark star (flipped about y: the star is left-right symmetric, so after flipping a point still faces up)
            if (k === 0) W.mover({kind: "flip", obj: tile, at: BEAT - 0.24, dur: 0.24, z0: zS + 0.75, hop: S.STRIP.R * 1.1});
        }
    }

    // ---------- The left island: THE RUSTY ANCHOR shack bar + picnic table + palms + people ----------
    W.reserve(-62, 120, 22, 12);
    W.put(T.house("rustyAnchor", {W: 38, D: 20, H: 13, wall: "#9ad0b8", trim: "#f4f0e0", roof: "#4a8a8a", roofKind: "tin", siding: true, windows: 4, doorX: 0.5,
        lit: 0.2, seed: 21, pitch: 8, shutters: "#3a7a7a",
        porch: {depth: 6, posts: 4, roof: "#5a9a9a", lights: true, sign: {text: "THE RUSTY ANCHOR", w: 32, h: 5, bg: "#f4ecd0", color: "#2a6a4a", edge: "#3a7a5a"}}}),
    -62, 110, 1.4, {freq: 1.1, damp: 5});
    [[-84, 96, "#f5c518"], [-48, 95, "#3a8ad0"]].forEach(([x, y, c], i) => W.put(T.picnicTable("pt" + i, c), x, y, 1.4, {fold: "grow", rect: [5, 4.4]}));
    [[-90, 92, "fishingShirt"], [-80, 92.5, "neonBikini"], [-53, 91.5, "campShirt", {prop: "cup"}], [-42, 92, "sunhatLady"], [-32, 98, "greenTrunks"]].forEach(([x, y, look, extra], i) =>
        W.put(person("ka" + i, 500 + i, look, extra, i), x, y, 1.4, {yaw: jitter(0.5), r: 2.4}));
    // Keep palms at least 36 apart pairwise (crown radius about 15-18, not changing with tree height)
    // Adjacent trees alternate tall and short, with the crowns staggered vertically
    [[-120, 100, 48], [-102, 138, 24], [-16, 98, 30], [-26, 138, 56]].forEach(([x, y, h], i) =>
        W.put(K.palm("kp" + i, {h, bend: 2 + R() * 3, seed: 800 + i, fronds: 8, reach: 0.85}), x, y, 1.4, {freq: 1.3, damp: 5.5, hide: true, unfold: true, r: 2.4}));
    for (let i = 0; i < 3; i++) W.put(K.bushes("kb" + i, {w: 10 + R() * 4, h: 4 + R() * 2, seed: 820 + i, base: "#5aa860", light: "#a8dc88", flowers: ["#ff5fa2", "#ffd84a", "#ff8a5a"][i]}), -92 + i * 21, 142 + jitter(2), 1.4,   // v12: flowering (bougainvillea, golden trumpet, hibiscus), no longer three identical clumps of dark green
        {rect: [8.6, 3]});

    // ---------- The right island: a green iguana lying on a rock (one size bigger than real) + a few palms ----------
    W.put(Wd.iguana("iguana", 3), 50, 140, 1.4, {freq: 1.2, damp: 5, r: 9, yaw: -0.15});
    [[94, 158, 44], [58, 170, 34]].forEach(([x, y, h], i) =>
        W.put(K.palm("kq" + i, {h, bend: 2 + R() * 3, seed: 840 + i, fronds: 8, reach: 0.85}), x, y, 1.4, {freq: 1.3, damp: 5.5, hide: true, unfold: true, r: 2.4}));
    W.put(K.umbrella("kumb", ["#ff8fb8", "#fff6ec"], {seed: 4}), 76, 136, 1.4, {hide: true, unfold: true, r: 5.6});   // Fix item 36: flips up first, then opens
    W.put(K.palm("kr0", {h: 38, bend: 3, seed: 860, fronds: 8, reach: 0.85}), 196, 72, 1.4, {freq: 1.3, damp: 5.5, hide: true, unfold: true, r: 2.4});

    // ---------- On the water: boat party (a row of outboard motors) + flamingo pool float + jet ski ----------
    {
        const boat = K.speedboat("partyBoat", {deck: "#fff6ec", hull: "#f4f4f8", stripe: "#1e1628", stripe2: "#ff4fa3", top: "#ffffff"});
        const b = W.put(boat, -20, 178, 0, {fold: "grow", yaw: 0.25});
        rings.push([b.pivot, -20, 178, 0.25, 17.5, 5.6]);
        [["neonBikini", {top: {kind: "bikini", color: "#ff4fa3"}, bottom: {kind: "bikini", color: "#ff4fa3"}, pose: "wave"}, 4, -1.4], ["shirtlessTats", {pose: "wave"}, -1, 1.2],
            ["fishnetFit", {}, -6, -1.2], ["leonidaTank", {prop: "cup"}, 8, 1.4]].forEach(([look, extra, x, y], i) => {
            const p = person("pb" + i, 520 + i, look, extra, 5 + i);
            p.position.set(x, y, 1);
            p.scale.setScalar(0.8);
            b.holder.add(p);
        });
        W.mover({kind: "bob", obj: b.holder, phase: 1.2, keepYaw: true});
        const fl = Wd.flamingoFloat("flamFloat");
        W.flat(fl, 12, 184, 0.3);
        W.mover({kind: "bob", obj: fl, phase: 0.4});
        const js = Wd.jetski("jet1", {color: "#ff4fa3", rider: person("jr1", 530, "jasonHeist", {back: true}, 14)});
        const lu = person("jr1b", 532, "luciaHeist", {back: true}, 15);
        lu.scale.setScalar(0.8);
        lu.position.set(-2.8, 0, 1.6);
        js.add(lu);
        // Fix item 20: a dog wearing goggles in front of Jason steers with its paws on the handlebars (the standee is 0.5 closer to the camera, drawn in front of Jason)
        const dog = Q.jetDog("jetDog");
        dog.scale.setScalar(0.75);
        dog.position.set(1.6, -0.5, 1.4);
        js.add(dog);
        const r1 = W.put(js, -60, 196, 0, {fold: "grow"});
        r1.holder.scale.setScalar(1.55);
        const wk1 = K.wake("jwake1", 4, 40);
        wk1.position.set(-6, 0, 0.3);
        r1.holder.add(wk1);
        W.mover({kind: "boat", obj: r1.pivot, x0: -60, v: 24});
        const r2 = W.put(Wd.jetski("jet2", {color: "#3ff0e0", rider: person("jr2", 531, "cropCargo", {}, 9)}), 80, 208, 0, {fold: "grow", yaw: Math.PI});
        const wk2 = K.wake("jwake2", 4, 40);
        wk2.position.set(-6, 0, 0.3);
        r2.holder.add(wk2);
        W.mover({kind: "boat", obj: r2.pivot, x0: 80, v: -20});
        // v12: this speedboat used to run out of frame and could not be seen in the opening at all - changed to a dive boat parked at the snorkeling spot (dive flag at the stern, a row of air tanks on deck, one diver)
        const db = Q.diveExtras("keysBoat", K.speedboat("keysBoat", {deck: "#fff6ec", hull: "#fff6ec", stripe: "#2a6a9a", stripe2: "#f5c518", top: "#ffffff"}));
        const diver = person("diver", 534, "greenTrunks", {pose: "wave"}, 10);
        diver.scale.setScalar(0.85);
        diver.position.set(-6, -1.2, 4);
        db.add(diver);
        const sb = W.put(db, -42, 30, 0, {fold: "grow", dt: -0.2, yaw: 0.12});
        rings.push([sb.pivot, -42, 30, 0.12, 12, 4]);
        sb.holder.scale.setScalar(0.68);
        W.mover({kind: "bob", obj: sb.holder, phase: 0.8, keepYaw: true});
    }
    // Wave strips are placed only on open water (not touching boats or islands)
    [[-130, 0], [70, 0], [150, 30], [-190, 40], [40, 214], [-130, 220]].forEach(([x, y], i) => {   // the first one used to sit under the BOAT TOURS text and looked like a white wooden board, so it was moved out of frame
        const w = W.put(K.waveStrip("kwave" + i, 20 + R() * 20, 60 + i, {h: 1.2 + R()}), x, y, 0, {});
        if (w) W.mover({kind: "wave", obj: w.holder, phase: R() * 6, amp: 2 + R() * 2});
    });

    // v8: add a sailboat on the cruise route (it is just in frame when the camera pans left at about 2 s), one more thing popping up in the opening
    {
        const sb = W.put(Wd.sailboat("keysSail", {stripe: "#2a9ad0"}), -72, 44, -0.2, {fold: "grow", yaw: 0.3});   // v12: the big lettering moved over, so the sailboat moved to the left
        rings.push([sb.pivot, -72, 44, 0.3, 10, 3.8]);
        W.mover({kind: "bob", obj: sb.holder, phase: 2.2, keepYaw: true});
    }

    // ---------- Seaplane: flying past at low altitude (LK_01) ----------
    {
        const plane = Wd.seaplane("seaplane");
        const p = W.put(plane, -150, 214, 34, {fold: "grow", lead: 80, stay: 400});
        p.holder.scale.setScalar(1.7);   // scaled up one size so that it reads as a seaplane in the frame
        W.mover({kind: "fly", obj: p.pivot, x0: -170, v: 26, z0: 34, prop: plane});
    }

    // ---------- Sea-crossing bridge + traffic ----------
    W.put(Wd.seaBridge("keysBridge", {h: 11, w: 24, every: 28}), 0, LANES.bridge, 0, {freq: 0.9, damp: 4.5});
    const bE = W.lane("bridgeE", LANES.bridge - 5.6, 18, {z: 13.8, driveIn: true});   // Fix item 36: cars drive onto the bridge from off-screen
    bE.add(K.car("kc0", "convertible", {body: "#ff8fb8", modern: false, rim: "#f0f0ff", interior: "#fff1d6"}), -140);
    bE.add(K.car("kc1", "suv", {body: "#f4f2ff", modern: true, rim: "#2a2236", chrome: "#1e1628"}), -60);
    bE.add(K.car("kc2", "pickup", {body: "#d8343f", modern: true, rim: "#d0d0e0", cargo: "#3fb8b0"}), 40);
    const bW = W.lane("bridgeW", LANES.bridge + 5.6, -14, {z: 13.8, driveIn: true});
    bW.add(K.car("kc3", "buffalo", {body: "#3fb8b0", modern: true, rim: "#c9c3dc"}), 120);
    bW.add(K.car("kc4", "widebody", {body: "#f5c518", livery: "wrap", wrap1: "#1e1628", wrap2: "#ff4fa3", modern: true, rim: "#2a2236", seed: 51}), 20);

    // ---------- The long island at the back: Highway 1, pastel cottages, billboards ----------
    const COT = [["#ffd6e0", "#4fb0c0"], ["#bfe8d8", "#e8605a"], ["#fff1c0", "#5a8ad0"], ["#d8d0ff", "#ff8fb8"], ["#ffe0c8", "#3fb8b0"]];
    {
        W.reserve(52, 363, 22, 10);
        const shed = T.house("boatWorks", {W: 40, D: 18, H: 13, wall: "#e8e4da", trim: "#1f5a8a", roof: "#8aa0b0", roofKind: "tin", roofType: "flat", windows: 3, doorX: 0.3,
            lit: 0.2, seed: 27, sign: {text: "BOAT REPAIR · STORAGE · FUEL", h: 2.4, y: 12.4, bg: "#1f5a8a", color: "#ffffff"}});
        const bs = S.postSign("brianSign", {lines: ["BRIAN'S BOAT WORKS", "& MARINA"], w: 36, h: 10, legs: 15,   // Blind review: the silhouetted person on the roof blocks the right end of the sign, so the posts are raised above head height bg: "#f4f0e4", colors: ["#1f5a8a", "#d8603a"], edge: "#1f3a5a",
            sizes: [3.6, 3.0]});
        bs.position.set(0, 10, 13);
        shed.add(bs);
        const sj = person("shirtlessJason", 533, "leonidaTank", {back: true, top: {kind: "none"}, hat: {kind: "cap_back", color: "#2a2a34"}, pose: "wave"}, 16);
        sj.position.set(13, 4, 13.4);
        shed.add(sj);
        W.put(shed, 52, 354, 1.4, {freq: 1.1, damp: 5});
        W.put(S.boatOnStand("standBoat", {deck: "#fff6ec", hull: "#fff6ec", stripe: "#1f5a8a", stripe2: "#d8603a", top: "#ffffff"}), 6, 362, 1.4,
            {fold: "grow", rect: [16, 4.5]});
        const dock = new THREE.Mesh(new THREE.BoxGeometry(8, 26, 1), new THREE.MeshStandardMaterial({color: 0xb8926e, roughness: 0.9}));
        dock.castShadow = true;
        dock.receiveShadow = true;
        W.flat(dock, 50, 290, 1.9);
        const mb = W.put(K.speedboat("mooredBoat", {deck: "#fff6ec", hull: "#2a3a5a", stripe: "#f5c518", stripe2: "#ffffff", top: "#ffffff"}), 74, 288, 0, {fold: "grow", rect: [15, 4]});
        if (mb) W.mover({kind: "bob", obj: mb.holder, phase: 0.3, keepYaw: true});
    }
    [-200, -150, -96, 136, 190].forEach((x, i) => {
        const [wall, trim] = COT[i % COT.length];
        const w = 18 + R() * 6, d = 13;
        W.reserve(x, 355 + d / 2, w / 2 + 0.6, d / 2 + 0.6);
        W.put(T.house("cot" + i, {W: w, D: d, H: 9, wall, trim: "#ffffff", roof: trim, roofKind: "tin", siding: true, windows: 2, doorX: 0.5, lit: 0.1, seed: 60 + i,
            pitch: 6, shutters: trim, porch: i % 2 ? {depth: 4, posts: 3} : null}), x, 355, 1.4, {freq: 1.1, damp: 5});
    });
    W.put(C.billboard("kbb", {kind: "leonida", w: 30, h: 12, legs: 10}), -40, 360, 1.4, {dt: 0.3});   // roadside billboard (there is one standing by the road in LK_02)
    for (let i = 0; i < 10; i++) {
        const x = -240 + i * 52 + jitter(8);
        W.put(K.palm("kk" + i, {h: 30 + R() * 22, bend: 2 + R() * 3, seed: 880 + i, fronds: 8, reach: 0.85}), x, 316 + jitter(4), 1.4,
            {freq: 1.3, damp: 5.5, hide: true, unfold: true, r: 2.4});
    }
    const road = W.lane("keysRoad", LANES.road - 4, 12, {driveIn: true});
    road.add(K.car("kd0", "pickup", {body: "#f4f2ff", modern: true, rim: "#2a2236", cargo: "#f5c518"}), -80);
    road.add(K.car("kd1", "convertible", {body: "#3fb8b0", modern: false, rim: "#f0f0ff"}), 60);
    // ---------- v12: add things to the opening (author: this stretch is bare, with few elements, and looks crude) ----------
    // Positions are all hard-coded, no footprint registered, people all attached to the group: no extra R() draws, so the random positions in later regions do not change
    {
        // Snorkeling spot: dive buoy + three people snorkeling (next to the printed SNORKEL flag)
        rings.push([W.put(Q.diveBuoy("diveBuoy"), -2, 18, 0, {fold: "grow"}).pivot, -2, 18, 0, 2.3, 2.3]);
        [[-20, 12, 0.6, "#c98d68", "#2a1e1a", "#f5d020", "#ff5a7a", "#2a6ad0"], [8, 26, -0.9, "#8a5a3e", "#1a1414", "#ff6a9a", "#3ad0b0", "#1e1e2a"],
            [16, 7, 2.2, "#e8b896", "#c8903a", "#3ad0e0", "#ffd030", "#ff6a2a"]].forEach(([x, y, yaw, skin, hair, tube, suit, fins], i) => {
            const sn = W.put(Q.snorkeler("snork" + i, 60 + i, {skin, hair, tube, suit, fins}), x, y, 0, {fold: "grow", yaw});
            rings.push([sn.pivot, x, y, yaw, 4.6, 2.6]);
            sn.holder.scale.setScalar(1.3);
            W.mover({kind: "bob", obj: sn.holder, phase: i * 1.7, keepYaw: true});
        });
        // Sandbar party: a few people standing at the front edge of the sandbar, a cooler and two beach towels on the sand
        [[-38, 51.5, "neonBikini", {prop: "cup"}], [-31, 50.5, "shirtlessTats", {pose: "wave"}], [3, 49, "sunhatLady", {}], [10, 50, "greenTrunks", {prop: "cup"}],
            [17, 51.5, "fishnetFit", {pose: "hips"}]].forEach(([x, y, look, extra], i) => {
            const grp = new THREE.Group();
            grp.add(person("sbp" + i, 550 + i, look, extra, [11, 12, 13, 18, 19][i]));
            W.put(grp, x, y, 1.4, {});
        });
        {
            const cooler = new THREE.Group();
            const box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.2), new THREE.MeshStandardMaterial({color: 0x2a8ad0, roughness: 0.85}));
            box.position.z = 1.1;
            const lid = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.5), new THREE.MeshStandardMaterial({color: 0xf4f4f8, roughness: 0.85}));
            lid.position.z = 2.45;
            for (const m of [box, lid]) { m.castShadow = true; m.receiveShadow = true; cooler.add(m); }
            W.put(cooler, -20, 57, 1.4, {fold: "grow", yaw: 0.3});
            [[-8, 55, "#ff6fae", "#fff6ec"], [22, 58, "#3ad0e0", "#f5d020"]].forEach(([x, y, a, b], i) => {
                const s = sheet(4, 8, 12);
                s.ctx.fillStyle = a; s.ctx.fillRect(0, 0, s.W, s.H);
                s.ctx.fillStyle = b;
                for (let k = 0; k < 4; k++) s.ctx.fillRect(0, s.mm(1 + k * 2), s.W, s.mm(0.8));
                const towel = rectSheet(s.canvas, {id: "towel" + i, width: 4, height: 8, thickness: 0.15, origin: "center", back: a, edge: a});
                towel.rotation.z = 1.3 + i * 0.4;
                W.flat(towel, x, y, 1.45);
            });
        }
        // Two dolphins jumping at the front left (next to the printed dolphin, facing the same direction)
        [[-58, 15, 0], [-47, 7, 1.05]].forEach(([x, y, ph], i) => {
            const d = Q.dolphin("dolphin" + i);
            const p = W.put(d, x, y, 0, {fold: "grow"});
            p.holder.scale.setScalar(1.3);
            W.mover({kind: "leap", obj: d, dir: 1, len: 10, h: 6.5, period: 2.1, air: 0.95, phase: ph});
        });
        // Channel markers: green 1 on the left, red 2 on the right, a pelican perched on top of each post
        [["green", 1, -66, 60], ["red", 2, 40, 70]].forEach(([kind, num, x, y], i) => {
            const m = Q.channelMarker("marker" + num, kind, num);
            const pel = Q.pelican("markerPelican" + i, i + 1);
            pel.position.set(0, 0.3, 12);
            m.add(pel);
            rings.push([W.put(m, x, y, 0, {freq: 1.2, damp: 5}).pivot, x, y, 0, 2.2, 2.2]);
        });
        // Lobster-trap buoys
        [[-24, 48, 3], [26, 22, 4], [36, 196, 5], [-56, 226, 6]].forEach(([x, y, sd], i) => {
            const b = W.put(Q.trapBuoys("traps" + i, sd), x, y, 0, {fold: "grow"});
            W.mover({kind: "bob", obj: b.holder, phase: i, keepYaw: true});
        });
        // Two kayaks: paddling slowly to the right in front of the sea-crossing bridge
        [[-52, 222, "#ff8a2a", "neonBikini", 0], [-66, 229, "#f5d020", "fishingShirt", 1.3]].forEach(([x, y, color, look, ph], i) => {
            const rider = person("kayaker" + i, 540 + i, look, {pose: "walk"}, [20, 17][i]);
            const k = Q.kayak("kayak" + i, color, rider);
            const p = W.put(k, x, y, 0, {fold: "grow"});
            p.holder.scale.setScalar(1.3);
            W.mover({kind: "kayak", obj: p.pivot, paddle: k.userData.paddle, x0: x, v: 3, phase: ph});
        });
        // Three brown pelicans gliding in a line from left to right (their shadows fall on the sea)
        [[-100, 196, 30, 0], [-114, 204, 33, 0.9], [-127, 211, 31, 1.7]].forEach(([x, y, z, ph], i) => {
            const b = Q.pelicanFlying("pelicanFly" + i);
            b.scale.setScalar(1.25);
            W.flat(b, x, y, z);
            W.mover({kind: "glide", obj: b, wings: b.userData.wings, x0: x, v: 11, z0: z, phase: ph});
        });
    }
    // ---------- Blind review (11-24): nothing GTA-related in the 3-8 s of footage - a police boat with flashing lights chases Jason and Lucia's jet ski ----------
    // Same route and speed as the jet ski, 40 behind; placed last in the region, no footprint registered: no extra random draws
    {
        const pb = S.policeBoat("kPolice");
        const p = W.put(pb, -100, 199, 0, {fold: "grow"});
        p.holder.scale.setScalar(0.75);
        const wk = K.wake("kPoliceWake", 6, 50);
        wk.position.set(-12, 0, 0.3);
        p.holder.add(wk);
        W.mover({kind: "boat", obj: p.pivot, x0: -100, v: 24});
    }
    // ---------- Fix item 30: water rings (appear together with their objects, swelling and shrinking gently); item 5: cut-paper short-line sparkles ----------
    rings.forEach(([pivot, x, y, yaw, rx, ry], i) => {
        const ring = Q.waterRing("wring" + i, rx, ry, 0.5, 300 + i);
        W.flat(ring, x, y, waterTop(x, y) + 0.06, {rot: yaw});
        W.mover({kind: "ripple", obj: ring, of: pivot, phase: i * 1.3});
        if (rx > 8) {   // another thin ring outside the boat
            const r2 = Q.waterRing("wring" + i + "b", rx * 1.35, ry * 1.6, 0.3, 400 + i);
            W.flat(r2, x, y, waterTop(x, y) + 0.05, {rot: yaw});
            W.mover({kind: "ripple", obj: r2, of: pivot, phase: i * 1.3 + 1.6, delay: 0.25});
        }
    });
    {
        const gr = rng(4242);   // its own random generator, leaving R() untouched
        const land = ISLANDS.map(isl => islandOutline({...isl, rx: isl.rx + 2.5, ry: isl.ry + 2.5}));
        const items = [];
        for (let i = 0; i < 420; i++) {
            const x = -135 + gr() * 270, y = -4 + gr() * 250, len = 2.6 + gr() * 2.6, wid = 0.45 + gr() * 0.2, rot = (gr() - 0.5) * 0.3;
            const P = 1.8 + gr() * 1.8, ph = gr();
            if (land.some(o => inside(o, x, y))) continue;
            const g = Q.glint("glint" + i, len, wid);
            W.flat(g, x, y, waterTop(x, y) + 0.08, {rot});
            items.push({obj: g, P, ph});
        }
        W.mover({kind: "glints", items});
    }
    void [THREE, P, mix];
    return {name: "keys", y0: Y0, y1: Y1};
}
