import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export declare namespace Vehicle {
    type VehicleType = 'wheeled' | 'motorcycle' | 'track';
    interface SpringSetting {
        mode?: 'frequency' | 'stiffness';
        stiffness?: number;
        frequency?: number;
        dampening?: number;
    }
    interface SuspensionSettings {
        minLength: number;
        maxLength: number;
        direction?: Vector3;
        spring?: SpringSetting;
    }
    interface WheelSetting {
        suspension?: SuspensionSettings;
        steeringAxis?: Vector3;
        radius: number;
        width: number;
        position: Vector3;
        up?: Vector3;
        forward?: Vector3;
    }
    interface WheelSettingWV extends WheelSetting {
        maxBrakeTorque?: number;
        maxHandBrakeTorque?: number;
        maxSteerAngle?: number;
    }
    interface WheelSettingTV extends WheelSetting {
        longitudinalFriction?: number;
        lateralFriction?: number;
    }
    interface WheelDifferentials {
        leftIndex: number;
        rightIndex: number;
        differentialRatio?: number;
        leftRightSplit?: number;
        limitedSlipRatio?: number;
        engineTorqueRatio?: number;
    }
    interface TrackSetting {
        wheelIndex: number[];
        drivenWheelIndex: number;
        inertia?: number;
        angularDamping?: number;
        maxBrakeTorque?: number;
        differentialRatio?: number;
    }
    interface AntiRollBar {
        leftIndex: number;
        rightIndex: number;
        stiffness?: number;
    }
    interface EngineSettings {
        maxTorque?: number;
        minRPM?: number;
        maxRPM?: number;
        inertia?: number;
        angularDamping?: number;
    }
    interface TransmissionSettings {
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
    interface VehicleSettings<T extends WheelSetting> {
        wheels: T[];
        antiRollBars?: AntiRollBar[];
        engine?: EngineSettings;
        transmission?: TransmissionSettings;
        maxPitchRollAngle?: number;
        collisionTester: 'ray' | 'cylinder';
    }
    interface WheeledVehicleSettings extends VehicleSettings<WheelSettingWV> {
        differentials: WheelDifferentials[];
        differentialSlipRatio?: number;
    }
    interface MotorcycleLeanSettings {
        maxAngle?: number;
        springConstant?: number;
        springDampings?: number;
        springCoefficient?: number;
        springDecay?: number;
        smoothingFactor?: number;
    }
    interface MotorcycleVehicleSettings extends WheeledVehicleSettings {
        lean?: MotorcycleLeanSettings;
    }
    interface TrackVehicleSettings extends VehicleSettings<WheelSettingTV> {
        tracks: [TrackSetting, TrackSetting];
    }
}
