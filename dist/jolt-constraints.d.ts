import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "./jolt-import";
import type { float } from "@babylonjs/core/types";
export type JoltConstraintType = 'Fixed' | 'Point' | 'Hinge' | 'Slider' | 'Distance' | 'Cone' | 'SwingTwist' | 'SixDOF' | 'Path' | 'RackAndPinion' | 'Gear' | 'Pulley';
type ESpace = 'Local' | 'World';
type float3 = [float, float, float];
type float4 = [float, float, float, float];
export interface JoltConstraint {
    type: JoltConstraintType;
}
export interface FixedConstraintParams extends JoltConstraint {
    type: 'Fixed';
    space: ESpace;
    point1: float3;
    axisx1: float3;
    axisy1: float3;
    point2: float3;
    axisx2: float3;
    axisy2: float3;
}
export interface PointConstraintParams extends JoltConstraint {
    type: 'Point';
    space: ESpace;
    point1: float3;
    point2: float3;
}
export interface HingeConstraintParams extends JoltConstraint {
    type: 'Hinge';
    space: ESpace;
    point1: float3;
    hingeAxis1: float3;
    normalAxis1: float3;
    point2: float3;
    hingeAxis2: float3;
    normalAxis2: float3;
    limitsMin: float;
    limitsMax: float;
    maxFrictionTorque: float;
}
export interface SliderConstraintParams extends JoltConstraint {
    type: 'Slider';
    space: ESpace;
    point1: float3;
    sliderAxis1: float3;
    normalAxis1: float3;
    point2: float3;
    sliderAxis2: float3;
    normalAxis2: float3;
    limitsMin: float;
    limitsMax: float;
    maxFrictionForce: float;
}
export interface DistanceConstraintParams extends JoltConstraint {
    type: 'Distance';
    space: ESpace;
    point1: float3;
    point2: float3;
    minDistance: float;
    maxDistance: float;
}
export interface ConeConstraintParams extends JoltConstraint {
    type: 'Cone';
    space: ESpace;
    point1: float3;
    twistAxis1: float3;
    point2: float3;
    twistAxis2: float3;
    halfConeAngle: float;
}
type RotationConstraintType = 'Free' | 'ConstrainAroundTangent' | 'ConstrainAroundNormal' | 'ConstrainAroundBinormal' | 'ConstrainToPath' | 'FullyConstrained';
export interface PathConstraintParams extends JoltConstraint {
    type: 'Path';
    path: float3[];
    pathPosition: float3;
    pathRotation: float4;
    pathNormal: float3;
    pathFraction: float;
    rotationConstraintType: RotationConstraintType;
    maxFrictionForce: float;
}
export interface PulleyConstraintParams extends JoltConstraint {
    type: 'Pulley';
    space: ESpace;
    bodyPoint1: float3;
    bodyPoint2: float3;
    fixedPoint1: float3;
    fixedPoint2: float3;
    ratio: float;
    minLength: float;
    maxLength: float;
}
interface JointJoltData<T> extends PhysicsJointData {
    nativeParams: {
        constraint: T;
    };
}
declare class JoltJoint<T extends JoltConstraint> extends PhysicsJoint {
    jointData: JointJoltData<T>;
}
export declare class JoltFixedJoint extends JoltJoint<FixedConstraintParams> {
    constructor(point1: Vector3, point2?: Vector3, space?: 'Local' | 'World');
}
export declare class JoltPointJoint extends JoltJoint<PointConstraintParams> {
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
export declare class JoltHingeJoint extends JoltJoint<HingeConstraintParams> {
    motor: MotorControl;
    constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
export declare class JoltSliderJoint extends JoltJoint<SliderConstraintParams> {
    motor: MotorControl;
    constructor(point1: Vector3, slideAxis: Vector3, space?: 'Local' | 'World', point2?: Vector3, slide2Axis?: Vector3);
    setMinMax(minAngle: number, maxAngle: number): void;
}
export declare class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams> {
    constructor(point1: Vector3, space?: 'Local' | 'World', point2?: Vector3);
    setMinMax(minVal: number, maxVal: number): void;
}
export declare class JoltConstraintManager {
    static CreateJoltConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, constraintParams: JoltConstraint): Jolt.Constraint | undefined;
    static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsJoint): Jolt.Constraint | undefined;
}
export {};
