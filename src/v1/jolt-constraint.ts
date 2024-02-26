import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
import { JVec3 } from "../jolt-util";

export class JoltConstraintManager {

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
    let constraint: Jolt.Constraint | undefined = undefined;
    switch (joint.type) {
      case PhysicsJoint.DistanceJoint: {
        let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
        setPoints(constraintSettings);
        setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
        setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
        constraint = Jolt.castObject(constraint, Jolt.DistanceConstraint);
      }
        break;
      case PhysicsJoint.HingeJoint: {
        let constraintSettings = twoBodySettings =new Jolt.HingeConstraintSettings();
        setPoints(constraintSettings);
        setHindgeAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
        constraint = Jolt.castObject(constraint, Jolt.HingeConstraint);
      }
        break;
      case PhysicsJoint.PrismaticJoint: {
        let constraintSettings = twoBodySettings =new Jolt.SliderConstraintSettings();
        setPoints(constraintSettings);
        setSliderAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
        constraint = Jolt.castObject(constraint, Jolt.SliderConstraint);
      }
        break;
      case PhysicsJoint.LockJoint: {
        let constraintSettings = twoBodySettings =new Jolt.FixedConstraintSettings();
        constraintSettings.mAutoDetectPoint = true;
        setPoints(constraintSettings);
        setAxisXY(constraintSettings);
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
      }
        break;
      case PhysicsJoint.PointToPointJoint: {
        let constraintSettings = twoBodySettings =new Jolt.PointConstraintSettings();
        setPoints(constraintSettings);
        constraint = twoBodySettings.Create(mainBody, connectedBody);
        Jolt.destroy(twoBodySettings);
        constraint = Jolt.castObject(constraint, Jolt.PointConstraint);
      }
        break;
    }
    return constraint;
  }
}