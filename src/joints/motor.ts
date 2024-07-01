import Jolt from "../jolt-import";
import { Spring } from "./spring";

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

class ForceLimit {
  constructor(private getMotor: () => Jolt.MotorSettings) {

  }
  private get motorSettings(): Jolt.MotorSettings {
    return this.getMotor();
  }

  get min(): number { return this.motorSettings.mMinForceLimit; }
  set min(v: number) { this.motorSettings.mMinForceLimit = v }

  get max(): number { return this.motorSettings.mMaxForceLimit; }
  set max(v: number) { this.motorSettings.mMaxForceLimit = v }
}

class TorqueLimit {
  constructor(private getMotor: () => Jolt.MotorSettings) {

  }
  private get motorSettings(): Jolt.MotorSettings {
    return this.getMotor();
  }
  get min(): number { return this.motorSettings.mMinTorqueLimit; }
  set min(v: number) { this.motorSettings.mMinTorqueLimit = v }

  get max(): number { return this.motorSettings.mMaxTorqueLimit; }
  set max(v: number) { this.motorSettings.mMaxTorqueLimit = v }
}

export class MotorControl {
  private _mode = MotorMode.Off;
  private _target = 0;

  public readonly forceLimit: ForceLimit;
  public readonly torqueLimit: TorqueLimit;
  public readonly spring: Spring;

  constructor(private _setMode: (mode: MotorMode) => void, private _setTarget: (mode: MotorMode, val: number) => void, motorSettings: () => Jolt.MotorSettings) {
    this.forceLimit = new ForceLimit(motorSettings);
    this.torqueLimit = new TorqueLimit(motorSettings);
    this.spring = new Spring(() => motorSettings().mSpringSettings);
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