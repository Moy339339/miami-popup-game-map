import * as THREE from "three";
import * as paper from "./index.js";
import {ShadowSettings} from "./shadows.js";
import {PostChain} from "./post.js";
import {loadTexture, canvasTexture} from "./textures.js";

function modulePath(path, directory) {
    if (!path.startsWith(directory + "/") || !/^[a-zA-Z0-9_/-]+\.js$/.test(path)) {
        throw new Error("invalid " + directory + " module path: " + path);
    }
    return "/" + path;
}

function styleSpec(spec) {
    const [path, name, extra] = spec.split(":");
    if (extra !== undefined || !name || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        throw new Error("style requires styles/module.js:Export");
    }
    return [modulePath(path, "styles"), name];
}

function cameraAt(camera, track) {
    const {position, target, up = [0, 0, 1], fov, near = 0.25, far = 2400} = track;
    if (!(fov > 0 && fov < 180 && near > 0 && far > near)) throw new RangeError("invalid camera parameters");
    camera.position.set(...position);
    camera.up.set(...up);
    camera.lookAt(...target);
    Object.assign(camera, {fov, near, far});
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
}

async function initialize(config, report) {
    // width and height are the canvas (output) size; when ss > 1 the whole post chain is drawn at ss times that size and finally scaled back down to the canvas on the GPU (post.js DOWNSAMPLE).
    // The width / height / scale handed to scenes and styles are the drawn size (same as the old "2x canvas + Python downscale")
    const {width: outW, height: outH, ss = 1, scene: scenePath, styles: names, samples} = config;
    const width = outW * ss, height = outH * ss;
    if (!(width > 0 && height > 0) || names.length === 0) throw new Error("invalid rendering configuration");
    const renderer = new THREE.WebGLRenderer({
        alpha: false, antialias: samples > 0, powerPreference: "high-performance",
        preserveDrawingBuffer: false,
    });
    const gl = renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    report.gpu = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "";
    if (/swiftshader|llvmpipe|software rasterizer|basic render driver/i.test(report.gpu)) {
        throw new Error("hardware WebGL2 is required; WebGL reported " + report.gpu);
    }
    if (config.requiredGPU && !report.gpu.toLowerCase().includes(config.requiredGPU.toLowerCase())) {
        throw new Error("required GPU " + config.requiredGPU + "; WebGL reported " + report.gpu);
    }
    if (!renderer.capabilities.isWebGL2) throw new Error("WebGL2 is required");
    renderer.setPixelRatio(1);
    renderer.setSize(outW, outH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000);
    renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, width / height);
    const world = new THREE.Scene();
    const shadow = new ShadowSettings();
    const post = new PostChain(renderer, world, camera, width, height, Math.min(samples, gl.getParameter(gl.MAX_SAMPLES)), ss);
    const context = {THREE, paper, loadTexture, canvasTexture, width, height, scale: width / 1080};
    const scene = await (await import(modulePath(scenePath, "scenes"))).build(context);
    world.add(scene.root);
    // the pixel size of point sprites (light dust) is derived from the canvas height; with GPU downscaling the canvas is the output size while the draw target is ss times larger, so the points have to be enlarged ss times to stay the same size as before
    if (ss > 1) world.traverse(object => {
        if (object.isPoints && object.material?.isPointsMaterial && !object.material.userData.ssScaled) {
            object.material.size *= ss;
            object.material.userData.ssScaled = true;
        }
    });
    if (scene.book && scene.root !== scene.book.root && !scene.book.root.parent) world.add(scene.book.root);
    const styles = new Map();
    const tagged = [];
    world.traverse(object => {
        if (object.userData.paper) tagged.push(object);
    });
    for (const name of names) {
        const [path, exported] = styleSpec(name);
        const factory = (await import(path))[exported];
        const style = await factory(context);
        const hold = style.frameHold ?? 1;
        if (!Number.isInteger(hold) || hold < 1) throw new RangeError("frameHold must be a positive integer");
        const lighting = await style.lighting?.() ?? {};
        const materials = tagged.map(mesh => {
            const {slots, ...definition} = mesh.userData.paper;
            return slots.map(face => {
                const material = style.material({...definition, face});
                if (!material?.isMaterial) throw new TypeError("style did not supply a material for " + definition.id);
                shadow.install(material);
                return material;
            });
        });
        styles.set(name, {style, hold, lighting, materials});
        report.styles[name] = hold;
    }
    await document.fonts.ready;

    let active;
    function setStyle(name) {
        const next = styles.get(name);
        if (!next) throw new Error("requested style was not prepared: " + name);
        if (active === next) return next;
        active?.lighting.root?.removeFromParent();
        if (next.lighting.root) world.add(next.lighting.root);
        tagged.forEach((mesh, index) => { mesh.material = next.materials[index]; });
        active = next;
        return next;
    }

    function stage(styleName, t) {
        if (!(Number.isFinite(t) && t >= 0)) throw new RangeError("t must be nonnegative and finite");
        const {style, lighting} = setStyle(styleName);
        const state = scene.state?.(t) ?? {};
        const theta = scene.theta?.(t, state);
        scene.book?.update(t, theta, state);
        const cameraTrack = scene.camera(t, state);
        cameraAt(camera, cameraTrack);
        const frame = {t, state, theta, width, height, scale: width / 1080, camera};
        scene.update?.(frame);
        style.update?.(frame, lighting);
        world.background = lighting.background ?? null;
        world.environment = lighting.environment ?? null;
        renderer.toneMapping = lighting.toneMapping ?? THREE.NoToneMapping;
        renderer.toneMappingExposure = lighting.exposure ?? 1;
        renderer.shadowMap.enabled = lighting.shadows?.enabled === true;
        shadow.update(lighting.shadows);
        return {frame, cameraTrack, lighting};
    }

    function draw(style, t) {
        const {frame, cameraTrack, lighting} = stage(style, t);
        post.draw(lighting.post, cameraTrack, frame);
    }

    for (const [name, {style}] of styles) {
        for (const t of [0, ...(style.warmTimes ?? [])]) {
            const {frame, cameraTrack, lighting} = stage(name, t);
            await renderer.compileAsync(world, camera);
            post.draw(lighting.post, cameraTrack, frame);
        }
    }
    gl.finish();

    // read back the canvas RGBA as is (rows bottom-to-top); flipping the rows and dropping the alpha channel are left to Python's numpy (much faster than copying pixel by pixel here)
    const rgba = new Uint8Array(outW * outH * 4);
    return {
        draw,
        capture(style, t, times) {
            let t0 = performance.now();
            draw(style, t);
            const t1 = performance.now();
            gl.readPixels(0, 0, outW, outH, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
            const failure = gl.getError();
            if (failure !== gl.NO_ERROR) throw new Error("WebGL capture error " + failure);
            if (times) { times.draw = t1 - t0; times.read = performance.now() - t1; }
            return rgba;
        },
    };
}

