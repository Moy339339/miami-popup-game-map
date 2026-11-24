import {todParams} from "/scenes/leonida/tod.js";
// Art style of the Leonida papercraft map: sunset. Material specs are written by the scene into meta.mat (a kit.js convention); this file only turns specs into materials, lighting and post-processing.
// Light: a low-angle warm orange key light from the front left (long soft shadows trail to the back right) + lavender sky light / pink ground bounce + pink rim light from behind; shadows tinted purple.

const GRADE = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float t;
uniform float sat, con, grainAmt, grainLum;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    // Adjust saturation and contrast by time of day: daytime and the golden afternoon are more vivid (otherwise everything looks grey), sunset and night stay as they are
    float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = max(mix(vec3(l0), c, sat), 0.0);
    c = max((c - 0.45) * con + 0.45, 0.0);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // Split toning: shadows toward indigo-purple, highlights toward peach
    vec3 shadowTint = vec3(0.86, 0.80, 1.12);
    vec3 highTint = vec3(1.06, 0.97, 0.90);
    c *= mix(shadowTint, vec3(1.0), smoothstep(0.02, 0.35, l));
    c *= mix(vec3(1.0), highTint, smoothstep(0.35, 1.2, l));
    c = pow(max(c, 0.0), vec3(1.12)) * 1.10;  // boost contrast
    c += vec3(0.008, 0.004, 0.018);           // lift blacks, with a purple tint
    // vignette
    vec2 d = vUv - 0.5;
    d.x *= resolution.x / resolution.y;
    c *= 1.0 - 0.42 * smoothstep(0.32, 0.9, length(d));
    // Fine grain: version A is +/-2.25% per pixel (grainAmt 0.045); fix item 8 version B cuts it to about +/-1% and distributes it by brightness (more in midtones, less in the darkest and brightest areas)
    // With supersampling (render at twice the size, then downscale) the grain is computed per output pixel, so half of it does not get averaged away
    float n = hash(floor(vUv * resolution / max(1.0, resolution.x / 1080.0)) + fract(t * 7.13) * 91.0) - 0.5;
    float lw = mix(1.0, 0.6 + 1.6 * l * (1.0 - l), grainLum);
    c *= 1.0 + n * grainAmt * lw;
    gl_FragColor = vec4(c, 1.0);
}
`;

// Paper surface: generate fibers and uneven printing from the object's own coordinates (mm) and perturb the normals - a low-angle setting sun rakes out the paper grain.
// Local object coordinates are used instead of world coordinates, so the paper texture moves with a car when it drives.
const PAPER_PARS = `
varying vec3 vPaperPos;
varying vec3 vPaxX, vPaxY, vPaxZ;
float pHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float pNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(pHash(i), pHash(i + vec3(1,0,0)), f.x), mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x), mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float paperHeight(vec3 p) {
    // Fibers: noise stretched along one direction + grain (feature size about 0.2-0.6 mm)
    float fib = pNoise(vec3(p.x * 1.4, p.y * 5.0, p.z * 1.4)) * 0.55 + pNoise(vec3(p.x * 4.5 + 3.1, p.y * 1.3, p.z * 4.5)) * 0.45;
    float tooth = pNoise(p * 3.6);
    return fib * 0.6 + tooth * 0.4;
}
`;
// Fix item 6: cloud shadows - faint patches of shadow drift across the map with the wind (all paper surfaces darken together, up to cloudAmt at the deepest). All materials share these two uniforms
const CLOUD = {t: {value: 0}, amt: {value: 0}};
// Fix item 8 version B: ground paper (W.ground in index.js is tagged spec.ground) is desaturated by time of day; upright things are left alone. Version A is always 1
const GROUND = {sat: {value: 1}};
// Blind review (11-24), night-scene paper feel: for materials with glow > 0 (tower facades) the emissive also varies with the paper texture - window light looks like it shines through a sheet of paper, each window a different brightness, with fibers
function paperize(material, strength = 1, {ground = false, glow = 0} = {}) {
    material.onBeforeCompile = (shader) => {
        shader.uniforms.paperStrength = {value: strength};
        shader.uniforms.cloudT = CLOUD.t;
        shader.uniforms.cloudAmt = CLOUD.amt;
        shader.uniforms.groundSat = GROUND.sat;
        shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying vec3 vPaperPos;\nvarying vec3 vPaxX, vPaxY, vPaxZ;\nvarying vec2 vCloudW;")
            .replace("#include <begin_vertex>", `#include <begin_vertex>
                vPaperPos = transformed;
                vCloudW = (modelMatrix * vec4(transformed, 1.0)).xy;
                vPaxX = (modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz;
                vPaxY = (modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
                vPaxZ = (modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz;`);
        shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nuniform float paperStrength, cloudT, cloudAmt, groundSat;\nvarying vec2 vCloudW;\n" + PAPER_PARS)
            .replace("#include <map_fragment>", `#include <map_fragment>
                ${ground ? "diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), diffuseColor.rgb, groundSat);" : ""}
                // mm per pixel: distant paper texture finer than a pixel fades out, to avoid flicker
                float paperFade = paperStrength * clamp(1.6 - length(fwidth(vPaperPos)) * 6.0, 0.0, 1.0);
                {
                    float mottle = pNoise(vPaperPos * 0.3) * 0.6 + pNoise(vPaperPos * 1.1) * 0.4;
                    float h = paperHeight(vPaperPos);
                    diffuseColor.rgb *= 1.0 + paperStrength * (mottle - 0.5) * 0.08 + paperFade * (h - 0.5) * 0.08;
                }
                if (cloudAmt > 0.0) {
                    // Wind blows toward +x and slightly toward +y (matching the scene's wind field), 22 mm / s; two noise layers stack into irregular patches with soft edges
                    vec2 cp = (vCloudW - vec2(0.894, 0.447) * cloudT * 22.0) * 0.011;
                    float cn = pNoise(vec3(cp, 0.5)) * 0.65 + pNoise(vec3(cp * 2.3, 3.7)) * 0.35;
                    diffuseColor.rgb *= 1.0 - cloudAmt * smoothstep(0.4, 0.54, cn);
                }`)
            .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
                ${glow > 0 ? `{
                    float gm = pNoise(vPaperPos * 0.45) * 0.6 + pNoise(vPaperPos * 1.3 + 7.0) * 0.4;
                    float gf = paperHeight(vPaperPos);
                    totalEmissiveRadiance *= max(0.0, 1.0 + ${glow.toFixed(2)} * ((gm - 0.5) * 0.9 + paperFade * (gf - 0.5) * 0.8));
                    diffuseColor.rgb *= 1.0 + ${glow.toFixed(2)} * ((gm - 0.5) * 0.15 + paperFade * (gf - 0.5) * 0.25);
                }` : ""}`)
            .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
                {
                    float e = 0.08;
                    float h0 = paperHeight(vPaperPos);
                    vec3 g = vec3(paperHeight(vPaperPos + vec3(e, 0.0, 0.0)) - h0, paperHeight(vPaperPos + vec3(0.0, e, 0.0)) - h0,
                        paperHeight(vPaperPos + vec3(0.0, 0.0, e)) - h0) / e;
                    vec3 gv = g.x * vPaxX + g.y * vPaxY + g.z * vPaxZ;
                    normal = normalize(normal - paperFade * 0.05 * (gv - dot(gv, normal) * normal));
                }`);
    };
    material.customProgramCacheKey = () => "paper-v2-" + strength + (ground ? "-g" : "") + (glow > 0 ? "-glow" + glow : "");
    return material;
}

// Fix item 29: matte floor; the special papers of version B. tier: 0 always on (boats, water), 1 from sunset (cars, wanted stars), 2 at night (towers, roads)
const MATTE_MIN = 0.8;
const GLOSS_KIND = {
    // The key light comes from the camera side, so the clearcoat reflects only 4% face-on and the sun highlights all reflect away from the camera - the gloss mainly comes from the base layer itself: lower roughness, higher index of refraction (stronger reflection),
    // so that the sky / horizon reflection reads on car roofs, boat hulls and building faces; then a clearcoat layer on top
    // 11-24 the author watched zg6 B: at 36 s a large pink-white bright patch on a car roof had a glow and noise, and appeared and vanished suddenly within 0.3 s when the camera turned - softened: slightly higher roughness (small, soft highlights that transition slowly with angle),
    // index of refraction, clearcoat and environment-map intensity all lowered (even with the base color added it cannot reach the glow threshold of 1.0), and only 30% of the paper-texture normals kept (no noise in the highlights)
    varnish: {rough: 0.56, ior: 1.75, clearcoat: 0.3, ccRough: 0.38, env: 0.45, paper: 0.3},   // spot UV varnish (car paint, building glass)
    card: {rough: 0.34, ior: 2.0, clearcoat: 0.8, ccRough: 0.12, env: 1.1},      // white glossy card (boat hull)
    water: {rough: 0.5, ior: 1.8, clearcoat: 0.3, ccRough: 0.3, env: 0.55},     // water varnish: lighter than the car paint (a sea surface that is too bright all over in daytime washes the color out)
    foil: {rough: 0.34, metal: 0.85, env: 1.0, paper: 2.2},                      // foil: paper-texture normals strengthened to break up the highlights
};

// Environment map of version B: paint a panorama on a canvas by time of day (zenith -> horizon -> ground), add a band of warm light on the horizon at sunset, and a few neon-colored blobs at night.
// No HDR download; it is attached only to the envMap of special-paper materials, not to world.environment (attaching it would brighten and flatten every matte paper)
function paintEnv(THREE, p, tod) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    const hex = a => "#" + a.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    // Horizon transition widened (it used to jump dark in one step from 0.50 to 0.53; in the reflection that hard edge sweeping across a car body was the bright patch that "suddenly appears and vanishes"); overall level lowered to 0.85
    const k = a => a.map(v => v * 0.85);
    g.addColorStop(0, hex(k(p.sky[0])));
    g.addColorStop(0.32, hex(k(p.sky[1])));
    g.addColorStop(0.5, hex(k(p.sky[2])));
    g.addColorStop(0.68, hex(p.hemiGround.map(v => v * 0.6)));
    g.addColorStop(1, hex(p.hemiGround.map(v => v * 0.4)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    // a bright band on the horizon (warmer and brighter at sunset)
    const warm = Math.max(0, 1 - Math.abs(tod - 2) / 1.2);
    const band = ctx.createLinearGradient(0, 84, 0, 152);
    band.addColorStop(0, "rgba(255,220,190,0)");
    band.addColorStop(0.5, `rgba(255,${Math.round(200 - 60 * warm)},${Math.round(170 - 60 * warm)},${0.18 + 0.2 * warm})`);
    band.addColorStop(1, "rgba(255,220,190,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, 84, 512, 68);
    // Night: a few neon-colored light blobs (pink, cyan, purple)
    const night = Math.max(0, Math.min(1, (tod - 2.3) / 0.5));
    if (night > 0) {
        [[60, 118, "255,80,170"], [170, 122, "80,230,255"], [300, 116, "190,110,255"], [420, 121, "255,90,140"], [480, 118, "90,200,255"]].forEach(([x, y, col]) => {
            const r = ctx.createRadialGradient(x, y, 0, x, y, 34);
            r.addColorStop(0, `rgba(${col},${0.85 * night})`);
            r.addColorStop(1, `rgba(${col},0)`);
            ctx.fillStyle = r;
            ctx.fillRect(x - 34, y - 34, 68, 68);
        });
    }
    if (globalThis.LEONIDA_AB?.envDebug) {
        // Debug: red on top, green at the horizon, blue below, to check whether the reflection direction is right
        const d = ctx.createLinearGradient(0, 0, 0, 256);
        d.addColorStop(0, "#ff0000"); d.addColorStop(0.5, "#00ff00"); d.addColorStop(1, "#0000ff");
        ctx.fillStyle = d; ctx.fillRect(0, 0, 512, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export async function Sunset({THREE}) {
    const AB = globalThis.LEONIDA_AB ?? {};   // the scene loads first; the ab_*.js entry points have already set the switches
    const glossy = [];
    const envCache = new Map();
    const cache = new Map();
    const neons = [];
    const flashes = [];
    const white = new THREE.Color(1, 1, 1);

    function material({id, face, meta = {}}) {
        const spec = meta.mat?.[face] ?? meta.mat?.front ?? {color: "#efe3d3"};
        if (cache.has(spec)) return cache.get(spec);
        if (spec.unlit) {
            // Things that glow by themselves, like the setting sun: unlit, no shadows received, displayed only in the texture's original color (times a bit of brightness)
            const u = new THREE.MeshBasicMaterial({map: spec.emissiveMap ?? spec.map ?? null, color: new THREE.Color(1, 1, 1).multiplyScalar(spec.emissive ?? 1), fog: false});
            cache.set(spec, u);
            return u;
        }
        // Fix item 29 (reviewer's 11-24 corrected version):
        // A (default) = matte throughout: any unintended plastic gloss is removed (roughness no lower than MATTE_MIN), and translucent glass becomes opaque printed card;
        // B (ab_gloss.js) = GTA6 landmark objects tagged spec.gloss are made as "special print finishes on paper": varnish / glossy card / foil; only they receive the environment map
        // 11-24 author's decision: gloss only on cars and building glass in the sunset and night scenes (varnish with glossTier >= 1); boat hulls, water, wanted stars and roads all go back to matte
        const G = AB.gloss && spec.gloss === "varnish" && (spec.glossTier ?? 0) >= 1 && !spec.ground ? GLOSS_KIND.varnish : null;
        const Ctor = G ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
        const m = new Ctor({
            map: spec.map ?? null,
            color: spec.color ? new THREE.Color(spec.color) : white.clone(),
            roughness: G ? G.rough : Math.max(spec.rough ?? 0.88, MATTE_MIN),
            metalness: 0,
            alphaTest: spec.alphaTest ?? 0,
            transparent: Boolean(spec.keepAlpha) && (Boolean(spec.transparent) || (spec.opacity ?? 1) < 1),
            opacity: spec.keepAlpha ? spec.opacity ?? 1 : 1,
            side: spec.side === "double" ? THREE.DoubleSide : THREE.FrontSide,
        });
        if (G) {
            m.envMapRotation.set(Math.PI / 2, 0, 0);   // the scene has +z up, while the environment map is painted with +y up: rotate 90 deg
            m.clearcoat = 0.001;                         // always above 0: crossing 0 would trigger a shader recompile
            m.clearcoatRoughness = G.ccRough ?? 0.2;
            glossy.push({m, G, tier: spec.glossTier ?? 0});
        }
        // Author, 11-24: "jagged, fuzzy element edges": the outline of a cut-paper piece is cut by thresholding the texture's alpha (the geometry is expanded by one ring), multisampling cannot reach it, so the edge is a hard step.
        // Turn on alpha-to-coverage: near the threshold, make a transition based on fwidth and hand it to multisampling (render target with 4 samples) to get a soft edge
        if (m.alphaTest > 0) m.alphaToCoverage = true;
        if (spec.tint) m.color.multiplyScalar(spec.tint);
        if (spec.emissiveMap) {
            m.emissiveMap = spec.emissiveMap;
            m.emissive = white.clone();
            m.emissiveIntensity = spec.emissive ?? 1;
        } else if (spec.emissiveColor) {
            m.emissive = new THREE.Color(spec.emissiveColor);
            m.emissiveIntensity = spec.emissive ?? 1;
        }
        // Register every emissive: neon lights switch on at the scheduled time; emissive is lowered in daytime and raised at night (the time-of-day neon coefficient)
        if (spec.emissiveMap || spec.emissiveColor) if (!spec.flash) neons.push({m, base: m.emissiveIntensity, t0: spec.neon ? spec.neon.flicker : null, id});
        if (spec.flash) flashes.push({m, color: spec.flash});
        if (spec.depthWrite === false) m.depthWrite = false;
        if (spec.paper !== false && !m.transparent) paperize(m, (spec.paper ?? 1) * (G?.paper ?? 1), {ground: Boolean(spec.ground), glow: spec.glowPaper ?? 0});
        cache.set(spec, m);
        return m;
    }

    const root = new THREE.Group();
    const sun = new THREE.DirectionalLight(new THREE.Color("#ffd2b4"), 3.8);
    sun.position.set(-430, -300, 330);
    sun.target.position.set(0, 60, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow, {radius: 7, bias: -0.0003, normalBias: 0.35});
    Object.assign(sun.shadow.camera, {near: 100, far: 1600, left: -430, right: 430, bottom: -430, top: 430});
    sun.shadow.camera.updateProjectionMatrix();
    const rim = new THREE.DirectionalLight(new THREE.Color("#ff9ccb"), 0.7);
    rim.position.set(220, 600, 180);
    rim.target.position.set(0, 60, 0);
    const hemi = new THREE.HemisphereLight(new THREE.Color("#a99be8"), new THREE.Color("#d8b4a6"), 0.55);
    root.add(sun, sun.target, rim, rim.target, hemi);

    const grade = {sat: 1, con: 1};   // written every frame by time of day; the grading shader reads it in update
    const lighting = {
        root,
        background: new THREE.Color("#c69ac0"),
        toneMapping: THREE.NeutralToneMapping,
        exposure: 0.95,
        shadows: {
            enabled: true, tint: new THREE.Color("#4a3f8a"),
            directional: {searchSamples: 12, filterSamples: 20, depthScale: 26},
        },
        post: {
            focus: {enabled: true},
            bloom: {enabled: true, threshold: 1.0, strength: 0.38, radius: 0.32},
            shader: {fragmentShader: GRADE, uniforms: {sat: {value: 1}, con: {value: 1}, grainAmt: {value: AB.desat ? 0.02 : 0.045}, grainLum: {value: AB.desat ? 1 : 0}},
                update: (u) => { u.sat.value = grade.sat; u.con.value = grade.con; }},
        },
    };

    // Neon: stays dark after popping up, then flickers twice at the scheduled time and stays lit
    function neonLevel(t, t0) {
        if (t0 === undefined || t0 === null) return 1;
        const k = t - t0;
        if (k < 0) return 0.06;
        if (k > 0.75) return 1;
        const pattern = [1, 0.1, 0.9, 0.05, 0.2, 1, 0.3, 1];
        return pattern[Math.min(pattern.length - 1, Math.floor(k / 0.1))];
    }

    const tmp = new THREE.Vector3();
    return {
        frameHold: 1,
        warmTimes: [7, 200, 203],
        material,
        lighting: () => lighting,
        update({t, state}, L) {
            const tt = t >= 200 ? 1e4 : t;
            const p = todParams(state?.tod ?? 2);
            // Lights follow the time of day; the shadow camera follows the camera's focus point
            const [fx, fy, fz] = state?.focus ?? [0, 60, 0];
            sun.color.setRGB(...p.sun, THREE.SRGBColorSpace);
            sun.intensity = p.sunI;
            tmp.set(...p.sunDir).normalize().multiplyScalar(800);
            sun.position.set(fx + tmp.x, fy + tmp.y, fz + tmp.z);
            sun.target.position.set(fx, fy, fz);
            rim.color.setRGB(...p.rim, THREE.SRGBColorSpace);
            rim.intensity = p.rimI;
            rim.position.set(fx + 220, fy + 540, 180);
            rim.target.position.set(fx, fy, 0);
            hemi.color.setRGB(...p.hemiSky, THREE.SRGBColorSpace);
            hemi.groundColor.setRGB(...p.hemiGround, THREE.SRGBColorSpace);
            hemi.intensity = p.hemiI;
            L.shadows.tint.setRGB(...p.tint, THREE.SRGBColorSpace);
            L.exposure = p.exposure;
            grade.sat = p.sat ?? 1;
            CLOUD.t.value = tt > 1000 ? 30 : tt;
            CLOUD.amt.value = p.cloud ?? 0;
            GROUND.sat.value = AB.desat ? p.groundSat ?? 1 : 1;
            if (glossy.length) {
                // The environment map is cached by time of day (one step per 0.25); the amount of gloss escalates with the story: the Keys have only boats and water, sunset adds cars and wanted stars, night adds towers and roads
                const tod = state?.tod ?? 2;
                const key = Math.round(tod * 4) / 4;
                if (!envCache.has(key)) envCache.set(key, paintEnv(THREE, todParams(key), key));
                const env = envCache.get(key);
                const ramp = (a, b) => Math.min(1, Math.max(0, (tod - a) / (b - a)));
                for (const g of glossy) {
                    const f = g.tier === 0 ? 1 : g.tier === 1 ? ramp(1.4, 2.0) : ramp(2.2, 2.8);
                    g.m.envMap = env;
                    g.m.envMapIntensity = g.G.env * f;
                    g.m.clearcoat = Math.max(0.001, (g.G.clearcoat ?? 0) * f);
                    g.m.roughness = 0.85 + (g.G.rough - 0.85) * f;
                    g.m.ior = 1.5 + ((g.G.ior ?? 1.5) - 1.5) * f;
                    if (g.G.metal) g.m.metalness = g.G.metal * f;
                }
            }
            grade.con = p.con ?? 1;
            L.post.bloom.strength = p.bloom;
            for (const n of neons) n.m.emissiveIntensity = n.base * neonLevel(tt, n.t0) * p.neon;
            const on = Math.floor(tt * 5) % 2 === 0;
            const ph = (tt * 5) % 1;
            const pulse = ph < 0.35 || (ph > 0.5 && ph < 0.8) ? 1 : 0.1;
            for (const f of flashes) {
                const lit = (f.color === "red") === on;
                f.m.emissiveIntensity = lit ? 6 * pulse : 0.15;
            }
        },
    };
}