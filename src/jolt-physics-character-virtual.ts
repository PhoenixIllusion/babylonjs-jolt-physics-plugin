
import Jolt from './jolt-import';
import { GetJoltVec3, LAYER_MOVING, RawPointer, SetJoltQuat, SetJoltVec3, wrapJolt } from './jolt-util';
import { JoltJSPlugin, JoltPluginData } from '.';
import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { GravityInterface } from './gravity/types';


class CharacterVirtualConfig {
  public maxSlopeAngle = 45.0 * (Math.PI / 180.0);
  public mass = 70;
  public maxStrength = 100.0;
  public characterPadding = 0.02;
  public penetrationRecoverySpeed = 1.0;
  public predictiveContactDistance = 0.1;
  public enableWalkStairs = true;
  public enableStickToFloor = true;
}

interface JoltCharacterVirtualPluginData extends JoltPluginData {
  controller: JoltCharacterVirtual;
}


export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
  _pluginData!: JoltCharacterVirtualPluginData;

  constructor(
    object: IPhysicsEnabledObject,
    type: number,
    _options: PhysicsImpostorParameters,
    _scene?: Scene
  ) {
    super(object, type, _options, _scene);

  }
  public get controller(): JoltCharacterVirtual {
    return this._pluginData.controller;
  }
  public set controller(controller: JoltCharacterVirtual) {
    this._pluginData.controller = controller;
  }
}

interface WorldData {
  jolt: Jolt.JoltInterface,
  physicsSystem: Jolt.PhysicsSystem
}

interface UpdateFiltersData {
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  bodyFilter: Jolt.BodyFilter;
  shapeFilter: Jolt.ShapeFilter
}

export interface CharacterVirtualInputHandler {
  up: Vector3;
  rotation: Quaternion;
  gravity?: GravityInterface;
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, tmpVec3: Jolt.Vec3, tmpQuat: Jolt.Quat): void;
  updateCharacter(character: Jolt.CharacterVirtual, tmp: Jolt.Vec3): void;
}

export const enum GroundState {
  ON_GROUND,
  RISING,
  FALLING
}
export const enum CharacterState {
  IDLE,
  MOVING,
  JUMPING
}

export class StandardCharacterVirtualHandler implements CharacterVirtualInputHandler {
  private mDesiredVelocity: Vector3 = new Vector3();
  private inMovementDirection: Vector3 = new Vector3();
  private inJump = false;

  public allowSliding = false;

  public controlMovementDuringJump = true;
  public characterSpeed = 6.0;
  public jumpSpeed = 15.0;

  public enableCharacterInertia = true;

  public groundState: GroundState = GroundState.ON_GROUND;
  public userState: CharacterState = CharacterState.IDLE;

  updateInput(inMovementDirection: Vector3, inJump: boolean) {
    this.inMovementDirection.copyFrom(inMovementDirection);
    this.inJump = inJump;
  }

  private _new_velocity: Vector3 = new Vector3();

  public autoUp = true;
  public up: Vector3 = new Vector3(0,1,0);
  public rotation: Quaternion = Quaternion.Identity();
  public gravity?: GravityInterface;

  private _linVelocity: Vector3 = new Vector3();
  private _groundVelocity: Vector3 = new Vector3();

