import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { GearConstraintParams } from "../constraints/types";
import { JoltHingeJoint } from ".";
export declare class JoltGearConstraint extends JoltJoint<GearConstraintParams, Jolt.GearConstraint> {
    constructor(hingeAxis1: Vector3, hingeAxis2: Vector3, ratio?: number, space?: 'Local' | 'World');
    setJointHint(gear1: JoltHingeJoint, gear2: JoltHingeJoint): void;
}
