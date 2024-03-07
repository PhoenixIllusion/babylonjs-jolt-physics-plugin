import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltFixedJoint extends JoltJoint {
    constructor(point1, point2, space = 'World') {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const constraint = {
            space,
            point1: f3(p1),
            point2: f3(p2),
            axisx1: [1, 0, 0],
            axisy1: [0, 1, 0],
            axisx2: [1, 0, 0],
            axisy2: [0, 1, 0],
            type: "Fixed"
        };
        super(PhysicsJoint.LockJoint, {
            nativeParams: {
                constraint
            }
        });
    }
}
