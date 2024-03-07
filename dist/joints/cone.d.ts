import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { ConeConstraintParams } from "../constraints/types";
export declare class JoltConeJoint extends JoltJoint<ConeConstraintParams, Jolt.ConeConstraint> {
    constructor(point1: Vector3, twistAxis: Vector3, halfCone?: number, space?: 'Local' | 'World', point2?: Vector3, twistAxis2?: Vector3);
    setMax(maxAngle: number): void;
}
