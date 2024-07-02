import Jolt from "../jolt-import";
import "../jolt-impostor";
import { BaseVehicleController, configureEngine, configureTransmission, configureWheel, createVehicleConstraint } from "./base";
import { DefaultVehicleInput } from "./input";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WheelTV } from "./wrapped";
function configureWheelTV(wheel, setting) {
    configureWheel(wheel, setting);
    if (setting.lateralFriction !== undefined) {
        wheel.mLateralFriction = setting.lateralFriction;
    }
    if (setting.longitudinalFriction !== undefined) {
        wheel.mLongitudinalFriction = setting.longitudinalFriction;
    }
}
function configureTrackSettings(track, setting) {
    track.mDrivenWheel = setting.drivenWheelIndex;
    setting.wheelIndex.forEach(idx => track.mWheels.push_back(idx));
    if (setting.inertia !== undefined) {
        track.mInertia = setting.inertia;
    }
    if (setting.angularDamping !== undefined) {
        track.mAngularDamping = setting.angularDamping;
    }
    if (setting.maxBrakeTorque !== undefined) {
        track.mMaxBrakeTorque = setting.maxBrakeTorque;
    }
    if (setting.differentialRatio !== undefined) {
        track.mDifferentialRatio = setting.differentialRatio;
    }
}
function configureTrackedVehicleConstraint(settings, controllerSettings) {
    const vehicle = createVehicleConstraint(settings);
    settings.wheels.forEach(wheelS => {
        const wheel = new Jolt.WheelSettingsTV();
        configureWheelTV(wheel, wheelS);
        vehicle.mWheels.push_back(wheel);
    });
    if (settings.engine !== undefined) {
        configureEngine(controllerSettings.mEngine, settings.engine);
    }
    if (settings.transmission !== undefined) {
        configureTransmission(controllerSettings.mTransmission, settings.transmission);
    }
    configureTrackSettings(controllerSettings.get_mTracks(0), settings.tracks[0]);
    configureTrackSettings(controllerSettings.get_mTracks(1), settings.tracks[1]);
    vehicle.mController = controllerSettings;
    return vehicle;
}
export function createBasicTracked(vehicle, wheel) {
    const wheelPos = [
        [-0.0, 2.95],
        [-0.3, 2.1],
        [-0.3, 1.4],
        [-0.3, 0.7],
        [-0.3, 0.0],
        [-0.3, -0.7],
        [-0.3, -1.4],
        [-0.3, -2.1],
        [-0.0, -2.75]
    ];
    const wheels = [];
    const suspensionMinLength = 0.3;
    const suspensionMaxLength = 0.5;
    const suspensionFrequency = 1.0;
    const trackL = { wheelIndex: [], drivenWheelIndex: 0 };
    wheelPos.map((pos, i) => {
        const setting = {
            position: new Vector3(-vehicle.width / 2 - wheel.width / 2 - 0.1, pos[0], pos[1]),
            radius: wheel.radius,
            width: wheel.width,
            suspension: {
                maxLength: i == 0 || i == wheelPos.length ? suspensionMinLength : suspensionMaxLength,
                minLength: suspensionMinLength,
                spring: { frequency: suspensionFrequency }
            }
        };
        wheels.push(setting);
        trackL.wheelIndex.push(i);
    });
    const trackR = { wheelIndex: [], drivenWheelIndex: wheels.length };
    wheelPos.map((pos, i) => {
        const setting = {
            position: new Vector3(vehicle.width / 2 + wheel.width / 2 + 0.1, pos[0], pos[1]),
            radius: wheel.radius,
            width: wheel.width,
            suspension: {
                maxLength: i == 0 || i == wheelPos.length ? suspensionMinLength : suspensionMaxLength,
                minLength: suspensionMinLength,
                spring: { frequency: suspensionFrequency }
            }
        };
        wheels.push(setting);
        trackR.wheelIndex.push(i + trackR.drivenWheelIndex);
    });
    const differentials = [];
    differentials.push({
        leftIndex: 0, rightIndex: 1, limitedSlipRatio: 1.4
    });
    return {
        maxPitchRollAngle: 60 * Math.PI / 180,
        wheels,
        tracks: [trackL, trackR],
        collisionTester: 'cylinder'
    };
}
export class DefaultTrackedInput extends DefaultVehicleInput {
    constructor(body) {
        super(body);
        this.minVelocityPivotTurn = 1.0;
        this.previousForward = 1.0;
    }
    onPrePhysicsUpdate(bodyInterface, controller, _deltaTime) {
        let forward = 0.0, leftRatio = 1.0, rightRatio = 1.0, brake = 0.0;
        const velocity = this.getVelocity();
        forward = this.input.forward;
        if (this.input.handBrake) {
            brake = 1.0;
        }
        if (this.input.right) {
            if (this.input.right > 0) {
                if (brake == 0.0 && forward == 0.0 && Math.abs(velocity) < this.minVelocityPivotTurn) {
                    // Pivot turn
                    leftRatio = -1.0;
                    forward = 1.0;
                }
                else
                    leftRatio = 0.6;
            }
            else {
                if (brake == 0.0 && forward == 0.0 && Math.abs(velocity) < this.minVelocityPivotTurn) {
                    // Pivot turn
                    rightRatio = -1.0;
                    forward = 1.0;
                }
                else
                    rightRatio = 0.6;
            }
        }
        if (this.previousForward * forward < 0.0) {
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
        controller.SetDriverInput(forward, leftRatio, rightRatio, brake);
        if (rightRatio != 0.0 || leftRatio != 0.0 || forward != 0.0 || brake != 0.0)
            bodyInterface.ActivateBody(this.bodyId);
    }
}
export class TrackedVehicleController extends BaseVehicleController {
    constructor(impostor, settings, input) {
        super(impostor, settings, configureTrackedVehicleConstraint(settings, new Jolt.TrackedVehicleControllerSettings()), input);
    }
    getController(controller) {
        return Jolt.castObject(controller, Jolt.TrackedVehicleController);
    }
    getEngine(controller) {
        return controller.GetEngine();
    }
    getTransmission(controller) {
        return controller.GetTransmission();
    }
    getWheel(wheel) {
        return new WheelTV(Jolt.castObject(wheel, Jolt.WheelTV));
    }
}
