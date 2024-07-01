import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltJSPlugin } from "../jolt-physics";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { BuoyancyInterface } from "./type";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";

export class BuoyancyUtility {
  private static _instance?: BuoyancyUtility;
  private _impostors: PhysicsImpostor[] = [];

  constructor(private plugin: JoltJSPlugin) { /* */ }

  static getInstance(plugin: JoltJSPlugin): BuoyancyUtility {
    let instance = this._instance;
    if (!instance) {
      instance = this._instance = new BuoyancyUtility(plugin);
      plugin.registerPerPhysicsStepCallback(instance.onPhysicsStep.bind(instance))
    }
    return instance;
  }

  private _bounding: BoundingInfo = new BoundingInfo(Vector3.ZeroReadOnly, Vector3.ZeroReadOnly);

  onPhysicsStep(delta: number): void {
    this._impostors.forEach(impostor => {
      const buoyancy = impostor.joltPluginData.buoyancy;
      const body: Jolt.Body = impostor.physicsBody;
      if (buoyancy && body.IsActive()) {
        const impulse = buoyancy.getBuoyancyImpulse(impostor, () => {
          const bounding = this._bounding.centerOn(Vector3.ZeroReadOnly, impostor.getObjectExtents().scale(0.5));
          bounding.update(impostor.object.computeWorldMatrix(false));
          return bounding;
        })
        if(impulse) {
          this.plugin.applyBuoyancyImpulse(impostor, impulse, delta);
        }
      }
    })
  }

  registerBuoyancy(impostor: PhysicsImpostor, buoyancy: BuoyancyInterface) {
    impostor.joltPluginData.buoyancy = buoyancy;
    this._impostors.push(impostor);
  }

  unregisterBuoyancy(impostor: PhysicsImpostor) {
    this._impostors.slice(this._impostors.indexOf(impostor), 1);
    impostor.joltPluginData.buoyancy = undefined;
  }
}