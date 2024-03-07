import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { JoltConstraintPath, createPath3DWithTan2CubicBenzier } from "../jolt-constraint-path";
import { JVec3, float3 } from "../jolt-util";
import { 
  ConeConstraintParams, DistanceConstraintParams, FixedConstraintParams, HingeConstraintParams,
  JoltConstraint, PathConstraintParams, PointConstraintParams, PulleyConstraintParams, SliderConstraintParams } from './types';

export function createJoltConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, constraintParams: JoltConstraint): Jolt.Constraint | undefined {

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
      const { path } = params;

      let jPath: JoltConstraintPath;
      if(path instanceof Array){
        const pos: Vector3[] = [];
        const inTan: Vector3[] = [];
        const norm: Vector3[] = [];
        path.forEach(([p, iT, oT, n]) => {
          pos.push(new Vector3(... p))
          inTan.push(new Vector3(... iT), new Vector3(... oT))
          norm.push(new Vector3(... n))
        })
        const hermite = createPath3DWithTan2CubicBenzier(pos, inTan, norm);
        params.pathObject = jPath = new JoltConstraintPath(hermite);
      } else {
        params.pathObject = jPath = new JoltConstraintPath(path);
      } 
      constraintSettings.mPath = jPath.getPtr();
      constraintSettings.mPath.SetIsLooping(jPath.looping);
      constraintSettings.mPathPosition.Set(...params.pathPosition);
      constraintSettings.mPathRotation.Set(...params.pathRotation);
      if(params.pathStartPosition) {
        constraintSettings.mPathFraction = jPath.getClosestPositionTo(new Vector3(...params.pathStartPosition), 0, jPath.getPathMaxFraction()).closestPosition;
      } else {
        constraintSettings.mPathFraction = params.pathFraction;
      }
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
      constraint = Jolt.castObject(constraint, Jolt.PathConstraint);
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