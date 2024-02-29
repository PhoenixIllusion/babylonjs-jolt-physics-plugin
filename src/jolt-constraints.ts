import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "./jolt-import";
import type { float } from "@babylonjs/core/types";
import { JoltConstraintPath } from "./jolt-constraint-path";
import { JVec3 } from "./jolt-util";

export type JoltConstraintType = 'Fixed' | 'Point' | 'Hinge' | 'Slider' | 'Distance' | 'Cone' | 'SwingTwist' | 'SixDOF' | 'Path' | 'RackAndPinion' | 'Gear' | 'Pulley';

type ESpace = 'Local' | 'World';
type float3 = [float, float, float];
type float4 = [float, float, float, float];

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

type RotationConstraintType = 'Free' | 'ConstrainAroundTangent' | 'ConstrainAroundNormal' | 'ConstrainAroundBinormal' | 'ConstrainToPath' | 'FullyConstrained';
export interface PathConstraintParams extends JoltConstraint {
  type: 'Path',
  path: float3[];
  pathPosition: float3;
  pathRotation: float4;
  pathNormal: float3;
  pathFraction: float;
  rotationConstraintType: RotationConstraintType;
  maxFrictionForce: float;
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

const f3 = (v: Vector3): float3 => [v.x, v.y, v.z];

interface JointJoltData<T> extends PhysicsJointData {
  nativeParams: { constraint: T }
}
class JoltJoint<T extends JoltConstraint> extends PhysicsJoint {
  jointData!: JointJoltData<T>;
}

export class JoltFixedJoint extends JoltJoint<FixedConstraintParams> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: FixedConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      axisx1: [1, 0, 0],
      axisy1: [0, 1, 0],
      axisx2: [1, 0, 0],
      axisy2: [0, 1, 0],
      type: "Fixed"
    }
    super(PhysicsJoint.LockJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}

export class JoltPointJoint extends JoltJoint<PointConstraintParams> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: PointConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      type: "Point"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}

export enum MotorMode {
  Off,
  Position,
  Velocity
}

function GetMode(mode: MotorMode) {
  switch (mode) {
    case MotorMode.Off: return Jolt.EMotorState_Off;
    case MotorMode.Position: return Jolt.EMotorState_Position;
    case MotorMode.Velocity: return Jolt.EMotorState_Velocity;
  }
}

class MotorControl {
  private _mode = MotorMode.Off;
  private _target = 0;

  constructor(private _setMode: (mode: MotorMode) => void, private _setTarget: (mode: MotorMode, val: number) => void) {

  }
  set mode(mode: MotorMode) {
    this._mode = mode;
    this._setMode(mode);
  }
  get mode() {
    return this._mode;
  }

  set target(val: number) {
    this._target = val;
    this._setTarget(this._mode, val);
  }
  get target() {
    return this._target;
  }
}

export class JoltHingeJoint extends JoltJoint<HingeConstraintParams>  {

  public motor: MotorControl;

  constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space: 'Local' | 'World' = 'World',
    point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const h1 = hingeAxis;
    const h2 = hinge2Axis ?? h1;
    const n1 = normalAxis;
    const n2 = normal2Axis ?? n1;

    const constraint: HingeConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      hingeAxis1: f3(h1),
      hingeAxis2: f3(h2),
      normalAxis1: f3(n1),
      normalAxis2: f3(n2),
      limitsMin: -Math.PI,
      limitsMax: Math.PI,
      maxFrictionTorque: 0,
      type: "Hinge"
    }
    super(PhysicsJoint.HingeJoint, {
      nativeParams: {
        constraint
      }
    })
    this.motor = new MotorControl((mode) => {
      if (this.physicsJoint) {
        const hinge = this.physicsJoint as Jolt.HingeConstraint;
        hinge.SetMotorState(GetMode(mode));
      }
    }, (mode, value) => {
      if (this.physicsJoint) {
        const hinge = this.physicsJoint as Jolt.HingeConstraint;
        if (mode == MotorMode.Position) {
          hinge.SetTargetAngle(value);
        }
        if (mode == MotorMode.Velocity) {
          hinge.SetTargetAngularVelocity(value);
        }
      }
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.jointData.nativeParams.constraint.limitsMin = minAngle;
    this.jointData.nativeParams.constraint.limitsMax = maxAngle;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.HingeConstraint;
      joint.SetLimits(minAngle, maxAngle);
    }
  }
}

