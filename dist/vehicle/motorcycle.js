import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import "../jolt-impostor";
import { configureWheeledVehicleConstraint } from "./wheeled";
import { DefaultVehicleInput } from "./input";
import { BaseVehicleController } from "./base";
import { WheelWV } from "./wrapped";
function configureMotorcycleLean(motorcycle, settings) {
    if (settings.maxAngle !== undefined) {
        motorcycle.mMaxLeanAngle = settings.maxAngle;
    }
    if (settings.springConstant !== undefined) {
        motorcycle.mLeanSpringConstant = settings.springConstant;
    }
    if (settings.springDampings !== undefined) {
        motorcycle.mLeanSpringDamping = settings.springDampings;
    }
    if (settings.springCoefficient !== undefined) {
        motorcycle.mLeanSpringIntegrationCoefficient = settings.springCoefficient;
    }
    if (settings.springDecay !== undefined) {
        motorcycle.mLeanSpringIntegrationCoefficientDecay = settings.springDecay;
    }
    if (settings.smoothingFactor !== undefined) {
        motorcycle.mLeanSmoothingFactor = settings.smoothingFactor;
    }
}
function createMotorcycleConstraint(settings) {
    const motorcycleSettings = new Jolt.MotorcycleControllerSettings();
    if (settings.lean) {
        configureMotorcycleLean(motorcycleSettings, settings.lean);
    }
    return configureWheeledVehicleConstraint(settings, motorcycleSettings);
}
export class DefaultMotorcycleInput extends DefaultVehicleInput {
    constructor(body) {
        super(body);
        this.steerSpeed = 4.0;
        this.previousForward = 1.0;
        this.currentRight = 0;
    }
    onPrePhysicsUpdate(bodyInterface, controller, deltaTime) {
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
        if (this.input.brake) {
            brake = 1.0;
        }
        if (this.input.handBrake) {
            forward = 0.0;
            handBrake = 1.0;
        }
        if (this.input.right > this.currentRight)
            this.currentRight = Math.min(this.currentRight + this.steerSpeed * deltaTime, this.input.right);
        else if (this.input.right < this.currentRight)
            this.currentRight = Math.max(this.currentRight - this.steerSpeed * deltaTime, this.input.right);
        right = this.currentRight;
        controller.SetDriverInput(forward, right, brake, handBrake);
        if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0)
            bodyInterface.ActivateBody(this.bodyId);
    }
}
export function createBasicMotorcycle(vehicle, wheel) {
    const casterAngle = 30 * Math.PI / 180;
    const wheels = [{
            position: new Vector3(0, -vehicle.height / 2 * 0.9, vehicle.length / 2),
            radius: wheel.radius,
            width: wheel.width,
            suspension: {
                maxLength: 0.5,
                minLength: 0.5 - vehicle.height / 2,
                direction: new Vector3(0, -1, Math.tan(casterAngle)).normalize(),
                spring: {
                    frequency: 2
                }
            },
            maxBrakeTorque: 500,
            maxSteerAngle: 30 * Math.PI / 180,
            steeringAxis: new Vector3(0, 1, -Math.tan(casterAngle)).normalize()
        }, {
            position: new Vector3(0, -vehicle.height / 2 * 0.9, -vehicle.length / 2),
            radius: wheel.radius,
            width: wheel.width,
            suspension: {
                maxLength: 0.5,
                minLength: 0.5 - vehicle.height / 2,
                spring: {
                    frequency: 1.5
                }
            },
            maxBrakeTorque: 250,
            maxSteerAngle: 0
        }];
    const differentials = [];
    differentials.push({
        leftIndex: -1, rightIndex: 1, differentialRatio: 1.93 * 40.0 / 16.0
    });
    return {
        maxPitchRollAngle: 60 * Math.PI / 180,
        wheels,
        differentials,
        collisionTester: 'cylinder',
        engine: {
            maxTorque: 150,
            minRPM: 1000,
            maxRPM: 10000
        },
        transmission: {
            shiftDownRPM: 2000,
            shiftUpRPM: 8000,
            clutchStrength: 2
        }
    };
}
export class MotorcycleController extends BaseVehicleController {
    constructor(impostor, settings, input) {
        super(impostor, settings, createMotorcycleConstraint(settings), input);
    }
    getController(controller) {
        return Jolt.castObject(controller, Jolt.MotorcycleController);
    }
    getEngine(controller) {
        return controller.GetEngine();
    }
    getTransmission(controller) {
        return controller.GetTransmission();
    }
    getWheel(wheel) {
        return new WheelWV(Jolt.castObject(wheel, Jolt.WheelWV));
    }
}
