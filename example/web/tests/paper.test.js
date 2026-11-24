import assert from "node:assert/strict";
import test from "node:test";
import {Box3, Vector3} from "three";
import * as THREE from "three";
import * as paper from "../engine/index.js";
import {build} from "../scenes/demo/index.js";

const {Book, Card, FoldedBox, Page, curlProfile, rectangle} = paper;
const fresh = () => build({THREE, paper});
const EPS = 1e-6;

function eachMesh(root, visit) {
    root.traverse(object => {
        if (object.isMesh && object.userData.paper.kind !== "page") visit(object);
    });
}

function meshPoints(mesh) {
    const p = mesh.geometry.attributes.position;
    return [0, 1, 2].map(i => mesh.localToWorld(new Vector3().fromBufferAttribute(p, i)));
}

function edges(mesh) {
    const [a, b, c] = meshPoints(mesh);
    return [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)];
}

test("thick card groups have opposing cap normals, mm UVs, edge walls and a cutout", () => {
    const g = paper.cardGeometry(rectangle(-2, -1, 10, 6), 0.35, [rectangle(0, 0, 2, 2)]);
    const {position, normal, uv, paperMm} = g.attributes;
    assert.deepEqual(g.groups.map(x => x.materialIndex), [0, 1, 2]);
    let area = 0;
    for (let i = 0; i < g.groups[0].count; i += 3) {
        const [a, b, c] = [i, i + 1, i + 2].map(j => new Vector3().fromBufferAttribute(position, j));
        area += b.sub(a).cross(c.sub(a)).length() / 2;
    }
    assert.equal(area, 56);
    assert.equal(normal.getZ(0), 1);
    assert.equal(normal.getZ(g.groups[1].start), -1);
    assert.equal(normal.getZ(g.groups[2].start), 0);
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 0.35) < EPS);
    for (let i = 0; i < g.groups[1].start + g.groups[1].count; i++) {
        assert.ok(Math.abs(uv.getX(i) - (paperMm.getX(i) + 2) / 10) < EPS);
        assert.ok(Math.abs(uv.getY(i) - (paperMm.getY(i) + 1) / 6) < EPS);
    }
});

test("book linkage joints and rigid mesh edges across all 181 opening angles", t => {
    const scene = fresh();
    const reference = new Map();
    let maxJoint = 0, maxEdgeDelta = 0;
    for (let degrees = 0; degrees <= 180; degrees++) {
        scene.book.update(5, degrees);
        scene.update({theta: degrees});
        scene.root.updateMatrixWorld(true);
        maxJoint = Math.max(maxJoint, ...scene.book.jointErrors().map(joint => joint.error));
        eachMesh(scene.book.root, object => {
            const lengths = edges(object);
            if (!reference.has(object)) reference.set(object, lengths);
            maxEdgeDelta = Math.max(maxEdgeDelta, ...lengths.map((length, i) => Math.abs(length - reference.get(object)[i])));
        });
    }
    t.diagnostic("181 angles | worst joint " + maxJoint + " mm | worst edge delta " + maxEdgeDelta + " mm");
    assert.ok(maxJoint <= 0.01);
    assert.ok(maxEdgeDelta <= EPS);
});

test("all closed demo solids fit between the two thick boards", t => {
    const scene = fresh();
    scene.book.update(0, 0);
    scene.update({theta: 0});
    scene.root.updateMatrixWorld(true);
    const left = new Box3().setFromObject(scene.book.left.children[0], true);
    const right = new Box3().setFromObject(scene.book.right.children[0], true);
    let minClearance = Infinity, tested = 0;
    eachMesh(scene.book.root, object => {
        const {id, kind, part} = object.userData.paper;
        if (kind === "board") return;
        const bounds = new Box3().setFromObject(object, true);
        const clearance = Math.min(left.min.z - bounds.max.z, bounds.min.z - right.max.z);
        assert.ok(clearance >= -EPS, id + "/" + part + " penetrates the board by " + clearance);
        assert.ok(bounds.min.x >= -EPS && bounds.max.x <= scene.book.width + EPS, id + " exceeds x footprint");
        assert.ok(bounds.min.y >= -scene.book.height / 2 - EPS && bounds.max.y <= scene.book.height / 2 + EPS,
            id + "/" + part + " exceeds y footprint");
        minClearance = Math.min(minClearance, clearance);
        tested++;
    });
    t.diagnostic(tested + " closed meshes | nearest board gap " + minClearance + " mm");
});

