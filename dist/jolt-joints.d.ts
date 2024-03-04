import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import { ConeConstraintParams, DistanceConstraintParams, FixedConstraintParams, HingeConstraintParams, JoltConstraint, PathConstraintParams, PointConstraintParams, RotationConstraintType, SliderConstraintParams } from "./jolt-constraints";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
import { float } from "@babylonjs/core/types";
import { Path3D } from "@babylonjs/core/Maths/math.path";
interface JointJoltData<T> extends PhysicsJointData {
    nativeParams: {
        constraint: T;
    };
}
declare class JoltJoint<T extends JoltConstraint, J extends Jolt.Constraint> extends PhysicsJoint {
    jointData: JointJoltData<T>;
    get constraint(): J | undefined;
    getParams(): T;
}
export declare class JoltFixedJoint extends JoltJoint<FixedConstraintParams, Jolt.Constraint> {
    constructor(point1: Vector3, point2?: Vector3, space?: 'Local' | 'World');
}
export declare class JoltPointJoint extends JoltJoint<PointConstraintParams, Jolt.PointConstraint> {
    constructor(point1: Vector3, point2?: Vector3, space?: 'Local' | 'World');
}
export declare enum MotorMode {
    Off = 0,
    Position = 1,
    Velocity = 2
}
declare class MotorControl {
    private _setMode;
    private _setTarget;
    private _mode;
    private _target;
    constructor(_setMode: (mode: MotorMode) => void, _setTarget: (mode: MotorMode, val: number) => void);
    set mode(mode: MotorMode);
    get mode(): MotorMode;
    set target(val: number);
    get target(): number;
}
export declare class JoltHingeJoint extends JoltJoint<HingeConstraintParams, Jolt.HingeConstraint> {
    motor: MotorControl;
    constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
export declare class JoltSliderJoint extends JoltJoint<SliderConstraintParams, Jolt.SliderConstraint> {
    motor: MotorControl;
    constructor(point1: Vector3, slideAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, slide2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
export declare class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams, Jolt.DistanceConstraint> {
    constructor(point1: Vector3, space?: 'Local' | 'World', point2?: Vector3);
    setMinMax(minVal: number, maxVal: number): void;
}
export declare class JoltConeJoint extends JoltJoint<ConeConstraintParams, Jolt.ConeConstraint> {
    constructor(point1: Vector3, twistAxis: Vector3, halfCone?: number, space?: 'Local' | 'World', point2?: Vector3, twistAxis2?: Vector3);
    setMax(maxAngle: number): void;
}
export declare class JoltPathConstraint extends JoltJoint<PathConstraintParams, Jolt.PathConstraint> {
    motor: MotorControl;
    constructor(points: Vector3[] | Path3D, type?: RotationConstraintType);
    setPathNormals(normal: Vector3 | Vector3[]): void;
    setPathTangents(tangent: Vector3 | Vector3[]): void;
    setPathOffset(position: Vector3, rotation: Quaternion): void;
    setPathFraction(val: float): void;
}
export {};
