import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import './jolt-impostor';
import { JoltJSPlugin } from "./jolt-physics";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export declare class GravityUtility {
    private static _instance?;
    private _impostors;
    static getInstance(plugin: JoltJSPlugin): GravityUtility;
    private _gravityForce;
    private _bodyCoM;
    onPhysicsStep(_delta: number): void;
    registerGravityOverride(impostor: PhysicsImpostor, gravity: Vector3, point?: Vector3): void;
    unregisterGravityOverride(impostor: PhysicsImpostor): void;
}
