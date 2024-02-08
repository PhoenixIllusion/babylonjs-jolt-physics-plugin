import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, SetJoltVec3 } from "./jolt-util";
import type { JoltPhysicsImpostor } from "./v1/jolt-impostor";
import type { JoltJSPlugin } from "./v1/jolt-physics";

export namespace Vehicle {

  export type VehicleType = 'wheeled' | 'motorcycle' | 'track'

  export interface SpringSetting {
    mode?: 'frequency' | 'stiffness';
    stiffness?: number;
    frequency?: number;
    dampening?: number;
  }

  export interface SuspensionSettings {
    minLength: number;
    maxLength: number;
    direction?: Vector3;
    spring?: SpringSetting;
  }

  export interface WheelSetting {
    suspension?: SuspensionSettings;
    steeringAxis?: Vector3;
    radius: number;
    width: number;
    position: Vector3;
  }
  export interface WheelSettingWV extends WheelSetting {
    maxBrakeTorque?: number;
    maxHandBrakeTorque?: number;
    maxSteerAngle?: number;
  }

  export interface WheelDifferentials {
    leftIndex: number;
    rightIndex: number;
    differentialRatio?: number;
    leftRightSplit?: number;
    limitedSlipRatio?: number;
    engineTorqueRatio?: number;
  }
  export interface AntiRollBar {
    leftIndex: number;
    rightIndex: number;
    stiffness?: number;
  }

  export interface EngineSettings {
    maxTorque?: number;
    minRPM?: number;
    maxRPM?: number;
    inertia?: number;
    angularDamping?: number;
  }

  export interface TransmissionSettings {
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

  export interface VehicleSettings<T extends WheelSetting> {
    wheels: T[];
    antiRollBars?: AntiRollBar[];
    engine?: EngineSettings;
    transmission?: TransmissionSettings;
    maxPitchRollAngle?: number;
    collisionTester: 'ray' | 'cylinder'
  }
  export interface WheeledVehicleSettings extends VehicleSettings<WheelSettingWV> {
    differentials: WheelDifferentials[];
    differentialSlipRatio?: number;
  }
  export interface MotorcycleLeanSettings {
    maxAngle?: number;
    springConstant?: number;
    springDampings?: number;
    springCoefficient?: number;
    springDecay?: number;
    smoothingFactor?: number;

  }
  export interface MotorcycleVehicleSettings extends WheeledVehicleSettings {
    lean?: MotorcycleLeanSettings;
  }
}

function configureWheel(wheel: Jolt.WheelSettings, setting: Vehicle.WheelSetting): void {
  SetJoltVec3(setting.position, wheel.mPosition);
  wheel.mWidth = setting.width;
  wheel.mRadius = setting.radius;
  if (setting.steeringAxis !== undefined) {
    SetJoltVec3(setting.steeringAxis, wheel.mSteeringAxis);
  }
  if (setting.suspension !== undefined) {
    const suspension = setting.suspension;
    if (suspension.direction !== undefined) {
      SetJoltVec3(suspension.direction, wheel.mSuspensionDirection);
    }
    if (suspension.maxLength !== undefined) {
      wheel.mSuspensionMaxLength = suspension.maxLength;
    }
    if (suspension.minLength !== undefined) {
      wheel.mSuspensionMinLength = suspension.minLength;
    }
    if (suspension.spring !== undefined) {
      const spring = suspension.spring;
      if (spring.mode !== undefined) {
        wheel.mSuspensionSpring.mMode = spring.mode == 'frequency' ? Jolt.ESpringMode_FrequencyAndDamping : Jolt.ESpringMode_StiffnessAndDamping;
      }
      if (spring.frequency !== undefined) {
        wheel.mSuspensionSpring.mFrequency = spring.frequency;
      }
      if (spring.stiffness !== undefined) {
        wheel.mSuspensionSpring.mStiffness = spring.stiffness;
      }
      if (spring.dampening !== undefined) {
        wheel.mSuspensionSpring.mDamping = spring.dampening;
      }
    }
  }
}
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
}

function createVehicleConstraint<T extends Vehicle.WheelSetting>(settings: Vehicle.VehicleSettings<T>): Jolt.VehicleConstraintSettings {
  const vehicle = new Jolt.VehicleConstraintSettings();
  if (settings.maxPitchRollAngle !== undefined) {
    vehicle.mMaxPitchRollAngle = settings.maxPitchRollAngle;
  }
  vehicle.mWheels.clear();
  if (settings.antiRollBars !== undefined) {
    vehicle.mAntiRollBars.clear();
    const rollbar = new Jolt.VehicleAntiRollBar();
    settings.antiRollBars.forEach(setting => {
      rollbar.mLeftWheel = setting.leftIndex;
      rollbar.mRightWheel = setting.rightIndex;
      if (setting.stiffness !== undefined) {
        rollbar.mStiffness = setting.stiffness;
      }
      vehicle.mAntiRollBars.push_back(rollbar);
    });
    Jolt.destroy(rollbar);
  }
  return vehicle;
}

