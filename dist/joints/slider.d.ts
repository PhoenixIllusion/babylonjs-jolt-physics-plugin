import { MotorControl } from "./motor";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SliderConstraintParams } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
export declare class JoltSliderJoint extends JoltJoint<SliderConstraintParams, Jolt.SliderConstraint> {
    motor: MotorControl;
    constructor(point1: Vector3, slideAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, slide2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
