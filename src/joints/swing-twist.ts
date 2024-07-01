import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { GetMode, MotorControl } from "./motor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SwingTwistConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { SetJoltQuat, SetJoltVec3, f3 } from "../jolt-util";

export class JoltSwingTwistJoint extends JoltJoint<SwingTwistConstraintParams, Jolt.SwingTwistConstraint> {

  public twistMotor: MotorControl;
  public swingMotor: MotorControl;

  constructor(point1: Vector3, twistAxis: Vector3, planeAxis: Vector3, space: 'Local' | 'World' = 'World',
    point2?: Vector3, twist2Axis?: Vector3, plane2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const t1 = twistAxis;
    const t2 = twist2Axis ?? t1;
    const pl1 = planeAxis;
    const pl2 = plane2Axis ?? pl1;

    const constraint: SwingTwistConstraintParams = {
      space,
      swingType: 'Cone',
      point1: f3(p1),
      point2: f3(p2),
      twistAxis1: f3(t1),
      twistAxis2: f3(t2),
      planeAxis1: f3(pl1),
      planeAxis2: f3(pl2),
      twistMinAngle: -Math.PI,
      twistMaxAngle: Math.PI,
      maxFrictionTorque: 0,
      planeHalfConeAngle: Math.PI,
      normalHalfConeAngle: Math.PI,
      type: "SwingTwist"
    }
    super(PhysicsJoint.HingeJoint, {
      nativeParams: {
        constraint
      }
    })
    this.twistMotor = new MotorControl((mode) => {
      if (this.constraint) {
        this.constraint.SetTwistMotorState(GetMode(mode));
      }
    }, (_mode, _value) => { }, () => this.constraint!.GetTwistMotorSettings());
    this.swingMotor = new MotorControl((mode) => {
      if (this.constraint) {
        this.constraint.SetSwingMotorState(GetMode(mode));
      }
    }, (_mode, _value) => { }, () => this.constraint!.GetSwingMotorSettings());
  }

  setTargetAngularVelocity(inVelocity: Vector3) {
    if (this.constraint) {
      const velocity = this.constraint.GetTargetAngularVelocityCS();
      SetJoltVec3(inVelocity, velocity);
      this.constraint.SetTargetAngularVelocityCS(velocity);
    }
  }

  setTargetRotation(inOrientation: Quaternion) {
    if (this.constraint) {
      const quat = this.constraint.GetTargetOrientationCS();
      SetJoltQuat(inOrientation, quat);
      this.constraint.SetTargetOrientationCS(quat);
    }
  }

  setTwistMinMax(minAngle: number, maxAngle: number) {
    this.getParams().twistMinAngle = minAngle;
    this.getParams().twistMaxAngle = maxAngle;
    if (this.constraint) {
      this.constraint.SetTwistMinAngle(minAngle);
      this.constraint.SetTwistMaxAngle(maxAngle);
    }
  }
  setHalfConeAngles(planeHalfConeAngle: number, normalHalfConeAngle: number) {
    this.getParams().planeHalfConeAngle = planeHalfConeAngle;
    this.getParams().normalHalfConeAngle = normalHalfConeAngle;
    if (this.constraint) {
      this.constraint.SetPlaneHalfConeAngle(planeHalfConeAngle);
      this.constraint.SetNormalHalfConeAngle(normalHalfConeAngle);
    }
  }
}