  processCharacterData(character: Jolt.CharacterVirtual, _physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat) {

    const player_controls_horizontal_velocity = this.controlMovementDuringJump || character.IsSupported();
    if (player_controls_horizontal_velocity) {
      // True if the player intended to move
      this.allowSliding = !(this.inMovementDirection.length() < 1.0e-12);
      // Smooth the player input
      if (this.enableCharacterInertia) {
        const s = 0.25 * this.characterSpeed;
        this.mDesiredVelocity = this.mDesiredVelocity.multiplyByFloats(0.75, 0.75, 0.75).add(this.inMovementDirection.multiplyByFloats(s, s, s))
      } else {
        const s = this.characterSpeed;
        this.mDesiredVelocity = this.inMovementDirection.multiplyByFloats(s, s, s);
      }
    }
    else {
      // While in air we allow sliding
      this.allowSliding = true;
    }

    const upRotation = this.rotation.clone();
    if(this.autoUp) {
      gravity.negateToRef(this.up);
      this.up.normalize();
      const rot = Quaternion.FromUnitVectorsToRef(new Vector3(0,1,0), this.up, new Quaternion());
      upRotation.multiplyInPlace(rot);
    }

    const characterUp = this.up;
    const character_up = SetJoltVec3(characterUp, _tmpVec3);
    const character_up_rotation = SetJoltQuat(upRotation, _tmpQuat);

    character.SetUp(character_up);
    character.SetRotation(character_up_rotation);

    character.UpdateGroundVelocity();
    const linearVelocity = GetJoltVec3(character.GetLinearVelocity(), this._linVelocity);
    const vVel = Vector3.Dot(linearVelocity, characterUp);
    const current_vertical_velocity = characterUp.multiplyByFloats(vVel, vVel, vVel);
    const ground_velocity = GetJoltVec3(character.GetGroundVelocity(), this._groundVelocity);
    const gVel = Vector3.Dot(this._groundVelocity, characterUp);

    const moving_towards_ground = (vVel - gVel) < 0.1;
    const groundState = character.GetGroundState();
    if (groundState == Jolt.EGroundState_OnGround) {
      this.groundState = GroundState.ON_GROUND;
      if (this.mDesiredVelocity.length() < 0.01) {
        this.userState = CharacterState.IDLE;
      } else {
        this.userState = CharacterState.MOVING;
      }
    } else {
      if (moving_towards_ground) {
        this.groundState = GroundState.FALLING;
      } else {
        this.groundState = GroundState.RISING;
      }
    }
    if (groundState == Jolt.EGroundState_OnGround	// If on ground
      && (this.enableCharacterInertia ?
        moving_towards_ground													// Inertia enabled: And not moving away from ground
        : !character.IsSlopeTooSteep(character.GetGroundNormal())))			// Inertia disabled: And not on a slope that is too steep
    {
      // Assume velocity of ground when on ground
      this._new_velocity.copyFrom(ground_velocity);

      // Jump
      if (this.inJump && moving_towards_ground) {
        this._new_velocity.addInPlace(characterUp.multiplyByFloats(this.jumpSpeed, this.jumpSpeed, this.jumpSpeed));
        this.userState = CharacterState.JUMPING;
      }
    }
    else
      this._new_velocity.copyFrom(current_vertical_velocity);


    // Gravity
    this._new_velocity.addInPlace(gravity.multiplyByFloats(inDeltaTime, inDeltaTime, inDeltaTime));

    if (player_controls_horizontal_velocity) {
      // Player input
      this._new_velocity.addInPlace(this.mDesiredVelocity.applyRotationQuaternion(upRotation));
    }
    else {
      // Preserve horizontal velocity
      const current_horizontal_velocity = linearVelocity.subtract(current_vertical_velocity);
      this._new_velocity.addInPlace(current_horizontal_velocity);
    }

  }

  updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void {
    SetJoltVec3(this._new_velocity, tempVec);
    character.SetLinearVelocity(tempVec);
  }
}


export class JoltCharacterVirtual {
  private mCharacter!: Jolt.CharacterVirtual;
  private mDisposables!: any[];

  private mUpdateSettings!: Jolt.ExtendedUpdateSettings;
  public updateFilterData!: UpdateFiltersData;

  public inputHandler?: CharacterVirtualInputHandler;

  public config = new CharacterVirtualConfig();

  public contactListener?: Jolt.CharacterContactListenerJS;

