import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { PointConstraintParams } from "../constraints/types";

export class JoltPointJoint extends JoltJoint<PointConstraintParams, Jolt.PointConstraint> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: PointConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      type: "Point"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}