test("independent tab and nested hinge springs preserve glue points while rebounding", t => {
    const active = fresh(), baseline = fresh();
    for (const mechanism of baseline.book.mechanisms) {
        if (mechanism.spring) mechanism.spring = undefined;
    }
    let min = 0, max = 0, maxJoint = 0, maxEdge = 0;
    for (let i = 0; i <= 120; i++) {
        const time = 5.7 + i / 120;
        const theta = active.theta(time);
        active.book.update(time, theta);
        baseline.book.update(time, theta);
        const deviation = active.book.node("layer").position.z - baseline.book.node("layer").position.z;
        min = Math.min(min, deviation);
        max = Math.max(max, deviation);
        maxJoint = Math.max(maxJoint, ...active.book.jointErrors().map(joint => joint.error));
        for (const name of ["v-left", "strut-a", "strut-b", "layer", "flap"]) {
            const reference = edges(baseline.book.node(name));
            maxEdge = Math.max(maxEdge, ...edges(active.book.node(name)).map((length, i) =>
                Math.abs(length - reference[i])));
        }
    }
    t.diagnostic("121 spring times | layer " + min + " to " + max + " mm | worst joint " + maxJoint + " mm");
    assert.ok(max > 0.3 && min < -0.12);
    assert.ok(maxJoint <= 0.01 && maxEdge <= EPS);
});

test("cylindrical curl is length preserving and keeps its paper spine", t => {
    let max = 0;
    const width = 102;
    for (let i = 0; i <= 100; i++) {
        const progress = i / 100;
        const points = curlProfile(width, {progress, radius: 34, lift: 30 * Math.sin(Math.PI * progress)});
        const pinned = points[0];
        assert.deepEqual([pinned.u, pinned.x === 0, pinned.z === 0], [0, true, true]);
        let span = 0;
        for (let j = 1; j < points.length; j++) {
            const left = points[j - 1], right = points[j];
            const u = right.u - left.u;
            const dx = Math.hypot(right.x - left.x, right.z - left.z);
            if (u > EPS) max = Math.max(max, Math.abs(dx / u - 1));
            span += dx;
        }
        assert.ok(Math.abs(span / width - 1) <= 0.005);
    }
    t.diagnostic("101 curl instants | largest strip length error " + (max * 100) + "%");
    assert.ok(max <= 0.005);
    const sharp = curlProfile(width, {progress: 0.4, radius: 20, lift: 58, segments: 5});
    for (let i = 1; i < sharp.length; i++) {
        const a = sharp[i - 1], b = sharp[i];
        if (b.u > a.u) assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) / (b.u - a.u) - 1) <= 0.005);
    }
});

test("turning page updates both buffer faces and mirrors the rear UV", () => {
    const page = new Page({id: "p", width: 102, height: 150});
    const {position, normal, uv} = page.geometry.attributes;
    const rear = position.count / 2;
    const a = position.getX(rear - 1);
    page.setTurn({progress: 0.6, radius: 34, lift: 27});
    assert.notEqual(a, position.getX(rear - 1));
    for (let i = 0; i < rear; i++) {
        assert.equal(position.getX(i), position.getX(i + rear));
        assert.ok(Math.abs(normal.getZ(i) + normal.getZ(i + rear)) < EPS);
        assert.ok(Math.abs(uv.getX(i) + uv.getX(i + rear) - 1) < EPS);
    }
});

test("box folds into a flat footprint and reopens with separately tagged faces", () => {
    const box = new FoldedBox({id: "box", width: 12, depth: 13, height: 19});
    const tags = [];
    eachMesh(box, object => tags.push(object.userData.paper.part));
    assert.deepEqual(tags.sort(), ["bottom", "east", "north", "south", "top", "west"]);
    box.setFold(0);
    assert.ok(new Box3().setFromObject(box, true).max.z < 0.176);
    box.setFold(Math.PI / 2);
    assert.ok(Math.abs(new Box3().setFromObject(box, true).max.z - 19.175) < EPS);
});

test("hierarchy rejects duplicate ids and keeps nested transforms anchored", () => {
    const book = new Book({width: 100, height: 150, spineZ: 4});
    const object = new Card({id: "nested", outline: rectangle(0, 0, 10, 20)});
    book.add(new paper.Hinge({
        id: "nested", parent: "board.left", anchor: [-7, 0], axis: [0, 1], object,
        angle: (_t, theta) => theta / 3,
    }));
    book.update(3, 140);
    assert.equal(object.parent, book.left);
    assert.ok(Math.max(...book.jointErrors().map(joint => joint.error)) <= EPS);
    assert.throws(() => book.add(new paper.FreePiece({id: "nested", object, track: () => ({position: [0,0,0]})})),
        /duplicate paper id/);
});
