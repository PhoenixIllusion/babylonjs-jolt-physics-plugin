import { JoltJoint } from ".";
import { JoltConstraint, SpringSettings } from "../constraints";
import Jolt from "../jolt-import";

export enum SpringMode {
  Frequency,
  Stiffness
}

export function GetSpringMode(mode: SpringMode): Jolt.ESpringMode {
  switch (mode) {
    case SpringMode.Frequency: return Jolt.ESpringMode_FrequencyAndDamping;
    case SpringMode.Stiffness: return Jolt.ESpringMode_StiffnessAndDamping;
  }
}

export class Spring {
  private _mode: SpringMode = SpringMode.Frequency;
  private _setting: SpringSettings = { mode: 'Frequency' };

  constructor(private getSpringSettings: () => Jolt.SpringSettings | undefined) {

  }
  private get springSettings(): Jolt.SpringSettings | undefined {
    return this.getSpringSettings();
  }

  protected getSettings(): SpringSettings {
    return this._setting;
  }

  private get settings(): SpringSettings {
    return this.getSettings();
  }

  set mode(mode: SpringMode) {
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

  set frequency(val: number) {
    this.settings.frequency = val;
    const settings = this.springSettings;
    if (settings) {
      settings.mFrequency = val;
    }
  }
  get frequency(): number | undefined {
    return this.settings.frequency;
  }

  set damping(val: number) {
    this.settings.damping = val;
    const settings = this.springSettings;
    if (settings) {
      settings.mDamping = val;
    }
  }
  get damping(): number | undefined {
    return this.settings.damping;
  }

  set stiffness(val: number) {
    this.settings.stiffness = val;
    const settings = this.springSettings;
    if (settings) {
      settings.mStiffness = val;
    }
  }
  get stiffness(): number | undefined {
    return this.settings.stiffness;
  }

}

export class SpringControl<P extends JoltConstraint & { spring?: SpringSettings }, C extends Jolt.TwoBodyConstraint & { GetLimitsSpringSettings(): Jolt.SpringSettings }> extends Spring {
  constructor(private _joint: JoltJoint<P, C>) {
    super(() => {
      return this._joint.constraint && this._joint.constraint.GetLimitsSpringSettings()
    })
  }

  override getSettings(): SpringSettings {
    const setting = this._joint.getParams().spring = this._joint.getParams().spring || { mode: 'Frequency' }
    return setting;
  }
}