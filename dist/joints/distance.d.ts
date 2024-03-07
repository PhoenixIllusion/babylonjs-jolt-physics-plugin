import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { DistanceConstraintParams } from "../constraints/types";
export declare class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams, Jolt.DistanceConstraint> {
    constructor(point1: Vector3, space?: 'Local' | 'World', point2?: Vector3);
    setMinMax(minVal: number, maxVal: number): void;
}
