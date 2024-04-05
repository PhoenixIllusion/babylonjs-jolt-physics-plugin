import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { float } from '@babylonjs/core/types';

export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;

export type RawPointer<_T> = number;

export function wrapJolt<T>(pointer: RawPointer<T>, clazz: new (... a: any[]) => T): T {
  return Jolt.wrapPointer(pointer, clazz);
}

export type JVec3 = Jolt.Vec3 | Jolt.RVec3;

export type float3 = [float, float, float];
export type float4 = [float, float, float, float];
export const f3 = (v: Vector3): float3 => [v.x, v.y, v.z];
export const f4 = (v: Quaternion): float4 => [v.x, v.y, v.z, v.w];

export const SetJoltVec3 = (vec3: Vector3, jVec3: Jolt.Vec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
  return jVec3;
}
export const SetJoltRVec3 = (vec3: Vector3, jVec3: Jolt.RVec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
  return jVec3;
}

export const GetJoltVec3 = (jVec3: JVec3, vec3: Vector3) => {
  vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ())
  return vec3;
}

export const SetJoltQuat = (quat: Quaternion, jQuat: Jolt.Quat) => {
  jQuat.Set(quat.x, quat.y, quat.z, quat.w);
  return jQuat;
}

export const GetJoltQuat = (jQuat: Jolt.Quat, quat: Quaternion) => {
  quat.set(jQuat.GetX(), jQuat.GetY(), jQuat.GetZ(), jQuat.GetW());
  return quat;
}