function configureEngine(engine: Jolt.VehicleEngineSettings, settings: Vehicle.EngineSettings) {
  if (settings.maxTorque !== undefined) {
    engine.mMaxTorque = settings.maxTorque;
  }
  if (settings.minRPM !== undefined) {
    engine.mMinRPM = settings.minRPM;
  }
  if (settings.maxRPM !== undefined) {
    engine.mMaxRPM = settings.maxRPM;
  }
  if (settings.inertia !== undefined) {
    engine.mInertia = settings.inertia;
  }
  if (settings.angularDamping !== undefined) {
    engine.mAngularDamping = settings.angularDamping;
  }
}
function configureTransmission(transmission: Jolt.VehicleTransmissionSettings, settings: Vehicle.TransmissionSettings) {
  if (settings.mode !== undefined) {
    transmission.mMode = settings.mode === 'auto' ? Jolt.ETransmissionMode_Auto : Jolt.ETransmissionMode_Manual;
  }
  if (settings.gearRatios !== undefined) {
    transmission.mGearRatios.clear();
    settings.gearRatios.forEach(v => {
      transmission.mGearRatios.push_back(v);
    })
  }
  if (settings.reverseGearRatios !== undefined) {
    transmission.mReverseGearRatios.clear();
    settings.reverseGearRatios.forEach(v => {
      transmission.mReverseGearRatios.push_back(v);
    })
  }
  if (settings.switchTime !== undefined) {
    transmission.mSwitchTime = settings.switchTime;
  }
  if (settings.switchLatency !== undefined) {
    transmission.mSwitchLatency = settings.switchLatency;
  }
  if (settings.clutchReleaseTime !== undefined) {
    transmission.mClutchReleaseTime = settings.clutchReleaseTime;
  }
  if (settings.clutchStrength !== undefined) {
    transmission.mClutchStrength = settings.clutchStrength;
  }
  if (settings.shiftUpRPM !== undefined) {
    transmission.mShiftUpRPM = settings.shiftUpRPM;
  }
  if (settings.shiftDownRPM !== undefined) {
    transmission.mShiftDownRPM = settings.shiftDownRPM;
  }
}

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

function createDifferential(differential: Jolt.VehicleDifferentialSettings, settings: Vehicle.WheelDifferentials): Jolt.VehicleDifferentialSettings {
  differential.mLeftWheel = settings.leftIndex;
  differential.mRightWheel = settings.rightIndex;

  if (settings.differentialRatio !== undefined) {
    differential.mDifferentialRatio = settings.differentialRatio;
  }
  if (settings.leftRightSplit !== undefined) {
    differential.mLeftRightSplit = settings.leftRightSplit;
  }
  if (settings.limitedSlipRatio !== undefined) {
    differential.mLimitedSlipRatio = settings.limitedSlipRatio;
  }
  if (settings.engineTorqueRatio !== undefined) {
    differential.mEngineTorqueRatio = settings.engineTorqueRatio;
  }
  return differential;
}

function configureWheeledVehicleConstraint(settings: Vehicle.WheeledVehicleSettings, controllerSettings: Jolt.WheeledVehicleControllerSettings): Jolt.VehicleConstraintSettings {
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
function createMotorcycleConstraint(settings: Vehicle.MotorcycleVehicleSettings): Jolt.VehicleConstraintSettings {
  const motorcycleSettings = new Jolt.MotorcycleControllerSettings();
  if (settings.lean) {
    configureMotorcycleLean(motorcycleSettings, settings.lean);
  }
  return configureWheeledVehicleConstraint(settings, motorcycleSettings);
}

export interface VehicleInputState {
  forward: number;
  right: number;
  handBrake: boolean
}

export interface WheeledVehicleInput<T extends Jolt.VehicleController> {
  onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: T, deltaTime: number): void;
}

export class DefaultVehicleInput {
  public input: VehicleInputState = { forward: 0, right: 0, handBrake: false };
  protected bodyId: Jolt.BodyID;

  constructor(protected body: Jolt.Body) {
    this.bodyId = body.GetID();
  }

  private _linearV: Vector3 = new Vector3();
  private _rotationQ: Quaternion = new Quaternion();

  getVelocity(): number {
    GetJoltVec3(this.body.GetLinearVelocity(), this._linearV);
    GetJoltQuat(this.body.GetRotation().Conjugated(), this._rotationQ);
    return this._linearV.applyRotationQuaternion(this._rotationQ).z;
  }
}

export class DefaultWheeledVehicleInput extends DefaultVehicleInput implements WheeledVehicleInput<Jolt.WheeledVehicleController> {
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

