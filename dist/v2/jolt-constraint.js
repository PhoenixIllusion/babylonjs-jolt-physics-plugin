import Jolt from "../jolt-import";
import { PhysicsConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsConstraintType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
export var JoltConstraintType;
(function (JoltConstraintType) {
    JoltConstraintType[JoltConstraintType["Fixed"] = 0] = "Fixed";
    JoltConstraintType[JoltConstraintType["Point"] = 1] = "Point";
    JoltConstraintType[JoltConstraintType["Hinge"] = 2] = "Hinge";
    JoltConstraintType[JoltConstraintType["Slider"] = 3] = "Slider";
    JoltConstraintType[JoltConstraintType["Distance"] = 4] = "Distance";
    JoltConstraintType[JoltConstraintType["Cone"] = 5] = "Cone";
    JoltConstraintType[JoltConstraintType["SwingTwist"] = 6] = "SwingTwist";
    JoltConstraintType[JoltConstraintType["SixDOF"] = 7] = "SixDOF";
    JoltConstraintType[JoltConstraintType["Path"] = 8] = "Path";
    JoltConstraintType[JoltConstraintType["RackAndPinion"] = 9] = "RackAndPinion";
    JoltConstraintType[JoltConstraintType["Gear"] = 10] = "Gear";
    JoltConstraintType[JoltConstraintType["Pulley"] = 11] = "Pulley";
})(JoltConstraintType || (JoltConstraintType = {}));
export class JoltPhysicsConstraint extends PhysicsConstraint {
    constructor() {
        super(...arguments);
        this._pluginData = {};
    }
}
export class JoltConstraintManager {
    static CreateClassicConstraint(mainBody, connectedBody, joint) {
        const jointData = joint.options;
        if (!jointData.pivotA) {
            jointData.pivotA = new Vector3(0, 0, 0);
        }
        if (!jointData.pivotB) {
            jointData.pivotB = new Vector3(0, 0, 0);
        }
        if (!jointData.axisA) {
            jointData.axisA = new Vector3(0, 1, 0);
        }
        if (!jointData.axisB) {
            jointData.axisB = new Vector3(0, 1, 0);
        }
        if (!jointData.perpAxisA) {
            jointData.perpAxisA = new Vector3(1, 0, 0);
        }
        if (!jointData.perpAxisB) {
            jointData.perpAxisB = new Vector3(1, 0, 0);
        }
        const p1 = jointData.pivotA;
        const p2 = jointData.pivotB;
        const setPoints = (constraintSettings) => {
            constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
            constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
        };
        const setHindgeAxis = (constraintSettings) => {
            const h1 = jointData.axisA;
            const h2 = jointData.axisB;
            constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
            constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
        };
        const setSliderAxis = (constraintSettings) => {
            const h1 = jointData.axisA;
            const h2 = jointData.axisB;
            constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
            constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
        };
        const setNormalAxis = (constraintSettings) => {
            const n1 = jointData.perpAxisA;
            const n2 = jointData.perpAxisB;
            constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
            constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
        };
        const setAxisXY = (constraintSettings) => {
            const x1 = jointData.axisA;
            const x2 = jointData.axisB;
            const y1 = jointData.perpAxisA;
            const y2 = jointData.perpAxisB;
            constraintSettings.mAxisX1.Set(x1.x, x1.y, x1.z);
            constraintSettings.mAxisX2.Set(x2.x, x2.y, x2.z);
            constraintSettings.mAxisY1.Set(y1.x, y1.y, y1.z);
            constraintSettings.mAxisY2.Set(y2.x, y2.y, y2.z);
        };
        function getMinMax(index, fallbackMin, fallbackMax) {
            if (joint instanceof JoltPhysicsConstraint) {
                if (joint._pluginData.minMax && joint._pluginData.minMax[index]) {
                    return joint._pluginData.minMax[index];
                }
            }
            return [fallbackMin, fallbackMax];
        }
        let twoBodySettings;
        switch (joint.type) {
            case PhysicsConstraintType.DISTANCE:
                {
                    let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
                    setPoints(constraintSettings);
                    [constraintSettings.mMinDistance, constraintSettings.mMaxDistance] = getMinMax(0, -1, joint.options.maxDistance || -1);
                }
                break;
            case PhysicsConstraintType.HINGE:
                {
                    let constraintSettings = twoBodySettings = new Jolt.HingeConstraintSettings();
                    setPoints(constraintSettings);
                    setHindgeAxis(constraintSettings);
                    setNormalAxis(constraintSettings);
                    [constraintSettings.mLimitsMin, constraintSettings.mLimitsMax] = getMinMax(0, -Math.PI, Math.PI);
                }
                break;
            case PhysicsConstraintType.PRISMATIC:
                {
                    let constraintSettings = twoBodySettings = new Jolt.SliderConstraintSettings();
                    setPoints(constraintSettings);
                    setSliderAxis(constraintSettings);
                    setNormalAxis(constraintSettings);
                    [constraintSettings.mLimitsMin, constraintSettings.mLimitsMax] = getMinMax(0, -1, joint.options.maxDistance || 1000);
                }
                break;
            case PhysicsConstraintType.LOCK:
                {
                    let constraintSettings = twoBodySettings = new Jolt.FixedConstraintSettings();
                    constraintSettings.mAutoDetectPoint = true;
                    setPoints(constraintSettings);
                    setAxisXY(constraintSettings);
                }
                break;
            case PhysicsConstraintType.BALL_AND_SOCKET:
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
        if (!constraint) {
            throw new Error('Unable to create constraint');
        }
        return constraint;
    }
}
