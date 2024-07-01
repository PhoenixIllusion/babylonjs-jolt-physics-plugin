import { Plane } from "@babylonjs/core/Maths/math.plane";
import { BuoyancyImpulse, BuoyancyInterface } from "./type";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export declare class BuoyancyPlane implements BuoyancyInterface {
    private plane;
    buoyancy: number;
    linearDrag: number;
    angularDrag: number;
    fluidVelocity: Vector3;
    surfacePosition: Vector3;
    constructor(plane: Plane);
    static FromPosition(position: Vector3, normal?: import("@babylonjs/core/types").DeepImmutableObject<Vector3>): BuoyancyPlane;
    getBuoyancyImpulse(_impostor: PhysicsImpostor, _getBoundingInfo: () => BoundingInfo): BuoyancyImpulse | null;
}
export declare class BuoyancyAggregate implements BuoyancyInterface {
    regionInterface: Map<BoundingInfo, BuoyancyInterface>;
    constructor();
    addRegion(bounds: BoundingInfo, buoyancy: BuoyancyInterface): void;
    removeRegion(bounds: BoundingInfo): void;
    getBuoyancyImpulse(impostor: PhysicsImpostor, getBoundingInfo: () => BoundingInfo): BuoyancyImpulse | null;
}
