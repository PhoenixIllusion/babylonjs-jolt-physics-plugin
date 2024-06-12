import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export class GravityVector {
    constructor(gravity) {
        this.gravity = gravity;
    }
    getGravity(_getCenterOfMass) {
        return this.gravity;
    }
}
export class GravityPoint {
    constructor(point, magnitude) {
        this.point = point;
        this.magnitude = magnitude;
        this._gravity = new Vector3();
    }
    getGravity(getCenterOfMass) {
        return this.point.subtractToRef(getCenterOfMass(), this._gravity).normalize().scaleInPlace(this.magnitude);
    }
}
