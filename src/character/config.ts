import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GetJoltVec3, SetJoltVec3 } from "../jolt-util";
import Jolt from "../jolt-import";

export class CharacterVirtualConfig {
  public enableWalkStairs = true;
  public enableStickToFloor = true;

  constructor(private character: Jolt.CharacterVirtual, private updateSettings: Jolt.ExtendedUpdateSettings) { /* */ }


  get mass(): number { return this.character.GetMass() };
  set mass(v: number) { this.character.SetMass(v) };

  set maxSlopeAngle(v: number) { this.character.SetMaxSlopeAngle(v) };

  get maxStrength(): number { return this.character.GetMaxStrength() };
  set maxStrength(v: number) { this.character.SetMaxStrength(v) };

  get characterPadding(): number { return this.character.GetCharacterPadding() };

  get penetrationRecoverySpeed(): number { return this.character.GetPenetrationRecoverySpeed() };
  set penetrationRecoverySpeed(v: number) { this.character.SetPenetrationRecoverySpeed(v) };

  private _stickToFloorStepDown = new Vector3();
  get stickToFloorStepDown(): Vector3 { return GetJoltVec3(this.updateSettings.mStickToFloorStepDown, this._stickToFloorStepDown); }
  set stickToFloorStepDown(v: Vector3) { this._stickToFloorStepDown.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mStickToFloorStepDown); }

  private _walkStairsStepUp = new Vector3();
  get walkStairsStepUp(): Vector3 { return GetJoltVec3(this.updateSettings.mWalkStairsStepUp, this._walkStairsStepUp); }
  set walkStairsStepUp(v: Vector3) { this._walkStairsStepUp.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mWalkStairsStepUp); }
}