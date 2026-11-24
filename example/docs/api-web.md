# three.js Pop-up Book API

> Interface reference for the rendering base (`web/engine/`) and the capture pipeline (`popup/pipeline/`). To write scenes and styles, start here, then read `web/scenes/leonida/`.

Scenes and styles are native ES modules; three.js is mapped by the project's import map to `web/node_modules/`. For running examples see the [demo scene](../web/scenes/demo/index.js) and the [debug style](../web/styles/debug.js).

## Running

Run the following commands under `example/` with PowerShell 7 (on macOS / Linux replace `$py` with `.venv/bin/python`). First create a Python 3.12 virtual environment `.venv`.

```powershell
$py = '.\.venv\Scripts\python.exe'
npm --prefix web ci
& $py -m pip install -r requirements.txt
& $py -m popup.pipeline.web_textures
& $py -m popup.pipeline.web_render --scene scenes/demo/index.js --edl web/scenes/demo/final.json --preset final --out out/web_demo_final.mp4
& $py -m popup.pipeline.web_render --scene scenes/demo/index.js --style styles/debug.js:Day --t0 3 --t1 6 --out out/day.mp4
& $py -m popup.pipeline.web_frame --scene scenes/demo/index.js --style styles/debug.js:Night --t 7.8 --out out/night.png
& $py -m popup.pipeline.web_contact --scene scenes/demo/index.js --edl web/scenes/demo/final.json --times 0,1.4,4.8,6.2,7.3,7.8,8.4,9.1,9.8 --cols 3 --out out/sheets/web_demo.png
& $py -m popup.pipeline.web_render --scene scenes/demo/index.js --edl web/scenes/demo/relay.json --preset final --out out/web_demo_relay.mp4
npm --prefix web test
& $py -m pytest -q --basetemp=out/web-pytest
```

- `--scene` takes a scene module path relative to `web/`. `--style` uses `styles/file.js:ExportName`. Direct rendering of a range is half-open (start included, end excluded). The edit list (EDL) follows the syntax of the earlier 2D pipeline (`popup/pipeline/timeline.py`); the samples include a day-to-night transition and a relay that switches every 0.4 s. [Day-to-night EDL](../web/scenes/demo/final.json) · [Relay EDL](../web/scenes/demo/relay.json)
- `preview` is 540×720 at 15 fps. `draft` is 1080×1440 at 30 fps; `final` is the same size, drawn at 2× and downsampled on the GPU. Contact sheets default to the preview preset, and in EDL mode the source time is chosen for the nearest output frame. A PNG still accepts any non-negative t. A whole clip also supports `--wav path`, reusing the same AAC and BT.709 encoding as the 2D pipeline (`popup/pipeline/encode.py`).
- The capture commands start a loopback static server and a separate local headless Chrome profile. The terminal prints the server PID, the address and the actual WebGL renderer, and the browser and server are shut down on exit. `--gpu` is unrestricted by default as long as the GPU is a hardware one; to pin a specific card, pass a substring of the renderer name (such as `--gpu "RTX 4070"`). Software renderers are rejected.
- The Python tests include color and stability acceptance checks that need a local Chrome plus a hardware GPU; without a usable GPU, add `-k 'not browser'` to run only the remaining tests.

## Scenes

A module exports `build(context)`, which may be async and returns `{root, book, theta, state, camera, update}`. `root` is the scene's `THREE.Object3D`. A scene without a book may omit `book` and `theta`. `context` carries `THREE`, `paper`, `loadTexture`, `canvasTexture`, `width`, `height` and `scale=width/1080`.

```js
export function build({THREE, paper}) {
    const book = new paper.Book({width: 105, height: 150, spineZ: 3});
    const card = new paper.Card({
        id: "flap", outline: paper.rectangle(0, 0, 24, 18), meta: {role: "frontage"},
    });
    book.add(new paper.Hinge({
        id: "flap", object: card, parent: "board.right", anchor: [44, 10], axis: [0, -1],
        angle: (t, theta) => theta / 3, limits: [0, 65],
    }));
    return {
        root: book.root, book,
        theta: t => 175 * Math.min(1, t / 3),
        state: t => ({phase: t}),
        camera: () => ({
            position: [180, -240, 215], target: [0, 0, 10], up: [0, 0, 1], fov: 50,
            focus: {distance: 260, band: 42, tilt: 8, maxBlur: 11},
        }),
    };
}
```

