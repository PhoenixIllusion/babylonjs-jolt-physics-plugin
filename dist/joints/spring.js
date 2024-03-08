import Jolt from "../jolt-import";
export var SpringMode;
(function (SpringMode) {
    SpringMode[SpringMode["Frequency"] = 0] = "Frequency";
    SpringMode[SpringMode["Stiffness"] = 1] = "Stiffness";
})(SpringMode || (SpringMode = {}));
export function GetSpringMode(mode) {
    switch (mode) {
        case SpringMode.Frequency: return Jolt.ESpringMode_FrequencyAndDamping;
        case SpringMode.Stiffness: return Jolt.ESpringMode_StiffnessAndDamping;
    }
}
export class SpringControl {
    constructor(_joint) {
        this._joint = _joint;
        this._mode = SpringMode.Frequency;
    }
    get settings() {
        const setting = this._joint.getParams().spring = this._joint.getParams().spring || { mode: 'Frequency' };
        return setting;
    }
    get constraint() {
        return this._joint.constraint;
    }
    set mode(mode) {
        this._mode = mode;
        this.settings.mode = mode == SpringMode.Frequency ? 'Frequency' : 'Stiffness';
        if (this.constraint) {
            this.constraint.GetLimitsSpringSettings().mMode = GetSpringMode(mode);
        }
    }
    get mode() {
        return this._mode;
    }
    set frequency(val) {
        this.settings.frequency = val;
        if (this.constraint) {
            this.constraint.GetLimitsSpringSettings().mFrequency = val;
        }
    }
    get frequency() {
        return this.settings.frequency;
    }
    set damping(val) {
        this.settings.damping = val;
        if (this.constraint) {
            this.constraint.GetLimitsSpringSettings().mDamping = val;
        }
    }
    get damping() {
        return this.settings.damping;
    }
    set stiffness(val) {
        this.settings.stiffness = val;
        if (this.constraint) {
            this.constraint.GetLimitsSpringSettings().mStiffness = val;
        }
    }
    get stiffness() {
        return this.settings.stiffness;
    }
}
