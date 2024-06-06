import Jolt from "../jolt-import";
import type { JoltJSPlugin } from "../jolt-physics";
import "../jolt-impostor";
import { Vehicle } from "./types";
import { BaseVehicleInput } from "./input";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Engine, Transmission, Wheel } from "./wrapped";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export declare function configureWheel(wheel: Jolt.WheelSettings, setting: Vehicle.WheelSetting): void;
export declare function createVehicleConstraint<T extends Vehicle.WheelSetting>(settings: Vehicle.VehicleSettings<T>): Jolt.VehicleConstraintSettings;
export declare function configureEngine(engine: Jolt.VehicleEngineSettings, settings: Vehicle.EngineSettings): void;
export declare function configureTransmission(transmission: Jolt.VehicleTransmissionSettings, settings: Vehicle.TransmissionSettings): void;
export declare function createDifferential(differential: Jolt.VehicleDifferentialSettings, settings: Vehicle.WheelDifferentials): Jolt.VehicleDifferentialSettings;
export declare function configureVehicleConstraint<T extends Vehicle.WheelSetting>(joltPlugin: JoltJSPlugin, settings: Vehicle.VehicleSettings<T>, constraint: Jolt.VehicleConstraint): any[];
export interface IBaseVehicleController {
    transmission: Transmission;
    engine: Engine;
    wheels: Wheel[];
    getLinearVelocity(): Vector3;
    getAngularVelocity(): Vector3;
}
export declare abstract class BaseVehicleController<T extends Vehicle.WheelSetting, W extends Wheel, K extends Jolt.VehicleController> implements IBaseVehicleController {
    protected impostor: PhysicsImpostor;
    private _physicsStepListener;
    protected controller: K;
    transmission: Transmission;
    engine: Engine;
    wheels: W[];
    constructor(impostor: PhysicsImpostor, settings: Vehicle.VehicleSettings<T>, constraintSettings: Jolt.VehicleConstraintSettings, input: BaseVehicleInput<K>);
    abstract getController(controller: Jolt.VehicleController): K;
    abstract getEngine(controller: K): Jolt.VehicleEngine;
    abstract getTransmission(controller: K): Jolt.VehicleTransmission;
    abstract getWheel(wheel: Jolt.Wheel): W;
    getLinearVelocity(): Vector3;
    getAngularVelocity(): Vector3;
}