- World and local papercraft dimensions are all in millimeters; the tabletop is in XY with +z up. The camera's `fov` is the vertical field of view in degrees, and `near` and `far` may be given. The focus parameters `focus.distance`, `band` and `tilt` refer to distance along the camera axis, in millimeters. `maxBlur` is a pixel radius at a 1080-wide baseline. `tilt` is the change in focal-plane distance from the bottom of the frame to the top.
- Each frame computes `state(t)`, `theta(t,state)`, the book pose and the camera, then calls `update(frame)`. The scene and the style receive the same `state` dictionary. `frame` contains `t`, `theta`, `state`, `camera`, `width`, `height` and `scale`. Time tracks should allow jumping to any time, and frame updates should be rebuilt from the values passed in.
- Create and register papercraft meshes at `build` time, and update pose, geometry or visibility by t. This lets materials and compilation finish during the ready phase. Plain Three objects can also be added to `root` directly; use `paper.tagPaper(mesh, definition, slots)` to hand a custom mesh to the same style for material assignment.

### Papercraft geometry and mechanisms

| Part | Parameters and coordinates |
| --- | --- |
| `Card({id, outline, holes, thickness, uvFrame, meta, kind, part, castShadow, receiveShadow})` | The outline is an array of local XY points in millimeters and may have holes. Thickness defaults to 0.35 mm, symmetric about local z. The three material slots are, in order, `front / back / edge`. The front and back are mapped with the same local millimeter coordinates. `uvFrame={x,y,width,height}` specifies the physical area the texture covers, defaulting to the outline's bounding box. The attribute `paperMm` stores the original XY coordinates |
| `FoldedBox({id,width,depth,height,thickness,meta})` | The six panels are tagged `north/south/east/west/top/bottom`. The origin is at the center of the bottom face, and vertical is +z. `setFold(radians)` lifts the side walls from 0 to π/2 and keeps the lid parallel to the bottom face |
| `CrossCard({id,outline,angle,...cardOptions})` | Two pieces initially share the local y axis, tagged `a/b`; the second piece turns about y, π/2 by default |
| `Book({width,height,spineZ,thickness,clearance,boardMeta})` | The right board is fixed; the right board's local x∈[0,width] and the left board's local x∈[-width,0]. The assembly planes of the two boards unfold from the spine line: θ=0 is coincident, θ=180 is laid flat. The inner faces of the solid boards are offset outward along their own assembly planes by `clearance/2`, leaving room for the fold pieces in between |
| `VFold({...})` | Parameters are `leftId,rightId,anchorX,anchorY,ridgeLength,ridgeProjection,spineY,thickness,leftMeta,rightMeta`. The glue line runs from the spine to `(±anchorX, spineY+anchorY)` on the boards. The dot product of the peak direction and the glue-line vector is `ridgeProjection`, which must lie between 0 and `anchorY`. The two halves are attached to the corresponding book boards |
| `TabLayer({...})` | `first,second,top` are named paper pieces, and `parent` is the parent part ID. `firstAnchor,secondAnchor` lie in the parent's plane, and `length` is the length of the support. The support's hinge line runs along local y; the side piece joins the base at `x=0` and the top at `x=length`, and a positive angle points toward the parent's +z. The top layer always stays parallel to the parent plane |
| `Hinge({...})` | `id,object,parent,anchor,axis,pivot` are defined in the local planes of the parent and child cards. The child's pivot defaults to `[0,0]`, rotation follows the right-hand rule, and hinges can be nested |
| `PullTab({...})` | `id,object,parent,start,end,pin`. The track `distance(t,theta,state)` is measured in millimeters and ranges from 0 to the slot length |
| `FreePiece({...})` | `id,object,parent="book"`. `track(t,theta,state)` returns `{position,rotation,visible}`, where the Euler rotation is in radians. If omitted, the rotation is zero and the piece is visible |
| `Spring({start,frequency,damping,amplitudeDeg,delay})` | Start and delay are in seconds, frequency in Hz, damping in 1/s. The hinge and layer tracks `angle(t,theta,state)` are in degrees, and may be given `spring` and `limits=[min,max]`. The angle is zero at θ=0. The independent degree of freedom of a V-fold is the book board θ, and rebound can be done through the whole group's `theta(t)` |
| `Page({id,width,height,origin,segments,meta})` | `book.setPage(page,track)`; the track returns `{progress,radius,lift,bendStart}` or `null`. Progress 0→1 turns the page from right to left, the cylinder radius and lift distance are in millimeters, and the lift direction is the normal of the current reference page plane. `bendStart` is a fraction of the page width, 0.3 by default. The arc subdivision is at least 5, 24 by default. The front and back have independent materials, and the back's u is mirrored automatically |

