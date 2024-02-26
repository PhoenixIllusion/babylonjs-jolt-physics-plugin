import Jolt from "./jolt-import";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { JoltConstraintPath } from "./jolt-constraint-path";
export function CreateJoltConstraint(mainBody, connectedBody, constraintParams) {
    const setPoints = (constraintSettings, params) => {
        constraintSettings.mPoint1.Set(...params.point1);
        constraintSettings.mPoint2.Set(...params.point2);
    };
    const setNormalAxis = (constraintSettings, params) => {
        constraintSettings.mNormalAxis1.Set(...params.normalAxis1);
        constraintSettings.mNormalAxis2.Set(...params.normalAxis2);
    };
    let twoBodySettings;
    let constraint = undefined;
    switch (constraintParams.type) {
        case 'Fixed':
            {
                const params = constraintParams;
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
        case 'Point':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.PointConstraintSettings();
                constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
                setPoints(constraintSettings, params);
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                constraint = Jolt.castObject(constraint, Jolt.PointConstraint);
            }
            break;
        case 'Hinge':
            {
                const params = constraintParams;
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
        case 'Slider':
            {
                const params = constraintParams;
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
        case 'Distance':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
                constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
                setPoints(constraintSettings, params);
                constraintSettings.mMinDistance = params.minDistance;
                constraintSettings.mMaxDistance = params.maxDistance;
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                constraint = Jolt.castObject(constraint, Jolt.DistanceConstraint);
            }
            break;
        case 'Cone':
            {
                const params = constraintParams;
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
        case 'Path':
            {
                const params = constraintParams;
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
        case 'Pulley':
            {
                const params = constraintParams;
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