const query = new URLSearchParams(location.search);
const config = {
    scene: query.get("scene") ?? "scenes/demo/index.js",
    styles: query.getAll("style").length ? query.getAll("style") : ["styles/debug.js:Day"],
    width: Number(query.get("width") ?? 540), height: Number(query.get("height") ?? 720), ss: Number(query.get("ss") ?? 1), samples: 4,
    requiredGPU: query.get("gpu"),
};

const report = {gpu: "", styles: {}};
const initialized = initialize(config, report);
initialized.catch(() => {});
let tail = Promise.resolve();
let selectedStyle = config.styles[0];
function queue(task) {
    const next = tail.then(task);
    tail = next.catch(() => {});
    return next;
}
window.popup = {
    async ready() {
        await initialized;
        return report;
    },
    setStyle(style) {
        return queue(async () => {
            await initialized;
            if (!Object.hasOwn(report.styles, style)) throw new Error("style was not prepared: " + style);
            selectedStyle = style;
        });
    },
    renderAt({style, t}) {
        return queue(async () => (await initialized).draw(style ?? selectedStyle, t));
    },
    captureAt({style, t, token, index = 0}) {
        return queue(async () => {
            const times = {};
            const pixels = (await initialized).capture(style ?? selectedStyle, t, times);
            const t2 = performance.now();
            await upload(pixels, token, index);
            times.post = performance.now() - t2;
            return times;
        });
    },
    // Pipeline capture: take the whole list of (style, t) at once and draw them back to back in the browser; while the next frame is being drawn, upload the previous one (at most `inflight` in transit),
    // Python collects them by frame number and hands them to the encoder in order. Returns immediately; use jobStatus() for progress and errors.
    // duty: the maximum share of time the GPU may be busy (keep it within 60-70% to leave headroom for other programs). When a frame is heavy to draw (long draw + read),
    // the next frame starts later, so that the interval from the start of this frame to the start of the next is no shorter than (draw + read) / duty. Light frames are not affected
    startRange({frames, token, start = 0, inflight = 2, duty = 0.6}) {
        const j = job = {done: false, error: null, count: 0, times: {draw: 0, read: 0, post: 0, rest: 0}};
        queue(async () => {
            const r = await initialized;
            const pending = [];
            let begun = performance.now(), busy = 0;
            for (let i = 0; i < frames.length; i++) {
                const rest = busy / duty - (performance.now() - begun);
                if (rest > 1) { await new Promise(done => setTimeout(done, rest)); j.times.rest += rest; }
                begun = performance.now();
                const tm = {};
                const pixels = r.capture(frames[i].style ?? selectedStyle, frames[i].t, tm);
                busy = tm.draw + tm.read;
                j.times.draw += tm.draw;
                j.times.read += tm.read;
                const t2 = performance.now();
                pending.push(upload(pixels, token, start + i));   // fetch copies the bytes the moment it is called, so the readback buffer can be reused right away
                if (pending.length >= inflight) await pending.shift();
                j.times.post += performance.now() - t2;
                j.count = i + 1;
            }
            await Promise.all(pending);
        }).then(() => { j.done = true; }, error => { j.error = String(error?.stack ?? error); j.done = true; });
        return true;
    },
    jobStatus() {
        return job;
    },
};
let job = null;
async function upload(pixels, token, index) {
    const response = await fetch("/__capture", {
        method: "POST", body: pixels, headers: {"X-Popup-Token": token, "X-Frame": String(index)},
    });
    if (!response.ok) throw new Error("capture upload failed: " + response.status);
}
