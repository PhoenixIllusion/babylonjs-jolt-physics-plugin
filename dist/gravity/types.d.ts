import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
export interface GravityInterface {
    getGravity(impostor: PhysicsImpostor, getCenterOfMass: () => Vector3): Vector3;
}
