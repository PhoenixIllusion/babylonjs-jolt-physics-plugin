import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GetJoltVec3, SetJoltVec3 } from "../jolt-util";
export class CharacterVirtualConfig {
    constructor(character, updateSettings) {
        this.character = character;
        this.updateSettings = updateSettings;
        this.enableWalkStairs = true;
        this.enableStickToFloor = true;
        this._stickToFloorStepDown = new Vector3();
        this._walkStairsStepUp = new Vector3();
    }
    get mass() { return this.character.GetMass(); }
    ;
    set mass(v) { this.character.SetMass(v); }
    ;
    set maxSlopeAngle(v) { this.character.SetMaxSlopeAngle(v); }
    ;
    get maxStrength() { return this.character.GetMaxStrength(); }
    ;
    set maxStrength(v) { this.character.SetMaxStrength(v); }
    ;
    get characterPadding() { return this.character.GetCharacterPadding(); }
    ;
    get penetrationRecoverySpeed() { return this.character.GetPenetrationRecoverySpeed(); }
    ;
    set penetrationRecoverySpeed(v) { this.character.SetPenetrationRecoverySpeed(v); }
    ;
    get stickToFloorStepDown() { return GetJoltVec3(this.updateSettings.mStickToFloorStepDown, this._stickToFloorStepDown); }
    set stickToFloorStepDown(v) { this._stickToFloorStepDown.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mStickToFloorStepDown); }
    get walkStairsStepUp() { return GetJoltVec3(this.updateSettings.mWalkStairsStepUp, this._walkStairsStepUp); }
    set walkStairsStepUp(v) { this._walkStairsStepUp.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mWalkStairsStepUp); }
}
