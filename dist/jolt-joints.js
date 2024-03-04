import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
const f3 = (v) => [v.x, v.y, v.z];
const f4 = (v) => [v.x, v.y, v.z, v.w];
class JoltJoint extends PhysicsJoint {
    get constraint() {
        return this.physicsJoint;
    }
    getParams() {
        return this.jointData.nativeParams.constraint;
    }
}
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
export var MotorMode;
(function (MotorMode) {
    MotorMode[MotorMode["Off"] = 0] = "Off";
    MotorMode[MotorMode["Position"] = 1] = "Position";
    MotorMode[MotorMode["Velocity"] = 2] = "Velocity";
})(MotorMode || (MotorMode = {}));
function GetMode(mode) {
    switch (mode) {
        case MotorMode.Off: return Jolt.EMotorState_Off;
        case MotorMode.Position: return Jolt.EMotorState_Position;
        case MotorMode.Velocity: return Jolt.EMotorState_Velocity;
    }
}
class MotorControl {
    constructor(_setMode, _setTarget) {
        this._setMode = _setMode;
        this._setTarget = _setTarget;
        this._mode = MotorMode.Off;
        this._target = 0;
    }
    set mode(mode) {
        this._mode = mode;
        this._setMode(mode);
    }
    get mode() {
        return this._mode;
    }
    set target(val) {
        this._target = val;
        this._setTarget(this._mode, val);
    }
    get target() {
        return this._target;
    }
}
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
export class JoltSliderJoint extends JoltJoint {
    constructor(point1, slideAxis, space = 'World', point2, slide2Axis) {
        const p1 = point1;
        const p2 = point2 ?? point1;
        const s1 = slideAxis;
        const s2 = slide2Axis ?? s1;
        const n1 = new Vector3();
        s1.getNormalToRef(n1);
        const n2 = new Vector3();
        s2.getNormalToRef(n2);
        const constraint = {
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
        };
        super(PhysicsJoint.PrismaticJoint, {
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
                    this.constraint.SetTargetPosition(value);
                }
                if (mode == MotorMode.Velocity) {
                    this.constraint.SetTargetVelocity(value);
                }
            }
        });
    }
    setMinMax(minAngle, maxAngle) {
        this.getParams().limitsMin = minAngle;
        this.getParams().limitsMax = maxAngle;
        if (this.constraint) {
            this.constraint.SetLimits(minAngle, maxAngle);
        }
    }
}
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
    }
    setMinMax(minVal, maxVal) {
        this.getParams().minDistance = minVal;
        this.getParams().maxDistance = maxVal;
        if (this.constraint) {
            this.constraint.SetDistance(minVal, maxVal);
        }
    }
}
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
export class JoltPathConstraint extends JoltJoint {
    constructor(points, type = 'Free') {
        const constraint = {
            type: 'Path',
            path: points,
            pathPosition: [0, 0, 0],
            pathRotation: [0, 0, 0, 1],
            pathNormal: [[0, 1, 0]],
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
            }
        });
    }
    setPathNormals(normal) {
        if (normal instanceof Array && normal.length > 1 && normal.length != this.getParams().path.length) {
            throw new Error('Path Normal must either be single item or equal to number of points in path');
        }
        const params = this.getParams();
        params.pathNormal = normal;
        if (params.pathObject) {
            params.pathObject.setPathNormals(normal);
        }
    }
    setPathTangents(tangent) {
        if (tangent instanceof Array && tangent.length > 1 && tangent.length != this.getParams().path.length) {
            throw new Error('Path Tangent must either be single item or equal to number of points in path');
        }
        const params = this.getParams();
        params.pathTangent = tangent;
        if (params.pathObject) {
            params.pathObject.setPathTangents(tangent);
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
    setPathFraction(val) {
        if (this.physicsJoint) {
            throw new Error('Unable to modify path fraction after creation');
        }
        const params = this.getParams();
        params.pathFraction = val;
    }
}
