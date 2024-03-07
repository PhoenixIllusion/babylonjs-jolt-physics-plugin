import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltPointJoint extends JoltJoint {
    constructor(point1, point2, space = 'World') {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const constraint = {
            space,
            point1: f3(p1),
            point2: f3(p2),
            type: "Point"
        };
        super(PhysicsJoint.PointToPointJoint, {
            nativeParams: {
                constraint
            }
        });
    }
}
