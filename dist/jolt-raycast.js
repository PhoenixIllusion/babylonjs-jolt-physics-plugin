import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3, LAYER_MOVING } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
export class RayCastUtility {
    constructor(jolt) {
        this._raycastResult = new PhysicsRaycastResult();
        this._ray_settings = new Jolt.RayCastSettings();
        this._ray_collector = new Jolt.CastRayCollectorJS();
        this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), LAYER_MOVING);
        this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), LAYER_MOVING);
        this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
        this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes
        this._ray = new Jolt.RRayCast();
    }
    raycast(from, to) {
        this.raycastToRef(from, to, this._raycastResult);
        return this._raycastResult;
    }
    raycastToRef(from, to, result) {
        const delta = to.subtract(from);
        SetJoltVec3(from, this._ray.mOrigin);
        SetJoltVec3(delta, this._ray.mDirection);
        let body;
        const closestResult = {
            mFraction: 1.01,
            hitPoint: new Vector3(),
            hitNormal: new Vector3()
        };
        this._ray_collector.OnBody = (inBody) => {
            body = Jolt.wrapPointer(inBody, Jolt.Body);
        };
        this._ray_collector.AddHit = (inRayCastResult) => {
            inRayCastResult = Jolt.wrapPointer(inRayCastResult, Jolt.RayCastResult);
            if (inRayCastResult.mFraction <= closestResult.mFraction && inRayCastResult.mFraction <= 1.0) {
                closestResult.mFraction = inRayCastResult.mFraction;
                let hitPoint = this._ray.GetPointOnRay(inRayCastResult.mFraction);
                GetJoltVec3(hitPoint, closestResult.hitPoint);
                let hitNormal = body.GetWorldSpaceSurfaceNormal(inRayCastResult.mSubShapeID2, hitPoint);
                GetJoltVec3(hitNormal, closestResult.hitNormal);
            }
        };
        result.reset(from, to);
        if (closestResult.mFraction <= 1.0) {
            result.setHitData(closestResult.hitPoint, closestResult.hitNormal);
            result.calculateHitDistance();
        }
    }
    dispose() {
        Jolt.destroy(this._ray_settings);
        Jolt.destroy(this._ray_collector);
        Jolt.destroy(this._ray);
        Jolt.destroy(this._bp_filter);
        Jolt.destroy(this._object_filter);
        Jolt.destroy(this._body_filter);
        Jolt.destroy(this._shape_filter);
    }
}
