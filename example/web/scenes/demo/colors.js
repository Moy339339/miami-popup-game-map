export const HEX = ["#FF2FA0", "#00C8FF", "#FFE600", "#1B1446", "#F4EDE0"];

export function build({THREE, paper}) {
    const root = new THREE.Group();
    for (const [i, hex] of HEX.entries()) {
        root.add(new paper.Card({
            id: "swatch-" + i, kind: "swatch", outline: paper.rectangle(-37.5 + 15 * i, -54, 15, 108),
            thickness: 0.002, meta: {hex}, castShadow: false, receiveShadow: false,
        }));
    }
    return {root, camera: () => ({position: [0, 0, 100], target: [0, 0, 0],
        up: [0, 1, 0], fov: 2 * Math.atan(0.5) * 180 / Math.PI})};
}
