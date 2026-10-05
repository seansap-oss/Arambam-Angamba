import {vi} from 'vitest';
window.matchMedia=()=>({matches:false});
global.IntersectionObserver=class {observe(){} disconnect(){}};
