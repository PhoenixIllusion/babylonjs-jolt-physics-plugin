import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
export declare class Wheel {
    private _radius;
    private _width;
    private _position;
    private _up;
    private _forward;
    worldPosition: Vector3;
    worldRotation: Quaternion;
    settings: Jolt.WheelSettings;
    constructor(wheel: Jolt.Wheel);
    get radius(): number;
    set radius(v: number);
    get width(): number;
    set width(v: number);
    get position(): Vector3;
    set position(v: Vector3);
    get up(): Vector3;
    set up(v: Vector3);
    get forward(): Vector3;
    set forward(v: Vector3);
    updateFrom(transform: Jolt.Mat44): void;
}
export declare class WheelTV extends Wheel {
    settingsTV: Jolt.WheelSettingsTV;
    private _longitudinalFriction;
    private _lateralFriction;
    constructor(wheel: Jolt.WheelTV);
    get longitudinalFriction(): number;
    set longitudinalFriction(v: number);
    get lateralFriction(): number;
    set lateralFriction(v: number);
}
export declare class WheelWV extends Wheel {
    settingsWV: Jolt.WheelSettingsWV;
    private _maxBrakeTorque;
    private _maxHandBrakeTorque;
    private _maxSteerAngle;
    private _lateralFriction;
    private _longitudinalFriction;
    constructor(wheel: Jolt.WheelWV);
    get maxBrakeTorque(): number;
    set maxBrakeTorque(v: number);
    get maxHandBrakeTorque(): number;
    set maxHandBrakeTorque(v: number);
    get maxSteerAngle(): number;
    set maxSteerAngle(v: number);
    get lateralFriction(): [number, number][];
    set lateralFriction(v: [number, number][]);
    get longitudinalFriction(): [number, number][];
    set longitudinalFriction(v: [number, number][]);
}
export declare class Engine {
    private engine;
    private _maxTorque;
    private _minRPM;
    private _maxRPM;
    private _inertia;
    private _angularDamping;
    constructor(engine: Jolt.VehicleEngine);
    get maxTorque(): number;
    set maxTorque(v: number);
    get minRPM(): number;
    set minRPM(v: number);
    get maxRPM(): number;
    set maxRPM(v: number);
    get inertia(): number;
    set inertia(v: number);
    get angularDamping(): number;
    set angularDamping(v: number);
    get rpm(): number;
    set rpm(v: number);
}
export type TransmissionMode = 'manual' | 'auto';
export declare class Transmission {
    private transmission;
    private _mode;
    private _switchTime;
    private _clutchReleaseTime;
    private _switchLatency;
    private _shiftUpRPM;
    private _shiftDownRPM;
    private _clutchStrength;
    private _gearRatios;
    constructor(transmission: Jolt.VehicleTransmission);
    changeGear(gear: number, friction?: number): void;
    get gear(): number;
    get gearRatio(): number;
    get gearRatios(): number[];
    get isSwitchingGear(): boolean;
    set mode(v: TransmissionMode);
    get mode(): TransmissionMode;
    get switchTime(): number;
    set switchTime(v: number);
    get clutchReleaseTime(): number;
    set clutchReleaseTime(v: number);
    get switchLatency(): number;
    set switchLatency(v: number);
    get shiftUpRPM(): number;
    set shiftUpRPM(v: number);
    get shiftDownRPM(): number;
    set shiftDownRPM(v: number);
    get clutchStrength(): number;
    set clutchStrength(v: number);
}
