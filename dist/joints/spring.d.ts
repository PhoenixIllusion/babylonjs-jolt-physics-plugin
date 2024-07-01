import { JoltJoint } from ".";
import { JoltConstraint, SpringSettings } from "../constraints";
import Jolt from "../jolt-import";
export declare enum SpringMode {
    Frequency = 0,
    Stiffness = 1
}
export declare function GetSpringMode(mode: SpringMode): Jolt.ESpringMode;
export declare class Spring {
    private getSpringSettings;
    private _mode;
    private _setting;
    constructor(getSpringSettings: () => Jolt.SpringSettings | undefined);
    private get springSettings();
    protected getSettings(): SpringSettings;
    private get settings();
    set mode(mode: SpringMode);
    get mode(): SpringMode;
    set frequency(val: number);
    get frequency(): number | undefined;
    set damping(val: number);
    get damping(): number | undefined;
    set stiffness(val: number);
    get stiffness(): number | undefined;
}
export declare class SpringControl<P extends JoltConstraint & {
    spring?: SpringSettings;
}, C extends Jolt.TwoBodyConstraint & {
    GetLimitsSpringSettings(): Jolt.SpringSettings;
}> extends Spring {
    private _joint;
    constructor(_joint: JoltJoint<P, C>);
    getSettings(): SpringSettings;
}