  private _jolt_temp1!: Jolt.Vec3;
  private _jolt_tempQuat1!: Jolt.Quat;
  constructor(private impostor: JoltCharacterVirtualImpostor, private shape: Jolt.Shape, private world: WorldData, private plugin: JoltJSPlugin) {
  }
  init(): void {
    const world = this.world;
    const impostor = this.impostor;
    this.mDisposables = impostor._pluginData.toDispose;

    this._jolt_temp1 = new Jolt.Vec3();
    this._jolt_tempQuat1 = new Jolt.Quat();
    this.mDisposables.push(this._jolt_temp1, this._jolt_tempQuat1);


    this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();

    const settings = new Jolt.CharacterVirtualSettings();
    settings.mMass = this.config.mass;
    settings.mMaxSlopeAngle = this.config.maxSlopeAngle;
    settings.mMaxStrength = this.config.maxStrength;
    settings.mShape = this.shape;
    settings.mCharacterPadding = this.config.characterPadding;
    settings.mPenetrationRecoverySpeed = this.config.penetrationRecoverySpeed;
    settings.mPredictiveContactDistance = this.config.predictiveContactDistance;
    const mSupportingVolume = new Jolt.Plane(Jolt.Vec3.prototype.sAxisY(), -1);
    settings.mSupportingVolume = mSupportingVolume;
    Jolt.destroy(mSupportingVolume);

    this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.world.physicsSystem);
    Jolt.destroy(settings);
    this.mDisposables.push(this.mCharacter, this.mUpdateSettings);


