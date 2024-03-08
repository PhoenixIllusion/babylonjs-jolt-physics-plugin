import { MotorControl } from "./motor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SwingTwistConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
export declare class JoltSwingTwistJoint extends JoltJoint<SwingTwistConstraintParams, Jolt.SwingTwistConstraint> {
    twistMotor: MotorControl;
    swingMotor: MotorControl;
    constructor(point1: Vector3, twistAxis: Vector3, planeAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, twist2Axis?: Vector3, plane2Axis?: Vector3);
    setTargetAngularVelocity(inVelocity: Vector3): void;
    setTargetRotation(inOrientation: Quaternion): void;
    setTwistMinMax(minAngle: number, maxAngle: number): void;
    setHalfConeAngles(planeHalfConeAngle: number, normalHalfConeAngle: number): void;
}
