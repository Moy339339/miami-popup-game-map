import {Color, ShaderChunk} from "three";

const SOFT_SHADOWS = `
uniform vec3 popupShadowTint;

#ifdef USE_SHADOWMAP
uniform vec3 popupDirTuning;
uniform vec3 popupPointTuning;
const int popupMaxSamples = 24;

vec2 popupDisk(int index, float count) {
    if (index == 0) return vec2(0.0);
    float angle = float(index) * 2.39996323;
    return vec2(cos(angle), sin(angle)) * sqrt(float(index) / max(count - 1.0, 1.0));
}

float popupDepth(sampler2D map, vec2 uv) {
    return unpackRGBAToDepth(texture2D(map, uv));
}

float popupDirectional(sampler2D map, vec2 size, float intensity, float bias,
        float radius, vec4 location) {
    vec3 p = location.xyz / location.w;
    p.z += bias;
    if (any(lessThan(p, vec3(0.0))) || any(greaterThan(p, vec3(1.0)))) return 1.0;
    if (radius <= 0.0) return mix(1.0, step(p.z, popupDepth(map, p.xy)), intensity);

    float sumDepth = 0.0;
    float blockers = 0.0;
    for (int i = 0; i < popupMaxSamples; i++) {
        if (float(i) >= popupDirTuning.x) break;
        vec2 tap = popupDisk(i, popupDirTuning.x) * radius / size;
        float depth = popupDepth(map, p.xy + tap);
        if (depth < p.z) {
            sumDepth += depth;
            blockers += 1.0;
        }
    }
    if (blockers == 0.0) return 1.0;

    float gap = max(0.0, p.z - sumDepth / blockers);
    float penumbra = clamp(radius * gap * popupDirTuning.z, 0.75, max(0.75, radius));
    float visible = 0.0;
    for (int i = 0; i < popupMaxSamples; i++) {
        if (float(i) >= popupDirTuning.y) break;
        vec2 tap = popupDisk(i, popupDirTuning.y) * penumbra / size;
        visible += step(p.z, popupDepth(map, p.xy + tap));
    }
    return mix(1.0, visible / popupDirTuning.y, intensity);
}

float popupPoint(sampler2D map, vec2 size, float intensity, float bias, float radius,
        vec4 location, float nearPlane, float farPlane) {
    float d = length(location.xyz);
    if (d < nearPlane || d > farPlane) return 1.0;
    float depthRange = farPlane - nearPlane;
    float receiver = (d - nearPlane) / depthRange + bias;
    float atlasTexel = 0.5 / size.y;
    vec3 ray = location.xyz / d;
    if (radius <= 0.0) return mix(1.0, step(receiver, popupDepth(map, cubeToUV(ray, atlasTexel))), intensity);

    vec3 reference = abs(ray.z) < 0.9 ? vec3(0, 0, 1) : vec3(0, 1, 0);
    vec3 right = normalize(cross(reference, ray));
    vec3 up = cross(ray, right);
    float angularTexel = 2.0 / size.y;
    float sumDepth = 0.0;
    float blockers = 0.0;
    for (int i = 0; i < popupMaxSamples; i++) {
        if (float(i) >= popupPointTuning.x) break;
        vec2 tap = popupDisk(i, popupPointTuning.x) * (radius * angularTexel);
        float depth = popupDepth(map, cubeToUV(ray + tap.x * right + tap.y * up, atlasTexel));
        if (depth < receiver) {
            sumDepth += depth;
            blockers += 1.0;
        }
    }
    if (blockers == 0.0) return 1.0;

    float blocker = sumDepth / blockers * depthRange + nearPlane;
    float gap = max(0.0, d - blocker) / max(blocker, nearPlane);
    float penumbra = clamp(radius * gap * popupPointTuning.z, 0.75, max(0.75, radius));
    float visible = 0.0;
    for (int i = 0; i < popupMaxSamples; i++) {
        if (float(i) >= popupPointTuning.y) break;
        vec2 tap = popupDisk(i, popupPointTuning.y) * (penumbra * angularTexel);
        visible += step(receiver, popupDepth(map, cubeToUV(ray + tap.x * right + tap.y * up, atlasTexel)));
    }
    return mix(1.0, visible / popupPointTuning.y, intensity);
}
#endif
`;

const tintedLights = ShaderChunk.lights_fragment_begin.replace(
    /(directLight\.color \*= .*?\? )(get(?:Point)?Shadow\([^;]+?\))( : 1\.0;)/g,
    (_, start, call) => {
        const method = call.startsWith("getPointShadow") ? "popupPoint"
            : call.includes("directionalShadowMap") ? "popupDirectional" : "getShadow";
        return start + "mix(popupShadowTint, vec3(1.0), " + call.replace(/^get(?:Point)?Shadow/, method)
            + ") : vec3(1.0);";
    },
);

function samples(value, fallback) {
    return Math.round(Math.min(24, Math.max(1, value ?? fallback)));
}

function tuning(options) {
    return [samples(options?.searchSamples, 8), samples(options?.filterSamples, 12), options?.depthScale ?? 1];
}

export class ShadowSettings {
    constructor() {
        this.uniforms = {
            popupShadowTint: {value: new Color(0)},
            popupDirTuning: {value: [8, 12, 1]},
            popupPointTuning: {value: [8, 12, 1]},
        };
        this.installed = new WeakSet();
    }

    update(settings = {}) {
        this.uniforms.popupShadowTint.value.set(settings.tint ?? 0);
        this.uniforms.popupDirTuning.value = tuning(settings.directional);
        this.uniforms.popupPointTuning.value = tuning(settings.point);
    }

    install(material) {
        if (this.installed.has(material)) return;
        this.installed.add(material);
        const original = material.onBeforeCompile;
        const originalKey = material.customProgramCacheKey();
        material.customProgramCacheKey = () => originalKey + "|popup-soft-shadow-v1";
        material.onBeforeCompile = (shader, renderer) => {
            original.call(material, shader, renderer);
            if (!shader.fragmentShader.includes("#include <lights_fragment_begin>")) return;
            Object.assign(shader.uniforms, this.uniforms);
            shader.fragmentShader = shader.fragmentShader
                .replace("#include <shadowmap_pars_fragment>", "$&\n" + SOFT_SHADOWS)
                .replace("#include <lights_fragment_begin>", () => tintedLights);
        };
    }
}
