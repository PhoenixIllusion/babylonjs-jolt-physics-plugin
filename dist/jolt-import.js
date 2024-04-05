const _jolt = {};

let Jolt;

export const setJoltModule = async (joltModule) => {
    Jolt = joltModule;
}

export const loadJolt = async (importSettings) => {
    if (!Jolt) {
        Jolt = (await import('https://www.unpkg.com/jolt-physics@0.21.0/dist/jolt-physics.wasm-compat.js')).default
    }
    const j = await Jolt(importSettings);
    Object.assign(_jolt, j);

    j.Quat.sIdentity = j.Quat.prototype.sIdentity;
    j.Quat.sEulerAngles = j.Quat.prototype.sEulerAngles;
    j.Vec3.sZero = j.Vec3.prototype.sZero;
    j.Vec3.sAxisY = j.Vec3.prototype.sAxisY
    return;
}

export default _jolt;