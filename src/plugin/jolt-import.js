import Jolt from 'https://www.unpkg.com/jolt-physics/dist/jolt-physics.wasm-compat.js';

const _jolt = {};
export const loadJolt = async (importSettings) => {
    const j= await Jolt(importSettings); 
    Object.assign(_jolt, j);
    return;
}

export default _jolt;