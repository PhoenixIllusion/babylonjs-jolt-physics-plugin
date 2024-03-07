import Jolt from "../jolt-import";

export enum MotorMode {
  Off,
  Position,
  Velocity
}

export function GetMode(mode: MotorMode) {
  switch (mode) {
    case MotorMode.Off: return Jolt.EMotorState_Off;
    case MotorMode.Position: return Jolt.EMotorState_Position;
    case MotorMode.Velocity: return Jolt.EMotorState_Velocity;
  }
}

export class MotorControl {
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