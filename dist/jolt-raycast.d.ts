import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { Vector3 } from '@babylonjs/core/Maths/math';
export declare class RayCastUtility {
    private _raycastResult;
    private _ray_settings;
    private _ray;
    private _ray_collector;
    private _bp_filter;
    private _object_filter;
    private _body_filter;
    private _shape_filter;
    constructor(jolt: Jolt.JoltInterface);
    raycast(from: Vector3, to: Vector3): PhysicsRaycastResult;
    raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void;
    dispose(): void;
}
