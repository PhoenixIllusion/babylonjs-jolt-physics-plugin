import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { GetMode, MotorControl, MotorMode } from "./motor";
import { JoltJoint } from "./jolt";
import { f3 } from "../jolt-util";
export class JoltHingeJoint extends JoltJoint {
    constructor(point1, hingeAxis, normalAxis, space = 'World', point2, hinge2Axis, normal2Axis) {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const h1 = hingeAxis;
        const h2 = hinge2Axis ?? h1;
        const n1 = normalAxis;
        const n2 = normal2Axis ?? n1;
        const constraint = {
            space,
            point1: f3(p1),
            point2: f3(p2),
            hingeAxis1: f3(h1),
            hingeAxis2: f3(h2),
            normalAxis1: f3(n1),
            normalAxis2: f3(n2),
            limitsMin: -Math.PI,
            limitsMax: Math.PI,
            maxFrictionTorque: 0,
            type: "Hinge"
        };
        super(PhysicsJoint.HingeJoint, {
            nativeParams: {
                constraint
            }
        });
        this.motor = new MotorControl((mode) => {
            if (this.constraint) {
                this.constraint.SetMotorState(GetMode(mode));
            }
        }, (mode, value) => {
            if (this.constraint) {
                if (mode == MotorMode.Position) {
                    this.constraint.SetTargetAngle(value);
                }
                if (mode == MotorMode.Velocity) {
                    this.constraint.SetTargetAngularVelocity(value);
                }
            }
        });
    }
    setMinMax(minAngle, maxAngle) {
        this.getParams().limitsMin = minAngle;
        this.getParams().limitsMax = maxAngle;
        if (this.physicsJoint) {
            const joint = this.physicsJoint;
            joint.SetLimits(minAngle, maxAngle);
        }
    }
}