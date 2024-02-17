import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
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
    space: ESpace;
    point1: float3;
    axisx1: float3;
    axisy1: float3;
    point2: float3;
    axisx2: float3;
    axisy2: float3;
}
export interface PointConstraintParams extends JoltConstraint {
    space: ESpace;
    point1: float3;
    point2: float3;
}
export interface HingeConstraintParams extends JoltConstraint {
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
    space: ESpace;
    point1: float3;
    point2: float3;
    minDistance: float;
    maxDistance: float;
}
export interface ConeConstraintParams extends JoltConstraint {
    space: ESpace;
    point1: float3;
    twistAxis1: float3;
    point2: float3;
    twistAxis2: float3;
    halfConeAngle: float;
}
type RotationConstraintType = 'Free' | 'ConstrainAroundTangent' | 'ConstrainAroundNormal' | 'ConstrainAroundBinormal' | 'ConstrainToPath' | 'FullyConstrained';
export interface PathConstraintParams extends JoltConstraint {
    path: float3[];
    pathPosition: float3;
    pathRotation: float4;
    pathNormal: float3;
    pathFraction: float;
    rotationConstraintType: RotationConstraintType;
    maxFrictionForce: float;
}
export interface PulleyConstraintParams extends JoltConstraint {
    space: ESpace;
    bodyPoint1: float3;
    bodyPoint2: float3;
    fixedPoint1: float3;
    fixedPoint2: float3;
    ratio: float;
    minLength: float;
    maxLength: float;
}
export declare class JoltConstraintManager {
    static CreateJoltConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, constraintParams: JoltConstraint): Jolt.Constraint | undefined;
    static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsJoint): Jolt.Constraint | undefined;
}
export {};
