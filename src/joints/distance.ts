import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { DistanceConstraintParams } from "../constraints/types";

export class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams, Jolt.DistanceConstraint> {
  constructor(point1: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: DistanceConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      minDistance: -1,
      maxDistance: -1,
      type: "Distance"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }

  setMinMax(minVal: number, maxVal: number) {
    this.getParams().minDistance = minVal;
    this.getParams().maxDistance = maxVal;
    if (this.constraint) {
      this.constraint.SetDistance(minVal, maxVal);
    }
  }
}