`book.add(...mechanisms)` registers them with parents first and children after. `book.jointErrors()` returns the current glue-point error. The visible surfaces of thick paper and thick boards are laid out around the ideal hinge line, and the visible detail of glue seams and folded layers is up to the scene. The closed gap should accommodate the thickest piece of paper. Crossings of adjacent pieces, local layering and the clearance between folded-box panels during motion have to be arranged by the scene; the base does not do general collision solving.

## Styles

Each named export of a `--style` is a style factory, which takes `context` as its argument and may return a Promise.

```js
export async function Paper({THREE, loadTexture, canvasTexture}) {
    const front = await loadTexture("tex/gen/demo-grid.png");
    const back = canvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = "#b0b0b0";
        ctx.fillRect(0, 0, w, h);
    });
    const root = new THREE.Group();
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-120, -100, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 15;
    sun.shadow.normalBias = 0.5;
    Object.assign(sun.shadow.camera, {left: -200, right: 200, bottom: -200, top: 200});
    sun.shadow.camera.updateProjectionMatrix();
    root.add(sun, sun.target, new THREE.AmbientLight(0xffffff, 0.4));

    return {
        frameHold: 1,
        material: ({kind, part, face, id, meta}) => new THREE.MeshStandardMaterial({
            color: 0xc9c9c9, roughness: 0.9,
            map: kind === "page" ? (face === "front" ? front : back) : null,
        }),
        lighting: () => ({
            root, background: new THREE.Color(0xc1c1c1),
            toneMapping: THREE.NoToneMapping, exposure: 1,
            shadows: {enabled: true, tint: 0x181818, directional: {
                searchSamples: 8, filterSamples: 16, depthScale: 20,
            }},
            post: {
                focus: {enabled: true},
                bloom: {enabled: false, threshold: 1, strength: 0, radius: 0},
            },
        }),
    };
}
```

- `material({id,kind,part,face,meta})` returns a `THREE.Material`. Materials are prepared once per style, mesh and slot, and objects may be reused. Lights, background, environment, roughness, shadows, exposure and post-processing are all set by the scene or the style. `update(frame, lighting)` can be used to reassign them every frame.
- Directional and point lights use blocker-depth search with contact hardening. Each light's `shadow.radius` is the maximum softening radius, in shadow-map texel units, and 0 gives a hard shadow. The light's `shadow.bias`, `normalBias`, `intensity`, shadow-map size and camera range can be set. Directional and point lights each have `searchSamples` and `filterSamples`, 1-24 each; `depthScale` adjusts the mapping from occluder distance to soft-edge radius. `shadows.tint` is the RGB fraction of that direct light remaining inside shadow, interpreted through Three's color input. The shadow fragments plug into Three's own lit materials, and `MeshBasicMaterial` stays unlit.
- `post.focus.enabled` is the depth-of-field switch; defaults for its parameters can be given in `post.focus` and are overridden by the scene's `camera(t).focus`. `post.bloom` supports `enabled,threshold,strength,radius`. The threshold is in linear HDR luminance. `post.shader` is a slot for an arbitrary fragment shader, providing `fragmentShader`, optional `uniforms`, and `update(uniforms,frame)`. The shader can read `tDiffuse`, `t`, `resolution` and `vUv`. The processing order is the 3D image → depth of field → bloom → custom shader → tone mapping and sRGB output.
- `loadTexture` only reads local `web/tex/`, and generated PNGs go in `web/tex/gen/`. These debug images are rebuilt with `web_textures`. Canvas 2D images are returned from `canvasTexture`. Color maps from both sources are sRGB by default; for normal or roughness maps pass `{color:false}`.
- `frameHold=2` quantizes the source time to every second tick of the global frame grid for the given fps. Two relayed styles that use the same `frameHold` get the same effective source time.

## Page calls

The entry query specifies `scene`, one or more `style`, `width` and `height`, and may specify `gpu` for a hardware-name check. `window.popup.ready()` waits for the style factories, textures, declared fonts and each style's warm-up draw, then returns the GPU name and the `frameHold` mapping. If a style opens a new shader or post-processing branch at a later time, it can export `warmTimes: [t1, t2]` to have it compiled ahead of time in the same way. When drawing a Canvas with fonts, the factory can first await `document.fonts.load`.

```js
await window.popup.ready();
await window.popup.renderAt({style: "styles/debug.js:Day", t: 4.8});
await window.popup.setStyle("styles/debug.js:Night");
await window.popup.renderAt({t: 7.8});
```

Rendering follows explicit calls only. Chrome's internal capture reads back the framebuffer right after drawing and sends RGB24 out over loopback HTTP. Skia is used to generate the debug PNGs, single-frame PNGs and contact sheets. MP4 pixels go through the ffmpeg encoder in `popup/pipeline/encode.py` and are written straight to disk.
