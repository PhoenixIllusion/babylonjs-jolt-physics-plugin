import { JoltJoint } from ".";
import { JoltConstraint, SpringSettings } from "../constraints";
import Jolt from "../jolt-import";
export declare enum SpringMode {
    Frequency = 0,
    Stiffness = 1
}
export declare function GetSpringMode(mode: SpringMode): Jolt.ESpringMode;
export declare class SpringControl<P extends JoltConstraint & {
    spring?: SpringSettings;
}, C extends Jolt.TwoBodyConstraint & {
    GetLimitsSpringSettings(): Jolt.SpringSettings;
}> {
    private _joint;
    private _mode;
    constructor(_joint: JoltJoint<P, C>);
    private get settings();
    private get constraint();
    set mode(mode: SpringMode);
    get mode(): SpringMode;
    set frequency(val: number);
    get frequency(): number | undefined;
    set damping(val: number);
    get damping(): number | undefined;
    set stiffness(val: number);
    get stiffness(): number | undefined;
}
