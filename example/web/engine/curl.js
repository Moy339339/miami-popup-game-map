import {
    BufferGeometry, DynamicDrawUsage, Float32BufferAttribute, Mesh, MeshBasicMaterial,
} from "three";
import {tagPaper} from "./paper.js";

export function curlProfile(width, {progress, radius, lift, bendStart = 0.3, segments = 24}) {
    if (!(width > 0 && progress >= 0 && progress <= 1 && radius > 0 && lift >= 0
            && bendStart >= 0 && bendStart < 1 && Number.isInteger(segments) && segments >= 5)) {
        throw new RangeError("invalid page turn");
    }
    const start = width * bendStart;
    const tail = width - start;
    const tipHeight = angle => radius * (1 - Math.cos(angle)) + (tail - radius * angle) * Math.sin(angle);
    let lo = 0, hi = Math.min(Math.PI / 2, tail / radius);
    if (lift > tipHeight(hi) + 1e-7) throw new RangeError("page lift exceeds the available length at this radius");
    if (lift === 0) hi = 0;
    for (let iteration = 0; iteration < 42; iteration++) {
        const trial = (lo + hi) / 2;
        if (tipHeight(trial) < lift) lo = trial;
        else hi = trial;
    }
    const bend = (lo + hi) / 2;
    const end = start + radius * bend;
    const samples = [0, ...Array.from({length: segments + 1}, (_, i) =>
        start + (end - start) * i / segments), width];
    const base = Math.PI * progress;
    return samples.map(u => {
        const angle = Math.min(bend, Math.max(0, (u - start) / radius));
        const beyond = Math.max(0, u - end);
        const x = Math.min(start, u) + radius * Math.sin(angle) + beyond * Math.cos(angle);
        const z = radius * (1 - Math.cos(angle)) + beyond * Math.sin(angle);
        return {
            u, x: x * Math.cos(base) - z * Math.sin(base),
            z: x * Math.sin(base) + z * Math.cos(base), angle: base + angle,
        };
    });
}

export class Page extends Mesh {
    constructor({id, width, height, origin = [0, 0, 0], segments = 24, ...definition}) {
        if (!(width > 0 && height > 0 && Number.isInteger(segments) && segments >= 5)) {
            throw new RangeError("invalid page geometry");
        }
        const geometry = new BufferGeometry();
        const columns = segments + 3;
        const count = columns * 4;
        geometry.setAttribute("position", new Float32BufferAttribute(count * 3, 3).setUsage(DynamicDrawUsage));
        geometry.setAttribute("normal", new Float32BufferAttribute(count * 3, 3).setUsage(DynamicDrawUsage));
        geometry.setAttribute("uv", new Float32BufferAttribute(count * 2, 2).setUsage(DynamicDrawUsage));
        const indices = [];
        for (const side of [0, 1]) {
            const start = indices.length;
            for (let row = 0; row < columns - 1; row++) {
                const a = 2 * (side * columns + row);
                if (side === 0) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
                else indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }
            geometry.addGroup(start, indices.length - start, side);
        }
        geometry.setIndex(indices);
        super(geometry, [new MeshBasicMaterial(), new MeshBasicMaterial()]);
        tagPaper(this, {id, kind: "page", ...definition}, ["front", "back"]);
        this.position.set(...origin);
        this.frustumCulled = false;
        this.width = width;
        this.height = height;
        this.segments = segments;
        this.setTurn({progress: 0, radius: width, lift: 0});
    }

    setTurn(turn) {
        const curve = curlProfile(this.width, {...turn, segments: this.segments});
        const {position, normal, uv} = this.geometry.attributes;
        for (const side of [0, 1]) {
            const sign = side === 0 ? 1 : -1;
            for (const [i, {u, x, z, angle}] of curve.entries()) {
                const j = 2 * (i + side * curve.length);
                for (const end of [0, 1]) {
                    position.setXYZ(j + end, x, (end - 0.5) * this.height, z);
                    normal.setXYZ(j + end, -sign * Math.sin(angle), 0, sign * Math.cos(angle));
                    uv.setXY(j + end, side === 0 ? u / this.width : 1 - u / this.width, end);
                }
            }
        }
        for (const attribute of [position, normal, uv]) attribute.needsUpdate = true;
    }
}
