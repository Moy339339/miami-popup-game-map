// Debug use: lay out the printed artwork of the pedestrian standees flat on one big image, facing the camera and unlit, to inspect drawing details (not in the final film).
import * as THREE from "three";
import {paintStreetPerson, LOOKS} from "./paint_people.js";
import {makeCanvas} from "./kit.js";

export async function build() {
    const root = new THREE.Group();
    for (const f of ['700 20px "Bookman Old Style"', '900 20px "Arial Black"', '20px Impact', '700 20px Bahnschrift']) await document.fonts.load(f);
    const items = [
        ...Object.keys(LOOKS),
        ["jasonHeist", {back: true}], ["luciaHeist", {back: true}], ["jasonHeist", {prop: "duffel", cashPeek: true, pose: "run"}],
        ["luciaHeist", {prop: "moneybag", pose: "run"}], ["leonidaTank", {back: true, top: {kind: "none"}}], ["luciaHeist", {prop: "cash", pose: "wave", mask: null, back: true}],
        ["fishnetFit", {pose: "handsup"}], ["cop", {pose: "hips"}], ["clerk", {pose: "run"}],
    ];
    const cols = 8, ppm = 40;
    const cells = items.map((it, i) => {
        const [look, extra] = Array.isArray(it) ? it : [it, {}];
        return paintStreetPerson(ppm, 900 + i, {...LOOKS[look], ...extra});
    });
    const cw = Math.max(...cells.map(c => c.width)), ch = Math.max(...cells.map(c => c.height));
    const rowsN = Math.ceil(cells.length / cols);
    const big = makeCanvas(cw * cols, ch * rowsN);
    const g = big.getContext("2d");
    g.fillStyle = "#e8d2b8";
    g.fillRect(0, 0, big.width, big.height);
    cells.forEach((c, i) => g.drawImage(c, (i % cols) * cw + (cw - c.width) / 2, Math.floor(i / cols) * ch + (ch - c.height)));
    const tex = new THREE.CanvasTexture(big);
    tex.colorSpace = THREE.SRGBColorSpace;
    const w = 100, h = w * big.height / big.width;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex}));
    plane.rotation.x = Math.PI / 2;
    plane.position.set(0, 0, h / 2);
    root.add(plane);
    // t=0 the whole sheet; t=1..: enlarged row by row
    const camera = t => {
        const k = Math.floor(t);
        if (k === 0) return {position: [0, -160, h / 2], target: [0, 0, h / 2], up: [0, 0, 1], fov: 40, near: 1, far: 1000, focus: {distance: 160, band: 400, tilt: 0, maxBlur: 0}};
        const row = Math.floor((k - 1) / 2), cy = h - (row + 0.5) * h / rowsN, half = (k - 1) % 2 ? w / 4 : -w / 4;
        return {position: [half, -48, cy], target: [half, 0, cy], up: [0, 0, 1], fov: 40, near: 1, far: 1000, focus: {distance: 48, band: 400, tilt: 0, maxBlur: 0}};
    };
    return {root, camera, update() {}, state: t => ({t, tod: 0.3, focus: [0, 0, 0]})};
}
