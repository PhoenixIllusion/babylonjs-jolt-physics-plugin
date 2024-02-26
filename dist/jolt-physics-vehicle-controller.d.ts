import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltPhysicsBody } from "./v2/index";
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
    }
    interface WheelSettingWV extends WheelSetting {
        maxBrakeTorque?: number;
        maxHandBrakeTorque?: number;
        maxSteerAngle?: number;
    }
    interface WheelDifferentials {
        leftIndex: number;
        rightIndex: number;
        differentialRatio?: number;
        leftRightSplit?: number;
        limitedSlipRatio?: number;
        engineTorqueRatio?: number;
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
}
export interface VehicleInputState {
    forward: number;
    right: number;
    handBrake: boolean;
}
export interface WheeledVehicleInput<T extends Jolt.VehicleController> {
    set body(body: Jolt.Body);
    set bodyId(id: Jolt.BodyID);
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: T, deltaTime: number): void;
}
export declare class DefaultVehicleInput {
    input: VehicleInputState;
    body: Jolt.Body;
    bodyId: Jolt.BodyID;
    private _linearV;
    private _rotationQ;
    getVelocity(): number;
}
export declare class DefaultWheeledVehicleInput extends DefaultVehicleInput implements WheeledVehicleInput<Jolt.WheeledVehicleController> {
    private previousForward;
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.WheeledVehicleController, _deltaTime: number): void;
}
export declare class DefaultMotorcycleInput extends DefaultVehicleInput implements WheeledVehicleInput<Jolt.MotorcycleController> {
    steerSpeed: number;
    private previousForward;
    private currentRight;
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.MotorcycleController, deltaTime: number): void;
}
export declare function createBasicCar(vehicle: {
    width: number;
    height: number;
    length: number;
}, wheel: {
    radius: number;
    width: number;
}, fourWheelDrive: boolean): Vehicle.WheeledVehicleSettings;
export declare function createBasicMotorcycle(vehicle: {
    height: number;
    length: number;
}, wheel: {
    radius: number;
    width: number;
}): Vehicle.MotorcycleVehicleSettings;
interface VehicleRequired {
    world: Jolt.PhysicsSystem;
    body: Jolt.Body;
    toDispose: any[];
    registerPerPhysicsStepCallback: (callback: (delta: number) => void) => void;
}
export declare class WheeledVehicleController {
    wheelTransforms: {
        position: Vector3;
        rotation: Quaternion;
    }[];
    private _physicsStepListener;
    static fromPhysicsImpostor(impostor: PhysicsImpostor, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.WheeledVehicleController>): WheeledVehicleController;
    static fromPhysicsBody(impostor: JoltPhysicsBody, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.WheeledVehicleController>): Promise<WheeledVehicleController>;
    constructor(data: VehicleRequired, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.WheeledVehicleController>);
}
export declare class MotorcycleController {
    wheelTransforms: {
        position: Vector3;
        rotation: Quaternion;
    }[];
    private _physicsStepListener;
    static fromPhysicsImpostor(impostor: PhysicsImpostor, settings: Vehicle.MotorcycleVehicleSettings, input: WheeledVehicleInput<Jolt.MotorcycleController>): MotorcycleController;
    static fromPhysicsBody(impostor: JoltPhysicsBody, settings: Vehicle.MotorcycleVehicleSettings, input: WheeledVehicleInput<Jolt.MotorcycleController>): Promise<MotorcycleController>;
    constructor(data: VehicleRequired, settings: Vehicle.MotorcycleVehicleSettings, input: WheeledVehicleInput<Jolt.MotorcycleController>);
}
export declare class TreadedVehicleController {
}
export {};
