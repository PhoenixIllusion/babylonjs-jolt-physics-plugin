import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
export function createClassicConstraint(mainBody, connectedBody, joint) {
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
    const setIfAvailable = (setting, k, key) => {
        if (options[key] !== undefined) {
            setting[k] = options[key];
        }
    };
    const setPoints = (constraintSettings) => {
        constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
        constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    };
    const setHindgeAxis = (constraintSettings) => {
        const h1 = jointData.mainAxis;
        const h2 = jointData.connectedAxis;
        constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
        constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    };
    const setSliderAxis = (constraintSettings) => {
        const h1 = jointData.mainAxis;
        const h2 = jointData.connectedAxis;
        constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
        constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    };
    const setNormalAxis = (constraintSettings) => {
        if (options['normal-axis-1'] && options['normal-axis-2']) {
            const n1 = options['normal-axis-1'];
            const n2 = options['normal-axis-2'];
            constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
            constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
        }
    };
    const setAxisXY = (constraintSettings) => {
        if (options['axis-x-1'] && options['axis-x-2'] && options['axis-y-1'] && options['axis-y-2']) {
            const x1 = options['axis-x-1'];
            const x2 = options['axis-x-2'];
            const y1 = options['axis-y-1'];
            const y2 = options['axis-y-2'];
            constraintSettings.mAxisX1.Set(x1.x, x1.y, x1.z);
            constraintSettings.mAxisX2.Set(x2.x, x2.y, x2.z);
            constraintSettings.mAxisY1.Set(y1.x, y1.y, y1.z);
            constraintSettings.mAxisY2.Set(y2.x, y2.y, y2.z);
        }
    };
    const p1 = jointData.mainPivot;
    const p2 = jointData.connectedPivot;
    let twoBodySettings;
    switch (joint.type) {
        case PhysicsJoint.DistanceJoint:
            {
                let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
                setPoints(constraintSettings);
                setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
                setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
            }
            break;
        case PhysicsJoint.HingeJoint:
            {
                let constraintSettings = twoBodySettings = new Jolt.HingeConstraintSettings();
                setPoints(constraintSettings);
                setHindgeAxis(constraintSettings);
                setNormalAxis(constraintSettings);
                setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
                setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
            }
            break;
        case PhysicsJoint.PrismaticJoint:
            {
                let constraintSettings = twoBodySettings = new Jolt.SliderConstraintSettings();
                setPoints(constraintSettings);
                setSliderAxis(constraintSettings);
                setNormalAxis(constraintSettings);
                setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
                setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
            }
            break;
        case PhysicsJoint.LockJoint:
            {
                let constraintSettings = twoBodySettings = new Jolt.FixedConstraintSettings();
                constraintSettings.mAutoDetectPoint = true;
                setPoints(constraintSettings);
                setAxisXY(constraintSettings);
            }
            break;
        case PhysicsJoint.PointToPointJoint:
            {
                let constraintSettings = twoBodySettings = new Jolt.PointConstraintSettings();
                setPoints(constraintSettings);
            }
            break;
    }
    let constraint = undefined;
    if (twoBodySettings) {
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
    }
    return constraint;
}
