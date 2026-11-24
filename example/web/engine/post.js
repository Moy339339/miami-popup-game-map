import {
    DepthTexture, HalfFloatType, ShaderMaterial, UnsignedIntType, Vector2, WebGLRenderTarget,
} from "three";
import {FullScreenQuad} from "three/addons/postprocessing/Pass.js";
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {ShaderPass} from "three/addons/postprocessing/ShaderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";

export const fullscreenVertex = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

class FocusPass extends ShaderPass {
    constructor() {
        super({
            uniforms: {
                tDiffuse: {value: null},
                tDepth: {value: null},
                texel: {value: new Vector2()},
                clipDepth: {value: new Vector2(0.1, 1000)},
                focalDistance: {value: 0},
                band: {value: 0},
                tilt: {value: 0},
                maxBlur: {value: 0},
            },
            vertexShader: fullscreenVertex,
            fragmentShader: `
                uniform sampler2D tDiffuse, tDepth;
                uniform vec2 texel, clipDepth;
                uniform float focalDistance, band, tilt, maxBlur;
                varying vec2 vUv;
                void main() {
                    vec4 center = texture2D(tDiffuse, vUv);
                    float d = texture2D(tDepth, vUv).r;
                    float eyeZ = clipDepth.x * clipDepth.y /
                        (clipDepth.y - d * (clipDepth.y - clipDepth.x));
                    float plane = focalDistance + tilt * (vUv.y - 0.5);
                    float radius = maxBlur * smoothstep(band * 0.5, band * 1.5, abs(eyeZ - plane));
                    if (radius < 0.25) {
                        gl_FragColor = center;
                        return;
                    }
                    // 36 golden-angle spiral samples: with 12, small bright dots get smeared into starbursts
                    vec4 total = center;
                    for (int i = 0; i < 36; ++i) {
                        float angle = float(i) * 2.39996323;
                        float spread = sqrt((float(i) + 0.5) / 36.0);
                        vec2 sampleUv = vUv + vec2(cos(angle), sin(angle)) * radius * spread * texel;
                        total += texture2D(tDiffuse, sampleUv);
                    }
                    gl_FragColor = total / 37.0;
                }
            `,
        });
    }

    configure(camera, focus, width, height) {
        const {uniforms} = this;
        uniforms.clipDepth.value.set(camera.near, camera.far);
        uniforms.texel.value.set(1 / width, 1 / height);
        uniforms.focalDistance.value = focus.distance;
        uniforms.band.value = focus.band;
        uniforms.tilt.value = focus.tilt ?? 0;
        uniforms.maxBlur.value = focus.maxBlur * width / 1080;
    }

    render(renderer, writeBuffer, readBuffer, delta, maskActive) {
        this.uniforms.tDepth.value = readBuffer.depthTexture;
        super.render(renderer, writeBuffer, readBuffer, delta, maskActive);
    }
}

// Last step of supersampling (downscale on the GPU): the whole post chain is drawn at ss times the size, and the output (already converted to sRGB) stays in an offscreen target;
// here each output pixel takes its ss x ss source pixels, clamps them to 0-1, converts back to linear light and averages them, then converts to sRGB and writes to the canvas.
// Same algorithm as the old downsample in Python (which worked after an 8-bit readback); the difference is at most 1 quantization level.
const DOWNSAMPLE = `
uniform sampler2D src;
uniform int ss;
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
    ivec2 o = ivec2(gl_FragCoord.xy) * ss;
    vec3 acc = vec3(0.0);
    for (int y = 0; y < 4; y++) {
        if (y >= ss) break;
        for (int x = 0; x < 4; x++) {
            if (x >= ss) break;
            acc += toLinear(clamp(texelFetch(src, o + ivec2(x, y), 0).rgb, 0.0, 1.0));
        }
    }
    gl_FragColor = vec4(toSRGB(acc / float(ss * ss)), 1.0);
}
`;

export class PostChain {
    // width and height are the drawn size; when ss > 1 the canvas is width/ss x height/ss, and the final downscale happens on the GPU
    constructor(renderer, world, camera, width, height, samples, ss = 1) {
        Object.assign(this, {renderer, world, camera, width, height, ss});
        if (ss > 1) {
            this.down = new FullScreenQuad(new ShaderMaterial({
                uniforms: {src: {value: null}, ss: {value: ss}}, vertexShader: fullscreenVertex, fragmentShader: DOWNSAMPLE,
                depthTest: false, depthWrite: false,
            }));
        }
        const target = new WebGLRenderTarget(width, height, {
            type: HalfFloatType, depthTexture: new DepthTexture(width, height, UnsignedIntType), samples,
        });
        this.composer = new EffectComposer(renderer, target);
        this.renderPass = new RenderPass(world, camera);
        this.focus = new FocusPass();
        this.glow = new UnrealBloomPass(new Vector2(width, height), 0, 0, 1);
        this.output = new OutputPass();
        this.slots = new WeakMap();
    }

    draw(settings, cameraTrack, frame) {
        const focus = {...settings?.focus, ...cameraTrack.focus};
        const applyFocus = settings?.focus?.enabled === true && focus.distance > 0 && focus.band > 0 && focus.maxBlur > 0;
        const bloom = settings?.bloom;
        const applyGlow = bloom?.enabled === true && bloom.strength > 0;
        const custom = settings?.shader;
        if (!(applyFocus || applyGlow || custom) && this.ss <= 1) {
            this.renderer.render(this.world, this.camera);
            return;
        }

        const passes = [this.renderPass];
        if (applyFocus) {
            this.focus.configure(this.camera, focus, this.width, this.height);
            passes.push(this.focus);
        }
        if (applyGlow) {
            this.glow.strength = bloom.strength;
            this.glow.radius = bloom.radius ?? 0;
            this.glow.threshold = bloom.threshold ?? 1;
            passes.push(this.glow);
        }
        if (custom) {
            if (!this.slots.has(custom)) {
                const shader = new ShaderPass({
                    vertexShader: fullscreenVertex, fragmentShader: custom.fragmentShader, uniforms: {
                        ...custom.uniforms, tDiffuse: {value: null}, t: {value: 0},
                        resolution: {value: new Vector2(this.width, this.height)},
                    },
                });
                this.slots.set(custom, shader);
            }
            const slot = this.slots.get(custom);
            slot.uniforms.t.value = frame.t;
            custom.update?.(slot.uniforms, frame);
            passes.push(slot);
        }
        this.composer.passes = [...passes, this.output];
        // Start each frame from the same target regardless of the previous style's pass count.
        this.composer.readBuffer = this.composer.renderTarget2;
        this.composer.writeBuffer = this.composer.renderTarget1;
        this.composer.renderToScreen = this.ss <= 1;
        this.composer.render(0);
        if (this.ss > 1) {
            // after the last pass finishes the composer has swapped buffers, so the finished image is in readBuffer
            this.down.material.uniforms.src.value = this.composer.readBuffer.texture;
            this.renderer.setRenderTarget(null);
            this.down.render(this.renderer);
        }
    }
}
