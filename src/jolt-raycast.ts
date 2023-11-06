
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import Jolt from './jolt-import';
import { SetJoltVec3, GetJoltVec3 } from './jolt-util';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class RayCastUtility {

  private _raycastResult: PhysicsRaycastResult;
  private _ray_settings: Jolt.RayCastSettings;
  private _ray: Jolt.RRayCast;
  private _ray_collector: Jolt.CastRayCollectorJS;

  private _bp_filter: Jolt.DefaultBroadPhaseLayerFilter;
  private _object_filter: Jolt.DefaultObjectLayerFilter;
  private _body_filter: Jolt.BodyFilter;
  private _shape_filter: Jolt.ShapeFilter;

  constructor(jolt: Jolt.JoltInterface) {
    this._raycastResult = new PhysicsRaycastResult();
    this._ray_settings = new Jolt.RayCastSettings();
    this._ray_collector = new Jolt.CastRayCollectorJS();

    this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), Jolt.MOVING);
    this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), Jolt.MOVING);
    this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
    this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes

    this._ray = new Jolt.RRayCast();
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
    result.reset(from, to);
    if (closestResult.mFraction <= 1.0) {
      result.setHitData(closestResult.hitPoint, closestResult.hitNormal);
      result.calculateHitDistance();
    }
  }

  public dispose() {
    Jolt.destroy(this._raycastResult);
    Jolt.destroy(this._ray_settings);
    Jolt.destroy(this._ray_collector);

    Jolt.destroy(this._bp_filter);
    Jolt.destroy(this._object_filter);
    Jolt.destroy(this._body_filter);
    Jolt.destroy(this._shape_filter);
  }
}