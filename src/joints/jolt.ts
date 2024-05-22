import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
import { JoltConstraint } from "../constraints/types";
import { JoltJSPlugin } from "../jolt-physics";

interface JointJoltData<T> extends PhysicsJointData {
  nativeParams: { constraint: T }
}
export class JoltJoint<T extends JoltConstraint, J extends Jolt.TwoBodyConstraint> extends PhysicsJoint {
  jointData!: JointJoltData<T>;
  get constraint(): J | undefined {
    return this.physicsJoint as J;
  }
  getParams(): T {
    return this.jointData.nativeParams.constraint;
  }

  activate() {
    const constraint = this.constraint;
    if (constraint) {
      const plugin: JoltJSPlugin = this._physicsPlugin as JoltJSPlugin;
      plugin.world.GetBodyInterface().ActivateConstraint(constraint);
    }
  }
}