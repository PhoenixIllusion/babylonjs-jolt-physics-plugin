import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { GetMode, MotorControl, MotorMode } from "./motor";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SliderConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";

export class JoltSliderJoint extends JoltJoint<SliderConstraintParams, Jolt.SliderConstraint>  {

  public motor: MotorControl;

  constructor(point1: Vector3, slideAxis: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3, slide2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const s1 = slideAxis;
    const s2 = slide2Axis ?? s1;
    const n1 = new Vector3();
    s1.getNormalToRef(n1);
    const n2 = new Vector3();
    s2.getNormalToRef(n2);

    const constraint: SliderConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      sliderAxis1: f3(s1),
      sliderAxis2: f3(s2),
      normalAxis1: f3(n1),
      normalAxis2: f3(n2),
      limitsMin: Number.MIN_SAFE_INTEGER,
      limitsMax: Number.MAX_SAFE_INTEGER,
      type: "Slider",
      maxFrictionForce: 0
    }
    super(PhysicsJoint.PrismaticJoint, {
      nativeParams: {
        constraint
      }
    })
    this.motor = new MotorControl((mode) => {
      if (this.constraint) {
        this.constraint.SetMotorState(GetMode(mode));
      }
    }, (mode, value) => {
      if (this.constraint) {
        if (mode == MotorMode.Position) {
          this.constraint.SetTargetPosition(value);
        }
        if (mode == MotorMode.Velocity) {
          this.constraint.SetTargetVelocity(value);
        }
      }
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.getParams().limitsMin = minAngle;
    this.getParams().limitsMax = maxAngle;
    if (this.constraint) {
      this.constraint.SetLimits(minAngle, maxAngle);
    }
  }
}