import Jolt from "../jolt-import";
import { LAYER_MOVING, SetJoltVec3 } from "../jolt-util";
import type { JoltJSPlugin } from "../jolt-physics";
import "../jolt-impostor";
import { Vehicle } from "./types";
import { BaseVehicleInput } from "./input";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Engine, Transmission, Wheel } from "./wrapped";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";


export function configureWheel(wheel: Jolt.WheelSettings, setting: Vehicle.WheelSetting): void {
  SetJoltVec3(setting.position, wheel.mPosition);
  wheel.mWidth = setting.width;
  wheel.mRadius = setting.radius;
  if (setting.steeringAxis !== undefined) {
    SetJoltVec3(setting.steeringAxis, wheel.mSteeringAxis);
  }
  if (setting.forward !== undefined) {
    SetJoltVec3(setting.forward, wheel.mWheelForward);
  }
  if (setting.up !== undefined) {
    SetJoltVec3(setting.up, wheel.mWheelUp);
  }
  if (setting.suspension !== undefined) {
    const suspension = setting.suspension;
    if (suspension.direction !== undefined) {
      SetJoltVec3(suspension.direction, wheel.mSuspensionDirection);
    }
    if (suspension.maxLength !== undefined) {
      wheel.mSuspensionMaxLength = suspension.maxLength;
    }
    if (suspension.minLength !== undefined) {
      wheel.mSuspensionMinLength = suspension.minLength;
    }
    if (suspension.spring !== undefined) {
      const spring = suspension.spring;
      if (spring.mode !== undefined) {
        wheel.mSuspensionSpring.mMode = spring.mode == 'frequency' ? Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
      }
      if (spring.frequency !== undefined) {
        wheel.mSuspensionSpring.mFrequency = spring.frequency;
      }
      if (spring.stiffness !== undefined) {
        wheel.mSuspensionSpring.mStiffness = spring.stiffness;
      }
      if (spring.dampening !== undefined) {
        wheel.mSuspensionSpring.mDamping = spring.dampening;
      }
    }
  }
}

export function createVehicleConstraint<T extends Vehicle.WheelSetting>(settings: Vehicle.VehicleSettings<T>): Jolt.VehicleConstraintSettings {
  const vehicle = new Jolt.VehicleConstraintSettings();
  if (settings.maxPitchRollAngle !== undefined) {
    vehicle.mMaxPitchRollAngle = settings.maxPitchRollAngle;
  }
  vehicle.mWheels.clear();
  if (settings.antiRollBars !== undefined) {
    vehicle.mAntiRollBars.clear();
    const rollbar = new Jolt.VehicleAntiRollBar();
    settings.antiRollBars.forEach(setting => {
      rollbar.mLeftWheel = setting.leftIndex;
      rollbar.mRightWheel = setting.rightIndex;
      if (setting.stiffness !== undefined) {
        rollbar.mStiffness = setting.stiffness;
      }
      vehicle.mAntiRollBars.push_back(rollbar);
    });
    Jolt.destroy(rollbar);
  }
  return vehicle;
}

export function configureEngine(engine: Jolt.VehicleEngineSettings, settings: Vehicle.EngineSettings) {
  if (settings.maxTorque !== undefined) {
    engine.mMaxTorque = settings.maxTorque;
  }
  if (settings.minRPM !== undefined) {
    engine.mMinRPM = settings.minRPM;
  }
  if (settings.maxRPM !== undefined) {
    engine.mMaxRPM = settings.maxRPM;
  }
  if (settings.inertia !== undefined) {
    engine.mInertia = settings.inertia;
  }
  if (settings.angularDamping !== undefined) {
    engine.mAngularDamping = settings.angularDamping;
  }
}

export function configureTransmission(transmission: Jolt.VehicleTransmissionSettings, settings: Vehicle.TransmissionSettings) {
  if (settings.mode !== undefined) {
    transmission.mMode = settings.mode === 'auto' ? Jolt.ETransmissionMode_Auto : Jolt.ETransmissionMode_Manual;
  }
  if (settings.gearRatios !== undefined) {
    transmission.mGearRatios.clear();
    settings.gearRatios.forEach(v => {
      transmission.mGearRatios.push_back(v);
    })
  }
  if (settings.reverseGearRatios !== undefined) {
    transmission.mReverseGearRatios.clear();
    settings.reverseGearRatios.forEach(v => {
      transmission.mReverseGearRatios.push_back(v);
    })
  }
  if (settings.switchTime !== undefined) {
    transmission.mSwitchTime = settings.switchTime;
  }
  if (settings.switchLatency !== undefined) {
    transmission.mSwitchLatency = settings.switchLatency;
  }
  if (settings.clutchReleaseTime !== undefined) {
    transmission.mClutchReleaseTime = settings.clutchReleaseTime;
  }
  if (settings.clutchStrength !== undefined) {
    transmission.mClutchStrength = settings.clutchStrength;
  }
  if (settings.shiftUpRPM !== undefined) {
    transmission.mShiftUpRPM = settings.shiftUpRPM;
  }
  if (settings.shiftDownRPM !== undefined) {
    transmission.mShiftDownRPM = settings.shiftDownRPM;
  }
}

