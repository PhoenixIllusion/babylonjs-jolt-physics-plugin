import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { float } from "@babylonjs/core/types";
export interface BuoyancyImpulse {
    surfacePosition: Vector3;
    surfaceNormal?: Vector3;
    buoyancy: float;
    linearDrag: float;
    angularDrag: float;
    fluidVelocity?: Vector3;
    gravity?: Vector3;
}
export interface BuoyancyInterface {
    getBuoyancyImpulse(impostor: PhysicsImpostor, getBoundingInfo: () => BoundingInfo): BuoyancyImpulse | null;
}
