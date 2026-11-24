import {Group, MathUtils, Matrix4, Quaternion, Vector3} from "three";
import {Card, rectangle} from "./paper.js";

const Y = new Vector3(0, 1, 0);
const EPS = 1e-8;
const vector = ([x, y, z = 0]) => new Vector3(x, y, z);
const degrees = MathUtils.degToRad;

function rigidPose(object, matrix) {
    matrix.decompose(object.position, object.quaternion, object.scale);
    object.updateMatrix();
}

export class Spring {
    constructor({start, frequency, damping, amplitudeDeg, delay = 0}) {
        if (![start, frequency, damping, amplitudeDeg, delay].every(Number.isFinite)
                || !(frequency > 0 && damping >= 0 && delay >= 0)) {
            throw new RangeError("invalid spring");
        }
        Object.assign(this, {start, frequency, damping, amplitudeDeg, delay});
    }

    offset(t) {
        const elapsed = t - this.start - this.delay;
        return elapsed <= 0 ? 0 : this.amplitudeDeg * Math.exp(-this.damping * elapsed)
            * Math.sin(2 * Math.PI * this.frequency * elapsed);
    }
}

function angleAt(track, spring, limits, t, theta, state) {
    if (!(limits[0] <= 0 && limits[1] >= 0)) {
        throw new RangeError("fold limits must contain the closed angle 0");
    }
    const nominal = track(t, theta, state);
    if (!Number.isFinite(nominal) || (theta === 0 && Math.abs(nominal) > EPS)) {
        throw new RangeError("fold angles must be finite and close flat");
    }
    const gain = Math.sin(degrees(theta) / 2);
    return degrees(MathUtils.clamp(nominal + (spring?.offset(t) ?? 0) * gain, ...limits));
}

export class Book {
    constructor({width, height, spineZ = 0, thickness = 2.2, clearance = 0.35, boardMeta = {}}) {
        if (!(width > 0 && height > 0 && thickness > 0 && clearance >= 0)) {
            throw new RangeError("invalid book dimensions");
        }
        Object.assign(this, {width, height, thickness, clearance});
        this.root = new Group();
        this.root.name = "book";
        this.root.position.z = spineZ;
        this.nodes = new Map([["book", this.root]]);
        this.mechanisms = [];
        this.joints = [];

        for (const [id, x] of [["board.left", -width], ["board.right", 0]]) {
            const mountingPlane = new Group();
            this.mount(id, mountingPlane, this.root);
            const board = new Card({
                id, kind: "board", meta: boardMeta[id], outline: rectangle(x, -height / 2, width, height),
                thickness,
            });
            board.position.z = -(thickness + clearance) / 2;
            mountingPlane.add(board);
        }
        this.left = this.node("board.left");
        this.right = this.node("board.right");
    }

    node(id) {
        const node = this.nodes.get(id);
        if (!node) throw new Error("unknown paper parent " + id);
        return node;
    }

    mount(id, object, parent) {
        if (this.nodes.has(id)) throw new Error("duplicate paper id " + id);
        if (!object?.isObject3D) throw new TypeError("expected Object3D for " + id);
        this.nodes.set(id, object);
        parent.add(object);
    }

    add(...mechanisms) {
        for (const mechanism of mechanisms) {
            mechanism.bind(this);
            this.mechanisms.push(mechanism);
        }
        return this;
    }

    setPage(page, track) {
        this.mount(page.name, page, this.root);
        this.page = page;
        this.pageTrack = track;
    }

    join(id, a, x, b, y) {
        this.joints.push({id, a, x: vector(x), b, y: vector(y)});
    }

    jointErrors() {
        this.root.updateWorldMatrix(true, true);
        return this.joints.map(({id, a, x, b, y}) => ({
            id, error: a.localToWorld(x.clone()).distanceTo(b.localToWorld(y.clone())),
        }));
    }

    update(t, theta, state = {}) {
        if (!(theta >= 0 && theta <= 180)) throw new RangeError("theta must be in [0,180]");
        this.left.rotation.y = Math.PI - degrees(theta);
        this.left.updateMatrix();
        this.right.updateMatrix();
        for (const mechanism of this.mechanisms) mechanism.update(t, theta, state);
        if (this.page) {
            const turn = this.pageTrack(t, theta, state);
            this.page.visible = turn != null;
            if (turn != null) this.page.setTurn(turn);
        }
        this.root.updateWorldMatrix(true, true);
    }
}

export class VFold {
    constructor(options) {
        Object.assign(this, {spineY: 0, thickness: 0.35, ...options});
    }

    bind(book) {
        this.book = book;
        const {anchorX: a, anchorY: b, ridgeLength: r, ridgeProjection: p, spineY} = this;
        if (!(a > 0 && a <= book.width && r > 0 && p > 0 && p < b)) {
            throw new RangeError("invalid V-fold geometry");
        }
        this.reach = Math.hypot(a, b);
        const x = r * p / this.reach;
        const y = Math.sqrt(r * r - x * x);
        this.panels = [
            {id: this.leftId, side: -1, parent: book.left, meta: this.leftMeta},
            {id: this.rightId, side: 1, parent: book.right, meta: this.rightMeta},
        ];
        for (const panel of this.panels) {
            const {id, side, parent, meta} = panel;
            panel.anchor = vector([side * a, spineY + b]);
            panel.card = new Card({id, kind: "vfold", meta, thickness: this.thickness,
                outline: [[0, 0], [this.reach, 0], [x, side * y]]});
            book.mount(id, panel.card, parent);
            book.join(id + ".spine", parent, [0, spineY], panel.card, [0, 0]);
            book.join(id + ".anchor", parent, panel.anchor.toArray(), panel.card, [this.reach, 0]);
        }
        book.join(this.leftId + "/" + this.rightId + ".ridge",
            this.panels[0].card, [x, -y], this.panels[1].card, [x, y]);
    }

