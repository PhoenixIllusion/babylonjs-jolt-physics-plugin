import { PhysicsJoint, PhysicsJointData } from "@babylonjs/core/Physics/v1/physicsJoint";
import { ConeConstraintParams, DistanceConstraintParams, FixedConstraintParams, HingeConstraintParams, JoltConstraint, PathConstraintParams, PointConstraintParams, RotationConstraintType, SliderConstraintParams, float3, float4 } from "./jolt-constraints";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import { float } from "@babylonjs/core/types";

const f3 = (v: Vector3): float3 => [v.x, v.y, v.z];
const f4 = (v: Quaternion): float4 => [v.x, v.y, v.z, v.w];

interface JointJoltData<T> extends PhysicsJointData {
  nativeParams: { constraint: T }
}
class JoltJoint<T extends JoltConstraint, J extends Jolt.Constraint> extends PhysicsJoint {
  jointData!: JointJoltData<T>;
  get constraint(): J | undefined {
    return this.physicsJoint as J;
  }
  getParams(): T {
    return this.jointData.nativeParams.constraint;
  }
}

export class JoltFixedJoint extends JoltJoint<FixedConstraintParams, Jolt.Constraint> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: FixedConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      axisx1: [1, 0, 0],
      axisy1: [0, 1, 0],
      axisx2: [1, 0, 0],
      axisy2: [0, 1, 0],
      type: "Fixed"
    }
    super(PhysicsJoint.LockJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}

export class JoltPointJoint extends JoltJoint<PointConstraintParams, Jolt.PointConstraint> {
  constructor(point1: Vector3, point2?: Vector3, space: 'Local' | 'World' = 'World') {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: PointConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      type: "Point"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }
}

export enum MotorMode {
  Off,
  Position,
  Velocity
}

function GetMode(mode: MotorMode) {
  switch (mode) {
    case MotorMode.Off: return Jolt.EMotorState_Off;
    case MotorMode.Position: return Jolt.EMotorState_Position;
    case MotorMode.Velocity: return Jolt.EMotorState_Velocity;
  }
}

class MotorControl {
  private _mode = MotorMode.Off;
  private _target = 0;

  constructor(private _setMode: (mode: MotorMode) => void, private _setTarget: (mode: MotorMode, val: number) => void) {

  }
  set mode(mode: MotorMode) {
    this._mode = mode;
    this._setMode(mode);
  }
  get mode() {
    return this._mode;
  }

  set target(val: number) {
    this._target = val;
    this._setTarget(this._mode, val);
  }
  get target() {
    return this._target;
  }
}

export class JoltHingeJoint extends JoltJoint<HingeConstraintParams, Jolt.HingeConstraint>  {

  public motor: MotorControl;

  constructor(point1: Vector3, hingeAxis: Vector3, normalAxis: Vector3, space: 'Local' | 'World' = 'World',
    point2?: Vector3, hinge2Axis?: Vector3, normal2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const h1 = hingeAxis;
    const h2 = hinge2Axis ?? h1;
    const n1 = normalAxis;
    const n2 = normal2Axis ?? n1;

    const constraint: HingeConstraintParams = {
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
    }
    super(PhysicsJoint.HingeJoint, {
      nativeParams: {
        constraint
      }
    })
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
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.getParams().limitsMin = minAngle;
    this.getParams().limitsMax = maxAngle;
    if (this.physicsJoint) {
      const joint = this.physicsJoint as Jolt.HingeConstraint;
      joint.SetLimits(minAngle, maxAngle);
    }
  }
}

export class JoltSliderJoint extends JoltJoint<SliderConstraintParams, Jolt.SliderConstraint>  {

  public motor: MotorControl;

