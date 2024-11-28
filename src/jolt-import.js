const _jolt = {};

let Jolt;
let _lastJolt = 0;

export const setJoltModule = async (joltModule) => {
    Jolt = joltModule;
}

export const loadJolt = async (importSettings) => {
    if(_lastJolt === Jolt) {
        return;
    }
    if (!Jolt) {
        Jolt = (await import('https://www.unpkg.com/jolt-physics@0.30.0/dist/jolt-physics.wasm-compat.js')).default
    }
    const j = await Jolt(importSettings);
    Object.assign(_jolt, j);
    _lastJolt = Jolt;

    j.Quat.sIdentity = j.Quat.prototype.sIdentity;
    j.Quat.sEulerAngles = j.Quat.prototype.sEulerAngles;
    j.Vec3.sZero = j.Vec3.prototype.sZero;
    j.Vec3.sAxisY = j.Vec3.prototype.sAxisY;
    return;
}

export default _jolt;