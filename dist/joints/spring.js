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
export class Spring {
    constructor(getSpringSettings) {
        this.getSpringSettings = getSpringSettings;
        this._mode = SpringMode.Frequency;
        this._setting = { mode: 'Frequency' };
    }
    get springSettings() {
        return this.getSpringSettings();
    }
    getSettings() {
        return this._setting;
    }
    get settings() {
        return this.getSettings();
    }
    set mode(mode) {
        this._mode = mode;
        this.settings.mode = mode == SpringMode.Frequency ? 'Frequency' : 'Stiffness';
        const settings = this.springSettings;
        if (settings) {
            settings.mMode = GetSpringMode(mode);
        }
    }
    get mode() {
        return this._mode;
    }
    set frequency(val) {
        this.settings.frequency = val;
        const settings = this.springSettings;
        if (settings) {
            settings.mFrequency = val;
        }
    }
    get frequency() {
        return this.settings.frequency;
    }
    set damping(val) {
        this.settings.damping = val;
        const settings = this.springSettings;
        if (settings) {
            settings.mDamping = val;
        }
    }
    get damping() {
        return this.settings.damping;
    }
    set stiffness(val) {
        this.settings.stiffness = val;
        const settings = this.springSettings;
        if (settings) {
            settings.mStiffness = val;
        }
    }
    get stiffness() {
        return this.settings.stiffness;
    }
}
export class SpringControl extends Spring {
    constructor(_joint) {
        super(() => {
            return this._joint.constraint && this._joint.constraint.GetLimitsSpringSettings();
        });
        this._joint = _joint;
    }
    getSettings() {
        const setting = this._joint.getParams().spring = this._joint.getParams().spring || { mode: 'Frequency' };
        return setting;
    }
}
