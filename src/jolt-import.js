import Jolt from 'https://www.unpkg.com/jolt-physics/dist/jolt-physics.wasm-compat.js';

const _jolt = {};
export const loadJolt = async (importSettings) => {
    const j= await Jolt(importSettings); 
    Object.assign(_jolt, j);

    j.Quat.sIdentity = j.Quat.prototype.sIdentity;
    j.Quat.sEulerAngles = j.Quat.prototype.sEulerAngles;
    j.Vec3.sZero = j.Vec3.prototype.sZero;
    j.Vec3.sAxisY = j.Vec3.prototype.sAxisY
    return;
}

export default _jolt;