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

export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
  _pluginData!: JoltCharacterVirtualPluginData;

  constructor(
    object: IPhysicsEnabledObject,
    type: number,
    _options: CharacterVirtualImpostorParameters,
    _scene?: Scene
  ) {
    super(object, type, _options, _scene);
  }

  getParam(param: string): any {
    super.getParam(param);
  }

  public get controller(): JoltCharacterVirtual {
    return this._pluginData.controller;
  }
  public set controller(controller: JoltCharacterVirtual) {
    this._pluginData.controller = controller;
  }
}

type CharacterVirtualNumberParam = 'maxSlopeAngle' | 'maxStrength' | 'characterPadding' | 'penetrationRecoverySpeed' | 'predictiveContactDistance';
type CharacterVirtualBooleanParam = 'enableWalkStairs' | 'enableStickToFloor';

export interface JoltCharacterVirtualImpostor {
  getParam(param: CharacterVirtualNumberParam): number | undefined;
  getParam(param: CharacterVirtualBooleanParam): boolean | undefined;
}
