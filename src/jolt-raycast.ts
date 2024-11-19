
import { IRaycastQuery, PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3, LAYER_MOVING } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { JoltJSPlugin, PhysicsSettings } from './jolt-physics';
import { getObjectLayer } from './jolt-collision';

export class RayCastUtility {

  private _raycastResult: PhysicsRaycastResult;
  private _ray_settings: Jolt.RayCastSettings;
  private _ray: Jolt.RRayCast;
  private _ray_collector: Jolt.CastRayClosestHitCollisionCollector;

  private _bp_filter: Jolt.DefaultBroadPhaseLayerFilter;
  private _object_filter: Jolt.DefaultObjectLayerFilter;
  private _body_filter: Jolt.BodyFilter;
  private _shape_filter: Jolt.ShapeFilter;

  private toDispose: any[] = [];


  point = new Vector3();
  normal = new Vector3();

  private _prevQuery = [LAYER_MOVING, -1]

  constructor(private jolt: Jolt.JoltInterface, private plugin: JoltJSPlugin, private settings?: PhysicsSettings) {
    this._raycastResult = new PhysicsRaycastResult();
    this._ray_settings = new Jolt.RayCastSettings();
    this._ray_collector = new Jolt.CastRayClosestHitCollisionCollector();

    this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), LAYER_MOVING);
    this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), LAYER_MOVING);
    this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
    this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes

    this._ray = new Jolt.RRayCast();

    this.toDispose.push(
      this._ray_settings, this._ray_collector,
      this._bp_filter, this._object_filter,
      this._body_filter, this._shape_filter,
      this._ray)
  }

  raycast(from: Vector3, to: Vector3, query?: IRaycastQuery): PhysicsRaycastResult {
    this.raycastToRef(from, to, this._raycastResult, query);
    return this._raycastResult;
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult, query?: IRaycastQuery): PhysicsRaycastResult {
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
    SetJoltVec3(from, this._ray.mOrigin);
    SetJoltVec3(delta, this._ray.mDirection);
    this._ray_collector.Reset();
    this.plugin.world.GetNarrowPhaseQuery().CastRay(
      this._ray, this._ray_settings,
      this._ray_collector as any, this._bp_filter, this._object_filter,
      this._body_filter, this._shape_filter);

    result.reset(from, to);

    if (this._ray_collector.HadHit()) {
      const hit = this._ray_collector.mHit;
      const body: Jolt.Body = this.plugin.GetImpostorForBodyId(hit.mBodyID.GetIndexAndSequenceNumber()).physicsBody;
      result.body = body as any;
      const hitPoint = this._ray.GetPointOnRay(hit.mFraction);
      const hitNormal = body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, hitPoint);
      const point = GetJoltVec3(hitPoint, this.point)
      const normal = GetJoltVec3(hitNormal, this.normal)
      result.setHitData(point, normal)
      result.calculateHitDistance();
    }
    return result;
  }

  public dispose() {
    this.toDispose.forEach(joltObj => {
      Jolt.destroy(joltObj);
    });
    Jolt.destroy(this._bp_filter);
    Jolt.destroy(this._object_filter);
  }
}