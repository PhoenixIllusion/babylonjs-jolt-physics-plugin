import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
export declare class CharacterVirtualConfig {
    private character;
    private updateSettings;
    enableWalkStairs: boolean;
    enableStickToFloor: boolean;
    constructor(character: Jolt.CharacterVirtual, updateSettings: Jolt.ExtendedUpdateSettings);
    get mass(): number;
    set mass(v: number);
    set maxSlopeAngle(v: number);
    get maxStrength(): number;
    set maxStrength(v: number);
    get characterPadding(): number;
    get penetrationRecoverySpeed(): number;
    set penetrationRecoverySpeed(v: number);
    private _stickToFloorStepDown;
    get stickToFloorStepDown(): Vector3;
    set stickToFloorStepDown(v: Vector3);
    private _walkStairsStepUp;
    get walkStairsStepUp(): Vector3;
    set walkStairsStepUp(v: Vector3);
}
