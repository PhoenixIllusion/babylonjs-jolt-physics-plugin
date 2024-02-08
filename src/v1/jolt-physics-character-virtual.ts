import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { JoltCharacterVirtual } from "../jolt-physics-character-virtual";

export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
  constructor(
    object: IPhysicsEnabledObject,
    type: number,
    _options: PhysicsImpostorParameters,
    _scene?: Scene
  ) {
    super(object, type, _options, _scene);

  }
  public get controller(): JoltCharacterVirtual<PhysicsImpostor> {
    return this._pluginData.controller;
  }
  public set controller(controller: JoltCharacterVirtual<PhysicsImpostor>) {
    this._pluginData.controller = controller;
  }
}