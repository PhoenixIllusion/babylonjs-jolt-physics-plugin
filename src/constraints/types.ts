import type { float } from "@babylonjs/core/types";
import type { float3, float4 } from "../jolt-util";
import type { JoltConstraintPath } from "../jolt-constraint-path";
import type { Path3D } from "@babylonjs/core/Maths/math.path";

export type JoltConstraintType = 'Fixed' | 'Point' | 'Hinge' | 'Slider' | 'Distance' | 'Cone' | 'SwingTwist' | 'SixDOF' | 'Path' | 'RackAndPinion' | 'Gear' | 'Pulley';

type ESpace = 'Local' | 'World';

export interface JoltConstraint {
  type: JoltConstraintType;
}

type ESpringMode = 'Frequency' | 'Stiffness';

export interface SpringSettings {
  mode: ESpringMode;
  frequency?: float;
  stiffness?: float;
  damping?: float;
}

export interface MotorSettings {
  state: 'Off' | 'Velocity' | 'Position';
  targetValue?: float;
  minForceLimit?: float;
  maxForceLimit?: float;
  minTorqueLimit?: float;
  maxTorqueLimit?: float;
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
  spring?: SpringSettings;
  motor1?: MotorSettings;
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
  spring?: SpringSettings;
  motor1?: MotorSettings;
}

export interface DistanceConstraintParams extends JoltConstraint {
  type: 'Distance';
  space: ESpace;
  point1: float3;
  point2: float3;
  minDistance: float;
  maxDistance: float;
  spring?: SpringSettings;
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

export interface SwingTwistConstraintParams extends JoltConstraint {
  type: 'SwingTwist';
  space: ESpace;
  point1: float3;
  twistAxis1: float3;
  planeAxis1: float3;
  point2: float3
  twistAxis2: float3;
  planeAxis2: float3;
  normalHalfConeAngle: float;
  planeHalfConeAngle: float;
  twistMinAngle: float;
  twistMaxAngle: float;
  swingType: 'Cone' | 'Pyramid';
  maxFrictionTorque: float;
  motor1?: MotorSettings;
  motor2?: MotorSettings;
}

export type RotationConstraintType = 'Free' | 'ConstrainAroundTangent' | 'ConstrainAroundNormal' | 'ConstrainAroundBinormal' | 'ConstrainToPath' | 'FullyConstrained';
export interface PathConstraintParams extends JoltConstraint {
  type: 'Path';
  path: Path3D | ([float3, float3, float3, float3])[];
  closed: boolean;
  pathPosition: float3;
  pathRotation: float4;
  pathFraction: float;
  pathStartPosition?: float3;
  rotationConstraintType: RotationConstraintType;
  maxFrictionForce: float;
  pathObject?: JoltConstraintPath;
  motor1?: MotorSettings;
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

export interface GearConstraintParams extends JoltConstraint {
  type: 'Gear';
  space: ESpace;
  hingeAxis1: float3;
  hingeAxis2: float3;
  ratio: float;
}

export interface RackAndPinionConstraintParams extends JoltConstraint {
  type: 'RackAndPinion';
  space: ESpace;
  hingeAxis1: float3;
  sliderAxis2: float3;
  ratio: float;
}