import {
    BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
    ShapeUtils, Vector2,
} from "three";

const placeholder = new MeshBasicMaterial();
const faces = ["front", "back", "edge"];

export function rectangle(x, y, width, height) {
    return [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
}

function area(ring) {
    return ring.reduce((sum, a, i) => {
        const b = ring[(i + 1) % ring.length];
        return sum + a.x * b.y - b.x * a.y;
    }, 0) / 2;
}

function points(ring) {
    const result = ring.map(([x, y]) => new Vector2(x, y));
    if (result[0]?.equals(result.at(-1))) result.pop();
    if (result.length < 3 || !result.every(({x, y}) => Number.isFinite(x) && Number.isFinite(y))
            || Math.abs(area(result)) < 1e-8) {
        throw new RangeError("paper outline needs a finite ring with a nonzero area");
    }
    return result;
}

export function cardGeometry(outline, thickness = 0.35, holes = [], uvFrame) {
    if (!Number.isFinite(thickness) || thickness <= 0) throw new RangeError("thickness must be positive");
    const outer = points(outline);
    const inner = holes.map(points);
    const vertices = outer.concat(...inner);
    const triangulated = ShapeUtils.triangulateShape(outer, inner);
    if (!triangulated.length) throw new RangeError("paper outline does not triangulate");
    const x0 = Math.min(...outer.map(p => p.x));
    const y0 = Math.min(...outer.map(p => p.y));
    const frame = uvFrame ?? {
        x: x0, y: y0, width: Math.max(...outer.map(p => p.x)) - x0,
        height: Math.max(...outer.map(p => p.y)) - y0,
    };
    if (!(frame.width > 0 && frame.height > 0)) throw new RangeError("UV frame must have a positive span");
    const geometry = new BufferGeometry();
    const coords = [], uvs = [], millimetres = [];
    const capUV = p => [(p.x - frame.x) / frame.width, (p.y - frame.y) / frame.height];
    const push = (p, z, uv = capUV(p)) => {
        coords.push(p.x, p.y, z);
        uvs.push(...uv);
        millimetres.push(p.x, p.y);
    };
    const z = thickness / 2;

    for (const [index, sign] of [1, -1].entries()) {
        const start = coords.length / 3;
        for (const face of triangulated) {
            const [a, b, c] = face.map(i => vertices[i]);
            const ccw = area([a, b, c]) > 0;
            for (const p of ccw === (sign > 0) ? [a, b, c] : [a, c, b]) push(p, sign * z);
        }
        geometry.addGroup(start, coords.length / 3 - start, index);
    }
    const start = coords.length / 3;
    for (const [index, ring] of [outer, ...inner].entries()) {
        const forward = (area(ring) > 0) === (index === 0);
        for (let i = 0; i < ring.length; i++) {
            const first = ring[i], second = ring[(i + 1) % ring.length];
            const [a, b] = forward ? [first, second] : [second, first];
            push(a, -z, [0, 0]); push(b, -z, [1, 0]); push(b, z, [1, 1]);
            push(a, -z, [0, 0]); push(b, z, [1, 1]); push(a, z, [0, 1]);
        }
    }
    geometry.addGroup(start, coords.length / 3 - start, 2);
    geometry.setAttribute("position", new Float32BufferAttribute(coords, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("paperMm", new Float32BufferAttribute(millimetres, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
}

export function tagPaper(mesh, definition, slots = faces) {
    const {id, kind, part, meta = {}, castShadow = true, receiveShadow = true} = definition;
    mesh.name = id;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.userData.paper = {id, kind, part, meta, slots};
    return mesh;
}

export class Card extends Mesh {
    constructor({outline, thickness = 0.35, holes, uvFrame, ...definition}) {
        super(cardGeometry(outline, thickness, holes, uvFrame), faces.map(() => placeholder));
        tagPaper(this, {kind: "card", ...definition});
    }
}

export class FoldedBox extends Group {
    constructor({id, width, depth, height, thickness = 0.35, meta, ...shadowOptions}) {
        super();
        if (![width, depth, height].every(n => n > thickness)) {
            throw new RangeError("box dimensions must exceed the paper thickness");
        }
        this.name = id;
        const make = (part, w, h, y = 0) => new Card({
                id, kind: "box", part, meta, thickness, outline: rectangle(-w / 2, -h / 2, w, h),
                ...shadowOptions,
            }).translateY(y);
        const base = make("bottom", width, depth);
        base.rotation.x = Math.PI;
        this.add(base);
        this.hinges = [];
        for (const [part, w, x, y, yaw] of [
            ["south", width, 0, -depth / 2, 0], ["north", width, 0, depth / 2, Math.PI],
            ["east", depth, width / 2, 0, Math.PI / 2], ["west", depth, -width / 2, 0, -Math.PI / 2],
        ]) {
            const mount = new Group();
            mount.position.set(x, y, 0);
            mount.rotation.z = yaw;
            const hinge = new Group();
            hinge.add(make(part, w, height, height / 2));
            if (part === "north") {
                this.lid = new Group();
                this.lid.position.y = height;
                this.lid.add(make("top", width, depth, depth / 2));
                hinge.add(this.lid);
            }
            mount.add(hinge);
            this.add(mount);
            this.hinges.push(hinge);
        }
        this.setFold(Math.PI / 2);
    }

    setFold(angle) {
        if (!(angle >= 0 && angle <= Math.PI / 2)) throw new RangeError("box angle outside [0, pi/2]");
        for (const hinge of this.hinges) hinge.rotation.x = angle;
        this.lid.rotation.x = -angle;
    }
}

export class CrossCard extends Group {
    constructor({id, outline, angle = Math.PI / 2, ...options}) {
        super();
        this.name = id;
        const first = new Card({id, kind: "cross", part: "a", outline, ...options});
        const second = new Card({id, kind: "cross", part: "b", outline, ...options});
        second.rotation.y = angle;
        this.add(first, second);
    }
}
