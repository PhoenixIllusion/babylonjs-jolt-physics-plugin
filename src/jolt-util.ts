import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';

export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;

export const SetJoltVec3 = (vec3: Vector3, jVec3: Jolt.Vec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
  return jVec3;
}

export const GetJoltVec3 = (jVec3: Jolt.Vec3, vec3: Vector3) => {
  vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ())
  return vec3;
}

export const SetJoltQuat = (quat: Quaternion, jQuat: Jolt.Quat, ) => {
  jQuat.Set(quat.x, quat.y, quat.z, quat.w);
  return jQuat;
}

export const GetJoltQuat = (jQuat: Jolt.Quat, quat: Quaternion) => {
  quat.set(jQuat.GetX(),jQuat.GetY(),jQuat.GetZ(),jQuat.GetW());
  return quat;
}