export function createDifferential(differential: Jolt.VehicleDifferentialSettings, settings: Vehicle.WheelDifferentials): Jolt.VehicleDifferentialSettings {
  differential.mLeftWheel = settings.leftIndex;
  differential.mRightWheel = settings.rightIndex;

  if (settings.differentialRatio !== undefined) {
    differential.mDifferentialRatio = settings.differentialRatio;
  }
  if (settings.leftRightSplit !== undefined) {
    differential.mLeftRightSplit = settings.leftRightSplit;
  }
  if (settings.limitedSlipRatio !== undefined) {
    differential.mLimitedSlipRatio = settings.limitedSlipRatio;
  }
  if (settings.engineTorqueRatio !== undefined) {
    differential.mEngineTorqueRatio = settings.engineTorqueRatio;
  }
  return differential;
}

export function configureVehicleConstraint<T extends Vehicle.WheelSetting>(joltPlugin: JoltJSPlugin, settings: Vehicle.VehicleSettings<T>, constraint: Jolt.VehicleConstraint): any[] {
  if (settings.collisionTester === 'cylinder') {
    constraint.SetVehicleCollisionTester(new Jolt.VehicleCollisionTesterCastCylinder(LAYER_MOVING, 0.05))
  }
  if (settings.collisionTester === 'ray') {
    constraint.SetVehicleCollisionTester(new Jolt.VehicleCollisionTesterRay(LAYER_MOVING))
  }
  joltPlugin.world.AddConstraint(constraint);
  const stepListener = new Jolt.VehicleConstraintStepListener(constraint);
  const toDispose = [stepListener];
  joltPlugin.world.AddStepListener(stepListener);
  return toDispose;
}

export interface IBaseVehicleController {
  transmission: Transmission;
  engine: Engine;
  wheels: Wheel[];
  getLinearVelocity(): Vector3;
  getAngularVelocity(): Vector3;
}

export abstract class BaseVehicleController<T extends Vehicle.WheelSetting, W extends Wheel, K extends Jolt.VehicleController> implements IBaseVehicleController{
  private _physicsStepListener: (delta: number) => void;

  protected controller: K;
  public transmission: Transmission;
  public engine: Engine;
  public wheels: W[] = [];

  constructor(protected impostor: PhysicsImpostor, settings: Vehicle.VehicleSettings<T>, constraintSettings: Jolt.VehicleConstraintSettings, input: BaseVehicleInput<K>) {
    const joltPlugin: JoltJSPlugin = impostor.joltPluginData.plugin;
    const physicsBody: Jolt.Body = impostor.physicsBody;
    const constraint = new Jolt.VehicleConstraint(physicsBody, constraintSettings);
    Jolt.destroy(constraintSettings);
    const toDispose = configureVehicleConstraint(joltPlugin, settings, constraint);

    const bodyInterface = joltPlugin.world.GetBodyInterface();
    const controller = this.controller = this.getController(constraint.GetController());
    this.engine = new Engine(this.getEngine(controller));
    this.transmission = new Transmission(this.getTransmission(controller));

    settings.wheels.forEach((_o, i) => {
      this.wheels.push(this.getWheel(constraint.GetWheel(i)))
    })

    const wheelRight = new Jolt.Vec3(0, 1, 0)
    const wheelUp = new Jolt.Vec3(1, 0, 0)
    this._physicsStepListener = (delta: number) => {
      this.wheels.forEach((o, i) => {
        const transform = constraint.GetWheelLocalTransform(i, wheelRight, wheelUp);
        o.updateFrom(transform);
      })
      input.onPrePhysicsUpdate(bodyInterface, controller, delta);
    };
    joltPlugin.registerPerPhysicsStepCallback(this._physicsStepListener);
    impostor._pluginData.toDispose.push(wheelRight, wheelUp, ...toDispose);
  }
  abstract getController(controller: Jolt.VehicleController): K;
  abstract getEngine(controller: K): Jolt.VehicleEngine;
  abstract getTransmission(controller: K): Jolt.VehicleTransmission;
  abstract getWheel(wheel: Jolt.Wheel): W;
  
  getLinearVelocity() { return this.impostor.getLinearVelocity()! }
  getAngularVelocity() { return this.impostor.getAngularVelocity()! }
  
}
