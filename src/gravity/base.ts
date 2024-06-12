import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GravityInterface } from "./types";

export class GravityVector implements GravityInterface {
  constructor(public gravity: Vector3) { /* do nothing */}

  getGravity(_getCenterOfMass: ()=>Vector3): Vector3{
    return this.gravity;
  }
}

export class GravityPoint implements GravityInterface {
  private _gravity = new Vector3();
  constructor(public point: Vector3, public magnitude: number) { /* do nothing */}

  getGravity(getCenterOfMass: ()=>Vector3): Vector3{
    return this.point.subtractToRef(getCenterOfMass(), this._gravity).normalize().scaleInPlace(this.magnitude);
  }
}