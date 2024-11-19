import Jolt from "./jolt-import";
import { PhysicsSettings } from "./jolt-physics";
import { MotionType } from "./jolt-impostor";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
export declare function GetMotionType(motionType: MotionType): Jolt.EMotionType;
export declare class BodyUtility {
    static createBody(impostor: PhysicsImpostor, physicsSettings: PhysicsSettings | undefined, bodyInterface: Jolt.BodyInterface, tempVec3A: Jolt.Vec3, tempVec3B: Jolt.Vec3, tempRVec3A: Jolt.RVec3, tempQuaternion: Jolt.Quat): Jolt.Body;
}
