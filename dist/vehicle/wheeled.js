import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import "../jolt-impostor";
import { BaseVehicleController, configureEngine, configureTransmission, configureWheel, createDifferential, createVehicleConstraint } from "./base";
import { DefaultVehicleInput } from "./input";
function configureWheelWV(wheel, setting) {
    configureWheel(wheel, setting);
    if (setting.maxSteerAngle !== undefined) {
        wheel.mMaxSteerAngle = setting.maxSteerAngle;
    }
    if (setting.maxBrakeTorque !== undefined) {
        wheel.mMaxBrakeTorque = setting.maxBrakeTorque;
    }
    if (setting.maxHandBrakeTorque !== undefined) {
        wheel.mMaxHandBrakeTorque = setting.maxHandBrakeTorque;
    }
}
export function configureWheeledVehicleConstraint(settings, controllerSettings) {
    const vehicle = createVehicleConstraint(settings);
    settings.wheels.forEach(wheelS => {
        const wheel = new Jolt.WheelSettingsWV();
        configureWheelWV(wheel, wheelS);
        vehicle.mWheels.push_back(wheel);
    });
    if (settings.engine !== undefined) {
        configureEngine(controllerSettings.mEngine, settings.engine);
    }
    if (settings.transmission !== undefined) {
        configureTransmission(controllerSettings.mTransmission, settings.transmission);
    }
    controllerSettings.mDifferentials.clear();
    const differential = new Jolt.VehicleDifferentialSettings();
    settings.differentials.forEach(setting => {
        controllerSettings.mDifferentials.push_back(createDifferential(differential, setting));
    });
    Jolt.destroy(differential);
    if (settings.differentialSlipRatio) {
        controllerSettings.mDifferentialLimitedSlipRatio = settings.differentialSlipRatio;
    }
    vehicle.mController = controllerSettings;
    return vehicle;
}
function createWheeledVehicleConstraint(settings) {
    return configureWheeledVehicleConstraint(settings, new Jolt.WheeledVehicleControllerSettings());
}
export class DefaultWheeledVehicleInput extends DefaultVehicleInput {
    constructor(body) {
        super(body);
        this.previousForward = 1.0;
    }
    onPrePhysicsUpdate(bodyInterface, controller, _deltaTime) {
        let forward = 0.0, right = 0.0, brake = 0.0, handBrake = 0.0;
        forward = this.input.forward;
        right = this.input.right;
        if (this.previousForward * forward < 0.0) {
            const velocity = this.getVelocity();
            if ((forward > 0.0 && velocity < -0.1) || (forward < 0.0 && velocity > 0.1)) {
                // Brake while we've not stopped yet
                forward = 0.0;
                brake = 1.0;
            }
            else {
                // When we've come to a stop, accept the new direction
                this.previousForward = forward;
            }
        }
        if (this.input.handBrake) {
            forward = 0.0;
            handBrake = 1.0;
        }
        controller.SetDriverInput(forward, right, brake, handBrake);
        if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0)
            bodyInterface.ActivateBody(this.bodyId);
    }
}
export function createBasicCar(vehicle, wheel, fourWheelDrive) {
    const posMultiplier = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    const wheels = posMultiplier.map((pos, i) => {
        return {
            position: new Vector3(pos[0] * (vehicle.width / 2 + wheel.width / 2 + 0.1), -vehicle.height + 0.02, pos[1] * vehicle.length / 2),
            radius: wheel.radius,
            width: wheel.width,
            suspension: {
                maxLength: 0.5,
                minLength: 0.5 - vehicle.height / 2
            },
            maxBrakeTorque: i < 2 ? 0.0 : undefined,
            maxSteerAngle: i < 2 ? 30 * Math.PI / 180.0 : 0.0
        };
    });
    const differentials = [];
    differentials.push({
        leftIndex: 0, rightIndex: 1, limitedSlipRatio: 1.4
    });
    if (fourWheelDrive) {
        differentials[0].engineTorqueRatio = 0.5;
        differentials.push({
            leftIndex: 2, rightIndex: 3, limitedSlipRatio: 1.4, engineTorqueRatio: 0.5
        });
    }
    return {
        maxPitchRollAngle: 60 * Math.PI / 180,
        wheels,
        differentials,
        collisionTester: 'cylinder',
        antiRollBars: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 2, rightIndex: 3 }]
    };
}
export class WheeledVehicleController extends BaseVehicleController {
    constructor(impostor, settings, input) {
        super(impostor, settings, createWheeledVehicleConstraint(settings), input);
    }
    getController(controller) {
        return Jolt.castObject(controller, Jolt.WheeledVehicleController);
    }
    getEngine(controller) {
        return controller.GetEngine();
    }
    getTransmission(controller) {
        return controller.GetTransmission();
    }
}
