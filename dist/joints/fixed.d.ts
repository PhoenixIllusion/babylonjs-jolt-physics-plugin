import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { FixedConstraintParams } from "../constraints/types";
export declare class JoltFixedJoint extends JoltJoint<FixedConstraintParams, Jolt.TwoBodyConstraint> {
    constructor(point1: Vector3, point2?: Vector3, space?: 'Local' | 'World');
}
