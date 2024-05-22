import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export namespace Vehicle {

  export type VehicleType = 'wheeled' | 'motorcycle' | 'track'

  export interface SpringSetting {
    mode?: 'frequency' | 'stiffness';
    stiffness?: number;
    frequency?: number;
    dampening?: number;
  }

  export interface SuspensionSettings {
    minLength: number;
    maxLength: number;
    direction?: Vector3;
    spring?: SpringSetting;
  }

  export interface WheelSetting {
    suspension?: SuspensionSettings;
    steeringAxis?: Vector3;
    radius: number;
    width: number;
    position: Vector3;
    up?: Vector3;
    forward?: Vector3;
  }

  export interface WheelSettingWV extends WheelSetting {
    maxBrakeTorque?: number;
    maxHandBrakeTorque?: number;
    maxSteerAngle?: number;
  }

  export interface WheelSettingTV extends WheelSetting {
	  longitudinalFriction?: number;
	  lateralFriction?: number;
  }

  export interface WheelDifferentials {
    leftIndex: number;
    rightIndex: number;
    differentialRatio?: number;
    leftRightSplit?: number;
    limitedSlipRatio?: number;
    engineTorqueRatio?: number;
  }

  export interface TrackSetting {
    wheelIndex: number[];
    drivenWheelIndex: number;
    inertia?: number;
    angularDamping?: number;
    maxBrakeTorque?: number;
    differentialRatio?: number; 
  }

  export interface AntiRollBar {
    leftIndex: number;
    rightIndex: number;
    stiffness?: number;
  }

  export interface EngineSettings {
    maxTorque?: number;
    minRPM?: number;
    maxRPM?: number;
    inertia?: number;
    angularDamping?: number;
  }

  export interface TransmissionSettings {
    mode?: 'auto' | 'manual';
    gearRatios?: number[];
    reverseGearRatios?: number[];
    switchTime?: number;
    switchLatency?: number;
    clutchReleaseTime?: number;
    clutchStrength?: number;
    shiftUpRPM?: number;
    shiftDownRPM?: number;
  }

  export interface VehicleSettings<T extends WheelSetting> {
    wheels: T[];
    antiRollBars?: AntiRollBar[];
    engine?: EngineSettings;
    transmission?: TransmissionSettings;
    maxPitchRollAngle?: number;
    collisionTester: 'ray' | 'cylinder'
  }

  export interface WheeledVehicleSettings extends VehicleSettings<WheelSettingWV> {
    differentials: WheelDifferentials[];
    differentialSlipRatio?: number;
  }

  export interface MotorcycleLeanSettings {
    maxAngle?: number;
    springConstant?: number;
    springDampings?: number;
    springCoefficient?: number;
    springDecay?: number;
    smoothingFactor?: number;
  }

  export interface MotorcycleVehicleSettings extends WheeledVehicleSettings {
    lean?: MotorcycleLeanSettings;
  }

  export interface TrackVehicleSettings extends VehicleSettings<WheelSettingTV> {
    tracks: [TrackSetting, TrackSetting]
  }
}
