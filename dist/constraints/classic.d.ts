import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import Jolt from "../jolt-import";
export declare function createClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsJoint): Jolt.Constraint | undefined;
