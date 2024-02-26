import Jolt from "../jolt-import";
import { PhysicsConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ConstrainedBodyPair, PhysicsConstraintType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { JVec3 } from "../jolt-util";

export enum JoltConstraintType {
  Fixed,
  Point,
  Hinge,
  Slider,
  Distance,
  Cone,
  SwingTwist,
  SixDOF,
  Path,
  RackAndPinion,
  Gear,
  Pulley
}
export interface IJoltConstraintData {
  type: JoltConstraintType;
  constraint: Jolt.Constraint;
  minMax: [number,number][];
  bodyPair: ConstrainedBodyPair;
}

export class JoltPhysicsConstraint extends PhysicsConstraint {
  _pluginData: IJoltConstraintData = {} as any;
}


export class JoltConstraintManager {

  static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsConstraint): Jolt.Constraint {
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


    const setPoints = (constraintSettings: { mPoint1: JVec3, mPoint2: JVec3 }) => {
      constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
      constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    }
    const setHindgeAxis = (constraintSettings: { mHingeAxis1: JVec3, mHingeAxis2: JVec3 }) => {
      const h1 = jointData.axisA!;
      const h2 = jointData.axisB!;
      constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setSliderAxis = (constraintSettings: { mSliderAxis1: JVec3, mSliderAxis2: JVec3 }) => {
      const h1 = jointData.axisA!;
      const h2 = jointData.axisB!;
      constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setNormalAxis = (constraintSettings: { mNormalAxis1: JVec3, mNormalAxis2: JVec3 }) => {
        const n1: Vector3 = jointData.perpAxisA!;
        const n2: Vector3 = jointData.perpAxisB!;
        constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
        constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
    }
    const setAxisXY = (constraintSettings: { mAxisX1: JVec3, mAxisX2: JVec3, mAxisY1: JVec3, mAxisY2: JVec3, }) => {
        const x1 = jointData.axisA!;
        const x2 = jointData.axisB!;
        const y1: Vector3 = jointData.perpAxisA!;
        const y2: Vector3 = jointData.perpAxisB!;
        constraintSettings.mAxisX1.Set(x1.x, x1.y, x1.z);
        constraintSettings.mAxisX2.Set(x2.x, x2.y, x2.z);
        constraintSettings.mAxisY1.Set(y1.x, y1.y, y1.z);
        constraintSettings.mAxisY2.Set(y2.x, y2.y, y2.z);
    }

    function getMinMax(index: number, fallbackMin: number, fallbackMax: number): [number, number] {
      if(joint instanceof JoltPhysicsConstraint) {
        if(joint._pluginData.minMax && joint._pluginData.minMax[index]) {
          return joint._pluginData.minMax[index];
        }
      }
      return [fallbackMin, fallbackMax];
    }

    let twoBodySettings: Jolt.TwoBodyConstraintSettings | undefined;
    switch (joint.type) {
      case PhysicsConstraintType.DISTANCE: {
        let constraintSettings = twoBodySettings = new Jolt.DistanceConstraintSettings();
        setPoints(constraintSettings);
        [constraintSettings.mMinDistance, constraintSettings.mMaxDistance] = getMinMax(0, -1, joint.options.maxDistance || -1);
      }
        break;
      case PhysicsConstraintType.HINGE: {
        let constraintSettings = twoBodySettings =new Jolt.HingeConstraintSettings();
        setPoints(constraintSettings);
        setHindgeAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        [constraintSettings.mLimitsMin, constraintSettings.mLimitsMax] = getMinMax(0, -Math.PI, Math.PI);
      }
        break;
      case PhysicsConstraintType.PRISMATIC: {
        let constraintSettings = twoBodySettings =new Jolt.SliderConstraintSettings();
        setPoints(constraintSettings);
        setSliderAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        [constraintSettings.mLimitsMin, constraintSettings.mLimitsMax] = getMinMax(0, -1, joint.options.maxDistance || 1000);
      }
        break;
      case PhysicsConstraintType.LOCK: {
        let constraintSettings = twoBodySettings =new Jolt.FixedConstraintSettings();
        constraintSettings.mAutoDetectPoint = true;
        setPoints(constraintSettings);
        setAxisXY(constraintSettings);
      }
        break;
      case PhysicsConstraintType.BALL_AND_SOCKET: {
          let constraintSettings = twoBodySettings =new Jolt.PointConstraintSettings();
          setPoints(constraintSettings);
        }
        break;
    }
    let constraint: Jolt.Constraint | undefined = undefined;
    if(twoBodySettings) {
      constraint = twoBodySettings.Create(mainBody, connectedBody);
      Jolt.destroy(twoBodySettings);
    }
    if(!constraint) {
      throw new Error('Unable to create constraint');
    }
    return constraint;
  }
}