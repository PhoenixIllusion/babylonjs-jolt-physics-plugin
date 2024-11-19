import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { float } from '@babylonjs/core/types';
export declare const LAYER_NON_MOVING = 0;
export declare const LAYER_MOVING = 1;
export type RawPointer<_T> = number;
export declare function wrapJolt<T>(pointer: RawPointer<T>, clazz: new (...a: any[]) => T): T;
export type JVec3 = Jolt.Vec3 | Jolt.RVec3;
export type float3 = [float, float, float];
export type float4 = [float, float, float, float];
export declare const f3: (v: Vector3) => float3;
export declare const f4: (v: Quaternion) => float4;
export declare const SetJoltVec3: <T extends Jolt.Vec3 | Jolt.RVec3>(vec3: Vector3, jVec3: T) => T;
export declare const GetJoltVec3: <T extends Jolt.Vec3 | Jolt.RVec3>(jVec3: T, vec3: Vector3) => Vector3;
export declare const SetJoltQuat: (quat: Quaternion, jQuat: Jolt.Quat) => Jolt.Quat;
export declare const GetJoltQuat: (jQuat: Jolt.Quat, quat: Quaternion) => Quaternion;
