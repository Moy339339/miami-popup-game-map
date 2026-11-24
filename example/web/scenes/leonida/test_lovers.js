// Debug use: the silhouette canvases of the closing pair (and the kid), enlarged and laid out flat, unlit, to inspect the outlines (not in the final film).
// t=0: the standing man, the standing woman, and the whole kissing sheet; t=1: kiss enlarged; t=2: the family of three arranged together at the spacing used in the film; t=3: the color layer of "HOT TOGETHER"
import * as THREE from "three";
import {standingSheet, kissSheet, holdingSheet, kidSheet, FAMILY} from "./props_lovers.js";
import {makeCanvas} from "./kit.js";

const PPM = 30;
function board(cells) {
    const W = cells.reduce((a, c) => a + c.width, 0) + 40 * (cells.length + 1), H = Math.max(...cells.map(c => c.height)) + 80;
    const big = makeCanvas(W, H);
    const g = big.getContext("2d");
    g.fillStyle = "#e8d2b8";
    g.fillRect(0, 0, W, H);
    let x = 40;
    for (const c of cells) { g.drawImage(c, x, H - 40 - c.height); x += c.width + 40; }
    return big;
}
function family() {
    const m = holdingSheet("man").canvas, w = holdingSheet("woman").canvas, k = kidSheet().canvas;
    const sp = FAMILY.spread * PPM, W = Math.round(2 * sp + m.width + 80), H = m.height + 80;
    const c = makeCanvas(W, H), g = c.getContext("2d");
    g.fillStyle = "#e8d2b8";
    g.fillRect(0, 0, W, H);
    const cx = W / 2, base = H - 40;
    g.drawImage(m, cx - sp - m.width / 2, base - m.height);
    g.drawImage(w, cx + sp - w.width / 2, base - w.height);
    g.drawImage(k, cx - k.width / 2, base - k.height);
    return c;
}
function plane(canvas, x, w) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const h = w * canvas.height / canvas.width;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex}));
    p.rotation.x = Math.PI / 2;
    p.position.set(x, 0, h / 2);
    return [p, h];
}

export async function build() {
    const root = new THREE.Group();
    await document.fonts.load('800 20px Bahnschrift');
    const [p1, h1] = plane(board([standingSheet("man").canvas, standingSheet("woman").canvas, kissSheet().canvas]), 0, 100);
    const [p2, h2] = plane(family(), 300, 60);
    root.add(p1, p2);
    const cam = (x, d, h, fov) => ({position: [x, -d, h / 2], target: [x, 0, h / 2], up: [0, 0, 1], fov, near: 1, far: 1000, focus: {distance: d, band: 400, tilt: 0, maxBlur: 0}});
    const camera = t => t < 1 ? cam(0, 250, h1, 30) : t < 2 ? cam(28, 60, h1, 40) : cam(300, 150, h2, 30);
    return {root, camera, update() {}, state: t => ({t, tod: 0.3, focus: [0, 0, 0]})};
}
