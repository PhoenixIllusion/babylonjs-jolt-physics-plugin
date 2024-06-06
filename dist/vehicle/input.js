import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GetJoltQuat, GetJoltVec3 } from "../jolt-util";
export class DefaultVehicleInput {
    constructor(body) {
        this.body = body;
        this.input = { forward: 0, right: 0, handBrake: false, brake: false };
        this._linearV = new Vector3();
        this._rotationQ = new Quaternion();
        this.bodyId = body.GetID();
    }
    getVelocity() {
        GetJoltVec3(this.body.GetLinearVelocity(), this._linearV);
        GetJoltQuat(this.body.GetRotation().Conjugated(), this._rotationQ);
        return this._linearV.applyRotationQuaternion(this._rotationQ).z;
    }
}
