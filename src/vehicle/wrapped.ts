import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { GetJoltQuat, GetJoltVec3, SetJoltVec3 } from "../jolt-util";

export class Wheel {
  private _radius: number;
  private _width: number;
  private _position: Vector3 = new Vector3();
  private _up: Vector3 = new Vector3();
  private _forward: Vector3 = new Vector3();

  public worldPosition: Vector3 = new Vector3();
  public worldRotation: Quaternion = new Quaternion();

  settings: Jolt.WheelSettings;
  constructor(wheel: Jolt.Wheel) {
    const settings = this.settings = wheel.GetSettings();
    this._radius = settings.mRadius;
    this._width = settings.mWidth;
    GetJoltVec3(settings.mPosition, this._position);
    GetJoltVec3(settings.mWheelUp, this._up);
    GetJoltVec3(settings.mWheelForward, this._forward);
  }

  get radius() { return this._radius; }
  set radius(v: number) { this._radius = v; this.settings.mRadius = v; }

  get width() { return this._width }
  set width(v: number) { this._width = v; this.settings.mWidth = v; }

  get position() { return this._position }
  set position(v: Vector3) { this._position.copyFrom(v); SetJoltVec3(v, this.settings.mPosition); }

  get up() { return this._up }
  set up(v: Vector3) { this._up.copyFrom(v); SetJoltVec3(v, this.settings.mWheelUp); }

  get forward() { return this._forward }
  set forward(v: Vector3) { this._forward.copyFrom(v); SetJoltVec3(v, this.settings.mWheelForward); }

  updateFrom(transform: Jolt.Mat44) {
    GetJoltVec3(transform.GetTranslation(), this.worldPosition);
    GetJoltQuat(transform.GetRotation().GetQuaternion(), this.worldRotation);
  }
}

export class Engine {
  private _maxTorque: number;
  private _minRPM: number;
  private _maxRPM: number;
  private _inertia: number;
  private _angularDamping: number;

  constructor(private engine: Jolt.VehicleEngine) {
    this._maxRPM = engine.mMaxRPM;
    this._minRPM = engine.mMinRPM;
    this._maxTorque = engine.mMaxTorque;
    this._inertia = engine.mInertia;
    this._angularDamping = engine.mAngularDamping;
  }

  get maxTorque() { return this._maxTorque; }
  set maxTorque(v: number) { this._maxTorque = v; this.engine.mMaxTorque = v; }

  get minRPM() { return this._minRPM; }
  set minRPM(v: number) { this._minRPM = v; this.engine.mMinRPM = v; }

  get maxRPM() { return this._maxRPM; }
  set maxRPM(v: number) { this._maxRPM = v; this.engine.mMaxRPM = v; }

  get inertia() { return this._inertia; }
  set inertia(v: number) { this._inertia = v; this.engine.mInertia = v; }

  get angularDamping() { return this._angularDamping; }
  set angularDamping(v: number) { this._angularDamping = v; this.engine.mAngularDamping = v; }

  get rpm() { return this.engine.GetCurrentRPM(); }
  set rpm(v: number) { this.engine.SetCurrentRPM(v); }
}

export type TransmissionMode = 'manual' | 'auto';

export class Transmission {

  private _mode: TransmissionMode;
  private _switchTime: number;
  private _clutchReleaseTime: number;
  private _switchLatency: number;
  private _shiftUpRPM: number;
  private _shiftDownRPM: number;
  private _clutchStrength: number;
  private _gearRatios: number[];

  constructor(private transmission: Jolt.VehicleTransmission) {
    this._mode = transmission.mMode === Jolt.ETransmissionMode_Auto ? 'auto' : 'manual';
    this._switchTime = transmission.mSwitchTime;
    this._clutchReleaseTime = transmission.mClutchReleaseTime;
    this._switchLatency = transmission.mSwitchLatency;
    this._shiftUpRPM = transmission.mShiftUpRPM;
    this._shiftDownRPM = transmission.mShiftDownRPM;
    this._clutchStrength = transmission.mClutchStrength;
    this._gearRatios = [];
    for(let i=0;i<transmission.mGearRatios.size();i++) {
      this._gearRatios[i] = transmission.mGearRatios.at(i);
    }
  }

  changeGear(gear: number, friction: number = 0) {
    this.transmission.Set(gear, friction);
  }
  get gear() { return this.transmission.GetCurrentGear(); }
  get gearRatio() { return this.transmission.GetCurrentRatio(); }
  get gearRatios() { return this._gearRatios};
  get isSwitchingGear() { return this.transmission.IsSwitchingGear(); }

  set mode(v: TransmissionMode) { this._mode = v; this.transmission.mMode = v == 'auto' ? Jolt.ETransmissionMode_Auto : Jolt.ETransmissionMode_Manual }
  get mode(): TransmissionMode { return this._mode; }

  get switchTime() { return this._switchTime; }
  set switchTime(v: number) { this._switchTime = v; this.transmission.mSwitchTime = v; }

  get clutchReleaseTime() { return this._clutchReleaseTime; }
  set clutchReleaseTime(v: number) { this._clutchReleaseTime = v; this.transmission.mClutchReleaseTime = v; }

  get switchLatency() { return this._switchLatency; }
  set switchLatency(v: number) { this._switchLatency = v; this.transmission.mSwitchLatency = v; }

  get shiftUpRPM() { return this._shiftUpRPM; }
  set shiftUpRPM(v: number) { this._shiftUpRPM = v; this.transmission.mShiftUpRPM = v; }

  get shiftDownRPM() { return this._shiftDownRPM; }
  set shiftDownRPM(v: number) { this._shiftDownRPM = v; this.transmission.mShiftDownRPM = v; }

  get clutchStrength() { return this._clutchStrength; }
  set clutchStrength(v: number) { this._clutchStrength = v; this.transmission.mClutchStrength = v; }
}
