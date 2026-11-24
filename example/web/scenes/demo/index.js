const ease = (t, start, end) => {
    const u = Math.min(1, Math.max(0, (t - start) / (end - start)));
    return u * u * (3 - 2 * u);
};
const radians = degrees => degrees * Math.PI / 180;

export function build({THREE, paper}) {
    const {Book, Card, FoldedBox, CrossCard, FreePiece, Hinge, Page, PullTab, Spring, TabLayer, VFold, rectangle} = paper;
    const root = new THREE.Group();
    const book = new Book({width: 108, height: 158, spineZ: 3.6, thickness: 2.1, clearance: 0.46});
    root.add(book.root);
    const desk = new Card({id: "desk", kind: "desk", outline: rectangle(-750, -750, 1500, 1500),
        thickness: 0.3, castShadow: false});
    desk.position.z = -0.15;
    root.add(desk);
    const cover = new Card({id: "case.left", kind: "cover", outline: rectangle(-112, -82, 112, 164), thickness: 0.6});
    cover.position.z = 0.4;
    root.add(cover);

    const opening = new Spring({start: 5.7, frequency: 2.4, damping: 5, amplitudeDeg: 3, delay: 0.03});
    const lift = new Spring({start: 5.65, frequency: 3, damping: 4.1, amplitudeDeg: 6, delay: 0.10});
    const hinge = new Spring({start: 5.65, frequency: 3.5, damping: 4.5, amplitudeDeg: 10, delay: 0.12});
    const flyer = new Card({id: "flyer", kind: "free", outline: [[-9,-5], [12,0], [-9,5], [-4,0]]});
    book.add(
        new VFold({leftId: "v-left", rightId: "v-right", anchorX: 36, anchorY: 62,
            ridgeLength: 54, ridgeProjection: 26, spineY: -34}),
        new TabLayer({
            first: new Card({id: "strut-a", kind: "strut", outline: rectangle(0, -5, 19, 10)}),
            second: new Card({id: "strut-b", kind: "strut", outline: rectangle(0, -5, 19, 10)}),
            top: new Card({id: "layer", kind: "layer", outline: rectangle(0, -8, 38, 17)}),
            parent: "board.right", firstAnchor: [12, 49], secondAnchor: [39, 49], length: 19,
            angle: (_, theta) => 63 * Math.sin(radians(theta) / 2), spring: lift, limits: [0, 79],
        }),
        new Hinge({
            id: "flap", parent: "layer", anchor: [6, -3], axis: [0, -1],
            object: new Card({id: "flap", kind: "flap", outline: rectangle(0, 0, 19, 12)}),
            angle: (t, theta) => 42 * Math.sin(radians(theta) / 2) + 10 * ease(t, 6.05, 7.3),
            spring: hinge, limits: [0, 72],
        }),
        new PullTab({
            id: "pull", parent: "board.right", start: [60, -61], end: [88, -61],
            object: new Card({id: "pull", kind: "pull", outline: rectangle(-7, -3, 14, 6)}),
            distance: t => 25 * ease(t, 5.95, 6.95),
        }),
        new FreePiece({
            id: "flyer", object: flyer,
            track: t => {
                const travel = ease(t, 6.15, 8.8);
                return {position: [83 - 81 * travel, -17 + 40 * travel, 53 * travel],
                    rotation: [0.15 * travel, -0.35 * travel, 0.8 * travel]};
            },
        }),
    );

    const boxes = [
        [53, -35, 12, 12, 19], [79, -41, 11, 14, 26],
        [61, -3, 14, 13, 22], [86, 7, 12, 13, 28],
        [62, 32, 12, 13, 17], [88, 43, 13, 14, 23],
    ].map(([x,y,w,d,h], i) => {
        const id = "box-" + i;
        const box = new FoldedBox({id, width: w, depth: d, height: h, thickness: 0.32, meta: {index: i}});
        book.add(new FreePiece({id, object: box, parent: "board.right", track: () => ({position: [x,y,0]})}));
        return box;
    });
    const pine = [[-2,0], [2,0], [2,4], [8,4], [4,11], [6,11], [0,22], [-6,11], [-4,11], [-8,4], [-2,4]];
    const trees = [[46,-55], [74,26], [95,55], [44,25]].map(([x,y], i) => {
        const id = "tree-" + i;
        const tree = new CrossCard({id, outline: pine, thickness: 0.29});
        book.add(new Hinge({
            id, parent: "board.right", anchor: [x, y], axis: [1, 0], object: tree, limits: [0, 90],
            angle: (_t, theta) => 90 * Math.min(1, theta / 155),
        }));
        return tree;
    });
    const emitter = new Card({id: "emitter", kind: "emitter", outline: rectangle(-1.4, -1.4, 2.8, 2.8),
        thickness: 0.25, castShadow: false});
    book.add(new FreePiece({
        id: "emitter", object: emitter, parent: "board.right",
        track: (_t, theta) => ({position: [86, 7, theta > 140 ? 28.3 : 0], visible: theta > 140}),
    }));
    book.setPage(new Page({id: "leaf", width: 102, height: 151, origin: [0,0,2.43], segments: 24}),
        t => {
            const progress = ease(t, 0.45, 2.8);
            return {progress, radius: 34, lift: progress < 1 ? 30 * Math.sin(Math.PI * progress) : 0};
        });

    return {
        root, book,
        theta: t => 173 * ease(t, 3.04, 5.7) + opening.offset(t),
        state: t => ({sweep: ease(t, 6.7, 9.4)}),
        update({theta}) {
            const erection = Math.min(1, theta / 157) * Math.PI / 2;
            for (const box of boxes) box.setFold(erection);
            for (const tree of trees) tree.children[1].rotation.y = erection;
        },
        camera(t, {sweep}) {
            const push = ease(t, 5.35, 7.25);
            const position = [236 - 146 * push - 29 * sweep, -246 + 173 * push + 136 * sweep, 247 - 192 * push + 14 * sweep];
            const target = [1 + 62 * push + 8 * sweep, -10 - 19 * push + 68 * sweep, 12 + 4 * push];
            return {
                position, target, fov: 49 - 4 * push,
                focus: {distance: Math.hypot(...position.map((p, i) => p - target[i])),
                    band: 62 - 42 * push, tilt: 8 + 11 * push, maxBlur: 4.5 + 8 * push},
            };
        },
    };
}
