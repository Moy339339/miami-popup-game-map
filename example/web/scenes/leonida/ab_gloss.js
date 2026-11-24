// Fix item 29, B version: specialty paper gloss. Render: --scene scenes/leonida/ab_gloss.js
import {setAB} from "./ab.js";
setAB({gloss: true});
export {build} from "./index.js";
