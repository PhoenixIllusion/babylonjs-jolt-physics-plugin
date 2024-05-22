import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { RackAndPinionConstraintParams } from "../constraints/types";
import { JoltHingeJoint, JoltSliderJoint } from ".";

export class JoltRackAndPinionConstraint extends JoltJoint<RackAndPinionConstraintParams, Jolt.RackAndPinionConstraint> {

  constructor(hingeAxis: Vector3, sliderAxis: Vector3, ratio: number = 1, space: 'Local' | 'World' = 'World') {

    const constraint: RackAndPinionConstraintParams = {
      space,
      hingeAxis1: f3(hingeAxis),
      sliderAxis2: f3(sliderAxis),
      ratio,
      type: "RackAndPinion"
    };
    super(PhysicsJoint.BallAndSocketJoint, { nativeParams: { constraint } })
  }

  setJointHint(rack: JoltHingeJoint, pinion: JoltSliderJoint) {
    if (this.constraint && rack.constraint && pinion.constraint) {
      this.constraint.SetConstraints(rack.constraint, pinion.constraint);
    } else {
      throw new Error('Attempted to configure RackAndPinion SetConstraints with uninitialized constraints')
    }
  }
}