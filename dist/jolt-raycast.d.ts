import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { JoltJSPlugin } from './jolt-physics';
export declare class RayCastUtility {
    private plugin;
    private _raycastResult;
    private _ray_settings;
    private _ray;
    private _ray_collector;
    private _bp_filter;
    private _object_filter;
    private _body_filter;
    private _shape_filter;
    private toDispose;
    point: Vector3;
    normal: Vector3;
    constructor(jolt: Jolt.JoltInterface, plugin: JoltJSPlugin);
    raycast(from: Vector3, to: Vector3): PhysicsRaycastResult;
    raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void;
    dispose(): void;
}
