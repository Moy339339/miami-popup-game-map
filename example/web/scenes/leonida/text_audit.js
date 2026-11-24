// Debug scene: same as index.js, but first takes over the canvas fillText and checks whether there is a backing plate under both ends of each piece of text (sign lettering overhanging the plate, or touching its edge).
// Usage: python text_audit.py. Only looks at unrotated text; where there is a whole opaque sheet of paper under the text (map, sea), the edge cannot be measured and nothing is reported.
const hits = [];
const P = CanvasRenderingContext2D.prototype;
const orig = P.fillText;
P.fillText = function (text, x, y, maxW) {
    try { check(this, String(text), x, y, maxW); } catch { /* skip if it cannot be measured */ }
    return orig.call(this, text, x, y, maxW);
};
function check(ctx, text, x, y, maxW) {
    if (!text.trim()) return;
    const tf = ctx.getTransform();
    if (Math.abs(tf.b) > 1e-6 || Math.abs(tf.c) > 1e-6) return;
    const m0 = ctx.measureText(text);
    // With maxWidth given: the browser squeezes the text horizontally to fit, so measure at the squeezed width
    const k = maxW > 0 && m0.width > maxW ? maxW / m0.width : 1;
    const al = ctx.textAlign, ax = al === "center" ? 0.5 : al === "right" || al === "end" ? 1 : 0;
    const m = {actualBoundingBoxLeft: (m0.actualBoundingBoxLeft - m0.width * ax) * k + m0.width * k * ax, actualBoundingBoxRight: (m0.actualBoundingBoxRight + m0.width * ax) * k - m0.width * k * ax,
        actualBoundingBoxAscent: m0.actualBoundingBoxAscent, actualBoundingBoxDescent: m0.actualBoundingBoxDescent};
    const cw = ctx.canvas.width;
    const L = tf.a * (x - m.actualBoundingBoxLeft) + tf.e, R = tf.a * (x + m.actualBoundingBoxRight) + tf.e;
    const Y = Math.round(tf.d * (y - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2) + tf.f);
    const px = parseFloat(/(\d+(\.\d+)?)px/.exec(ctx.font)?.[1] ?? "10") * Math.abs(tf.a);
    if (Y < 0 || Y >= ctx.canvas.height || px < 6) return;
    if (L < -0.5 || R > cw + 0.5) { hits.push({text, font: ctx.font, canvas: [cw, ctx.canvas.height], kind: "off canvas", over: +Math.max(-L, R - cw).toFixed(1), px: +px.toFixed(1)}); return; }
    const row = ctx.getImageData(0, Y, cw, 1).data;
    const a = i => row[Math.max(0, Math.min(cw - 1, Math.round(i))) * 4 + 3];
    // Each end: outside the plate = how far it sticks out; on the plate = how much room is left before the plate edge
    const side = (x0, dir) => {
        if (a(x0) <= 8) { let i = x0; while (Math.abs(i - x0) < px * 6 && a(i) <= 8) i -= dir; return -Math.abs(i - x0); }
        let i = x0; while (i >= 0 && i < cw && Math.abs(i - x0) < px * 2 && a(i) > 8) i += dir;
        return i < 0 || i >= cw ? px * 2 : Math.abs(i - x0);
    };
    const ml = side(L, -1), mr = side(R, 1);
    const worst = Math.min(ml, mr);
    if (worst < px * 0.12) hits.push({text, font: ctx.font, canvas: [cw, ctx.canvas.height], kind: worst < 0 ? "overhangs plate" : "near edge",
        left: +(ml / px).toFixed(2), right: +(mr / px).toFixed(2), px: +px.toFixed(1)});
}
window.leonidaTextAudit = () => hits;
export * from "./index.js";
