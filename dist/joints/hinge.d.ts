import { MotorControl } from "./motor";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HingeConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
export declare class JoltHingeJoint extends JoltJoint<HingeConstraintParams, Jolt.HingeConstraint> {
    motor: MotorControl;
    constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
