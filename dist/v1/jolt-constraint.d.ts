import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
export declare class JoltConstraintManager {
    static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsJoint): Jolt.Constraint | undefined;
}
