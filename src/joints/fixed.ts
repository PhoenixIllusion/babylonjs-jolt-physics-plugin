import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { FixedConstraintParams } from "../constraints/types";

export class JoltFixedJoint extends JoltJoint<FixedConstraintParams, Jolt.Constraint> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: FixedConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      axisx1: [1, 0, 0],
      axisy1: [0, 1, 0],
      axisx2: [1, 0, 0],
      axisy2: [0, 1, 0],
      type: "Fixed"
    }
    super(PhysicsJoint.LockJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}