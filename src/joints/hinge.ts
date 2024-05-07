import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { GetMode, MotorControl, MotorMode } from "./motor";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HingeConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3 } from "../jolt-util";
import { SpringControl } from "./spring";

export class JoltHingeJoint extends JoltJoint<HingeConstraintParams, Jolt.HingeConstraint>  {
  public motor: MotorControl;
  public spring: SpringControl<HingeConstraintParams, Jolt.HingeConstraint>;

  constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space: 'Local' | 'World' = 'World',
    point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const h1 = hingeAxis;
    const h2 = hinge2Axis ?? h1;
    const n1 = normalAxis;
    const n2 = normal2Axis ?? n1;

    const constraint: HingeConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      hingeAxis1: f3(h1),
      hingeAxis2: f3(h2),
      normalAxis1: f3(n1),
      normalAxis2: f3(n2),
      limitsMin: -Math.PI,
      limitsMax: Math.PI,
      maxFrictionTorque: 0,
      type: "Hinge"
    }
    super(PhysicsJoint.HingeJoint, {
      nativeParams: {
        constraint
      }
    });
    this.spring = new SpringControl(this);
    this.motor = new MotorControl((mode) => {
      if (this.constraint) {
        this.constraint.SetMotorState(GetMode(mode));
      }
    }, (mode, value) => {
      if (this.constraint) {
        if (mode == MotorMode.Position) {
          this.constraint.SetTargetAngle(value);
        }
        if (mode == MotorMode.Velocity) {
          this.constraint.SetTargetAngularVelocity(value);
        }
        this.activate();
      }
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.getParams().limitsMin = minAngle;
    this.getParams().limitsMax = maxAngle;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.HingeConstraint;
      joint.SetLimits(minAngle, maxAngle);
    }
  }
}