export class JoltSliderJoint extends JoltJoint<SliderConstraintParams>  {

  public motor: MotorControl;

  constructor(point1: Vector3, slideAxis: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3, slide2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const s1 = slideAxis;
    const s2 = slide2Axis ?? s1;
    const n1 = new Vector3();
    s1.getNormalToRef(n1);
    const n2 = new Vector3();
    s2.getNormalToRef(n2);

    const constraint: SliderConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      sliderAxis1: f3(s1),
      sliderAxis2: f3(s2),
      normalAxis1: f3(n1),
      normalAxis2: f3(n2),
      limitsMin: Number.MIN_SAFE_INTEGER,
      limitsMax: Number.MAX_SAFE_INTEGER,
      type: "Slider",
      maxFrictionForce: 0
    }
    super(PhysicsJoint.PrismaticJoint, {
      nativeParams: {
        constraint
      }
    })
    this.motor = new MotorControl((mode) => {
      if (this.physicsJoint) {
        const slider = this.physicsJoint as Jolt.SliderConstraint;
        slider.SetMotorState(GetMode(mode));
      }
    }, (mode, value) => {
      if (this.physicsJoint) {
        const slider = this.physicsJoint as Jolt.SliderConstraint;
        if (mode == MotorMode.Position) {
          slider.SetTargetPosition(value);
        }
        if (mode == MotorMode.Velocity) {
          slider.SetTargetVelocity(value);
        }
      }
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.jointData.nativeParams.constraint.limitsMin = minAngle;
    this.jointData.nativeParams.constraint.limitsMax = maxAngle;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.SliderConstraint;
      joint.SetLimits(minAngle, maxAngle);
    }
  }
}


export class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams> {
  constructor(point1: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: DistanceConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      minDistance: -1,
      maxDistance: -1,
      type: "Distance"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }

  setMinMax(minVal: number, maxVal: number) {
    this.jointData.nativeParams.constraint.minDistance = minVal;
    this.jointData.nativeParams.constraint.maxDistance = maxVal;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.DistanceConstraint;
      joint.SetDistance(minVal, maxVal);
    }
  }
}

export class JoltConeJoint extends JoltJoint<ConeConstraintParams>  {

  constructor(point1: Vector3, twistAxis: Vector3, halfCone: number = 0,  space: 'Local' | 'World' = 'World', point2?: Vector3, twistAxis2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const t1 = twistAxis;
    const t2 = twistAxis2 ?? t1;

    const constraint: ConeConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      twistAxis1: f3(t1),
      twistAxis2: f3(t2),
      halfConeAngle: halfCone,
      type: "Cone"
    };
    super(PhysicsJoint.BallAndSocketJoint, {nativeParams: constraint})
  }

  setMax( maxAngle: number) {
    this.jointData.nativeParams.constraint.halfConeAngle = maxAngle;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.ConeConstraint;
      joint.SetHalfConeAngle(maxAngle);
    }
  }
}

