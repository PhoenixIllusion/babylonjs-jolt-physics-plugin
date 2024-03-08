import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { RackAndPinionConstraintParams } from "../constraints/types";
import { JoltHingeJoint, JoltSliderJoint } from ".";
export declare class JoltRackAndPinionConstraint extends JoltJoint<RackAndPinionConstraintParams, Jolt.RackAndPinionConstraint> {
    constructor(hingeAxis: Vector3, sliderAxis: Vector3, ratio?: number, space?: 'Local' | 'World');
    setJointHint(rack: JoltHingeJoint, pinion: JoltSliderJoint): void;
}
