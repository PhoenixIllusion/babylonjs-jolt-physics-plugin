import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3, LAYER_MOVING, SetJoltRVec3 } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
export class RayCastUtility {
    constructor(jolt, plugin) {
        this.plugin = plugin;
        this.toDispose = [];
        this.point = new Vector3();
        this.normal = new Vector3();
        this._raycastResult = new PhysicsRaycastResult();
        this._ray_settings = new Jolt.RayCastSettings();
        this._ray_collector = new Jolt.CastRayClosestHitCollisionCollector();
        this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), LAYER_MOVING);
        this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), LAYER_MOVING);
        this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
        this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes
        this._ray = new Jolt.RRayCast();
        this.toDispose.push(this._ray_settings, this._ray_collector, this._bp_filter, this._object_filter, this._body_filter, this._shape_filter, this._ray);
    }
    raycast(from, to) {
        this.raycastToRef(from, to, this._raycastResult);
        return this._raycastResult;
    }
    raycastToRef(from, to, result) {
        const delta = to.subtract(from);
        SetJoltRVec3(from, this._ray.mOrigin);
        SetJoltVec3(delta, this._ray.mDirection);
        this._ray_collector.Reset();
        this.plugin.world.GetNarrowPhaseQuery().CastRay(this._ray, this._ray_settings, this._ray_collector, this._bp_filter, this._object_filter, this._body_filter, this._shape_filter);
        result.reset(from, to);
        if (this._ray_collector.HadHit()) {
            const hit = this._ray_collector.mHit;
            const body = this.plugin.GetBodyForBodyId(hit.mBodyID.GetIndexAndSequenceNumber());
            const hitPoint = this._ray.GetPointOnRay(hit.mFraction);
            const hitNormal = body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, hitPoint);
            const point = GetJoltVec3(hitPoint, this.point);
            const normal = GetJoltVec3(hitNormal, this.normal);
            result.body = this.plugin.GetPhysicsBodyForBodyId(hit.mBodyID.GetIndexAndSequenceNumber());
            result.setHitData(point, normal);
            result.calculateHitDistance();
        }
    }
    dispose() {
        this.toDispose.forEach(joltObj => {
            Jolt.destroy(joltObj);
        });
    }
}
