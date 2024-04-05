import Jolt from './jolt-import';
export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;
export function wrapJolt(pointer, clazz) {
    return Jolt.wrapPointer(pointer, clazz);
}
export const f3 = (v) => [v.x, v.y, v.z];
export const f4 = (v) => [v.x, v.y, v.z, v.w];
export const SetJoltVec3 = (vec3, jVec3) => {
    jVec3.Set(vec3.x, vec3.y, vec3.z);
    return jVec3;
};
export const SetJoltRVec3 = (vec3, jVec3) => {
    jVec3.Set(vec3.x, vec3.y, vec3.z);
    return jVec3;
};
export const GetJoltVec3 = (jVec3, vec3) => {
    vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ());
    return vec3;
};
export const SetJoltQuat = (quat, jQuat) => {
    jQuat.Set(quat.x, quat.y, quat.z, quat.w);
    return jQuat;
};
export const GetJoltQuat = (jQuat, quat) => {
    quat.set(jQuat.GetX(), jQuat.GetY(), jQuat.GetZ(), jQuat.GetW());
    return quat;
};
