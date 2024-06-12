
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import '../jolt-impostor';
import { JoltJSPlugin } from "../jolt-physics";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GetJoltVec3 } from "../jolt-util";
import Jolt from "../jolt-import";
import { GravityInterface } from "./types";

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

  private _gravityForce = new Vector3();
  private _bodyCoM = new Vector3();
  onPhysicsStep(_delta: number): void {
    this._impostors.forEach(impostor => {
      const gravity = impostor.joltPluginData.gravity;
      const body: Jolt.Body = impostor.physicsBody;
      if(gravity && body.IsActive() ) {
        this._gravityForce.copyFrom(gravity.getGravity(() => {
          return GetJoltVec3(body.GetCenterOfMassPosition(), this._bodyCoM);
        }));
        this._gravityForce.scaleInPlace(impostor.joltPluginData.mass);
        impostor.applyForce(this._gravityForce);
      }
    })
  }

  registerGravityOverride(impostor: PhysicsImpostor, gravity: GravityInterface) {
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