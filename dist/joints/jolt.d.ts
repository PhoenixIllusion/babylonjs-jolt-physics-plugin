import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
import { JoltConstraint } from "../constraints/types";
interface JointJoltData<T> extends PhysicsJointData {
    nativeParams: {
        constraint: T;
    };
}
export declare class JoltJoint<T extends JoltConstraint, J extends Jolt.TwoBodyConstraint> extends PhysicsJoint {
    jointData: JointJoltData<T>;
    get constraint(): J | undefined;
    getParams(): T;
    activate(): void;
}
export {};
