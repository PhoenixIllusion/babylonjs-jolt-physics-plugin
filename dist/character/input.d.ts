import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GravityInterface } from "../gravity/types";
import Jolt from "../jolt-import";
import { CharacterState, GroundState } from "./type";
export interface CharacterVirtualInputHandler {
    up: Vector3;
    rotation: Quaternion;
    gravity?: GravityInterface;
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, tmpVec3: Jolt.Vec3, tmpQuat: Jolt.Quat): void;
    updateCharacter(character: Jolt.CharacterVirtual, tmp: Jolt.Vec3): void;
}
export declare class StandardCharacterVirtualHandler implements CharacterVirtualInputHandler {
    private mDesiredVelocity;
    private inMovementDirection;
    private inJump;
    allowSliding: boolean;
    controlMovementDuringJump: boolean;
    characterSpeed: number;
    jumpSpeed: number;
    enableCharacterInertia: boolean;
    groundState: GroundState;
    userState: CharacterState;
    updateInput(inMovementDirection: Vector3, inJump: boolean): void;
    private _new_velocity;
    autoUp: boolean;
    up: Vector3;
    rotation: Quaternion;
    gravity?: GravityInterface;
    private _linVelocity;
    private _groundVelocity;
    processCharacterData(character: Jolt.CharacterVirtual, _physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat): void;
    updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void;
}
