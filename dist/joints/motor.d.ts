export declare enum MotorMode {
    Off = 0,
    Position = 1,
    Velocity = 2
}
export declare function GetMode(mode: MotorMode): number;
export declare class MotorControl {
    private _setMode;
    private _setTarget;
    private _mode;
    private _target;
    constructor(_setMode: (mode: MotorMode) => void, _setTarget: (mode: MotorMode, val: number) => void);
    set mode(mode: MotorMode);
    get mode(): MotorMode;
    set target(val: number);
    get target(): number;
}
