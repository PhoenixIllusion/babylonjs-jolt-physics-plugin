
import Jolt from './jolt-import';
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, SetJoltVec3 } from './jolt-util';
import { JoltJSPlugin } from '.';
import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';


class CharacterVirtualConfig {
  public sMaxSlopeAngle = 45.0 * (Math.PI / 180.0);
  public sMaxStrength = 100.0;
  public sCharacterPadding = 0.02;
  public sPenetrationRecoverySpeed = 1.0;
  public sPredictiveContactDistance = 0.1;
  public sEnableWalkStairs = true;
  public sEnableStickToFloor = true;
}


export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
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
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number): void;
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

  public upRotationX = 0;
  public upRotationZ = 0;

  public groundState: GroundState = GroundState.ON_GROUND;
  public userState: CharacterState = CharacterState.IDLE;


  updateInput(inMovementDirection: Vector3, inJump: boolean) {
    this.inMovementDirection.copyFrom(inMovementDirection);
    this.inJump = inJump;
  }

  private _new_velocity: Vector3 = new Vector3();

  private _charUpRot: Quaternion = new Quaternion();
  private _charUp: Vector3 = new Vector3();
  private _linVelocity: Vector3 = new Vector3();
  private _groundVelocity: Vector3 = new Vector3();
  private _gravity: Vector3 = new Vector3();
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number) {

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
    const character_up_rotation = Jolt.Quat.sEulerAngles(new Jolt.Vec3(this.upRotationX, 0, this.upRotationZ));
    character.SetUp(character_up_rotation.RotateAxisY());
    character.SetRotation(character_up_rotation);
    const upRotation = GetJoltQuat(character_up_rotation, this._charUpRot);

    character.UpdateGroundVelocity();
    const characterUp = GetJoltVec3(character.GetUp(), this._charUp);
    const linearVelocity = GetJoltVec3(character.GetLinearVelocity(), this._linVelocity);
    const vVel = Vector3.Dot(linearVelocity, characterUp);
    const current_vertical_velocity = characterUp.multiplyByFloats(vVel, vVel, vVel);
    const ground_velocity = GetJoltVec3(character.GetGroundVelocity(), this._groundVelocity);
    const gravity = GetJoltVec3(physicsSys.GetGravity(), this._gravity);

    const moving_towards_ground = (current_vertical_velocity.y - ground_velocity.y) < 0.1;
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
    this._new_velocity.addInPlace(gravity.multiplyByFloats(inDeltaTime, inDeltaTime, inDeltaTime).applyRotationQuaternion(upRotation));

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
  private mUpdateFilterData!: UpdateFiltersData;

  public inputHandler?: CharacterVirtualInputHandler;

  public config = new CharacterVirtualConfig();

  public contactListener?: Jolt.CharacterContactListenerJS;

  private _jolt_temp1!: Jolt.Vec3;
  constructor(private impostor: JoltCharacterVirtualImpostor, private shape: Jolt.Shape, private world: WorldData, private plugin: JoltJSPlugin) {
  }
  init(): void {
    const world = this.world;
    const impostor = this.impostor;
    this.mDisposables = impostor._pluginData.toDispose;

    this._jolt_temp1 = new Jolt.Vec3();
    this.mDisposables.push(this._jolt_temp1);


    this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();

    const settings = new Jolt.CharacterVirtualSettings();
    settings.mMass = 1000;
    settings.mMaxSlopeAngle = this.config.sMaxSlopeAngle;
    settings.mMaxStrength = this.config.sMaxStrength;
    settings.mShape = this.shape;
    settings.mCharacterPadding = this.config.sCharacterPadding;
    settings.mPenetrationRecoverySpeed = this.config.sPenetrationRecoverySpeed;
    settings.mPredictiveContactDistance = this.config.sPredictiveContactDistance;
    settings.mSupportingVolume = new Jolt.Plane(Jolt.Vec3.sAxisY(), -1);

    this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.sZero(), Jolt.Quat.sIdentity(), this.world.physicsSystem);
    this.mDisposables.push(this.mCharacter, this.mUpdateSettings, settings);


    const objectVsBroadPhaseLayerFilter = world.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = world.jolt.GetObjectLayerPairFilter();
    const filter = this.mUpdateFilterData = {
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

  prePhysicsUpdate(mDeltaTime: number) {
    GetJoltVec3(this.mCharacter.GetUp(), this._characterUp);
    if (!this.config.sEnableStickToFloor) {
      this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0)
    }
    else {
      const len = -this.mUpdateSettings.mStickToFloorStepDown.Length();
      const vec = this._temp1;
      this._temp2.set(len, len, len);
      this._characterUp.multiplyToRef(this._temp2, vec);
      SetJoltVec3(vec, this.mUpdateSettings.mStickToFloorStepDown);
    }

    if (!this.config.sEnableWalkStairs) {
      this.mUpdateSettings.mWalkStairsStepUp.Set(0, 0, 0);
    }
    else {
      const len = -this.mUpdateSettings.mWalkStairsStepUp.Length();
      const vec = this._temp1;
      this._temp2.set(len, len, len);
      this._characterUp.multiplyToRef(this._temp2, vec);
      SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
    }
    const gravLen = -this.world.physicsSystem.GetGravity().Length();
    this._temp2.set(gravLen, gravLen, gravLen);
    const g = this._characterUp.multiplyInPlace(this._temp2);

    if (this.inputHandler) {
      this.inputHandler.processCharacterData(this.mCharacter, this.world.physicsSystem, mDeltaTime);
      this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);
    }

    const inGravity = SetJoltVec3(g, this._jolt_temp1);

    const {
      movingBPFilter,
      movingLayerFilter,
      bodyFilter,
      shapeFilter } = this.mUpdateFilterData;
    this.mCharacter.ExtendedUpdate(mDeltaTime,
      inGravity,
      this.mUpdateSettings,
      movingBPFilter,
      movingLayerFilter,
      bodyFilter,
      shapeFilter,
      this.world.jolt.GetTempAllocator());
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
      this.contactListener.OnAdjustBodyVelocity = (_inCharacter, inBody2: Jolt.Body, lVelocity: Jolt.Vec3, aVelocity: Jolt.Vec3): void => {
        inBody2 = Jolt.wrapPointer(inBody2 as any as number, Jolt.Body);
        lVelocity = Jolt.wrapPointer(lVelocity as any as number, Jolt.Vec3);
        aVelocity = Jolt.wrapPointer(aVelocity as any as number, Jolt.Vec3);
        const impostor = this.plugin.GetImpostorForBodyId(inBody2.GetID().GetIndexAndSequenceNumber());
        GetJoltVec3(lVelocity, _lVelocity);
        GetJoltVec3(aVelocity, _aVelocity);
        this.onJoltCollide('on-adjust-velocity', { body: impostor, linearVelocity: _lVelocity, angularVelocity: _aVelocity });
        SetJoltVec3(_aVelocity, aVelocity);
        SetJoltVec3(_lVelocity, lVelocity);
      }
      this.contactListener.OnContactAdded = (_inCharacter: Jolt.CharacterVirtual, inBodyID2: Jolt.BodyID, _inSubShapeID2: Jolt.SubShapeID,
        _inContactPosition: Jolt.Vec3, _inContactNormal: Jolt.Vec3, _ioSettings: Jolt.CharacterContactSettings): void => {
        inBodyID2 = Jolt.wrapPointer(inBodyID2 as any as number, Jolt.BodyID);
        const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
        this.onJoltCollide('on-contact-add', { body: impostor });
      }
      this.contactListener.OnContactValidate = (_inCharacter: Jolt.CharacterVirtual, inBodyID2: Jolt.BodyID, _inSubShapeID2: Jolt.SubShapeID): boolean => {
        inBodyID2 = Jolt.wrapPointer(inBodyID2 as any as number, Jolt.BodyID);
        const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
        const ret = this.onJoltCollide('on-contact-validate', { body: impostor });
        if (ret !== undefined) {
          return ret;
        }
        return true;
      }
      this.contactListener.OnContactSolve = (_inCharacter: Jolt.CharacterVirtual, _inBodyID2: Jolt.BodyID, _inSubShapeID2: Jolt.SubShapeID,
        _inContactPosition: Jolt.Vec3, _inContactNormal: Jolt.Vec3, _inContactVelocity: Jolt.Vec3, _inContactMaterial: Jolt.PhysicsMaterial,
        _inCharacterVelocity: Jolt.Vec3, _ioNewCharacterVelocity: Jolt.Vec3): void => {
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