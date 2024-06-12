import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface GravityInterface {
  getGravity(getCenterOfMass: ()=>Vector3): Vector3;
}