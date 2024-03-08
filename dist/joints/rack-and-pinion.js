import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltRackAndPinionConstraint extends JoltJoint {
    constructor(hingeAxis, sliderAxis, ratio = 1, space = 'World') {
        const constraint = {
            space,
            hingeAxis1: f3(hingeAxis),
            sliderAxis2: f3(sliderAxis),
            ratio,
            type: "RackAndPinion"
        };
        super(PhysicsJoint.BallAndSocketJoint, { nativeParams: { constraint } });
    }
    setJointHint(rack, pinion) {
        if (this.constraint && rack.constraint && pinion.constraint) {
            this.constraint.SetConstraints(rack.constraint, pinion.constraint);
        }
        else {
            throw new Error('Attempted to configure RackAndPinion SetConstraints with uninitialized constraints');
        }
    }
}
