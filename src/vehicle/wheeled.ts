import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import "../jolt-impostor";
import { BaseVehicleController, configureEngine, configureTransmission, configureWheel, createDifferential, createVehicleConstraint } from "./base";
import { Vehicle } from "./types";
import { BaseVehicleInput, DefaultVehicleInput } from "./input";
import { WheelWV } from "./wrapped";

function configureWheelWV(wheel: Jolt.WheelSettingsWV, setting: Vehicle.WheelSettingWV) {
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
  if (setting.lateralFriction !== undefined) {
    wheel.mLateralFriction.Clear();
    setting.lateralFriction.forEach(([x, y]) => {
      wheel.mLateralFriction.AddPoint(x, y);
    });
  }
  if (setting.longitudinalFriction !== undefined) {
    wheel.mLongitudinalFriction.Clear();
    setting.longitudinalFriction.forEach(([x, y]) => {
      wheel.mLongitudinalFriction.AddPoint(x, y);
    });
  }
}

export function configureWheeledVehicleConstraint(settings: Vehicle.WheeledVehicleSettings, controllerSettings: Jolt.WheeledVehicleControllerSettings): Jolt.VehicleConstraintSettings {
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
  })
  Jolt.destroy(differential);
  if (settings.differentialSlipRatio) {
    controllerSettings.mDifferentialLimitedSlipRatio = settings.differentialSlipRatio;
  }
  vehicle.mController = controllerSettings;
  return vehicle;
}

function createWheeledVehicleConstraint(settings: Vehicle.WheeledVehicleSettings): Jolt.VehicleConstraintSettings {
  return configureWheeledVehicleConstraint(settings, new Jolt.WheeledVehicleControllerSettings());
}

export class DefaultWheeledVehicleInput extends DefaultVehicleInput implements BaseVehicleInput<Jolt.WheeledVehicleController> {
  private previousForward = 1.0;
  constructor(body: Jolt.Body) {
    super(body);
  }

  onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: Jolt.WheeledVehicleController, _deltaTime: number): void {
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

    controller.SetDriverInput(forward, right, brake, handBrake);
    if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0)
      bodyInterface.ActivateBody(this.bodyId);
  }

}

export function createBasicCar(vehicle: { width: number, height: number, length: number }, wheel: { radius: number, width: number }, fourWheelDrive: boolean): Vehicle.WheeledVehicleSettings {

  const posMultiplier: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  const wheels: Vehicle.WheelSettingWV[] = posMultiplier.map((pos, i) => {
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
    }
  });
  const differentials: Vehicle.WheelDifferentials[] = [];
  differentials.push({
    leftIndex: 0, rightIndex: 1, limitedSlipRatio: 1.4
  })
  if (fourWheelDrive) {
    differentials[0].engineTorqueRatio = 0.5
    differentials.push({
      leftIndex: 2, rightIndex: 3, limitedSlipRatio: 1.4, engineTorqueRatio: 0.5
    })
  }

  return {
    maxPitchRollAngle: 60 * Math.PI / 180,
    wheels,
    differentials,
    collisionTester: 'cylinder',
    antiRollBars: [{ leftIndex: 0, rightIndex: 1 }, { leftIndex: 2, rightIndex: 3 }]
  }
}

export class WheeledVehicleController extends BaseVehicleController<Vehicle.WheelSettingWV, WheelWV, Jolt.WheeledVehicleController> {
  constructor(impostor: PhysicsImpostor, settings: Vehicle.MotorcycleVehicleSettings, input: BaseVehicleInput<Jolt.WheeledVehicleController>) {
    super(impostor, settings, createWheeledVehicleConstraint(settings), input);
  }
  getController(controller: Jolt.VehicleController): Jolt.WheeledVehicleController {
    return Jolt.castObject(controller, Jolt.WheeledVehicleController);
  }
  getEngine(controller: Jolt.WheeledVehicleController): Jolt.VehicleEngine {
    return controller.GetEngine();
  }
  getTransmission(controller: Jolt.WheeledVehicleController): Jolt.VehicleTransmission {
    return controller.GetTransmission();
  }
  getWheel(wheel: Jolt.Wheel): WheelWV {
    return new WheelWV(Jolt.castObject(wheel, Jolt.WheelWV));
  }
}
