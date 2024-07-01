import { GetMode, MotorControl, MotorMode } from "./motor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PathConstraintParams, RotationConstraintType } from "../constraints/types";
import { JoltJoint } from "./jolt";
import Jolt from "../jolt-import";
import { f3, f4 } from "../jolt-util";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import { float } from "@babylonjs/core/types";

export class JoltPathConstraint extends JoltJoint<PathConstraintParams, Jolt.PathConstraint> {
  public motor: MotorControl;

  constructor(points: Path3D, type: RotationConstraintType = 'Free') {

    const constraint: PathConstraintParams = {
      type: 'Path',
      path: points,
      closed: true,
      pathPosition: [0, 0, 0],
      pathRotation: [0, 0, 0, 1],
      pathFraction: 0,
      rotationConstraintType: type,
      maxFrictionForce: 0
    };
    super(-1, { nativeParams: { constraint } })
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
    }, () => this.constraint!.GetPositionMotorSettings());
  }

  setPathNormals(normal: Vector3 | Vector3[]) {
    if (normal instanceof Array && normal.length > 1 && normal.length != this.getParams().path.length) {
      throw new Error('Path Normal must either be single item or equal to number of points in path')
    }
    const params = this.getParams();
    if (params.pathObject) {
      params.pathObject.setPathNormals(normal);
    }
  }

  setPathOffset(position: Vector3, rotation: Quaternion) {
    if (this.physicsJoint) {
      throw new Error('Unable to modify path offset after creation')
    }
    const params = this.getParams();
    params.pathPosition = f3(position);
    params.pathRotation = f4(rotation);
  }

  setPathStartPosition(val: Vector3) {
    if (this.physicsJoint) {
      throw new Error('Unable to modify path fraction after creation')
    }
    const params = this.getParams();
    params.pathStartPosition = f3(val);
  }

  setPathFraction(val: float) {
    if (this.physicsJoint) {
      throw new Error('Unable to modify path fraction after creation')
    }
    const params = this.getParams();
    params.pathFraction = val;
  }
}