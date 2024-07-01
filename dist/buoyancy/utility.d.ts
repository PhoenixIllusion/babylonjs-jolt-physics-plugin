import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltJSPlugin } from "../jolt-physics";
import { BuoyancyInterface } from "./type";
export declare class BuoyancyUtility {
    private plugin;
    private static _instance?;
    private _impostors;
    constructor(plugin: JoltJSPlugin);
    static getInstance(plugin: JoltJSPlugin): BuoyancyUtility;
    private _bounding;
    onPhysicsStep(delta: number): void;
    registerBuoyancy(impostor: PhysicsImpostor, buoyancy: BuoyancyInterface): void;
    unregisterBuoyancy(impostor: PhysicsImpostor): void;
}
