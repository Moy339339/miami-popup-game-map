// Fix item 8, B version: desaturated ground by day (standing pieces unchanged), grain reduced to about +/-1% and distributed by brightness. Render: --scene scenes/leonida/ab_desat.js
import {setAB} from "./ab.js";
setAB({desat: true});
export {build} from "./index.js";
