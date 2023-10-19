import { Vector3 } from '@babylonjs/core';
import Jolt from './jolt-import';


export const SetJoltVec3 = (vec3: Vector3, jVec3: Jolt.Vec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
}

export const GetJoltVec3 = (jVec3: Jolt.Vec3, vec3: Vector3) => {
  vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ())
}

