// For the single-switch comparison sheet (11-24): print for the whole film + desat (only the two daytime regions, half strength). Render: --scene scenes/leonida/ab_print_desat.js
import {setAB} from "./ab.js";
setAB({print: true, desat: true});
export {build} from "./index.js";
