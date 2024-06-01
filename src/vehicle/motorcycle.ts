import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import "../jolt-impostor";
import { configureWheeledVehicleConstraint } from "./wheeled";
import { Vehicle } from "./types";
import { BaseVehicleInput, DefaultVehicleInput } from "./input";
import { BaseVehicleController } from "./base";
import { WheelWV } from "./wrapped";


function configureMotorcycleLean(motorcycle: Jolt.MotorcycleControllerSettings, settings: Vehicle.MotorcycleLeanSettings) {
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

function createMotorcycleConstraint(settings: Vehicle.MotorcycleVehicleSettings): Jolt.VehicleConstraintSettings {
  const motorcycleSettings = new Jolt.MotorcycleControllerSettings();
  if (settings.lean) {
    configureMotorcycleLean(motorcycleSettings, settings.lean);
  }
  return configureWheeledVehicleConstraint(settings, motorcycleSettings);
}

export class DefaultMotorcycleInput extends DefaultVehicleInput implements BaseVehicleInput<Jolt.MotorcycleController> {
  public steerSpeed = 4.0;

  private previousForward = 1.0;
  private currentRight = 0;
  constructor(body: Jolt.Body) {
    super(body);
  }

  onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.MotorcycleController, deltaTime: number): void {
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
    if(this.input.brake) {
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

export function createBasicMotorcycle(vehicle: { height: number, length: number }, wheel: { radius: number, width: number }): Vehicle.MotorcycleVehicleSettings {
  const casterAngle = 30 * Math.PI / 180;
  const wheels: Vehicle.WheelSettingWV[] = [{
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
  const differentials: Vehicle.WheelDifferentials[] = [];
  differentials.push({
    leftIndex: -1, rightIndex: 1, differentialRatio: 1.93 * 40.0 / 16.0
  })

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
  }
}

export class MotorcycleController extends BaseVehicleController<Vehicle.WheelSettingWV, WheelWV, Jolt.MotorcycleController> {
  constructor(impostor: PhysicsImpostor, settings: Vehicle.MotorcycleVehicleSettings, input: BaseVehicleInput<Jolt.MotorcycleController>) {
    super(impostor, settings, createMotorcycleConstraint(settings), input);
  }
  getController(controller: Jolt.VehicleController): Jolt.MotorcycleController {
    return Jolt.castObject(controller, Jolt.MotorcycleController);
  }
  getEngine(controller: Jolt.MotorcycleController): Jolt.VehicleEngine {
    return controller.GetEngine();
  }
  getTransmission(controller: Jolt.MotorcycleController): Jolt.VehicleTransmission {
    return controller.GetTransmission();
  }
  getWheel(wheel: Jolt.Wheel): WheelWV {
    return new WheelWV(Jolt.castObject(wheel, Jolt.WheelWV));
  }
}
