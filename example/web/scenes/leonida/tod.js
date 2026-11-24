// Time of day: 0 day (the Keys) -> 1 golden afternoon (Grassrivers) -> 2 sunset (Vice Beach, the key color of the GTA6 key art) -> 3 night (Vice City downtown, neon).
// The scene (sky dome, fog, dust motes) and the art style (lights, shadows, bloom, neon) both take their values from here, interpolated by the fractional part.
// cloud: how much cloud shadow darkens the paper (fix item 6; the reviewer's alpha <= 0.12 is judged by eye - after color grading 0.11 is barely visible, 0.24 is roughly a 10% drop in brightness; none at night)
// groundSat: saturation of the ground paper for fix item 8, B version. Author, 11-24: only on in the two daytime regions (the Keys, Grassrivers), at half strength first (0.86 / 0.9); sunset and night keep the A color scheme
export const TOD = [
    {   // 0 day: high sun, cyan-blue sky, bluish shadows
        sun: "#fff1dc", sunI: 3.7, sunDir: [-0.45, -0.35, 0.82], hemiSky: "#a9d6ff", hemiGround: "#f2e2c8", hemiI: 0.85,
        rim: "#ffffff", rimI: 0.25, tint: "#6f7fb8", fog: "#d4e6f2", fogNear: 700, fogFar: 2200, bloom: 0.22, exposure: 1.0, neon: 0.15,
        sky: ["#5aa8e6", "#9fd0f2", "#e6f6f4"], dust: "#fff4d0", sat: 1.24, con: 1.06, cloud: 0.24, groundSat: 0.86,
    },
    {   // 1 golden afternoon
        sun: "#ffd39a", sunI: 4.1, sunDir: [-0.62, -0.38, 0.62], hemiSky: "#c8bce8", hemiGround: "#f4d0a8", hemiI: 0.88,
        rim: "#ffb070", rimI: 0.55, tint: "#7a6aa0", fog: "#f0caa4", fogNear: 650, fogFar: 2000, bloom: 0.3, exposure: 1.06, neon: 0.45,
        sky: ["#8aa0d6", "#f3c3a0", "#ffd890"], dust: "#ffd9a0", sat: 1.16, con: 1.04, cloud: 0.18, groundSat: 0.9,
    },
    {   // 2 sunset (the color settled on in the first scene)
        sun: "#ffd2b4", sunI: 3.8, sunDir: [-0.69, -0.48, 0.53], hemiSky: "#a99be8", hemiGround: "#d8b4a6", hemiI: 0.55,
        rim: "#ff9ccb", rimI: 0.7, tint: "#4a3f8a", fog: "#d8a2c2", fogNear: 650, fogFar: 1900, bloom: 0.38, exposure: 0.95, neon: 1.0,
        sky: ["#9e86c8", "#de92b6", "#ffb089"], dust: "#ffd6a8", sat: 1.0, con: 1.0, cloud: 0.06, groundSat: 1,
    },
    {   // 3 night: bluish-purple moonlight, neon and window lights are the stars. The key light slants in from the camera side (like a street lamp hitting a face), so the standee figures read from the front instead of being a row of black silhouettes
        sun: "#b8b4ff", sunI: 1.9, sunDir: [-0.4, -0.5, 0.77], hemiSky: "#6a62c8", hemiGround: "#4a3058", hemiI: 0.95,
        rim: "#ff4fa3", rimI: 0.9, tint: "#2e2860", fog: "#3a2c62", fogNear: 700, fogFar: 2200, bloom: 0.6, exposure: 1.1, neon: 1.6,
        sky: ["#0d0b26", "#2a1a52", "#8a3a7a"], dust: "#c9b8ff", sat: 1.06, con: 1.0, cloud: 0, groundSat: 1,
    },
];

function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const mixN = (a, b, k) => a + (b - a) * k;
function mixHex(a, b, k) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return A.map((v, i) => mixN(v, B[i], k));
}

// Get the parameter set for time of day tod (a fraction in 0-3); colors are returned as [r,g,b] (0-1, sRGB)
export function todParams(tod) {
    const i = Math.max(0, Math.min(TOD.length - 2, Math.floor(tod)));
    const k = Math.max(0, Math.min(1, tod - i));
    const a = TOD[i], b = TOD[i + 1];
    const out = {};
    for (const key of Object.keys(a)) {
        const va = a[key], vb = b[key];
        if (typeof va === "number") out[key] = mixN(va, vb, k);
        else if (typeof va === "string") out[key] = mixHex(va, vb, k);
        else if (Array.isArray(va) && typeof va[0] === "number") out[key] = va.map((v, j) => mixN(v, vb[j], k));
        else if (Array.isArray(va)) out[key] = va.map((v, j) => mixHex(v, vb[j], k));
    }
    return out;
}
