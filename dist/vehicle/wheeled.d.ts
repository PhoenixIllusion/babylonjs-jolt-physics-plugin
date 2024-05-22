import Jolt from "../jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import "../jolt-impostor";
import { BaseVehicleController } from "./base";
import { Vehicle } from "./types";
import { BaseVehicleInput, DefaultVehicleInput } from "./input";
export declare function configureWheeledVehicleConstraint(settings: Vehicle.WheeledVehicleSettings, controllerSettings: Jolt.WheeledVehicleControllerSettings): Jolt.VehicleConstraintSettings;
export declare class DefaultWheeledVehicleInput extends DefaultVehicleInput implements BaseVehicleInput<Jolt.WheeledVehicleController> {
    private previousForward;
    constructor(body: Jolt.Body);
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.WheeledVehicleController, _deltaTime: number): void;
}
export declare function createBasicCar(vehicle: {
    width: number;
    height: number;
    length: number;
}, wheel: {
    radius: number;
    width: number;
}, fourWheelDrive: boolean): Vehicle.WheeledVehicleSettings;
export declare class WheeledVehicleController extends BaseVehicleController<Vehicle.WheelSettingWV, Jolt.WheeledVehicleController> {
    constructor(impostor: PhysicsImpostor, settings: Vehicle.MotorcycleVehicleSettings, input: BaseVehicleInput<Jolt.WheeledVehicleController>);
    getController(controller: Jolt.VehicleController): Jolt.WheeledVehicleController;
    getEngine(controller: Jolt.WheeledVehicleController): Jolt.VehicleEngine;
    getTransmission(controller: Jolt.WheeledVehicleController): Jolt.VehicleTransmission;
}
