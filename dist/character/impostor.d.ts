import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltCharacterVirtual } from "./character-virtual";
import { Scene } from "@babylonjs/core/scene";
import { JoltPluginData } from "../jolt-impostor";
interface JoltCharacterVirtualPluginData extends JoltPluginData {
    controller: JoltCharacterVirtual;
}
export interface CharacterVirtualImpostorParameters extends PhysicsImpostorParameters {
    maxSlopeAngle?: number;
    maxStrength?: number;
    characterPadding?: number;
    penetrationRecoverySpeed?: number;
    predictiveContactDistance?: number;
    enableWalkStairs?: boolean;
    enableStickToFloor?: boolean;
}
export declare class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    _pluginData: JoltCharacterVirtualPluginData;
    constructor(object: IPhysicsEnabledObject, type: number, _options: CharacterVirtualImpostorParameters, _scene?: Scene);
    get controller(): JoltCharacterVirtual;
    set controller(controller: JoltCharacterVirtual);
}
type CharacterVirtualNumberParam = 'maxSlopeAngle' | 'maxStrength' | 'characterPadding' | 'penetrationRecoverySpeed' | 'predictiveContactDistance';
type CharacterVirtualBooleanParam = 'enableWalkStairs' | 'enableStickToFloor';
export interface JoltCharacterVirtualImpostor {
    getParam(param: CharacterVirtualNumberParam): number | undefined;
    getParam(param: CharacterVirtualBooleanParam): boolean | undefined;
}
export {};
