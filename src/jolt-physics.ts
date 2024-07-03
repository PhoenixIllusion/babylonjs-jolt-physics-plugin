
import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from '@babylonjs/core/Physics/v1/IPhysicsEnginePlugin';
import Jolt, { loadJolt } from './jolt-import';
import { ContactCollector } from './jolt-contact';
import { RayCastUtility } from './jolt-raycast';
import { SetJoltQuat, SetJoltVec3 } from './jolt-util';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Logger } from '@babylonjs/core/Misc/logger';
import { IMotorEnabledJoint, MotorEnabledJoint, PhysicsJoint, PhysicsJointData } from '@babylonjs/core/Physics/v1/physicsJoint';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { Nullable } from '@babylonjs/core/types';
import { IRaycastQuery, PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import * as JoltConstraintManager from './constraints';
import './jolt-impostor';
import { createJoltShape } from './jolt-shapes';
import { GravityUtility } from './gravity/utility';
import { GravityInterface } from './gravity/types';
import { LayerCollisionConfiguration, SystemCollisionConfiguration, configureSystemCollision, getObjectLayer } from './jolt-collision';
import { BodyUtility, GetMotionType } from './jolt-body';
import { MotionType } from './jolt-impostor';
import { BuoyancyImpulse, BuoyancyInterface } from './buoyancy/type';
import { BuoyancyUtility } from './buoyancy/utility';
import { JoltCharacterVirtualImpostor } from './character/impostor';
import { JoltCharacterVirtual } from './character/character-virtual';
export { setJoltModule } from './jolt-import'

interface PossibleMotors {
  SetMotorState(state: Jolt.EMotorState): void;
  SetTargetAngularVelocity(val: number): void;
  SetTargetAngle(val: number): void;
  SetTargetVelocity(val: number): void;
  SetTargetPosition(val: number): void;
}

export enum AllowedDOFs {
  None = 0b000000,
  All = 0b111111,
  TranslationX = 0b000001,
  TranslationY = 0b000010,
  TranslationZ = 0b000100,
  RotationX = 0b001000,
  RotationY = 0b010000,
  RotationZ = 0b100000,
  Plane2D = TranslationX | TranslationY | RotationZ
}

export const enum Jolt_Type {
  CHARACTER = 200,
  VIRTUAL_CHARACTER = 201,
}

export interface PhysicsSettings {
  collision?: SystemCollisionConfiguration,
  maxBodies?: number;
  maxPairs?: number;
  disableBidirectionalTransformation?: boolean;
  freezeStatic?: boolean;
}

export class JoltJSPlugin implements IPhysicsEnginePlugin {
  public world: Jolt.PhysicsSystem;
  public name = 'JoltJSPlugin';

  private _timeStep: number = 1 / 60;
  private _fixedTimeStep: number = 1 / 60;
  private _maxSteps = 10;

  private _tempVec3A: Jolt.Vec3;
  private _tempVec3B: Jolt.Vec3;
  private _tempVec3C: Jolt.Vec3;
  private _tempVec3D: Jolt.Vec3;

  private _tempQuaternion: Jolt.Quat;
  private _tempQuaternionBJS = new Quaternion();
  private _bodyInterface: Jolt.BodyInterface;

  private _raycaster: RayCastUtility;

  private _contactCollector: ContactCollector;
  private _contactListener: Jolt.ContactListenerJS;

  private _impostorLookup: Record<number, PhysicsImpostor> = {};
  private toDispose: any[] = [];


  static async loadPlugin(_useDeltaForWorldStep: boolean = true, physicsSettings?: PhysicsSettings, importSettings?: any): Promise<JoltJSPlugin> {
    await loadJolt(importSettings);
    const settings = new Jolt.JoltSettings();

    if (physicsSettings) {
      if (physicsSettings.maxPairs) {
        settings.mMaxBodyPairs = physicsSettings.maxPairs;
      }
      if (physicsSettings.maxBodies) {
        settings.mMaxBodies = physicsSettings.maxBodies;
      }
    }
    if (physicsSettings && physicsSettings.collision) {
      configureSystemCollision(settings, physicsSettings.collision);
    } else {
      const collision: LayerCollisionConfiguration = {
        type: 'layer',
        objectLayers: [{ id: 0, collides: [1] }, { id: 1, collides: [0, 1] }],
        broadphase: [{ id: 0, includesObjectLayers: [0] }, { id: 1, includesObjectLayers: [1] }]
      }
      configureSystemCollision(settings, collision);
    }

    const joltInterface = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);
    return new JoltJSPlugin(joltInterface, physicsSettings, _useDeltaForWorldStep);
  }

  constructor(private jolt: Jolt.JoltInterface, public settings: PhysicsSettings | undefined, private _useDeltaForWorldStep: boolean = true) {
    this.world = jolt.GetPhysicsSystem();
    this._bodyInterface = this.world.GetBodyInterface();
    this._tempVec3A = new Jolt.Vec3();
    this._tempVec3B = new Jolt.Vec3();
    this._tempVec3C = new Jolt.Vec3();
    this._tempVec3D = new Jolt.Vec3();
    this._tempQuaternion = new Jolt.Quat();
    this._raycaster = new RayCastUtility(jolt, this);
    this._contactListener = new Jolt.ContactListenerJS();
    this._contactCollector = new ContactCollector(this._contactListener);

    this.toDispose.push(this.jolt);
    this.toDispose.push(this._tempVec3A, this._tempVec3B, this._tempVec3C, this._tempVec3D);
    this.toDispose.push(this._tempQuaternion, this._contactListener);

  }

  setGravity(gravity: Vector3): void {
    this._tempVec3A.Set(gravity.x, gravity.y, gravity.z);
    this.world.SetGravity(this._tempVec3A);
  }

  public setTimeStep(timeStep: number) {
    this._timeStep = timeStep;
  }

  /**
   * Increment to step forward in the physics engine (If timeStep is set to 1/60 and fixedTimeStep is set to 1/120 the physics engine should run 2 steps per frame) (Default: 1/60)
   * @param fixedTimeStep fixedTimeStep to use in seconds
   */
  public setFixedTimeStep(fixedTimeStep: number) {
    this._fixedTimeStep = fixedTimeStep;
  }

  /**
   * Sets the maximum number of steps by the physics engine per frame (Default: 5)
   * @param maxSteps the maximum number of steps by the physics engine per frame
   */
  public setMaxSteps(maxSteps: number) {
    this._maxSteps = maxSteps;
  }
  public getMaxSteps(): number {
    return this._maxSteps;
  }

  /**
   * Gets the current timestep (only used if useDeltaForWorldStep is false in the constructor)
   * @returns the current timestep in seconds
   */
  public getTimeStep(): number {
    return this._timeStep;
  }

  private _perPhysicsStepCallbacks: ((timeStep: number) => void)[] = [];
  registerPerPhysicsStepCallback(listener: (timeStep: number) => void): void {
    this._perPhysicsStepCallbacks.push(listener);
  }
  unregisterPerPhysicsStepCallback(listener: (timeStep: number) => void): void {
    const index = this._perPhysicsStepCallbacks.indexOf(listener);
    if (index > 0) {
      this._perPhysicsStepCallbacks.splice(index, 1);
    }
  }

  executeStep(delta: number, impostors: PhysicsImpostor[]): void {
    this._contactCollector.clear();
    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft && !impostor.joltPluginData.frozen) {
        impostor.beforeStep();
      }
      if (impostor.physicsBody instanceof Jolt.Body) {
        const body: Jolt.Body = impostor.physicsBody;
        const bodyID = body.GetID().GetIndexAndSequenceNumber();
        this._contactCollector.registerImpostor(bodyID, impostor);
      }
    }
    if(this._contactCollector.hasRegisteredListener) {
      this.world.SetContactListener(this._contactCollector.listener);
    } else {
      this.world.SetContactListener(0);
    }

    this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep, (delta) => this.onPhysicsStep(delta));

    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft && !impostor.joltPluginData.frozen) {
        impostor.afterStep();
      }
    }
  }

  private onPhysicsStep(inDeltaTime: number): void {
    this._perPhysicsStepCallbacks.forEach(listener => listener(inDeltaTime));
  }

  // Ammo's behavior when maxSteps > 0 does not behave as described in docs
  // @see http://www.bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
  //
  // When maxSteps is 0 do the entire simulation in one step
  // When maxSteps is > 0, run up to maxStep times, if on the last step the (remaining step - fixedTimeStep) is < fixedTimeStep, the remainder will be used for the step. (eg. if remainder is 1.001 and fixedTimeStep is 1 the last step will be 1.001, if instead it did 2 steps (1, 0.001) issues occuered when having a tiny step in ammo)
  // Note: To get deterministic physics, timeStep would always need to be divisible by fixedTimeStep
  private _stepSimulation(timeStep: number = 1 / 60, maxSteps: number = 10, fixedTimeStep: number = 1 / 60, onStep: (delta: number)=>void) {
    if (maxSteps == 0) {
      onStep(timeStep);
      this.jolt.Step(timeStep, 1);
    } else {
      while (maxSteps > 0 && timeStep > 0) {
        if (timeStep - fixedTimeStep < fixedTimeStep) {
          onStep(timeStep);
          this.jolt.Step(timeStep, 1);
          timeStep = 0;
        } else {
          timeStep -= fixedTimeStep;
          onStep(fixedTimeStep);
          this.jolt.Step(fixedTimeStep, 1);
        }
        maxSteps--;
      }
    }
  }

  getPluginVersion(): number {
    return 1;
  }

  applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;

      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      SetJoltVec3(force, impulse)
      SetJoltVec3(contactPoint, worldPoint)

      physicsBody.AddImpulse(impulse, worldPoint);
    } else {
      Logger.Warn('Cannot be applied to a soft body');
    }

  }

  applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint?: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;
      const forceJ = this._tempVec3B;
      SetJoltVec3(force, forceJ)
      if (contactPoint) {
        const worldPoint = this._tempVec3A;
        SetJoltVec3(contactPoint, worldPoint)
        this._bodyInterface.AddForce(physicsBody.GetID(), forceJ, worldPoint, Jolt.EActivation_Activate);
      } else {
        this._bodyInterface.AddForce(physicsBody.GetID(), forceJ, Jolt.EActivation_Activate);
      }
    } else {
      Logger.Warn('Cannot be applied to a soft body');
    }
  }

  generatePhysicsBody(impostor: PhysicsImpostor): void {
    impostor._pluginData = impostor._pluginData || {};
    impostor.joltPluginData.toDispose = [];

    //parent-child relationship
    if (impostor.parent) {
      if (impostor.physicsBody) {
        this.removePhysicsBody(impostor);
        impostor.forceUpdate();
      }
      return;
    }
    if (impostor.isBodyInitRequired()) {
      if (impostor instanceof JoltCharacterVirtualImpostor) {
        const imp = impostor as JoltCharacterVirtualImpostor;
        const shape = createJoltShape(impostor, this._tempVec3A, this._tempVec3B, this._tempQuaternion);
        const char = new JoltCharacterVirtual(imp, shape, { physicsSystem: this.world, jolt: this.jolt }, this);
        char.init();
        shape.Release();
        imp.physicsBody = char.getCharacter();
        imp._pluginData.controller = char;
        imp._pluginData.plugin = this;
        this._impostorLookup[-performance.now()] = impostor;
        return;
      }
      const body = BodyUtility.createBody(impostor, this.settings, this._bodyInterface, this._tempVec3A, this._tempVec3B, this._tempQuaternion);
      impostor.joltPluginData.plugin = this;
      this._bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
      this._impostorLookup[body.GetID().GetIndexAndSequenceNumber()] = impostor;
    }
  }

  public GetImpostorForBodyId(id: number) {
    return this._impostorLookup[id];
  }

  /**
  * Removes the physics body from the imposter and disposes of the body's memory
  * @param impostor imposter to remove the physics body from
  */
  public removePhysicsBody(impostor: PhysicsImpostor) {
    if (impostor instanceof JoltCharacterVirtualImpostor) {
      if (impostor.joltPluginData) {
        impostor.controller.onDestroy();
        impostor.joltPluginData.toDispose.forEach((d: any) => {
          Jolt.destroy(d);
        });
        impostor.joltPluginData.toDispose = [];
      }
      return;
    }
    if (this.world) {
      delete this._impostorLookup[impostor.physicsBody.GetID().GetIndexAndSequenceNumber()];
      this._bodyInterface.RemoveBody(impostor.physicsBody.GetID());
      this._bodyInterface.DestroyBody(impostor.physicsBody.GetID());

      if (impostor.joltPluginData) {
        impostor.joltPluginData.toDispose.forEach((d: any) => {
          Jolt.destroy(d);
        });
        impostor.joltPluginData.toDispose = [];
      }
    }
  }


  generateJoint(impostorJoint: PhysicsImpostorJoint): void {
    const mainBody: Jolt.Body = impostorJoint.mainImpostor.physicsBody;
    const connectedBody: Jolt.Body = impostorJoint.connectedImpostor.physicsBody;
    if (!mainBody || !connectedBody) {
      return;
    }

    const joint = impostorJoint.joint;
    const nativeParams = joint.jointData.nativeParams;

    let constraint: Jolt.Constraint | undefined;
    if (nativeParams && nativeParams.constraint) {
      constraint = JoltConstraintManager.createJoltConstraint(mainBody, connectedBody, nativeParams.constraint);
    } else {
      constraint = JoltConstraintManager.createClassicConstraint(mainBody, connectedBody, joint)
    }
    if (constraint) {
      this.world.AddConstraint(constraint);
      impostorJoint.joint.physicsJoint = constraint;
      impostorJoint.joint.jointData.nativeParams.body1 = mainBody;
      impostorJoint.joint.jointData.nativeParams.body2 = connectedBody;
    }
  }

  removeJoint(impostorJoint: PhysicsImpostorJoint): void {
    if (this.world) {
      this.world.RemoveConstraint(impostorJoint.joint.physicsJoint);
    }
  }
  /**
   * If this plugin is supported
   * @returns true if its supported
   */
  public isSupported(): boolean {
    return Jolt !== undefined;
  }

  setTransformationFromPhysicsBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;

    const position = physicsBody.GetPosition();
    impostor.object.position.set(position.GetX(), position.GetY(), position.GetZ());
    const quat = physicsBody.GetRotation();
    this._tempQuaternionBJS.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());

    if (!impostor.object.rotationQuaternion) {
      if (impostor.object.rotation) {
        this._tempQuaternionBJS.toEulerAnglesToRef(impostor.object.rotation);
      }
    } else {
      impostor.object.rotationQuaternion.copyFrom(this._tempQuaternionBJS);
    }

  }

  setPhysicsBodyTransformation(impostor: PhysicsImpostor, newPosition: Vector3, newRotation: Quaternion): void {
    const position = this._tempVec3A;
    const rotation = this._tempQuaternion;
    position.Set(newPosition.x, newPosition.y, newPosition.z);
    rotation.Set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);

    if (impostor instanceof JoltCharacterVirtualImpostor) {
      const character: Jolt.CharacterVirtual = impostor.physicsBody;
      character.SetPosition(position);
      character.SetRotation(rotation);
    } else {
      const physicsBody: Jolt.Body = impostor.physicsBody;
      this._bodyInterface.SetPositionAndRotationWhenChanged(physicsBody.GetID(), position, rotation, Jolt.EActivation_Activate);
    }
  }

  /**
   * Sets the linear velocity of the physics body
   * @param impostor imposter to set the velocity on
   * @param velocity velocity to set
   */
  public setLinearVelocity(impostor: PhysicsImpostor, velocity: Vector3) {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
    physicsBody.SetLinearVelocity(this._tempVec3A);
  }


  setAngularVelocity(impostor: PhysicsImpostor, velocity: Nullable<Vector3>): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    if (velocity) {
      this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
    } else {
      this._tempVec3A.Set(0, 0, 0);
    }
    physicsBody.SetAngularVelocity(this._tempVec3A);
  }
  getLinearVelocity(impostor: PhysicsImpostor): Nullable<Vector3> {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    const velocity = physicsBody.GetLinearVelocity();
    return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
  }
  getAngularVelocity(impostor: PhysicsImpostor): Nullable<Vector3> {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    const velocity = physicsBody.GetAngularVelocity();
    return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
  }
  setBodyMass(impostor: PhysicsImpostor, mass: number): void {
    const body: Jolt.Body = impostor.physicsBody;
    const motionProps = body.GetMotionProperties();
    const massProps = body.GetShape().GetMassProperties();
    massProps.ScaleToMass(mass);
    motionProps.SetMassProperties(Jolt.EAllowedDOFs_All, massProps);
    impostor.joltPluginData.mass = mass;
  }
  getBodyMass(impostor: PhysicsImpostor): number {
    return impostor.joltPluginData.mass || 0;
  }
  getBodyFriction(impostor: PhysicsImpostor): number {
    return impostor.joltPluginData.friction || 0;
  }
  setBodyFriction(impostor: PhysicsImpostor, friction: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetFriction(friction);
    impostor.joltPluginData.friction = friction;
  }
  getBodyRestitution(impostor: PhysicsImpostor): number {
    return impostor.joltPluginData.restitution || 0;
  }
  setBodyRestitution(impostor: PhysicsImpostor, restitution: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetRestitution(restitution);
    impostor.joltPluginData.restitution = restitution;
  }
  /*
  getBodyPressure?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyPressure?(impostor: PhysicsImpostor, pressure: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyStiffness?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyStiffness?(impostor: PhysicsImpostor, stiffness: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyVelocityIterations?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyVelocityIterations?(impostor: PhysicsImpostor, velocityIterations: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyPositionIterations?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyPositionIterations?(impostor: PhysicsImpostor, positionIterations: number): void {
    throw new Error('Method not implemented.');
  }
  appendAnchor?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, width: number, height: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error('Method not implemented.');
  }
  appendHook?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, length: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error('Method not implemented.');
  }*/

  setShape(impostor: PhysicsImpostor, type: number, params: PhysicsImpostorParameters): void {
    impostor.type = type;
    const keys: (keyof PhysicsImpostorParameters)[] = ['extents', 'centerOfMass', 'radiusBottom', 'radiusTop', 'mesh', 'copyShape'];
    keys.forEach(key => {
      impostor.setParam(key, params[key])
    });
    impostor.resetUpdateFlags();
    const body: Jolt.Body = impostor.physicsBody;
    const shape = createJoltShape(impostor, this._tempVec3A, this._tempVec3B, this._tempQuaternion);

    if (impostor instanceof JoltCharacterVirtualImpostor) {
      const charImp = impostor as JoltCharacterVirtualImpostor;
      const char = charImp._pluginData.controller;
      char.getCharacter().SetShape(shape,
        1.5 * this.world.GetPhysicsSettings().mPenetrationSlop,
        char.updateFilterData.movingBPFilter,
        char.updateFilterData.movingLayerFilter,
        char.updateFilterData.bodyFilter,
        char.updateFilterData.shapeFilter,
        this.jolt.GetTempAllocator()
      );
    } else {
      this._bodyInterface.SetShape(body.GetID(), shape, true, Jolt.EActivation_Activate);
    }
    shape.Release();
  }

  sleepBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.DeactivateBody(physicsBody.GetID())
  }

  wakeUpBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.ActivateBody(physicsBody.GetID())
  }

  raycast(from: Vector3, to: Vector3, query?: IRaycastQuery): PhysicsRaycastResult {
    return this._raycaster.raycast(from, to, query);
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult, query?: IRaycastQuery): void {
    this._raycaster.raycastToRef(from, to, result, query);
  }

  updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void {
    if (joint.type !== PhysicsJoint.DistanceJoint) {
      const constraint: Jolt.DistanceConstraint = joint.physicsJoint;
      constraint.SetDistance(minDistance || 0, maxDistance);
    } else {
      throw new Error('updateDistanceJoint on non-distance constraint');
    }
  }
  setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const constraint: Partial<PossibleMotors> = joint.physicsJoint;
      if (motorMode == 'position') {
        constraint.SetMotorState!(Jolt.EMotorState_Position);
        constraint.SetTargetAngle && constraint.SetTargetAngle(speed);
        constraint.SetTargetPosition && constraint.SetTargetPosition(speed);
      } else if (motorMode == 'velocity') {
        constraint.SetMotorState!(Jolt.EMotorState_Velocity);
        constraint.SetTargetAngularVelocity && constraint.SetTargetAngularVelocity(speed);
        constraint.SetTargetVelocity && constraint.SetTargetVelocity(speed);
      }
      if (joint instanceof MotorEnabledJoint) {
        const motorJoint = joint as MotorEnabledJoint;
        const body1: Jolt.Body = motorJoint.jointData.nativeParams?.body1;
        const body2: Jolt.Body = motorJoint.jointData.nativeParams?.body2;
        body1 && this._bodyInterface.ActivateBody(body1.GetID());
        body2 && this._bodyInterface.ActivateBody(body2.GetID());
      }
      if (maxForce) {
        this.setLimit(joint, maxForce);
      }

    } else {
      throw new Error('setMotor on non-motorized constraint');
    }
  }
  setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const motorSettings: Jolt.MotorSettings = joint.physicsJoint.GetMotorSettings();
      if (upperLimit == 0 && lowerLimit == 0) {
        joint.physicsJoint.SetMotorState(Jolt.EMotorState_Off);
      }
      if (motorMode == 'position') {
        motorSettings.mMaxForceLimit = upperLimit;
        motorSettings.mMinForceLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      } else if (motorMode == 'velocity') {
        motorSettings.mMaxTorqueLimit = upperLimit;
        motorSettings.mMinTorqueLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      }
    } else {
      throw new Error('setLimit on non-motorized constraint');
    }
  }
  getRadius(impostor: PhysicsImpostor): number {
    const extents = impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
    return Math.max(extents.x, extents.y, extents.z) / 2;
  }
  getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void {
    const extents = impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
    result.x = extents.x;
    result.y = extents.y;
    result.z = extents.z;
  }
  syncMeshWithImpostor(mesh: AbstractMesh, impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;

    const position = physicsBody.GetPosition();
    mesh.position.set(position.GetX(), position.GetY(), position.GetZ());

    if (mesh.rotationQuaternion) {
      const quat = physicsBody.GetRotation();
      mesh.rotationQuaternion.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());
    }
  }

  dispose(): void {
    const outstandingBodies = Object.values(this._impostorLookup);
    outstandingBodies.forEach(impostor => {
      impostor.dispose();
    })
    this.toDispose.forEach(joltObj => {
      Jolt.destroy(joltObj);
    });
    this._raycaster.dispose();
    (this.world as any) = null;
  }

  setGravityOverride(impostor: PhysicsImpostor, gravity: GravityInterface | null) {

    if (impostor instanceof JoltCharacterVirtualImpostor) {
      const charImp = impostor as JoltCharacterVirtualImpostor;
      const char = charImp._pluginData.controller;
      const inputHandler = char.inputHandler;
      if (inputHandler) {
        inputHandler.gravity = gravity ? gravity : undefined;
      }
      return;
    }

    const gravityUtility = GravityUtility.getInstance(this);
    if (gravity) {
      if (impostor.joltPluginData.gravity) {
        impostor.joltPluginData.gravity = gravity;
      } else {
        gravityUtility.registerGravityOverride(impostor, gravity);
      }
    } else {
      gravityUtility.unregisterGravityOverride(impostor);
    }
  }

  setGravityFactor(impostor: PhysicsImpostor, factor: number) {
    const body: Jolt.Body = impostor.physicsBody;
    body.GetMotionProperties().SetGravityFactor(factor);
  }

  moveKinematic(impostor: PhysicsImpostor, position: Vector3 | null, rotation: Quaternion | null, duration: number): void {
    const body: Jolt.Body = impostor.physicsBody;

    const vec3 = (position != null) ? SetJoltVec3(position, this._tempVec3A) : body.GetPosition();
    const quat = (rotation != null) ? SetJoltQuat(rotation, this._tempQuaternion) : body.GetRotation();

    body.MoveKinematic(vec3, quat, duration);
  }


  setLayer(impostor: PhysicsImpostor, layer: number, mask?: number): void {
    layer = getObjectLayer(layer, mask, this.settings);
    if (impostor instanceof JoltCharacterVirtualImpostor) {
      impostor.controller.setLayer(layer);
    } else {
      const body: Jolt.Body = impostor.physicsBody;
      this._bodyInterface.SetObjectLayer(body.GetID(), layer);
    }
  }

  setMotionType(impostor: PhysicsImpostor, motionType: MotionType): void {
    const body: Jolt.Body = impostor.physicsBody;
    if (motionType !== 'static') {
      const allowed = body.CanBeKinematicOrDynamic();
      if (!allowed) {
        throw new Error("Impostor needs to be created with Jolt PhysicsImpostorParameters 'allowDynamicOrKinematic' set tot true");
      }
    }
    this._bodyInterface.SetMotionType(body.GetID(), GetMotionType(motionType), Jolt.EActivation_Activate);
  }

  registerBuoyancyInterface(impostor: PhysicsImpostor, buoyancy: BuoyancyInterface | null) {
    const buoyancyUtility = BuoyancyUtility.getInstance(this);
    if (buoyancy) {
      if (impostor.joltPluginData.buoyancy) {
        impostor.joltPluginData.buoyancy = buoyancy;
      } else {
        buoyancyUtility.registerBuoyancy(impostor, buoyancy);
      }
    } else {
      buoyancyUtility.unregisterBuoyancy(impostor);
    }
  }

  applyBuoyancyImpulse(impostor: PhysicsImpostor, impulse: BuoyancyImpulse, deltaTime: number) {
    const body: Jolt.Body = impostor.physicsBody;

    const inSurfacePosition = SetJoltVec3(impulse.surfacePosition, this._tempVec3A);
    const inSurfaceNormal = SetJoltVec3(impulse.surfaceNormal || Vector3.UpReadOnly, this._tempVec3B);
    const inBuoyancy = impulse.buoyancy;
    const inLinearDrag = impulse.linearDrag;
    const inAngularDrag = impulse.angularDrag;
    const inFluidVelocity = SetJoltVec3(impulse.fluidVelocity || Vector3.ZeroReadOnly, this._tempVec3C);
    const inGravity = impulse.gravity ? SetJoltVec3(impulse.gravity, this._tempVec3D) : this.world.GetGravity();
    this._bodyInterface.ApplyBuoyancyImpulse(body.GetID(), inSurfacePosition, inSurfaceNormal, inBuoyancy, inLinearDrag, inAngularDrag, inFluidVelocity, inGravity, deltaTime);
  }
}
