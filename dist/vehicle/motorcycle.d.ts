import Jolt from "../jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import "../jolt-impostor";
import { Vehicle } from "./types";
import { BaseVehicleInput, DefaultVehicleInput } from "./input";
import { BaseVehicleController } from "./base";
import { WheelWV } from "./wrapped";
export declare class DefaultMotorcycleInput extends DefaultVehicleInput implements BaseVehicleInput<Jolt.MotorcycleController> {
    steerSpeed: number;
    private previousForward;
    private currentRight;
    constructor(body: Jolt.Body);
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.MotorcycleController, deltaTime: number): void;
}
export declare function createBasicMotorcycle(vehicle: {
    height: number;
    length: number;
}, wheel: {
    radius: number;
    width: number;
}): Vehicle.MotorcycleVehicleSettings;
export declare class MotorcycleController extends BaseVehicleController<Vehicle.WheelSettingWV, WheelWV, Jolt.MotorcycleController> {
    constructor(impostor: PhysicsImpostor, settings: Vehicle.MotorcycleVehicleSettings, input: BaseVehicleInput<Jolt.MotorcycleController>);
    getController(controller: Jolt.VehicleController): Jolt.MotorcycleController;
    getEngine(controller: Jolt.MotorcycleController): Jolt.VehicleEngine;
    getTransmission(controller: Jolt.MotorcycleController): Jolt.VehicleTransmission;
    getWheel(wheel: Jolt.Wheel): WheelWV;
}
