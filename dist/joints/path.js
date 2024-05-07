import { GetMode, MotorControl, MotorMode } from "./motor";
import { JoltJoint } from "./jolt";
import { f3, f4 } from "../jolt-util";
export class JoltPathConstraint extends JoltJoint {
    constructor(points, type = 'Free') {
        const constraint = {
            type: 'Path',
            path: points,
            closed: true,
            pathPosition: [0, 0, 0],
            pathRotation: [0, 0, 0, 1],
            pathFraction: 0,
            rotationConstraintType: type,
            maxFrictionForce: 0
        };
        super(-1, { nativeParams: { constraint } });
        this.motor = new MotorControl((mode) => {
            if (this.constraint) {
                this.constraint.SetPositionMotorState(GetMode(mode));
            }
        }, (mode, value) => {
            if (this.constraint) {
                if (mode == MotorMode.Position) {
                    this.constraint.SetTargetPathFraction(value);
                }
                if (mode == MotorMode.Velocity) {
                    this.constraint.SetTargetVelocity(value);
                }
                this.activate();
            }
        });
    }
    setPathNormals(normal) {
        if (normal instanceof Array && normal.length > 1 && normal.length != this.getParams().path.length) {
            throw new Error('Path Normal must either be single item or equal to number of points in path');
        }
        const params = this.getParams();
        if (params.pathObject) {
            params.pathObject.setPathNormals(normal);
        }
    }
    setPathOffset(position, rotation) {
        if (this.physicsJoint) {
            throw new Error('Unable to modify path offset after creation');
        }
        const params = this.getParams();
        params.pathPosition = f3(position);
        params.pathRotation = f4(rotation);
    }
    setPathStartPosition(val) {
        if (this.physicsJoint) {
            throw new Error('Unable to modify path fraction after creation');
        }
        const params = this.getParams();
        params.pathStartPosition = f3(val);
    }
    setPathFraction(val) {
        if (this.physicsJoint) {
            throw new Error('Unable to modify path fraction after creation');
        }
        const params = this.getParams();
        params.pathFraction = val;
    }
}
