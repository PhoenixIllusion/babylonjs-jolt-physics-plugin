import Jolt from "../jolt-import";
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
export class MotorControl {
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
