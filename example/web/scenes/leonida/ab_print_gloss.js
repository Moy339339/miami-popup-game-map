// For the single-switch comparison sheet (11-24): print for the whole film + gloss (only cars and building-face glass at sunset and night). Render: --scene scenes/leonida/ab_print_gloss.js
import {setAB} from "./ab.js";
setAB({print: true, gloss: true});
export {build} from "./index.js";
