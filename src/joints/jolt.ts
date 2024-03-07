import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
import { JoltConstraint } from "../constraints/types";

interface JointJoltData<T> extends PhysicsJointData {
  nativeParams: { constraint: T }
}
export class JoltJoint<T extends JoltConstraint, J extends Jolt.Constraint> extends PhysicsJoint {
  jointData!: JointJoltData<T>;
  get constraint(): J | undefined {
    return this.physicsJoint as J;
  }
  getParams(): T {
    return this.jointData.nativeParams.constraint;
  }
}