  constructor(point1: Vector3, slideAxis: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3, slide2Axis?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const s1 = slideAxis;
    const s2 = slide2Axis ?? s1;
    const n1 = new Vector3();
    s1.getNormalToRef(n1);
    const n2 = new Vector3();
    s2.getNormalToRef(n2);

    const constraint: SliderConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      sliderAxis1: f3(s1),
      sliderAxis2: f3(s2),
      normalAxis1: f3(n1),
      normalAxis2: f3(n2),
      limitsMin: Number.MIN_SAFE_INTEGER,
      limitsMax: Number.MAX_SAFE_INTEGER,
      type: "Slider",
      maxFrictionForce: 0
    }
    super(PhysicsJoint.PrismaticJoint, {
      nativeParams: {
        constraint
      }
    })
    this.motor = new MotorControl((mode) => {
      if (this.constraint) {
        this.constraint.SetMotorState(GetMode(mode));
      }
    }, (mode, value) => {
      if (this.constraint) {
        if (mode == MotorMode.Position) {
          this.constraint.SetTargetPosition(value);
        }
        if (mode == MotorMode.Velocity) {
          this.constraint.SetTargetVelocity(value);
        }
      }
    })
  }

  setMinMax(minAngle: number, maxAngle: number) {
    this.getParams().limitsMin = minAngle;
    this.getParams().limitsMax = maxAngle;
    if (this.constraint) {
      this.constraint.SetLimits(minAngle, maxAngle);
    }
  }
}


export class JoltDistanceJoint extends JoltJoint<DistanceConstraintParams, Jolt.DistanceConstraint> {
  constructor(point1: Vector3, space: 'Local' | 'World' = 'World', point2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;

    const constraint: DistanceConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      minDistance: -1,
      maxDistance: -1,
      type: "Distance"
    }
    super(PhysicsJoint.PointToPointJoint, {
      nativeParams: {
        constraint
      }
    })
  }

  setMinMax(minVal: number, maxVal: number) {
    this.getParams().minDistance = minVal;
    this.getParams().maxDistance = maxVal;
    if (this.constraint) {
      this.constraint.SetDistance(minVal, maxVal);
    }
  }
}

export class JoltConeJoint extends JoltJoint<ConeConstraintParams, Jolt.ConeConstraint>  {

  constructor(point1: Vector3, twistAxis: Vector3, halfCone: number = 0,  space: 'Local' | 'World' = 'World', point2?: Vector3, twistAxis2?: Vector3) {
    const p1 = point1;
    const p2 = point2 ?? point1;
    const t1 = twistAxis;
    const t2 = twistAxis2 ?? t1;

    const constraint: ConeConstraintParams = {
      space,
      point1: f3(p1),
      point2: f3(p2),
      twistAxis1: f3(t1),
      twistAxis2: f3(t2),
      halfConeAngle: halfCone,
      type: "Cone"
    };
    super(PhysicsJoint.BallAndSocketJoint, {nativeParams: { constraint }})
  }

  setMax( maxAngle: number) {
    this.getParams().halfConeAngle = maxAngle;
    if (this.constraint) {
      this.constraint.SetHalfConeAngle(maxAngle);
    }
  }
}

export class JoltPathConstraint extends JoltJoint<PathConstraintParams, Jolt.PathConstraint>  {
  public motor: MotorControl;

  constructor(points: Vector3[] | Path3D, type: RotationConstraintType = 'Free') {

    const constraint: PathConstraintParams = {
      type: 'Path',
      path: points,
      pathPosition: [0,0,0],
      pathRotation: [0,0,0, 1],
      pathNormal: [[0, 1, 0]],
      pathFraction: 0,
      rotationConstraintType: type,
      maxFrictionForce: 0
    };
    super(-1, {nativeParams: { constraint}})
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
      }
    })
  }

  setPathNormals(normal: Vector3 | Vector3[]) {
    if(normal instanceof Array && normal.length > 1 && normal.length != this.getParams().path.length) {
      throw new Error('Path Normal must either be single item or equal to number of points in path')
    }
    const params = this.getParams();
    params.pathNormal = normal;
    if(params.pathObject) {
      params.pathObject.setPathNormals(normal);
    }
  }

  setPathOffset(position: Vector3, rotation: Quaternion) {
    if(this.physicsJoint) {
      throw new Error('Unable to modify path offset after creation')
    }
    const params = this.getParams();
    params.pathPosition = f3(position);
    params.pathRotation = f4(rotation);
  }

  setPathStartPosition(val: Vector3) {
    if(this.physicsJoint) {
      throw new Error('Unable to modify path fraction after creation')
    }
    const params = this.getParams();
    params.pathStartPosition = f3(val);
  }

  setPathFraction(val: float) {
    if(this.physicsJoint) {
      throw new Error('Unable to modify path fraction after creation')
    }
    const params = this.getParams();
    params.pathFraction = val;
  }

}