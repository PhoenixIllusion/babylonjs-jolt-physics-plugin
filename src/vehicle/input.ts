import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { GetJoltQuat, GetJoltVec3 } from "../jolt-util";

export interface VehicleInputState {
  forward: number;
  right: number;
  brake: boolean;
  handBrake: boolean
}

export interface BaseVehicleInput<T extends Jolt.VehicleController> {
  onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: T, deltaTime: number): void;
}

export class DefaultVehicleInput {
  public input: VehicleInputState = { forward: 0, right: 0, handBrake: false, brake: false };
  protected bodyId: Jolt.BodyID;

  constructor(protected body: Jolt.Body) {
    this.bodyId = body.GetID();
  }

  private _linearV: Vector3 = new Vector3();
  private _rotationQ: Quaternion = new Quaternion();

  getVelocity(): number {
    GetJoltVec3(this.body.GetLinearVelocity(), this._linearV);
    GetJoltQuat(this.body.GetRotation().Conjugated(), this._rotationQ);
    return this._linearV.applyRotationQuaternion(this._rotationQ).z;
  }
}