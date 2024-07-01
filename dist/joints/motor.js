import Jolt from "../jolt-import";
import { Spring } from "./spring";
export var MotorMode;
(function (MotorMode) {
    MotorMode[MotorMode["Off"] = 0] = "Off";
    MotorMode[MotorMode["Position"] = 1] = "Position";
    MotorMode[MotorMode["Velocity"] = 2] = "Velocity";
})(MotorMode || (MotorMode = {}));
export function GetMode(mode) {
    switch (mode) {
        case MotorMode.Off: return Jolt.EMotorState_Off;
        case MotorMode.Position: return Jolt.EMotorState_Position;
        case MotorMode.Velocity: return Jolt.EMotorState_Velocity;
    }
}
class ForceLimit {
    constructor(getMotor) {
        this.getMotor = getMotor;
    }
    get motorSettings() {
        return this.getMotor();
    }
    get min() { return this.motorSettings.mMinForceLimit; }
    set min(v) { this.motorSettings.mMinForceLimit = v; }
    get max() { return this.motorSettings.mMaxForceLimit; }
    set max(v) { this.motorSettings.mMaxForceLimit = v; }
}
class TorqueLimit {
    constructor(getMotor) {
        this.getMotor = getMotor;
    }
    get motorSettings() {
        return this.getMotor();
    }
    get min() { return this.motorSettings.mMinTorqueLimit; }
    set min(v) { this.motorSettings.mMinTorqueLimit = v; }
    get max() { return this.motorSettings.mMaxTorqueLimit; }
    set max(v) { this.motorSettings.mMaxTorqueLimit = v; }
}
export class MotorControl {
    constructor(_setMode, _setTarget, motorSettings) {
        this._setMode = _setMode;
        this._setTarget = _setTarget;
        this._mode = MotorMode.Off;
        this._target = 0;
        this.forceLimit = new ForceLimit(motorSettings);
        this.torqueLimit = new TorqueLimit(motorSettings);
        this.spring = new Spring(() => motorSettings().mSpringSettings);
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
