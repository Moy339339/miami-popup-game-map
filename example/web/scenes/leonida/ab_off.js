// All four switches off (the default look before 11-24), for comparison. Render: --scene scenes/leonida/ab_off.js
import {setAB} from "./ab.js";
setAB({print: false, gloss: false, desat: false, atlas: false});
export {build} from "./index.js";
