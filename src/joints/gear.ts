import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { GearConstraintParams } from "../constraints/types";
import { JoltHingeJoint } from ".";

export class JoltGearConstraint extends JoltJoint<GearConstraintParams, Jolt.GearConstraint>  {

  constructor(hingeAxis1: Vector3, hingeAxis2: Vector3, ratio: number = 1,  space: 'Local' | 'World' = 'World') {

    const constraint: GearConstraintParams = {
      space,
      hingeAxis1: f3(hingeAxis1),
      hingeAxis2: f3(hingeAxis2),
      ratio,
      type: "Gear"
    };
    super(PhysicsJoint.BallAndSocketJoint, {nativeParams: { constraint }})
  }

  setJointHint( gear1: JoltHingeJoint, gear2: JoltHingeJoint) {
    if (this.constraint && gear1.constraint && gear2.constraint) {
      this.constraint.SetConstraints(gear1.constraint, gear2.constraint);
    } else {
      throw new Error('Attempted to configure gear SetConstraints with uninitialized constraints')
    }
  }
}