    update(_t, theta) {
        const {anchorX: a, anchorY: b, ridgeLength: r, ridgeProjection: p, spineY} = this;
        const half = degrees(theta) / 2;
        const projected = a * Math.cos(half);
        const angle = Math.atan2(projected, b) + Math.acos(p / Math.hypot(projected, b));
        const horizontal = r * Math.sin(angle);
        const root = vector([0, spineY]);
        const ridge = vector([horizontal * Math.cos(half), r * Math.cos(angle), horizontal * Math.sin(half)]);
        if (horizontal > this.book.width || [spineY, spineY + b, spineY + ridge.y]
            .some(y => Math.abs(y) > this.book.height / 2)) {
            throw new RangeError("V-fold exceeds the book footprint");
        }
        for (const {side, parent, anchor, card} of this.panels) {
            const x = anchor.clone().applyMatrix4(parent.matrix).sub(root).normalize();
            const z = new Vector3().crossVectors(x, ridge).normalize().multiplyScalar(side);
            const y = new Vector3().crossVectors(z, x);
            const pose = new Matrix4().makeBasis(x, y, z).setPosition(root);
            rigidPose(card, parent.matrix.clone().invert().multiply(pose));
        }
    }
}

export class Hinge {
    constructor({id, object, parent, anchor, axis, pivot = [0, 0], angle, spring, limits = [-180, 180]}) {
        Object.assign(this, {id, object, parent, angle, spring, limits});
        this.anchor = vector(anchor);
        this.pivot = vector(pivot);
        this.axis = vector(axis);
        if (Math.abs(this.axis.z) > EPS || this.axis.lengthSq() <= EPS) {
            throw new RangeError("hinge axis must be nonzero in the parent plane");
        }
        this.axis.normalize();
    }

    bind(book) {
        const parent = book.node(this.parent);
        book.mount(this.id, this.object, parent);
        for (const step of [0, 1]) {
            book.join(this.id + ".hinge." + step, parent, this.anchor.clone().addScaledVector(this.axis, step).toArray(),
                this.object, this.pivot.clone().addScaledVector(this.axis, step).toArray());
        }
    }

    update(t, theta, state) {
        const angle = angleAt(this.angle, this.spring, this.limits, t, theta, state);
        this.object.quaternion.setFromAxisAngle(this.axis, angle);
        this.object.position.copy(this.anchor).sub(this.pivot.clone().applyQuaternion(this.object.quaternion));
    }
}

export class TabLayer {
    constructor({first, second, top, parent, firstAnchor, secondAnchor, length, angle, spring, limits = [0, 90]}) {
        if (!(length > 0) || Math.abs(firstAnchor[0] - secondAnchor[0]) <= EPS) {
            throw new RangeError("tab linkage requires distinct hinges and a positive length");
        }
        Object.assign(this, {top, parent, length, angle, spring, limits});
        this.struts = [[first, vector(firstAnchor)], [second, vector(secondAnchor)]];
    }

    bind(book) {
        const parent = book.node(this.parent);
        book.mount(this.top.name, this.top, parent);
        for (const [strut, point] of this.struts) {
            book.mount(strut.name, strut, parent);
            const offset = point.clone().sub(this.struts[0][1]);
            for (const y of [0, 1]) {
                book.join(strut.name + ".base." + y, parent, [point.x, point.y + y], strut, [0, y]);
                book.join(strut.name + ".tip." + y, this.top, [offset.x, offset.y + y], strut, [this.length, y]);
            }
        }
    }

    update(t, theta, state) {
        const angle = angleAt(this.angle, this.spring, this.limits, t, theta, state);
        const rotate = new Quaternion().setFromAxisAngle(Y, -angle);
        for (const [strut, origin] of this.struts) {
            strut.position.copy(origin);
            strut.quaternion.copy(rotate);
        }
        const tip = new Vector3(this.length, 0, 0).applyQuaternion(rotate);
        this.top.position.copy(this.struts[0][1]).add(tip);
    }
}

export class PullTab {
    constructor({id, object, parent, start, end, distance, pin = [0, 0]}) {
        Object.assign(this, {id, object, parent, distance});
        this.start = vector(start);
        this.slot = vector(end).sub(this.start);
        this.length = this.slot.length();
        this.pin = vector(pin);
        if (this.length <= EPS) throw new RangeError("pull tab needs a nonempty slot");
    }

    bind(book) {
        const parent = book.node(this.parent);
        book.mount(this.id, this.object, parent);
        book.join(this.id + ".pin", parent, this.start.toArray(), this.object, this.pin.toArray());
        this.joint = book.joints.at(-1);
    }

    update(t, theta, state) {
        const distance = this.distance(t, theta, state);
        if (!(distance >= 0 && distance <= this.length)) throw new RangeError("pin outside its slot");
        this.joint.x.copy(this.start).addScaledVector(this.slot, distance / this.length);
        this.object.position.copy(this.joint.x).sub(this.pin);
    }
}

export class FreePiece {
    constructor({id, object, parent = "book", track}) {
        Object.assign(this, {id, object, parent, track});
    }

    bind(book) {
        book.mount(this.id, this.object, book.node(this.parent));
    }

    update(t, theta, state) {
        const {position, rotation = [0, 0, 0], visible = true} = this.track(t, theta, state);
        this.object.position.set(...position);
        this.object.rotation.set(...rotation);
        this.object.visible = visible;
    }
}
