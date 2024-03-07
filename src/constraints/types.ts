import type { float } from "@babylonjs/core/types";
import type { float3, float4 } from "../jolt-util";
import type { JoltConstraintPath } from "../jolt-constraint-path";
import type { Path3D } from "@babylonjs/core/Maths/math.path";

export type JoltConstraintType = 'Fixed' | 'Point' | 'Hinge' | 'Slider' | 'Distance' | 'Cone' | 'SwingTwist' | 'SixDOF' | 'Path' | 'RackAndPinion' | 'Gear' | 'Pulley';

type ESpace = 'Local' | 'World';

export interface JoltConstraint {
  type: JoltConstraintType;
}

export interface FixedConstraintParams extends JoltConstraint {
  type: 'Fixed',
  space: ESpace;
  point1: float3;
  axisx1: float3;
  axisy1: float3;
  point2: float3;
  axisx2: float3;
  axisy2: float3;
}

export interface PointConstraintParams extends JoltConstraint {
  type: 'Point',
  space: ESpace;
  point1: float3;
  point2: float3;
}

export interface HingeConstraintParams extends JoltConstraint {
  type: 'Hinge',
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
  type: 'Slider',
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
  type: 'Distance',
  space: ESpace;
  point1: float3;
  point2: float3;
  minDistance: float;
  maxDistance: float;
}

export interface ConeConstraintParams extends JoltConstraint {
  type: 'Cone',
  space: ESpace;
  point1: float3;
  twistAxis1: float3;
  point2: float3;
  twistAxis2: float3;
  halfConeAngle: float;
}

export type RotationConstraintType = 'Free' | 'ConstrainAroundTangent' | 'ConstrainAroundNormal' | 'ConstrainAroundBinormal' | 'ConstrainToPath' | 'FullyConstrained';
export interface PathConstraintParams extends JoltConstraint {
  type: 'Path',
  path: Path3D | ([float3,float3,float3,float3])[];
  closed: boolean;
  pathPosition: float3;
  pathRotation: float4;
  pathFraction: float;
  pathStartPosition?: float3;
  rotationConstraintType: RotationConstraintType;
  maxFrictionForce: float;
  pathObject?: JoltConstraintPath;
}

export interface PulleyConstraintParams extends JoltConstraint {
  type: 'Pulley',
  space: ESpace;
  bodyPoint1: float3;
  bodyPoint2: float3;
  fixedPoint1: float3;
  fixedPoint2: float3;
  ratio: float;
  minLength: float;
  maxLength: float;
}
