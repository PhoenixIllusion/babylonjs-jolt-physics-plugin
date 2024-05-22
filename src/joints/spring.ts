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

export class SpringControl<P extends JoltConstraint & { spring?: SpringSettings }, C extends Jolt.TwoBodyConstraint & { GetLimitsSpringSettings(): Jolt.SpringSettings }> {
  private _mode = SpringMode.Frequency;

  constructor(private _joint: JoltJoint<P, C>) { }

  private get settings(): SpringSettings {
    const setting = this._joint.getParams().spring = this._joint.getParams().spring || { mode: 'Frequency' }
    return setting;
  }

  private get constraint(): C | undefined {
    return this._joint.constraint;
  }

  set mode(mode: SpringMode) {
    this._mode = mode;
    this.settings.mode = mode == SpringMode.Frequency ? 'Frequency' : 'Stiffness';
    if (this.constraint) {
      this.constraint.GetLimitsSpringSettings().mMode = GetSpringMode(mode);
    }
  }
  get mode() {
    return this._mode;
  }

  set frequency(val: number) {
    this.settings.frequency = val;
    if (this.constraint) {
      this.constraint.GetLimitsSpringSettings().mFrequency = val;
    }
  }
  get frequency(): number | undefined {
    return this.settings.frequency;
  }

  set damping(val: number) {
    this.settings.damping = val;
    if (this.constraint) {
      this.constraint.GetLimitsSpringSettings().mDamping = val;
    }
  }
  get damping(): number | undefined {
    return this.settings.damping;
  }

  set stiffness(val: number) {
    this.settings.stiffness = val;
    if (this.constraint) {
      this.constraint.GetLimitsSpringSettings().mStiffness = val;
    }
  }
  get stiffness(): number | undefined {
    return this.settings.stiffness;
  }

}