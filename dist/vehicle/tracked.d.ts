import Jolt from "../jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import "../jolt-impostor";
import { BaseVehicleController } from "./base";
import { Vehicle } from "./types";
import { BaseVehicleInput, DefaultVehicleInput } from "./input";
export declare function createBasicTracked(vehicle: {
    width: number;
    height: number;
    length: number;
}, wheel: {
    radius: number;
    width: number;
}): Vehicle.TrackVehicleSettings;
export declare class DefaultTrackedInput extends DefaultVehicleInput implements BaseVehicleInput<Jolt.TrackedVehicleController> {
    minVelocityPivotTurn: number;
    private previousForward;
    constructor(body: Jolt.Body);
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.TrackedVehicleController, _deltaTime: number): void;
}
export declare class TrackededVehicleController extends BaseVehicleController<Vehicle.WheelSettingTV, Jolt.TrackedVehicleController> {
    constructor(impostor: PhysicsImpostor, settings: Vehicle.TrackVehicleSettings, input: BaseVehicleInput<Jolt.TrackedVehicleController>);
    getController(controller: Jolt.VehicleController): Jolt.TrackedVehicleController;
    getEngine(controller: Jolt.TrackedVehicleController): Jolt.VehicleEngine;
    getTransmission(controller: Jolt.TrackedVehicleController): Jolt.VehicleTransmission;
}
