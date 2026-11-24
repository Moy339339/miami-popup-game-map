function shadow(light, {size, radius, bias, normalBias, near, far, extent}) {
    light.castShadow = true;
    light.shadow.mapSize.set(size, size);
    Object.assign(light.shadow, {radius, bias, normalBias});
    Object.assign(light.shadow.camera, {near, far});
    if (extent) Object.assign(light.shadow.camera, {left: -extent, right: extent, bottom: -extent, top: extent});
    light.shadow.camera.updateProjectionMatrix();
    return light;
}

function settings(THREE, night, features) {
    const root = new THREE.Group();
    if (night) {
        root.add(new THREE.AmbientLight(0x9b9b9b, 0.38));
        const left = shadow(new THREE.PointLight(0xffffff, 14200, 310, 2), {
            size: 384, radius: features.soft === false ? 0 : 13, bias: -0.0005, normalBias: 0.65, near: 3, far: 310,
        });
        left.position.set(18, -48, 106);
        root.add(left);
        const right = new THREE.PointLight(0xececec, 7600, 270, 2);
        right.position.set(129, 77, 83);
        const fill = new THREE.PointLight(0xdadada, 3100, 170, 2);
        fill.position.set(51, 11, 43);
        root.add(right, fill);
    } else {
        root.add(new THREE.AmbientLight(0xffffff, 0.64));
        const sun = shadow(new THREE.DirectionalLight(0xffffff, 2.1), {
            size: 1024, radius: features.soft === false ? 0 : 21, bias: -0.00035, normalBias: 0.55, near: 4, far: 630, extent: 220,
        });
        sun.position.set(-135, -125, 205);
        root.add(sun, sun.target);
    }
    return {
        root, background: new THREE.Color(night ? 0x363636 : 0xbdbdbd),
        shadows: {
            enabled: true, tint: night ? 0x222222 : 0x171717,
            directional: {searchSamples: 8, filterSamples: 14, depthScale: 24},
            point: {searchSamples: 8, filterSamples: 12, depthScale: 7},
        },
        post: {
            focus: {enabled: features.focus},
            bloom: {enabled: features.bloom, strength: 0.93, radius: 0.56, threshold: 1.06},
        },
    };
}

async function debug({THREE, loadTexture, canvasTexture}, night, features) {
    const [grid, hatch] = await Promise.all([
        loadTexture("tex/gen/demo-grid.png"),
        canvasTexture(256, 256, (ctx, w, h) => {
            ctx.fillStyle = "#bdbdbd";
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = "#707070";
            ctx.lineWidth = 3;
            for (let y = 24; y < h; y += 36) {
                for (let x = 25; x < w; x += 51) ctx.strokeRect(x, y, 24, 20);
            }
        }),
    ]);
    const cache = new Map();
    return {
        lighting: () => settings(THREE, night, features),
        material({kind, face, part, meta}) {
            const index = meta.index ?? 0;
            const key = [kind, face, part, index].join("/");
            if (!cache.has(key)) {
                const shades = {
                    board: 0xb0b0b0, cover: 0x929292, desk: night ? 0x6a6a6a : 0xbcbcbc,
                    layer: 0xadadad, cross: 0x929292, vfold: 0xc3c3c3, free: 0xd3d3d3,
                };
                const color = face === "edge" ? 0x6d6d6d : shades[kind] ?? (face === "front" ? 0xd2d2d2 : 0xaaaaaa);
                const map = kind === "page" ? (face === "front" ? grid : hatch)
                    : kind === "box" && face === "front" && part !== "top" && part !== "bottom" ? hatch : null;
                cache.set(key, new THREE.MeshStandardMaterial({
                    color, map, roughness: 0.94, metalness: 0,
                    emissive: kind === "emitter" && night ? 0xffffff : 0x000000,
                    emissiveIntensity: kind === "emitter" && night ? 6 : 0,
                }));
            }
            return cache.get(key);
        },
    };
}

export const Day = context => debug(context, false, {focus: true, bloom: false});
export const DayBare = context => debug(context, false, {focus: false, bloom: false});
export const DayHard = context => debug(context, false, {focus: false, bloom: false, soft: false});
export const Night = context => debug(context, true, {focus: true, bloom: true});
export const NightBare = context => debug(context, true, {focus: false, bloom: false});
export const NightHard = context => debug(context, true, {focus: false, bloom: false, soft: false});
export const NightFocus = context => debug(context, true, {focus: true, bloom: false});

export function Swatches({THREE}) {
    const materials = new Map();
    return {
        lighting: () => ({toneMapping: THREE.NoToneMapping}),
        material({meta}) {
            if (!materials.has(meta.hex)) materials.set(meta.hex, new THREE.MeshBasicMaterial({color: meta.hex}));
            return materials.get(meta.hex);
        },
    };
}

export function SwatchesShader(context) {
    const style = Swatches(context);
    const shader = {
        fragmentShader: [
            "uniform sampler2D tDiffuse;",
            "uniform float t;",
            "varying vec2 vUv;",
            "void main() {",
            "    vec4 pixel = texture2D(tDiffuse, vUv);",
            "    gl_FragColor = t > 0.0 ? vec4(pixel.bgr, pixel.a) : pixel;",
            "}",
        ].join("\n"),
    };
    return {...style, lighting: () => ({post: {shader}})};
}
