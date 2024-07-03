import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { getObjectLayer } from "../jolt-collision";
import Jolt from "../jolt-import";
import { GetJoltVec3, LAYER_MOVING, RawPointer, SetJoltVec3, wrapJolt } from "../jolt-util";
import { CharacterVirtualConfig } from "./config";
import { JoltCharacterVirtualImpostor } from "./impostor";
import { CharacterVirtualInputHandler } from "./input";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Logger } from "@babylonjs/core/Misc/logger";
import { JoltJSPlugin } from "../jolt-physics";


type OnContactValidate = (body: PhysicsImpostor) => boolean;
type OnContactAdd = (body: PhysicsImpostor) => void;
type OnAdjustVelocity = (body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3) => void;

type CharacterListenerCallbacks<T> = { callback: T, otherImpostors: Array<PhysicsImpostor> }
type CharacterListenerCallbackKey = 'on-adjust-velocity' | 'on-contact-add' | 'on-contact-validate';


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

export class JoltCharacterVirtual {
  private mCharacter!: Jolt.CharacterVirtual;
  private mDisposables!: any[];

  private mUpdateSettings!: Jolt.ExtendedUpdateSettings;
  public updateFilterData!: UpdateFiltersData;

  public inputHandler?: CharacterVirtualInputHandler;

  public contactListener?: Jolt.CharacterContactListenerJS;

  private _jolt_temp1!: Jolt.Vec3;
  private _jolt_tempQuat1!: Jolt.Quat;

  public config!: CharacterVirtualConfig;

  private onPhysicsStep: (timeStep: number) => void;

  constructor(private impostor: JoltCharacterVirtualImpostor, private shape: Jolt.Shape, private world: WorldData, private plugin: JoltJSPlugin) {
    this.onPhysicsStep = this.prePhysicsUpdate.bind(this);
  }

  init(): void {
    const world = this.world;
    const impostor = this.impostor;
    this.mDisposables = impostor._pluginData.toDispose;

    this._jolt_temp1 = new Jolt.Vec3();
    this._jolt_tempQuat1 = new Jolt.Quat();
    this.mDisposables.push(this._jolt_temp1, this._jolt_tempQuat1);


    const settings = new Jolt.CharacterVirtualSettings();
    settings.mMass = this.impostor.getParam('mass') | 70;
    settings.mMaxSlopeAngle = this.impostor.getParam('maxSlopeAngle') || (45.0 * (Math.PI / 180.0));
    settings.mMaxStrength = this.impostor.getParam('maxStrength') || 100;
    settings.mCharacterPadding = this.impostor.getParam('characterPadding') || 0.02;
    settings.mPenetrationRecoverySpeed = this.impostor.getParam('penetrationRecoverySpeed') || 1;
    settings.mPredictiveContactDistance = this.impostor.getParam('predictiveContactDistance') || 0.1;
    settings.mShape = this.shape;

    const mSupportingVolume = new Jolt.Plane(Jolt.Vec3.prototype.sAxisY(), -1);
    settings.mSupportingVolume = mSupportingVolume;
    Jolt.destroy(mSupportingVolume);

    this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.world.physicsSystem);
    Jolt.destroy(settings);
    this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();
    this.mDisposables.push(this.mCharacter, this.mUpdateSettings);
    this.config = new CharacterVirtualConfig(this.mCharacter, this.mUpdateSettings);
    this.config.enableStickToFloor = this.impostor.getParam('enableStickToFloor') || false;
    this.config.enableWalkStairs = this.impostor.getParam('enableWalkStairs') || true;


    const objectVsBroadPhaseLayerFilter = world.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = world.jolt.GetObjectLayerPairFilter();

    const layer = getObjectLayer(this.impostor.getParam('layer') || LAYER_MOVING, this.impostor.getParam('mask'), this.plugin.settings);
    this.updateFilterData = {
      movingBPFilter: new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, layer),
      movingLayerFilter: new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, layer),
      bodyFilter: new Jolt.BodyFilter(),
      shapeFilter: new Jolt.ShapeFilter()
    };
    this.plugin.registerPerPhysicsStepCallback(this.onPhysicsStep);
  }

  setLayer(layer: number) {
    Jolt.destroy(this.updateFilterData.movingBPFilter);
    Jolt.destroy(this.updateFilterData.movingLayerFilter);
    const objectVsBroadPhaseLayerFilter = this.world.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = this.world.jolt.GetObjectLayerPairFilter();
    this.updateFilterData.movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, layer);
    this.updateFilterData.movingLayerFilter = new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, layer);
  }

  onDestroy() {
    Jolt.destroy(this.updateFilterData.movingBPFilter);
    Jolt.destroy(this.updateFilterData.movingLayerFilter);
    Jolt.destroy(this.updateFilterData.bodyFilter);
    Jolt.destroy(this.updateFilterData.shapeFilter);
    this.plugin.unregisterPerPhysicsStepCallback(this.onPhysicsStep);
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
        const len = this.mUpdateSettings.mWalkStairsStepUp.Length();
        const vec = this._temp1;
        this._temp2.set(len, len, len);
        this._characterUp.multiplyToRef(this._temp2, vec);
        SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
      }

      const gravity = this.inputHandler.gravity;
      if (!gravity) {
        GetJoltVec3(this.world.physicsSystem.GetGravity(), this._gravity);
      } else {
        this._gravity.copyFrom(gravity.getGravity(this.impostor, () => GetJoltVec3(this.mCharacter.GetPosition(), this._temp1)));
      }

      this.inputHandler.processCharacterData(this.mCharacter, this.world.physicsSystem, this._gravity, mDeltaTime, this._jolt_temp1, this._jolt_tempQuat1);
      this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);


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