
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import './jolt-impostor';
import { JoltJSPlugin } from "./jolt-physics";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class GravityUtility {
  private static _instance?: GravityUtility;
  private _impostors: PhysicsImpostor[] = [];

  static getInstance(plugin: JoltJSPlugin): GravityUtility {
    let instance = this._instance;
    if(!instance) {
      instance = this._instance = new GravityUtility();
      plugin.registerPerPhysicsStepCallback(instance.onPhysicsStep.bind(instance))
    }
    return instance;
  }

  gravityForce = new Vector3();
  onPhysicsStep(_delta: number): void {
    this._impostors.forEach(impostor => {
      const gravity = impostor.joltPluginData.gravity;
      if(gravity) {
        gravity.scaleToRef(impostor.joltPluginData.mass, this.gravityForce);
        impostor.applyForce(this.gravityForce);
      }
    })
  }

  registerGravityOverride(impostor: PhysicsImpostor, gravity: Vector3) {
    impostor.joltPluginData.gravity = gravity;
    impostor.setGravityFactor(0);
    this._impostors.push(impostor);
  }

  unregisterGravityOverride(impostor: PhysicsImpostor) {
    this._impostors.slice(this._impostors.indexOf(impostor),1);
    impostor.setGravityFactor(1);
    impostor.joltPluginData.gravity = undefined;
  }
}