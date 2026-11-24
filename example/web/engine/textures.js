import {CanvasTexture, NoColorSpace, SRGBColorSpace, TextureLoader} from "three";

export async function loadTexture(path, {color = true} = {}) {
    const url = new URL(path, location.origin + "/");
    if (url.origin !== location.origin || !url.pathname.startsWith("/tex/")) {
        throw new Error("texture URL must be under the local /tex/ directory");
    }
    const texture = await new TextureLoader().loadAsync(url.href);
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    return texture;
}

export function canvasTexture(width, height, draw, {color = true} = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d"), width, height);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    return texture;
}
