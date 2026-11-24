// Fix item 34, B version: printed artwork gets a short indigo-purple drop shadow between layers (the shallows layer in the opening), ink lines no thinner than 0.2 mm, and a contact-darkening print at the bottom of standees. Render: --scene scenes/leonida/ab_print.js
import {setAB} from "./ab.js";
setAB({print: true});
export {build} from "./index.js";
