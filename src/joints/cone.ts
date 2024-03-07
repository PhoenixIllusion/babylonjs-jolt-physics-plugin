import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { ConeConstraintParams } from "../constraints/types";

export class JoltConeJoint extends JoltJoint<ConeConstraintParams, Jolt.ConeConstraint>  {

  constructor(point1: Vector3, twistAxis: Vector3, halfCone: number = 0,  space: 'Local' | 'World' = 'World', point2?: Vector3, twistAxis2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const t1 = twistAxis;
    const t2 = twistAxis2 ?? t1;

    const constraint: ConeConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      twistAxis1: f3(t1),
      twistAxis2: f3(t2),
      halfConeAngle: halfCone,
      type: "Cone"
    };
    super(PhysicsJoint.BallAndSocketJoint, {nativeParams: { constraint }})
  }

  setMax( maxAngle: number) {
    this.getParams().halfConeAngle = maxAngle;
    if (this.constraint) {
      this.constraint.SetHalfConeAngle(maxAngle);
    }
  }
}