    const objectVsBroadPhaseLayerFilter = world.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = world.jolt.GetObjectLayerPairFilter();
    const filter = this.updateFilterData = {
      movingBPFilter: new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, LAYER_MOVING),
      movingLayerFilter: new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, LAYER_MOVING),
      bodyFilter: new Jolt.BodyFilter(),
      shapeFilter: new Jolt.ShapeFilter()
    };
    this.mDisposables.push(filter.bodyFilter, filter.shapeFilter, filter.movingBPFilter, filter.movingLayerFilter);

  }

  private _characterUp: Vector3 = new Vector3();
  private _temp1: Vector3 = new Vector3();
  private _temp2: Vector3 = new Vector3();

  private _gravity: Vector3 = new Vector3();

  prePhysicsUpdate(mDeltaTime: number) {
    if (this.inputHandler) {
      this._characterUp.copyFrom(this.inputHandler.up);
      if (!this.config.enableStickToFloor) {
        this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0)
      }
      else {
        const len = -this.mUpdateSettings.mStickToFloorStepDown.Length();
        const vec = this._temp1;
        this._temp2.set(len, len, len);
        this._characterUp.multiplyToRef(this._temp2, vec);
        SetJoltVec3(vec, this.mUpdateSettings.mStickToFloorStepDown);
      }

      if (!this.config.enableWalkStairs) {
        this.mUpdateSettings.mWalkStairsStepUp.Set(0, 0, 0);
      }
      else {
        const len = -this.mUpdateSettings.mWalkStairsStepUp.Length();
        const vec = this._temp1;
        this._temp2.set(len, len, len);
        this._characterUp.multiplyToRef(this._temp2, vec);
        SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
      }

      const gravity = this.inputHandler.gravity;
      if(!gravity) {
        GetJoltVec3(this.world.physicsSystem.GetGravity(), this._gravity);
      } else {
        this._gravity.copyFrom(gravity.getGravity(() => GetJoltVec3(this.mCharacter.GetPosition(), this._temp1)));
      }

      this.inputHandler.processCharacterData(this.mCharacter, this.world.physicsSystem, this._gravity, mDeltaTime, this._jolt_temp1, this._jolt_tempQuat1);
      this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);

      this.mCharacter.SetMaxSlopeAngle(this.config.maxSlopeAngle);
      this.mCharacter.SetMaxStrength(this.config.maxStrength);
      this.mCharacter.SetMass(this.config.mass);
      this.mCharacter.SetPenetrationRecoverySpeed(this.config.penetrationRecoverySpeed);

      const inGravity = SetJoltVec3(this._gravity, this._jolt_temp1);
      const {
        movingBPFilter,
        movingLayerFilter,
        bodyFilter,
        shapeFilter } = this.updateFilterData;
      this.mCharacter.ExtendedUpdate(mDeltaTime,
        inGravity,
        this.mUpdateSettings,
        movingBPFilter,
        movingLayerFilter,
        bodyFilter,
        shapeFilter,
        this.world.jolt.GetTempAllocator());
    }
  }

  getCharacter(): Jolt.CharacterVirtual {
    return this.mCharacter;
  }

  setPosition(position: Vector3) {
    SetJoltVec3(position, this._jolt_temp1);
    this.mCharacter.SetPosition(this._jolt_temp1);
  }

  public _JoltPhysicsCallback: {
    'on-adjust-velocity': CharacterListenerCallbacks<OnAdjustVelocity>[],
    'on-contact-add': CharacterListenerCallbacks<OnContactAdd>[],
    'on-contact-validate': CharacterListenerCallbacks<OnContactValidate>[]
  } = { 'on-adjust-velocity': [], 'on-contact-add': [], 'on-contact-validate': [] }

  public registerOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactAdd): void;
  public registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidate): void;
  public registerOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnAdjustVelocity): void;
  public registerOnJoltPhysicsCollide(kind: CharacterListenerCallbackKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactValidate | OnContactAdd | OnAdjustVelocity): void {

    let _lVelocity = new Vector3();
    let _aVelocity = new Vector3();
    if (!this.contactListener) {
      this.contactListener = new Jolt.CharacterContactListenerJS();
      this.contactListener.OnAdjustBodyVelocity = (_inCharacter: RawPointer<Jolt.CharacterVirtual>, inBody2Ptr: RawPointer<Jolt.Body>, lVelocityPtr: RawPointer<Jolt.Vec3>, aVelocityPtr: RawPointer<Jolt.Vec3>): void => {
        const inBody2 = wrapJolt(inBody2Ptr, Jolt.Body);
        const lVelocity = wrapJolt(lVelocityPtr, Jolt.Vec3);
        const aVelocity = wrapJolt(aVelocityPtr, Jolt.Vec3);
        const impostor = this.plugin.GetImpostorForBodyId(inBody2.GetID().GetIndexAndSequenceNumber());
        GetJoltVec3(lVelocity, _lVelocity);
        GetJoltVec3(aVelocity, _aVelocity);
        this.onJoltCollide('on-adjust-velocity', { body: impostor, linearVelocity: _lVelocity, angularVelocity: _aVelocity });
        SetJoltVec3(_aVelocity, aVelocity);
        SetJoltVec3(_lVelocity, lVelocity);
      }
      this.contactListener.OnContactAdded = (_inCharacter: RawPointer<Jolt.CharacterVirtual>, inBodyID2Ptr: RawPointer<Jolt.BodyID>, _inSubShapeID2: RawPointer<Jolt.SubShapeID>,
        _inContactPosition: RawPointer<Jolt.Vec3>, _inContactNormal: RawPointer<Jolt.Vec3>, _ioSettings: RawPointer<Jolt.CharacterContactSettings>): void => {
        const inBodyID2 = wrapJolt(inBodyID2Ptr as any as number, Jolt.BodyID);
        const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
        this.onJoltCollide('on-contact-add', { body: impostor });
      }
      this.contactListener.OnContactValidate = (_inCharacter: RawPointer<Jolt.CharacterVirtual>, inBodyID2Ptr: RawPointer<Jolt.BodyID>, _inSubShapeID2: RawPointer<Jolt.SubShapeID>): boolean => {
        const inBodyID2 = wrapJolt(inBodyID2Ptr as any as number, Jolt.BodyID);
        const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
        const ret = this.onJoltCollide('on-contact-validate', { body: impostor });
        if (ret !== undefined) {
          return ret;
        }
        return true;
      }
      this.contactListener.OnContactSolve = (_inCharacter: RawPointer<Jolt.CharacterVirtual>, _inBodyID2: RawPointer<Jolt.BodyID>, _inSubShapeID2: RawPointer<Jolt.SubShapeID>,
        _inContactPosition: RawPointer<Jolt.Vec3>, _inContactNormal: RawPointer<Jolt.Vec3>, _inContactVelocity: RawPointer<Jolt.Vec3>, _inContactMaterial: RawPointer<Jolt.PhysicsMaterial>,
        _inCharacterVelocity: RawPointer<Jolt.Vec3>, _ioNewCharacterVelocity: RawPointer<Jolt.Vec3>): void => {
      }
      this.mCharacter.SetListener(this.contactListener);
      this.mDisposables.push(this.contactListener);
    }

    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    if (kind == 'on-contact-add') {
      const list = this._JoltPhysicsCallback['on-contact-add'];
      list.push({ callback: func as OnContactAdd, otherImpostors: collidedAgainstList });
    }
    if (kind == 'on-contact-validate') {
      const list = this._JoltPhysicsCallback['on-contact-validate'];
      list.push({ callback: func as OnContactValidate, otherImpostors: collidedAgainstList });
    }
    if (kind == 'on-adjust-velocity') {
      const list = this._JoltPhysicsCallback[kind];
      list.push({ callback: func as OnAdjustVelocity, otherImpostors: collidedAgainstList });
    }
  }
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactAdd): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidate): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnAdjustVelocity): void;
  public unregisterOnJoltPhysicsCollide(kind: CharacterListenerCallbackKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactValidate | OnContactAdd | OnAdjustVelocity): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    let index = -1;

    const found = this._JoltPhysicsCallback[kind].some((cbDef, idx) => {
      if (cbDef.callback === func && cbDef.otherImpostors.length === collidedAgainstList.length) {
        const sameList = cbDef.otherImpostors.every((impostor) => {
          return collidedAgainstList.indexOf(impostor) > -1;
        });
        if (sameList) {
          index = idx;
        }
        return sameList;
      }
      return false;
    });

    if (found) {
      this._JoltPhysicsCallback[kind].splice(index, 1);
    } else {
      Logger.Warn('Function to remove was not found');
    }
  }


  public onJoltCollide(kind: 'on-contact-add', event: { body: PhysicsImpostor }): void;
  public onJoltCollide(kind: 'on-contact-validate', event: { body: PhysicsImpostor }): boolean | undefined;
  public onJoltCollide(kind: 'on-adjust-velocity', event: { body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3 }): void;
  public onJoltCollide(kind: CharacterListenerCallbackKey, event: { body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3 } | { body: PhysicsImpostor }): boolean | undefined | void {
    if (!this._JoltPhysicsCallback[kind].length) {
      return undefined;
    }
    if (event.body) {
      if (kind == 'on-contact-validate') {
        const e = event as { body: PhysicsImpostor };
        const ret: boolean[] = [];
        const list = this._JoltPhysicsCallback['on-contact-validate'];
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          const r = obj.callback(e.body);
          if (r !== undefined) {
            ret.push(r);
          }
        });
        //if you have registered multiple validate callback between A & B and they disagree, you have big problems on your hand so I'm not trying to combine
        if (ret.length > 1) {
          console.warn(`Warning: [${ret.length}] Validation Listeners registered between: `, this, event.body);
        }
        return ret[0];
      } else {
        let collisionHandlerCount = 0;
        if (kind === 'on-adjust-velocity') {
          const list = this._JoltPhysicsCallback[kind];
          const e = event as { body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3 };
          list.filter((obj) => {
            return obj.otherImpostors.indexOf(event.body) !== -1;
          }).forEach((obj) => {
            obj.callback(e.body, e.linearVelocity, e.angularVelocity);
            collisionHandlerCount++;
          });
        } else if (kind === 'on-contact-add') {
          const list = this._JoltPhysicsCallback[kind];
          const e = event as { body: PhysicsImpostor };
          list.filter((obj) => {
            return obj.otherImpostors.indexOf(event.body) !== -1;
          }).forEach((obj) => {
            obj.callback(e.body);
            collisionHandlerCount++;
          });
        }
        //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
        if (collisionHandlerCount > 1) {
          console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
        }
      }
    }
  }
}

type OnContactValidate = (body: PhysicsImpostor) => boolean;
type OnContactAdd = (body: PhysicsImpostor) => void;
type OnAdjustVelocity = (body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3) => void;

type CharacterListenerCallbacks<T> = { callback: T, otherImpostors: Array<PhysicsImpostor> }
type CharacterListenerCallbackKey = 'on-adjust-velocity' | 'on-contact-add' | 'on-contact-validate';