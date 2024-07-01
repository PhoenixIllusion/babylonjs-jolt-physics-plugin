import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import '../jolt-impostor';
import { JoltJSPlugin } from "../jolt-physics";
import { GravityInterface } from "./types";
export declare class GravityUtility {
    private static _instance?;
    private _impostors;
    constructor();
    static getInstance(plugin: JoltJSPlugin): GravityUtility;
    private _gravityForce;
    private _bodyCoM;
    onPhysicsStep(_delta: number): void;
    registerGravityOverride(impostor: PhysicsImpostor, gravity: GravityInterface): void;
    unregisterGravityOverride(impostor: PhysicsImpostor): void;
}
