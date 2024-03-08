import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
import { SpringControl } from "./spring";
export class JoltDistanceJoint extends JoltJoint {
    constructor(point1, space = 'World', point2) {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const constraint = {
            space,
            point1: f3(p1),
            point2: f3(p2),
            minDistance: -1,
            maxDistance: -1,
            type: "Distance"
        };
        super(PhysicsJoint.PointToPointJoint, {
            nativeParams: {
                constraint
            }
        });
        this.spring = new SpringControl(this);
    }
    setMinMax(minVal, maxVal) {
        this.getParams().minDistance = minVal;
        this.getParams().maxDistance = maxVal;
        if (this.constraint) {
            this.constraint.SetDistance(minVal, maxVal);
        }
    }
}
