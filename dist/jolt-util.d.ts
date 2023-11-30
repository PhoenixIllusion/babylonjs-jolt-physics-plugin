import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
export declare const LAYER_NON_MOVING = 0;
export declare const LAYER_MOVING = 1;
export declare const SetJoltVec3: (vec3: Vector3, jVec3: Jolt.Vec3) => Jolt.Vec3;
export declare const GetJoltVec3: (jVec3: Jolt.Vec3, vec3: Vector3) => Vector3;
export declare const SetJoltQuat: (quat: Quaternion, jQuat: Jolt.Quat) => Jolt.Quat;
export declare const GetJoltQuat: (jQuat: Jolt.Quat, quat: Quaternion) => Quaternion;
