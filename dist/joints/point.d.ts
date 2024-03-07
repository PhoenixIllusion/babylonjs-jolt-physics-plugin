import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { PointConstraintParams } from "../constraints/types";
export declare class JoltPointJoint extends JoltJoint<PointConstraintParams, Jolt.PointConstraint> {
    constructor(point1: Vector3, point2?: Vector3, space?: 'Local' | 'World');
}
