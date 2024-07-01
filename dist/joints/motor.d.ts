import Jolt from "../jolt-import";
import { Spring } from "./spring";
export declare enum MotorMode {
    Off = 0,
    Position = 1,
    Velocity = 2
}
export declare function GetMode(mode: MotorMode): number;
declare class ForceLimit {
    private getMotor;
    constructor(getMotor: () => Jolt.MotorSettings);
    private get motorSettings();
    get min(): number;
    set min(v: number);
    get max(): number;
    set max(v: number);
}
declare class TorqueLimit {
    private getMotor;
    constructor(getMotor: () => Jolt.MotorSettings);
    private get motorSettings();
    get min(): number;
    set min(v: number);
    get max(): number;
    set max(v: number);
}
export declare class MotorControl {
    private _setMode;
    private _setTarget;
    private _mode;
    private _target;
    readonly forceLimit: ForceLimit;
    readonly torqueLimit: TorqueLimit;
    readonly spring: Spring;
    constructor(_setMode: (mode: MotorMode) => void, _setTarget: (mode: MotorMode, val: number) => void, motorSettings: () => Jolt.MotorSettings);
    set mode(mode: MotorMode);
    get mode(): MotorMode;
    set target(val: number);
    get target(): number;
}
export {};
