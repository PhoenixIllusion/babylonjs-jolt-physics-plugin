
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3, LAYER_MOVING } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class RayCastUtility {

  private _physicsSystem: Jolt.PhysicsSystem;
  private _raycastResult: PhysicsRaycastResult;
  private _ray_settings: Jolt.RayCastSettings;
  private _ray: Jolt.RRayCast;
  private _ray_collector: Jolt.CastRayCollectorJS;

  private _bp_filter: Jolt.DefaultBroadPhaseLayerFilter;
  private _object_filter: Jolt.DefaultObjectLayerFilter;
  private _body_filter: Jolt.BodyFilter;
  private _shape_filter: Jolt.ShapeFilter;

  private toDispose: any[] = [];


  constructor(jolt: Jolt.JoltInterface) {
    this._physicsSystem = jolt.GetPhysicsSystem();
    this._raycastResult = new PhysicsRaycastResult();
    this._ray_settings = new Jolt.RayCastSettings();
    this._ray_collector = new Jolt.CastRayCollectorJS();

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

  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    this.raycastToRef(from, to, this._raycastResult);
    return this._raycastResult;
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    const delta = to.subtract(from);
    SetJoltVec3(from, this._ray.mOrigin);
    SetJoltVec3(delta, this._ray.mDirection);

    let body: Jolt.Body;

    const closestResult = {
      mFraction: 1.01,
      hitPoint: new Vector3(),
      hitNormal: new Vector3()
    }
    this._ray_collector.OnBody = (inBody: Jolt.Body) => {
      body = Jolt.wrapPointer(inBody as any as number, Jolt.Body);
    }
    this._ray_collector.AddHit = (inRayCastResult: Jolt.RayCastResult) => {
      inRayCastResult = Jolt.wrapPointer(inRayCastResult as any as number, Jolt.RayCastResult);
      if (inRayCastResult.mFraction <= closestResult.mFraction && inRayCastResult.mFraction <= 1.0) {
        closestResult.mFraction = inRayCastResult.mFraction;

        let hitPoint = this._ray.GetPointOnRay(inRayCastResult.mFraction);
        GetJoltVec3(hitPoint, closestResult.hitPoint)
        let hitNormal = body.GetWorldSpaceSurfaceNormal(inRayCastResult.mSubShapeID2, hitPoint);
        GetJoltVec3(hitNormal, closestResult.hitNormal)
      }
    }

    this._physicsSystem.GetNarrowPhaseQuery().CastRay(
      this._ray, this._ray_settings,
      this._ray_collector as any, this._bp_filter, this._object_filter,
      this._body_filter, this._shape_filter);
    result.reset(from, to);
    if (closestResult.mFraction <= 1.0) {
      result.setHitData(closestResult.hitPoint, closestResult.hitNormal);
      result.calculateHitDistance();
    }
  }

  public dispose() {
    this.toDispose.forEach(joltObj => {
      Jolt.destroy(joltObj);
    });
  }
}