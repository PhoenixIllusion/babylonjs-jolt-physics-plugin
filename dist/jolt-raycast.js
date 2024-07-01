import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3, LAYER_MOVING, SetJoltRVec3 } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { getObjectLayer } from './jolt-collision';
export class RayCastUtility {
    constructor(jolt, plugin, settings) {
        this.jolt = jolt;
        this.plugin = plugin;
        this.settings = settings;
        this.toDispose = [];
        this.point = new Vector3();
        this.normal = new Vector3();
        this._prevQuery = [LAYER_MOVING, -1];
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
    raycast(from, to, query) {
        this.raycastToRef(from, to, this._raycastResult, query);
        return this._raycastResult;
    }
    raycastToRef(from, to, result, query) {
        if (query && query.membership !== undefined) {
            const layer = query.membership;
            const mask = query.collideWith || 0xffffff;
            const [pLayer, pMask] = this._prevQuery;
            if (pLayer != layer || pMask != mask) {
                const newLayer = getObjectLayer(layer, mask, this.settings);
                Jolt.destroy(this._bp_filter);
                Jolt.destroy(this._object_filter);
                this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(this.jolt.GetObjectVsBroadPhaseLayerFilter(), newLayer);
                this._object_filter = new Jolt.DefaultObjectLayerFilter(this.jolt.GetObjectLayerPairFilter(), newLayer);
                this._prevQuery = [layer, mask];
            }
        }
        const delta = to.subtract(from);
        SetJoltRVec3(from, this._ray.mOrigin);
        SetJoltVec3(delta, this._ray.mDirection);
        this._ray_collector.Reset();
        this.plugin.world.GetNarrowPhaseQuery().CastRay(this._ray, this._ray_settings, this._ray_collector, this._bp_filter, this._object_filter, this._body_filter, this._shape_filter);
        result.reset(from, to);
        if (this._ray_collector.HadHit()) {
            const hit = this._ray_collector.mHit;
            const body = this.plugin.GetImpostorForBodyId(hit.mBodyID.GetIndexAndSequenceNumber()).physicsBody;
            result.body = body;
            const hitPoint = this._ray.GetPointOnRay(hit.mFraction);
            const hitNormal = body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, hitPoint);
            const point = GetJoltVec3(hitPoint, this.point);
            const normal = GetJoltVec3(hitNormal, this.normal);
            result.setHitData(point, normal);
            result.calculateHitDistance();
        }
        return result;
    }
    dispose() {
        this.toDispose.forEach(joltObj => {
            Jolt.destroy(joltObj);
        });
        Jolt.destroy(this._bp_filter);
        Jolt.destroy(this._object_filter);
    }
}
