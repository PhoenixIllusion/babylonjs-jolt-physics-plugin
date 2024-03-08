import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltGearConstraint extends JoltJoint {
    constructor(hingeAxis1, hingeAxis2, ratio = 1, space = 'World') {
        const constraint = {
            space,
            hingeAxis1: f3(hingeAxis1),
            hingeAxis2: f3(hingeAxis2),
            ratio,
            type: "Gear"
        };
        super(PhysicsJoint.BallAndSocketJoint, { nativeParams: { constraint } });
    }
    setJointHint(gear1, gear2) {
        if (this.constraint && gear1.constraint && gear2.constraint) {
            this.constraint.SetConstraints(gear1.constraint, gear2.constraint);
        }
        else {
            throw new Error('Attempted to configure gear SetConstraints with uninitialized constraints');
        }
    }
}
