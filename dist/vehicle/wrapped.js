import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { GetJoltQuat, GetJoltVec3, SetJoltVec3 } from "../jolt-util";
export class Wheel {
    constructor(wheel) {
        this._position = new Vector3();
        this._up = new Vector3();
        this._forward = new Vector3();
        this.worldPosition = new Vector3();
        this.worldRotation = new Quaternion();
        const settings = this.settings = wheel.GetSettings();
        this._radius = settings.mRadius;
        this._width = settings.mWidth;
        GetJoltVec3(settings.mPosition, this._position);
        GetJoltVec3(settings.mWheelUp, this._up);
        GetJoltVec3(settings.mWheelForward, this._forward);
    }
    get radius() { return this._radius; }
    set radius(v) { this._radius = v; this.settings.mRadius = v; }
    get width() { return this._width; }
    set width(v) { this._width = v; this.settings.mWidth = v; }
    get position() { return this._position; }
    set position(v) { this._position.copyFrom(v); SetJoltVec3(v, this.settings.mPosition); }
    get up() { return this._up; }
    set up(v) { this._up.copyFrom(v); SetJoltVec3(v, this.settings.mWheelUp); }
    get forward() { return this._forward; }
    set forward(v) { this._forward.copyFrom(v); SetJoltVec3(v, this.settings.mWheelForward); }
    updateFrom(transform) {
        GetJoltVec3(transform.GetTranslation(), this.worldPosition);
        GetJoltQuat(transform.GetRotation().GetQuaternion(), this.worldRotation);
    }
}
export class WheelTV extends Wheel {
    constructor(wheel) {
        super(wheel);
        const settings = this.settingsTV = wheel.GetSettings();
        this._longitudinalFriction = settings.mLongitudinalFriction;
        this._lateralFriction = settings.mLateralFriction;
    }
    get longitudinalFriction() { return this._longitudinalFriction; }
    set longitudinalFriction(v) { this._longitudinalFriction = v; this.settingsTV.mLongitudinalFriction = v; }
    get lateralFriction() { return this._lateralFriction; }
    set lateralFriction(v) { this._lateralFriction = v; this.settingsTV.mLateralFriction = v; }
}
export class WheelWV extends Wheel {
    constructor(wheel) {
        super(wheel);
        this._lateralFriction = [];
        this._longitudinalFriction = [];
        const settings = this.settingsWV = wheel.GetSettings();
        this._maxBrakeTorque = settings.mMaxBrakeTorque;
        this._maxHandBrakeTorque = settings.mMaxHandBrakeTorque;
        this._maxSteerAngle = settings.mMaxSteerAngle;
    }
    get maxBrakeTorque() { return this._maxBrakeTorque; }
    set maxBrakeTorque(v) { this._maxBrakeTorque = v; this.settingsWV.mMaxBrakeTorque = v; }
    get maxHandBrakeTorque() { return this._maxHandBrakeTorque; }
    set maxHandBrakeTorque(v) { this._maxHandBrakeTorque = v; this.settingsWV.mMaxBrakeTorque = v; }
    get maxSteerAngle() { return this._maxSteerAngle; }
    set maxSteerAngle(v) { this._maxSteerAngle = v; this.settingsWV.mMaxSteerAngle = v; }
    get lateralFriction() { return this._lateralFriction; }
    set lateralFriction(v) {
        this.settingsWV.mLateralFriction.Clear();
        v.forEach(([x, y]) => {
            this.settingsWV.mLateralFriction.AddPoint(x, y);
        });
    }
    get longitudinalFriction() { return this._longitudinalFriction; }
    set longitudinalFriction(v) {
        this.settingsWV.mLongitudinalFriction.Clear();
        v.forEach(([x, y]) => {
            this.settingsWV.mLongitudinalFriction.AddPoint(x, y);
        });
    }
}
export class Engine {
    constructor(engine) {
        this.engine = engine;
        this._maxRPM = engine.mMaxRPM;
        this._minRPM = engine.mMinRPM;
        this._maxTorque = engine.mMaxTorque;
        this._inertia = engine.mInertia;
        this._angularDamping = engine.mAngularDamping;
    }
    get maxTorque() { return this._maxTorque; }
    set maxTorque(v) { this._maxTorque = v; this.engine.mMaxTorque = v; }
    get minRPM() { return this._minRPM; }
    set minRPM(v) { this._minRPM = v; this.engine.mMinRPM = v; }
    get maxRPM() { return this._maxRPM; }
    set maxRPM(v) { this._maxRPM = v; this.engine.mMaxRPM = v; }
    get inertia() { return this._inertia; }
    set inertia(v) { this._inertia = v; this.engine.mInertia = v; }
    get angularDamping() { return this._angularDamping; }
    set angularDamping(v) { this._angularDamping = v; this.engine.mAngularDamping = v; }
    get rpm() { return this.engine.GetCurrentRPM(); }
    set rpm(v) { this.engine.SetCurrentRPM(v); }
}
export class Transmission {
    constructor(transmission) {
        this.transmission = transmission;
        this._mode = transmission.mMode === Jolt.ETransmissionMode_Auto ? 'auto' : 'manual';
        this._switchTime = transmission.mSwitchTime;
        this._clutchReleaseTime = transmission.mClutchReleaseTime;
        this._switchLatency = transmission.mSwitchLatency;
        this._shiftUpRPM = transmission.mShiftUpRPM;
        this._shiftDownRPM = transmission.mShiftDownRPM;
        this._clutchStrength = transmission.mClutchStrength;
        this._gearRatios = [];
        for (let i = 0; i < transmission.mGearRatios.size(); i++) {
            this._gearRatios[i] = transmission.mGearRatios.at(i);
        }
    }
    changeGear(gear, friction = 0) {
        this.transmission.Set(gear, friction);
    }
    get gear() { return this.transmission.GetCurrentGear(); }
    get gearRatio() { return this.transmission.GetCurrentRatio(); }
    get gearRatios() { return this._gearRatios; }
    ;
    get isSwitchingGear() { return this.transmission.IsSwitchingGear(); }
    set mode(v) { this._mode = v; this.transmission.mMode = v == 'auto' ? Jolt.ETransmissionMode_Auto : Jolt.ETransmissionMode_Manual; }
    get mode() { return this._mode; }
    get switchTime() { return this._switchTime; }
    set switchTime(v) { this._switchTime = v; this.transmission.mSwitchTime = v; }
    get clutchReleaseTime() { return this._clutchReleaseTime; }
    set clutchReleaseTime(v) { this._clutchReleaseTime = v; this.transmission.mClutchReleaseTime = v; }
    get switchLatency() { return this._switchLatency; }
    set switchLatency(v) { this._switchLatency = v; this.transmission.mSwitchLatency = v; }
    get shiftUpRPM() { return this._shiftUpRPM; }
    set shiftUpRPM(v) { this._shiftUpRPM = v; this.transmission.mShiftUpRPM = v; }
    get shiftDownRPM() { return this._shiftDownRPM; }
    set shiftDownRPM(v) { this._shiftDownRPM = v; this.transmission.mShiftDownRPM = v; }
    get clutchStrength() { return this._clutchStrength; }
    set clutchStrength(v) { this._clutchStrength = v; this.transmission.mClutchStrength = v; }
}
