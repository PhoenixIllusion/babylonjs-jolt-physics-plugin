import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { JoltConstraintPath, createPath3DWithTan2CubicBenzier } from "../jolt-constraint-path";
export function createJoltConstraint(mainBody, connectedBody, constraintParams) {
    function setPoints(constraintSettings, params) {
        constraintSettings.mPoint1.Set(...params.point1);
        constraintSettings.mPoint2.Set(...params.point2);
    }
    function setNormalAxis(constraintSettings, params) {
        constraintSettings.mNormalAxis1.Set(...params.normalAxis1);
        constraintSettings.mNormalAxis2.Set(...params.normalAxis2);
    }
    function setMotor(motor, settings) {
        if (motor.minForceLimit !== undefined)
            settings.mMinForceLimit = motor.minForceLimit;
        if (motor.maxForceLimit !== undefined)
            settings.mMaxForceLimit = motor.maxForceLimit;
        if (motor.minTorqueLimit !== undefined)
            settings.mMinTorqueLimit = motor.minTorqueLimit;
        if (motor.maxTorqueLimit !== undefined)
            settings.mMaxTorqueLimit = motor.maxTorqueLimit;
    }
    function enableMotor(motor, constraint, enable, value, velocity) {
        if (motor !== undefined) {
            switch (motor.state) {
                case 'Off':
                    constraint[enable](Jolt.EMotorState_Off);
                    break;
                case 'Position':
                    constraint[enable](Jolt.EMotorState_Position);
                    if (motor.targetValue) {
                        constraint[value](motor.targetValue);
                    }
                    break;
                case 'Velocity':
                    constraint[enable](Jolt.EMotorState_Velocity);
                    if (motor.targetValue) {
                        constraint[velocity](motor.targetValue);
                    }
                    break;
            }
        }
    }
    function setMotor1Settings(param, constraintSettings, key) {
        if (param.motor1 !== undefined && param.motor1 !== null) {
            const motor = param.motor1;
            const settings = constraintSettings[key];
            setMotor(motor, settings);
            constraintSettings[key] = settings;
        }
    }
    function setMotor2Settings(param, constraintSettings, key) {
        if (param.motor2 !== undefined && param.motor2 !== null) {
            const motor = param.motor2;
            const settings = constraintSettings[key];
            setMotor(motor, settings);
            constraintSettings[key] = settings;
        }
    }
    function setSpringSettings(param, constraint) {
        if (param.spring !== undefined && param.spring !== null) {
            const settings = constraint.mLimitsSpringSettings;
            const spring = param.spring;
            settings.mMode = (spring.mode == 'Frequency') ? Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
            if (spring.frequency !== undefined) {
                settings.mFrequency = spring.frequency;
            }
            if (spring.stiffness !== undefined) {
                settings.mStiffness = spring.stiffness;
            }
            if (spring.damping !== undefined) {
                settings.mDamping = spring.damping;
            }
            constraint.mLimitsSpringSettings = settings;
        }
    }
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
                setSpringSettings(params, constraintSettings);
                setMotor1Settings(params, constraintSettings, 'mMotorSettings');
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                const hinge = constraint = Jolt.castObject(constraint, Jolt.HingeConstraint);
                enableMotor(params.motor1, hinge, 'SetMotorState', 'SetTargetAngle', 'SetTargetAngularVelocity');
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
                setSpringSettings(params, constraintSettings);
                setMotor1Settings(params, constraintSettings, 'mMotorSettings');
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                const slider = constraint = Jolt.castObject(constraint, Jolt.SliderConstraint);
                enableMotor(params.motor1, slider, 'SetMotorState', 'SetTargetPosition', 'SetTargetVelocity');
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
                setSpringSettings(params, constraintSettings);
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
        case 'SwingTwist':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.SwingTwistConstraintSettings();
                constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
                constraintSettings.mPosition1.Set(...params.point1);
                constraintSettings.mPosition2.Set(...params.point2);
                constraintSettings.mTwistAxis1.Set(...params.twistAxis1);
                constraintSettings.mTwistAxis2.Set(...params.twistAxis2);
                constraintSettings.mPlaneAxis1.Set(...params.planeAxis1);
                constraintSettings.mPlaneAxis2.Set(...params.planeAxis2);
                constraintSettings.mSwingType = params.swingType == 'Pyramid' ? Jolt.ESwingType_Pyramid : Jolt.ESwingType_Cone;
                constraintSettings.mNormalHalfConeAngle = params.normalHalfConeAngle;
                constraintSettings.mPlaneHalfConeAngle = params.planeHalfConeAngle;
                constraintSettings.mTwistMinAngle = params.twistMinAngle;
                constraintSettings.mTwistMaxAngle = params.twistMaxAngle;
                constraintSettings.mMaxFrictionTorque = params.maxFrictionTorque;
                setMotor1Settings(params, constraintSettings, 'mSwingMotorSettings');
                setMotor2Settings(params, constraintSettings, 'mTwistMotorSettings');
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                constraint = Jolt.castObject(constraint, Jolt.SwingTwistConstraint);
                //TODO - How to configure start motor on boot givin non-standard 'set target orientation & angular velocity'
            }
            break;
        case 'Path':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.PathConstraintSettings();
                const { path } = params;
                let jPath;
                if (path instanceof Array) {
                    const pos = [];
                    const inTan = [];
                    const norm = [];
                    path.forEach(([p, iT, oT, n]) => {
                        pos.push(new Vector3(...p));
                        inTan.push(new Vector3(...iT), new Vector3(...oT));
                        norm.push(new Vector3(...n));
                    });
                    if (params.closed) {
                        pos.push(pos[0]);
                        inTan.push(inTan[0], inTan[1]);
                        norm.push(norm[0]);
                    }
                    const hermite = createPath3DWithTan2CubicBenzier(pos, inTan, norm);
                    params.pathObject = jPath = new JoltConstraintPath(hermite);
                }
                else {
                    params.pathObject = jPath = new JoltConstraintPath(path);
                }
                constraintSettings.mPath = jPath.getPtr();
                constraintSettings.mPath.SetIsLooping(params.closed);
                constraintSettings.mPathPosition.Set(...params.pathPosition);
                constraintSettings.mPathRotation.Set(...params.pathRotation);
                if (params.pathStartPosition) {
                    constraintSettings.mPathFraction = jPath.getClosestPositionTo(new Vector3(...params.pathStartPosition), 0, jPath.getPathMaxFraction()).closestPosition;
                }
                else {
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
                setMotor1Settings(params, constraintSettings, 'mPositionMotorSettings');
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                const pathConstraint = constraint = Jolt.castObject(constraint, Jolt.PathConstraint);
                enableMotor(params.motor1, pathConstraint, 'SetPositionMotorState', 'SetTargetPathFraction', 'SetTargetVelocity');
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
        case 'Gear':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.GearConstraintSettings();
                constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
                constraintSettings.mHingeAxis1.Set(...params.hingeAxis1);
                constraintSettings.mHingeAxis2.Set(...params.hingeAxis2);
                constraintSettings.mRatio = params.ratio;
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                constraint = Jolt.castObject(constraint, Jolt.GearConstraint);
            }
            break;
        case 'RackAndPinion':
            {
                const params = constraintParams;
                let constraintSettings = twoBodySettings = new Jolt.RackAndPinionConstraintSettings();
                constraintSettings.mSpace = params.space == 'Local' ? Jolt.EConstraintSpace_LocalToBodyCOM : Jolt.EConstraintSpace_WorldSpace;
                constraintSettings.mHingeAxis.Set(...params.hingeAxis1);
                constraintSettings.mSliderAxis.Set(...params.sliderAxis2);
                constraintSettings.mRatio = params.ratio;
                constraint = twoBodySettings.Create(mainBody, connectedBody);
                constraint = Jolt.castObject(constraint, Jolt.RackAndPinionConstraint);
            }
            break;
    }
    if (twoBodySettings) {
        Jolt.destroy(twoBodySettings);
    }
    return constraint;
}
