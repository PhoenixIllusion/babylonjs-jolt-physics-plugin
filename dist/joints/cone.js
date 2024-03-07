import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltConeJoint extends JoltJoint {
    constructor(point1, twistAxis, halfCone = 0, space = 'World', point2, twistAxis2) {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const t1 = twistAxis;
        const t2 = twistAxis2 ?? t1;
        const constraint = {
            space,
            point1: f3(p1),
            point2: f3(p2),
            twistAxis1: f3(t1),
            twistAxis2: f3(t2),
            halfConeAngle: halfCone,
            type: "Cone"
        };
        super(PhysicsJoint.BallAndSocketJoint, { nativeParams: { constraint } });
    }
    setMax(maxAngle) {
        this.getParams().halfConeAngle = maxAngle;
        if (this.constraint) {
            this.constraint.SetHalfConeAngle(maxAngle);
        }
    }
}