    if (this.input.handBrake) {
      forward = 0.0;
      handBrake = 1.0;
    }

    controller.SetDriverInput(forward, right, brake, handBrake);
    if (right != 0.0 || forward != 0.0 || brake != 0.0 || handBrake != 0.0)
      bodyInterface.ActivateBody(this.bodyId);
  }

}

export class DefaultMotorcycleInput extends DefaultVehicleInput implements WheeledVehicleInput<Jolt.MotorcycleController> {
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

function configureVehicleConstraint<T extends Vehicle.WheelSetting>(data: VehicleRequired, settings: Vehicle.VehicleSettings<T>, constraint: Jolt.VehicleConstraint): any[] {
  if (settings.collisionTester === 'cylinder') {
    constraint.SetVehicleCollisionTester(new Jolt.VehicleCollisionTesterCastCylinder(LAYER_MOVING, 0.05))
  }
  if (settings.collisionTester === 'ray') {
    constraint.SetVehicleCollisionTester(new Jolt.VehicleCollisionTesterRay(LAYER_MOVING))
  }
  data.world.AddConstraint(constraint);
  const stepListener = new Jolt.VehicleConstraintStepListener(constraint);
  const toDispose = [stepListener];
  data.world.AddStepListener(stepListener);
  return toDispose;
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

interface VehicleRequired {
  world: Jolt.PhysicsSystem,
  body: Jolt.Body,
  toDispose: any[],
  registerPerPhysicsStepCallback: (callback: (delta: number)=>void) => void
}


export class WheeledVehicleController {

  public wheelTransforms: { position: Vector3, rotation: Quaternion }[] = []

  private _physicsStepListener: (delta: number) => void;
  constructor(data: VehicleRequired, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.WheeledVehicleController>) {
    const physicsBody: Jolt.Body = data.body;
    const constraintSettings = createWheeledVehicleConstraint(settings);
    const constraint = new Jolt.VehicleConstraint(physicsBody, constraintSettings);
    Jolt.destroy(constraintSettings);
    const toDispose = configureVehicleConstraint(data, settings, constraint);

    const bodyInterface = data.world.GetBodyInterface();
    const controller = Jolt.castObject(constraint.GetController(), Jolt.WheeledVehicleController);

    settings.wheels.forEach(() => {
      this.wheelTransforms.push({ position: new Vector3, rotation: new Quaternion });
    })

    const wheelRight = new Jolt.Vec3(0, 1, 0)
    const wheelUp = new Jolt.Vec3(1, 0, 0)
    this._physicsStepListener = (delta: number) => {
      this.wheelTransforms.forEach((o, i) => {
        const transform = constraint.GetWheelLocalTransform(i, wheelRight, wheelUp);
        GetJoltVec3(transform.GetTranslation(), o.position);
        GetJoltQuat(transform.GetRotation().GetQuaternion(), o.rotation);
      })
      input.onPrePhysicsUpdate(bodyInterface, controller, delta);
    };
    data.registerPerPhysicsStepCallback(this._physicsStepListener);
    data.toDispose.push(wheelRight, wheelUp, ... toDispose);
  }
}

export class MotorcycleController {
  public wheelTransforms: { position: Vector3, rotation: Quaternion }[] = []
  private _physicsStepListener: (delta: number) => void;
  constructor(data: VehicleRequired, settings: Vehicle.MotorcycleVehicleSettings, input: WheeledVehicleInput<Jolt.MotorcycleController>) {
    const physicsBody: Jolt.Body = data.body;
    const constraintSettings = createMotorcycleConstraint(settings);
    const constraint = new Jolt.VehicleConstraint(physicsBody, constraintSettings);
    Jolt.destroy(constraintSettings);
    const toDispose = configureVehicleConstraint(data, settings, constraint);

    const bodyInterface = data.world.GetBodyInterface();
    const controller = Jolt.castObject(constraint.GetController(), Jolt.MotorcycleController);

    settings.wheels.forEach(() => {
      this.wheelTransforms.push({ position: new Vector3, rotation: new Quaternion });
    })

    const wheelRight = new Jolt.Vec3(0, 1, 0)
    const wheelUp = new Jolt.Vec3(1, 0, 0)
    this._physicsStepListener = (delta: number) => {
      this.wheelTransforms.forEach((o, i) => {
        const transform = constraint.GetWheelLocalTransform(i, wheelRight, wheelUp);
        GetJoltVec3(transform.GetTranslation(), o.position);
        GetJoltQuat(transform.GetRotation().GetQuaternion(), o.rotation);
      })
      input.onPrePhysicsUpdate(bodyInterface, controller, delta);
    };
    data.registerPerPhysicsStepCallback(this._physicsStepListener);
    data.toDispose.push(wheelRight, wheelUp, ... toDispose);
  }
}
export class TreadedVehicleController {

}