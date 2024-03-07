import { MotorControl } from "./motor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PathConstraintParams, RotationConstraintType } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import { float } from "@babylonjs/core/types";
export declare class JoltPathConstraint extends JoltJoint<PathConstraintParams, Jolt.PathConstraint> {
    motor: MotorControl;
    constructor(points: Path3D, type?: RotationConstraintType);
    setPathNormals(normal: Vector3 | Vector3[]): void;
    setPathOffset(position: Vector3, rotation: Quaternion): void;
    setPathStartPosition(val: Vector3): void;
    setPathFraction(val: float): void;
}
