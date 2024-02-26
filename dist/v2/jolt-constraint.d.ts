import Jolt from "../jolt-import";
import { PhysicsConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { ConstrainedBodyPair } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
export declare enum JoltConstraintType {
    Fixed = 0,
    Point = 1,
    Hinge = 2,
    Slider = 3,
    Distance = 4,
    Cone = 5,
    SwingTwist = 6,
    SixDOF = 7,
    Path = 8,
    RackAndPinion = 9,
    Gear = 10,
    Pulley = 11
}
export interface IJoltConstraintData {
    type: JoltConstraintType;
    constraint: Jolt.Constraint;
    minMax: [number, number][];
    bodyPair: ConstrainedBodyPair;
}
export declare class JoltPhysicsConstraint extends PhysicsConstraint {
    _pluginData: IJoltConstraintData;
}
export declare class JoltConstraintManager {
    static CreateClassicConstraint(mainBody: Jolt.Body, connectedBody: Jolt.Body, joint: PhysicsConstraint): Jolt.Constraint;
}