export class JoltConstraintManager {
  static CreateJoltConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, constraintParams: JoltConstraint): Jolt.Constraint | undefined {

    const setPoints = (constraintSettings: { mPoint1: JVec3, mPoint2: JVec3 }, params: { point1: float3, point2: float3 }) => {
      constraintSettings.mPoint1.Set(...params.point1);
      constraintSettings.mPoint2.Set(...params.point2);
    }
    const setNormalAxis = (constraintSettings: { mNormalAxis1: JVec3, mNormalAxis2: JVec3 }, params: { normalAxis1: float3, normalAxis2: float3 }) => {
      constraintSettings.mNormalAxis1.Set(...params.normalAxis1);
      constraintSettings.mNormalAxis2.Set(...params.normalAxis2);
    }


    let twoBodySettings: Jolt.TwoBodyConstraintSettings | undefined;
    let constraint: Jolt.Constraint | undefined = undefined;
    switch (constraintParams.type) {
      case 'Fixed': {
        const params = constraintParams as FixedConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.FixedConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        constraintSettings.mAxisX1.Set(...params.axisx1);
        constraintSettings.mAxisX2.Set(...params.axisx2);
        constraintSettings.mAxisY1.Set(...params.axisy1);
        constraintSettings.mAxisY2.Set(...params.axisy2);
        constraint = twoBodySettings.Create(mainBody, connectedBody);
      }
        break;
      case 'Point': {
        const params = constraintParams as PointConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.PointConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.PointConstraint);
      }
        break;
      case 'Hinge': {
        const params = constraintParams as HingeConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.HingeConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        setNormalAxis(constraintSettings, params);
        constraintSettings.mHingeAxis1.Set(...params.hingeAxis1);
        constraintSettings.mHingeAxis2.Set(...params.hingeAxis2);
        constraintSettings.mLimitsMin = params.limitsMin;
        constraintSettings.mLimitsMax = params.limitsMax;
        constraintSettings.mMaxFrictionTorque = params.maxFrictionTorque;
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.HingeConstraint);
      }
        break;
      case 'Slider': {
        const params = constraintParams as SliderConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.SliderConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        setNormalAxis(constraintSettings, params);
        constraintSettings.mSliderAxis1.Set(...params.sliderAxis1);
        constraintSettings.mSliderAxis2.Set(...params.sliderAxis2);
        constraintSettings.mLimitsMin = params.limitsMin;
        constraintSettings.mLimitsMax = params.limitsMax;
        constraintSettings.mMaxFrictionForce = params.maxFrictionForce;
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.SliderConstraint);
      }
        break;
      case 'Distance': {
        const params = constraintParams as DistanceConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        constraintSettings.mMinDistance = params.minDistance;
        constraintSettings.mMaxDistance = params.maxDistance;
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.DistanceConstraint);
      }
        break;
      case 'Cone': {
        const params = constraintParams as ConeConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.ConeConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        setPoints(constraintSettings, params);
        constraintSettings.mTwistAxis1.Set(...params.twistAxis1);
        constraintSettings.mTwistAxis2.Set(...params.twistAxis2);
        constraintSettings.mHalfConeAngle = params.halfConeAngle;
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.ConeConstraint);
      }
        break;
      case 'Path': {
        const params = constraintParams as PathConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.PathConstraintSettings();
        const path = new JoltConstraintPath(params.path.map(f3 => new Vector3(f3[0], f3[1], f3[2])), new Vector3(...params.pathNormal));
        constraintSettings.mPath.SetIsLooping(path.looping);
        constraintSettings.mPathPosition.Set(...params.pathPosition);
        constraintSettings.mPathRotation.Set(...params.pathRotation);
        constraintSettings.mPathFraction = params.pathFraction;
        constraintSettings.mMaxFrictionForce = params.maxFrictionForce;
        switch (params.rotationConstraintType) {
          case 'Free':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_Free;
            break;
          case 'ConstrainAroundTangent':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_ConstrainAroundTangent;
            break;
          case 'ConstrainAroundNormal':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_ConstrainAroundNormal;
            break;
          case 'ConstrainAroundBinormal':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_ConstrainAroundBinormal;
            break;
          case 'ConstrainToPath':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_ConstrainToPath;
            break;
          case 'FullyConstrained':
            constraintSettings.mRotationConstraintType = Jolt.EPathRotationConstraintType_FullyConstrained;
            break;
        }
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        const pathConstraint = constraint = Jolt.castObject(constraint, Jolt.PathConstraint);
        pathConstraint.SetPath(path.getPtr(), params.pathFraction);
      }
        break;
      case 'Pulley': {
        const params = constraintParams as PulleyConstraintParams;
        let constraintSettings = twoBodySettings = new Jolt.PulleyConstraintSettings();
        constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
        constraintSettings.mBodyPoint1.Set(...params.bodyPoint1);
        constraintSettings.mBodyPoint2.Set(...params.bodyPoint2);
        constraintSettings.mFixedPoint1.Set(...params.fixedPoint1);
        constraintSettings.mFixedPoint2.Set(...params.fixedPoint2);
        constraintSettings.mRatio = params.ratio;
        constraintSettings.mMinLength = params.minLength;
        constraintSettings.mMaxLength = params.maxLength;
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.PulleyConstraint);
      }
        break;
    }
    if (twoBodySettings) {
      Jolt.destroy(twoBodySettings);
    }
    return constraint;
  }

  static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsJoint): Jolt.Constraint | undefined {
    const jointData = joint.jointData;
    if (!jointData.mainPivot) {
      jointData.mainPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedPivot) {
      jointData.connectedPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.mainAxis) {
      jointData.mainAxis = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedAxis) {
      jointData.connectedAxis = new Vector3(0, 0, 0);
    }
    const options = jointData.nativeParams || {};

    const setIfAvailable = <T extends Jolt.ConstraintSettings>(setting: T, k: keyof T, key: any) => {
      if (options[key] !== undefined) {
        setting[k] = options[key];
      }
    }

    const setPoints = (constraintSettings: { mPoint1: JVec3, mPoint2: JVec3 }) => {
      constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
      constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    }
    const setHindgeAxis = (constraintSettings: { mHingeAxis1: JVec3, mHingeAxis2: JVec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setSliderAxis = (constraintSettings: { mSliderAxis1: JVec3, mSliderAxis2: JVec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setNormalAxis = (constraintSettings: { mNormalAxis1: JVec3, mNormalAxis2: JVec3 }) => {
      if (options['normal-axis-1'] && options['normal-axis-2']) {
        const n1: Vector3 = options['normal-axis-1'];
        const n2: Vector3 = options['normal-axis-2'];
        constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
        constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
      }
    }
    const setAxisXY = (constraintSettings: { mAxisX1: JVec3, mAxisX2: JVec3, mAxisY1: JVec3, mAxisY2: JVec3, }) => {
      if (options['axis-x-1'] && options['axis-x-2'] && options['axis-y-1'] && options['axis-y-2']) {
        const x1: Vector3 = options['axis-x-1'];
        const x2: Vector3 = options['axis-x-2'];
        const y1: Vector3 = options['axis-y-1'];
        const y2: Vector3 = options['axis-y-2'];
        constraintSettings.mAxisX1.Set(x1.x, x1.y, x1.z);
        constraintSettings.mAxisX2.Set(x2.x, x2.y, x2.z);
        constraintSettings.mAxisY1.Set(y1.x, y1.y, y1.z);
        constraintSettings.mAxisY2.Set(y2.x, y2.y, y2.z);
      }
    }

    const p1 = jointData.mainPivot;
    const p2 = jointData.connectedPivot;
    let twoBodySettings: Jolt.TwoBodyConstraintSettings | undefined;
    switch (joint.type) {
      case PhysicsJoint.DistanceJoint: {
        let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
        setPoints(constraintSettings);
        setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
        setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
      }
        break;
      case PhysicsJoint.HingeJoint: {
        let constraintSettings = twoBodySettings = new Jolt.HingeConstraintSettings();
        setPoints(constraintSettings);
        setHindgeAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
      }
        break;
      case PhysicsJoint.PrismaticJoint: {
        let constraintSettings = twoBodySettings = new Jolt.SliderConstraintSettings();
        setPoints(constraintSettings);
        setSliderAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
      }
        break;
      case PhysicsJoint.LockJoint: {
        let constraintSettings = twoBodySettings = new Jolt.FixedConstraintSettings();
        constraintSettings.mAutoDetectPoint = true;
        setPoints(constraintSettings);
        setAxisXY(constraintSettings);
      }
        break;
      case PhysicsJoint.PointToPointJoint: {
        let constraintSettings = twoBodySettings = new Jolt.PointConstraintSettings();
        setPoints(constraintSettings);
      }
        break;
    }
    let constraint: Jolt.Constraint | undefined = undefined;
    if (twoBodySettings) {
      constraint = twoBodySettings.Create(mainBody, connectedBody);
      Jolt.destroy(twoBodySettings);
    }
    return constraint;
  }
}