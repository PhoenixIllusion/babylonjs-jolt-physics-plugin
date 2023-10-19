import { Vector3, PhysicsImpostor, Quaternion, Nullable, PhysicsRaycastResult, PhysicsJoint, IMotorEnabledJoint, AbstractMesh, Epsilon, Logger, VertexBuffer, IPhysicsEnabledObject, IndicesArray, PhysicsJointData, MotorEnabledJoint, PhysicsBody } from "@babylonjs/core";
import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from "@babylonjs/core/Physics/v1/IPhysicsEnginePlugin";
import type Jolt from 'jolt-physics';
import { JoltCharacterVirtualImpostor, JoltVirtualCharacter } from "./jolt-physics-virtual-character";

type JoltNS = typeof Jolt;

interface JoltCollision {
  body: PhysicsBody,
  point: Vector3 | null,
  distance: number,
  impulse: number,
  normal: Vector3 | null
}

type Without<T, K> = {
  [L in Exclude<keyof T, K>]: T[L]
};

interface MeshVertexData {
  indices: IndicesArray | number[];
  vertices: Float32Array | number[];
  faceCount: number;
}

interface PossibleMotors {
  SetMotorState(state: Jolt.EMotorState): void;
  SetTargetAngularVelocity(val: number): void;
  SetTargetAngle(val: number): void;
  SetTargetVelocity(val: number): void;
  SetTargetPosition(val: number): void;
}

export const enum Jolt_Type {
  CHARACTER = 200,
  VIRTUAL_CHARACTER = 201,
}

const SetJoltVec3 = (vec3: Vector3, jVec3: Jolt.Vec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
}
const GetJoltVec3 = (jVec3: Jolt.Vec3, vec3: Vector3) => {
  vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ())
}

class RayCastUtility {

  private _raycastResult: PhysicsRaycastResult;
  private _ray_settings: Jolt.RayCastSettings;
  private _ray: Jolt.RRayCast;
  private _ray_collector: Jolt.CastRayCollectorJS;

  private _bp_filter: Jolt.DefaultBroadPhaseLayerFilter;
  private _object_filter: Jolt.DefaultObjectLayerFilter;
  private _body_filter: Jolt.BodyFilter;
  private _shape_filter: Jolt.ShapeFilter;

  constructor(private Jolt: JoltNS, jolt: Jolt.JoltInterface) {
    this._raycastResult = new PhysicsRaycastResult();
    this._ray_settings = new Jolt.RayCastSettings();
    this._ray_collector = new Jolt.CastRayCollectorJS();

    this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), Jolt.MOVING);
    this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), Jolt.MOVING);
    this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
    this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes

    this._ray = new Jolt.RRayCast();
  }

  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    this.raycastToRef(from, to, this._raycastResult);
    return this._raycastResult;
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    const delta = to.subtract(from);
    SetJoltVec3(from, this._ray.mOrigin);
    SetJoltVec3(delta, this._ray.mDirection);

    let body: Jolt.Body;

    const closestResult = {
      mFraction: 1.01,
      hitPoint: new Vector3(),
      hitNormal: new Vector3()
    }
    this._ray_collector.OnBody = (inBody: Jolt.Body) => {
      body = this.Jolt.wrapPointer(inBody as any as number, this.Jolt.Body);
    }
    this._ray_collector.AddHit = (inRayCastResult: Jolt.RayCastResult) => {
      inRayCastResult = this.Jolt.wrapPointer(inRayCastResult as any as number, this.Jolt.RayCastResult);
      if (inRayCastResult.mFraction <= closestResult.mFraction && inRayCastResult.mFraction <= 1.0) {
        closestResult.mFraction = inRayCastResult.mFraction;

        let hitPoint = this._ray.GetPointOnRay(inRayCastResult.mFraction);
        GetJoltVec3(hitPoint, closestResult.hitPoint)
        let hitNormal = body.GetWorldSpaceSurfaceNormal(inRayCastResult.mSubShapeID2, hitPoint);
        GetJoltVec3(hitNormal, closestResult.hitNormal)
      }
    }
    result.reset(from, to);
    if (closestResult.mFraction <= 1.0) {
      result.setHitData(closestResult.hitPoint, closestResult.hitNormal);
      result.calculateHitDistance();
    }
  }

  public dispose() {
    this.Jolt.destroy(this._raycastResult);
    this.Jolt.destroy(this._ray_settings);
    this.Jolt.destroy(this._ray_collector);

    this.Jolt.destroy(this._bp_filter);
    this.Jolt.destroy(this._object_filter);
    this.Jolt.destroy(this._body_filter);
    this.Jolt.destroy(this._shape_filter);
  }
}

export type FILTER_PROPS<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
}[keyof Base]; // <- gets all keys of specified types.


function WrapJolt<T, K, L extends keyof K>(jolt: K, key: L) {
  return function (target: ClassAccessorDecoratorTarget<T, K[L]>, context: ClassAccessorDecoratorContext<T, K[L]>): ClassAccessorDecoratorResult<T, K[L]> {
    return {
      get(): K[L] {
        return jolt[key];
      },
      set(val: K[L]) {
        jolt[key] = val;
      },
      init(this: T, initialValue: K[L]) { return initialValue; }
    }
  }
}
function WrapJoltReversable<T, K, L extends keyof K>(jolt: K, rev: boolean, key1: L, key2: L) {
  type RetType = K[L];
  return function (target: ClassAccessorDecoratorTarget<T, RetType>, context: ClassAccessorDecoratorContext<T, RetType>): ClassAccessorDecoratorResult<T, RetType> {
    return {
      get(): RetType {
        return (rev ? jolt[key2] : jolt[key1]);
      },
      set(val: RetType) {
        rev ? (jolt[key2] = val) : (jolt[key1] = val);
      },
      init(this: T, initialValue: RetType) { return initialValue; }
    }
  }
}
function WrapJoltVec3<T, K>(jolt: K, key: FILTER_PROPS<K, Jolt.Vec3>) {
  return function (target: ClassAccessorDecoratorTarget<T, Vector3>, context: ClassAccessorDecoratorContext): ClassAccessorDecoratorResult<T, Vector3> {
    let v3 = new Vector3();
    return {
      get(): Vector3 {
        GetJoltVec3(jolt[key] as Jolt.Vec3, v3);
        return v3;
      },
      set(val: Vector3) {
        v3 = val;
        SetJoltVec3(val, jolt[key] as Jolt.Vec3);
      },
      init(this: T, initialValue: Vector3) { return initialValue; }
    }
  }
}

const JoltContactSettingImpl = (jolt: Jolt.ContactSettings, rev: boolean): JoltContactSetting => new class {
  constructor() { }
  @WrapJolt(jolt, 'mCombinedFriction') accessor combinedFriction: number = 0;
  @WrapJolt(jolt, 'mCombinedRestitution') accessor combinedRestitution: number = 0;
  @WrapJoltReversable(jolt, rev, 'mInvMassScale1', 'mInvMassScale2') accessor inverseMassScale1 = 0;
  @WrapJoltReversable(jolt, rev, 'mInvMassScale2', 'mInvMassScale1') accessor inverseMassScale2 = 0;
  @WrapJoltReversable(jolt, rev, 'mInvInertiaScale1', 'mInvInertiaScale2') accessor inverseInertiaScale1 = 0;
  @WrapJoltReversable(jolt, rev, 'mInvInertiaScale2', 'mInvInertiaScale1') accessor inverseInertiaScale2 = 0;
  @WrapJolt(jolt, 'mIsSensor') accessor isSensor = false;
  relativeLinearSurfaceVelocity = new Vector3();
  relativeAngularSurfaceVelocity = new Vector3();
}
export interface JoltContactSetting {
  combinedFriction: number;
  combinedRestitution: number;
  inverseMassScale1: number;
  inverseMassScale2: number;
  inverseInertiaScale1: number;
  inverseInertiaScale2: number;
  isSensor: boolean;
  relativeLinearSurfaceVelocity: Vector3;
  relativeAngularSurfaceVelocity: Vector3;
};


export const enum OnContactValidateResponse {
  AcceptAllContactsForThisBodyPair = 0,							///< Accept this and any further contact points for this body pair
  AcceptContact = 1,												///< Accept this contact only (and continue calling this callback for every contact manifold for the same body pair)
  RejectContact = 2,												///< Reject this contact only (but process any other contact manifolds for the same body pair)
  RejectAllContactsForThisBodyPair = 3							///< Rejects this and any further contact points for this body pair
}
export type OnContactValidateCallback = (body: PhysicsImpostor) => OnContactValidateResponse;
export type OnContactCallback = (body: PhysicsImpostor, offset: Vector3, contactSettings: JoltContactSetting) => void;

interface JoltCollisionCallback<T extends OnContactValidateCallback | OnContactCallback> { callback: T, otherImpostors: Array<PhysicsImpostor> }


interface JoltPhysicsCollideCallbacks {
  'on-contact-add': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-persist': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-validate': JoltCollisionCallback<OnContactValidateCallback>[]
}
type JoltCollisionKey = keyof JoltPhysicsCollideCallbacks;

export class JoltPhysicsImpostor extends PhysicsImpostor {

  public _JoltPhysicsCallback: JoltPhysicsCollideCallbacks = { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [] }

  public registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public registerOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    if (kind == 'on-contact-validate') {
      const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
      list.push({ callback: func as OnContactValidateCallback, otherImpostors: collidedAgainstList });
    } else {
      const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
      list.push({ callback: func as OnContactCallback, otherImpostors: collidedAgainstList });
    }
  }
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
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
      Logger.Warn("Function to remove was not found");
    }
  }

  public onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: { body: PhysicsImpostor, ioSettings: JoltContactSetting }): void;
  public onJoltCollide(kind: 'on-contact-validate', event: { body: PhysicsImpostor }): OnContactValidateResponse | undefined;
  public onJoltCollide(kind: JoltCollisionKey, event: { body: PhysicsImpostor, ioSettings: JoltContactSetting } | { body: PhysicsImpostor }): OnContactValidateResponse | undefined | void {
    if (!this._JoltPhysicsCallback[kind].length) {
      return undefined;
    }
    if (event.body) {
      if (kind == 'on-contact-validate') {
        const ret: OnContactValidateResponse[] = [];
        const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
        const e = event as { body: PhysicsImpostor };
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          const r = obj.callback(e.body);
          if(r !== undefined) {
            ret.push(r);
          }
        });
        //if you have registered multiple validate callback between A & B and they disagree, you have big problems on your hand so I'm not trying to combine
        if(ret.length > 1) {
          console.warn(`Warning: [${ret.length}] Validation Listeners registered between: `, this, event.body);
        }
        return ret[0]; 
      } else {
        let collisionHandlerCount = 0;
        const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
        const e = event as { body: PhysicsImpostor, ioSettings: JoltContactSetting };
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          obj.callback(e.body, new Vector3(), e.ioSettings);
          collisionHandlerCount++;
        });
        //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
        if(collisionHandlerCount > 1) {
          console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
        }
      }
    }
  }
}

type CollisionRecords = { 'on-contact-add': Record<number, boolean>, 'on-contact-persist': Record<number, boolean>, 'on-contact-validate': Record<number, boolean> };

class ContactCollector {

  private _collisionEnabled: Record<number, boolean> = {};
  private _joltEventEnabled: CollisionRecords = { 'on-contact-add': {}, 'on-contact-persist': {}, 'on-contact-validate': {} };

  private _imposterBodyHash: { [hash: number]: PhysicsImpostor } = {};

  constructor(private Jolt: JoltNS, listener: Jolt.ContactListenerJS) {
    const withChecks = (inBody1: Jolt.Body, inBody2: Jolt.Body, type: keyof CollisionRecords | 'regular', withImpostors: (body1: PhysicsImpostor, body2: PhysicsImpostor, rev: boolean) => void) => {
      inBody1 = Jolt.wrapPointer(inBody1 as any as number, Jolt.Body);
      inBody2 = Jolt.wrapPointer(inBody2 as any as number, Jolt.Body);

      const body1Hash = inBody1.GetID().GetIndexAndSequenceNumber();
      const body2Hash = inBody2.GetID().GetIndexAndSequenceNumber();
      const hash = type === 'regular' ? this._collisionEnabled : this._joltEventEnabled[type];

      const body1Enabled = hash[body1Hash];
      const body2Enabled = hash[body2Hash];

      if (body1Enabled || body2Enabled) {
        const body1 = this._imposterBodyHash[body1Hash];
        const body2 = this._imposterBodyHash[body2Hash];
        if (body1Enabled) {
          withImpostors(body1, body2, false)
        }
        if (body2Enabled) {
          withImpostors(body2, body1, true)
        }
      }
    }

    const wrapContactSettings = (ioSettings: Jolt.ContactSettings, rev: boolean, withSettings: (settings: JoltContactSetting) => void) => {
      ioSettings = Jolt.wrapPointer(ioSettings as any as number, Jolt.ContactSettings);
      const contactSettings = JoltContactSettingImpl(ioSettings, rev);
      withSettings(contactSettings);

    }
    const wrapContactValidate = (inBody1: Jolt.Body, inBody2: Jolt.Body): OnContactValidateResponse => {
      const kind = 'on-contact-validate'
      let ret: OnContactValidateResponse[] = [];
      withChecks(inBody1, inBody2, kind,
        (body1, body2, rev) => {
          if (body1 instanceof JoltPhysicsImpostor) {
            const resp = body1.onJoltCollide(kind, { body: body2 });
            if(resp !== undefined) {
              ret.push(resp);
            }
          }
        }
      );
      if(ret[0] !== undefined) {
        return ret[0];
      }
      return Jolt.AcceptAllContactsForThisBodyPair;
    }
    const wrapContactEvent = (kind: 'on-contact-add' | 'on-contact-persist',
      inBody1: Jolt.Body, inBody2: Jolt.Body, inCollision: Jolt.ContactSettings) => {
      withChecks(inBody1, inBody2, kind,
        (body1, body2, rev) => {
          wrapContactSettings(inCollision, rev, (ioSettings) => {
            body1.onCollide({ body: body2.physicsBody, point: null, distance: 0, impulse: 0, normal: null });
            if (body1 instanceof JoltPhysicsImpostor) {
              body1.onJoltCollide(kind, { body: body2, ioSettings });
            }
          })
        })
    }

    listener.OnContactValidate = (inBody1, inBody2, inBaseOffset, inCollisionResult) => {
      return wrapContactValidate(inBody1, inBody2);
    }
    listener.OnContactRemoved = (shapeIdPair) => { /* do nothing */ }
    listener.OnContactAdded = (inBody1, inBody2, inManifold, ioSettings) => {
      wrapContactEvent('on-contact-add', inBody1, inBody2, ioSettings);
    }
    listener.OnContactPersisted = (inBody1, inBody2, inManifold, ioSettings) => {
      wrapContactEvent('on-contact-persist', inBody1, inBody2, ioSettings);
    }
  }
  registerImpostor(hash: number, impostor: PhysicsImpostor) {
    this._imposterBodyHash[hash] = impostor;
    if (impostor._onPhysicsCollideCallbacks.length > 0) {
      this._collisionEnabled[hash] = true;
    }
    if (impostor instanceof JoltPhysicsImpostor) {
      (Object.keys(this._joltEventEnabled) as (keyof CollisionRecords & keyof JoltPhysicsCollideCallbacks)[]).forEach((key) => {
        if (impostor._JoltPhysicsCallback[key].length > 0) {
          this._joltEventEnabled[key][hash] = true;
        }
      });
    }
  }
  clear() {
    this._imposterBodyHash = {};
    this._collisionEnabled = {};
    this._joltEventEnabled = { 'on-contact-add': {}, 'on-contact-persist': {}, 'on-contact-validate': {} };
  }

}

export class JoltJSPlugin implements IPhysicsEnginePlugin {
  public world: Jolt.PhysicsSystem;
  public name = "JoltJSPlugin";

  private _timeStep: number = 1 / 60;
  private _fixedTimeStep: number = 1 / 60;
  private _maxSteps = 10;

  private _tempVec3A: Jolt.Vec3;
  private _tempVec3B: Jolt.Vec3;

  private _tempQuaternion: Jolt.Quat;
  private _tempQuaternionBJS = new Quaternion();
  private _bodyInterface: Jolt.BodyInterface;

  private _raycaster: RayCastUtility;

  private _contactCollector: ContactCollector;
  private _contactListener: Jolt.ContactListenerJS;

  constructor(private Jolt: JoltNS, private jolt: Jolt.JoltInterface, private _useDeltaForWorldStep: boolean = true) {
    this.world = jolt.GetPhysicsSystem();
    this._bodyInterface = this.world.GetBodyInterface();
    this._tempVec3A = new Jolt.Vec3();
    this._tempVec3B = new Jolt.Vec3();
    this._tempQuaternion = new Jolt.Quat();
    this._raycaster = new RayCastUtility(Jolt, jolt);
    this._contactListener = new Jolt.ContactListenerJS();
    this._contactCollector = new ContactCollector(Jolt, this._contactListener);

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

  /**
   * Gets the current timestep (only used if useDeltaForWorldStep is false in the constructor)
   * @returns the current timestep in seconds
   */
  public getTimeStep(): number {
    return this._timeStep;
  }

  executeStep(delta: number, impostors: PhysicsImpostor[]): void {
    this._contactCollector.clear();
    const virtualCharacters: JoltCharacterVirtualImpostor[] = [];
    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft) {
        impostor.beforeStep();
      }
      if (impostor.physicsBody instanceof this.Jolt.Body) {
        const body: Jolt.Body = impostor.physicsBody;
        const bodyID = body.GetID().GetIndexAndSequenceNumber();
      }
      if (impostor instanceof JoltCharacterVirtualImpostor) {
        virtualCharacters.push(impostor as JoltCharacterVirtualImpostor);
      }
    }

    this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep,
      (timeStep) => {
        virtualCharacters.forEach(vChar => vChar.controller?.prePhysicsUpdate(timeStep));
      });

    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft) {
        impostor.afterStep();
      }
    }
  }

  // Ammo's behavior when maxSteps > 0 does not behave as described in docs
  // @see http://www.bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
  //
  // When maxSteps is 0 do the entire simulation in one step
  // When maxSteps is > 0, run up to maxStep times, if on the last step the (remaining step - fixedTimeStep) is < fixedTimeStep, the remainder will be used for the step. (eg. if remainder is 1.001 and fixedTimeStep is 1 the last step will be 1.001, if instead it did 2 steps (1, 0.001) issues occuered when having a tiny step in ammo)
  // Note: To get deterministic physics, timeStep would always need to be divisible by fixedTimeStep
  private _stepSimulation(timeStep: number = 1 / 60, maxSteps: number = 10, fixedTimeStep: number = 1 / 60, perStep: (timeStep: number) => void) {
    if (maxSteps == 0) {
      perStep(timeStep);
      this.jolt.Step(timeStep, 1);
    } else {
      while (maxSteps > 0 && timeStep > 0) {
        if (timeStep - fixedTimeStep < fixedTimeStep) {
          perStep(timeStep);
          this.jolt.Step(timeStep, 1);
          timeStep = 0;
        } else {
          timeStep -= fixedTimeStep;
          perStep(fixedTimeStep);
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
      Logger.Warn("Cannot be applied to a soft body");
    }

  }

  applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;
      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      SetJoltVec3(force, impulse)
      SetJoltVec3(contactPoint, worldPoint)
      physicsBody.AddForce(impulse, worldPoint);
    } else {
      Logger.Warn("Cannot be applied to a soft body");
    }
  }

  generatePhysicsBody(impostor: PhysicsImpostor): void {
    impostor._pluginData.toDispose = [];

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
        const shape = this._createShape(imp);
        const char = new JoltVirtualCharacter(imp, shape, { physicsSystem: this.world, jolt: this.jolt }, this.Jolt);
        imp.physicsBody = char.getCharacter();
        imp._pluginData.controller = char;
        return;
      }
      const colShape = this._createShape(impostor);
      const mass = impostor.getParam("mass");
      const friction = impostor.getParam("friction");
      const restitution = impostor.getParam("restitution");
      const collisionGroup: number = impostor.getParam("collision-group");
      const collisionSubGroup: number = impostor.getParam("collision-sub-group");
      const collisionFilter: Jolt.GroupFilter = impostor.getParam("collision-filter");

      impostor.object.computeWorldMatrix(true);
      SetJoltVec3(impostor.object.position, this._tempVec3A);
      this._tempQuaternion.Set(
        impostor.object.rotationQuaternion!.x,
        impostor.object.rotationQuaternion!.y,
        impostor.object.rotationQuaternion!.z,
        impostor.object.rotationQuaternion!.w
      );
      const isStatic = (mass === 0) ? this.Jolt.Static : this.Jolt.Dynamic;
      const layer = (mass === 0) ? this.Jolt.NON_MOVING : this.Jolt.MOVING;
      const settings = new this.Jolt.BodyCreationSettings(colShape, this._tempVec3A, this._tempQuaternion, isStatic, layer);
      if (collisionGroup !== undefined) {
        settings.mCollisionGroup.SetGroupID(collisionGroup);
      }
      if (collisionSubGroup !== undefined) {
        settings.mCollisionGroup.SetSubGroupID(collisionGroup);
      }
      if (collisionFilter !== undefined) {
        settings.mCollisionGroup.SetGroupFilter(collisionFilter);
      }
      impostor._pluginData.mass = mass;
      impostor._pluginData.friction = friction;
      impostor._pluginData.restitution = restitution;
      settings.mRestitution = restitution;
      settings.mFriction = friction;
      if (mass !== 0) {
        settings.mOverrideMassProperties = this.Jolt.CalculateInertia;
        settings.mMassPropertiesOverride.mMass = mass;
      }
      const body = impostor.physicsBody = this._bodyInterface.CreateBody(settings);
      this._bodyInterface.AddBody(body.GetID(), this.Jolt.Activate)
    }
  }
  /**
  * Removes the physics body from the imposter and disposes of the body's memory
  * @param impostor imposter to remove the physics body from
  */
  public removePhysicsBody(impostor: PhysicsImpostor) {
    if (this.world) {
      if (impostor.soft) {
        this._bodyInterface.RemoveBody(impostor.physicsBody);
      }

      if (impostor._pluginData) {
        impostor._pluginData.toDispose.forEach((d: any) => {
          this.Jolt.destroy(d);
        });
        impostor._pluginData.toDispose = [];
      }
    }
  }

  private _getMeshVertexData(impostor: PhysicsImpostor): MeshVertexData {
    const object = impostor.object;
    const rawVerts = object.getVerticesData ? object.getVerticesData(VertexBuffer.PositionKind) : [];
    const indices = (object.getIndices && object.getIndices()) ? object.getIndices()! : [];
    if (!rawVerts) {
      throw new Error("Tried to create a MeshImpostor for an object without vertices. This will fail.");
    }
    // get only scale! so the object could transform correctly.
    const oldPosition = object.position.clone();
    const oldRotation = object.rotation && object.rotation.clone();
    const oldQuaternion = object.rotationQuaternion && object.rotationQuaternion.clone();
    object.position.copyFromFloats(0, 0, 0);
    object.rotation && object.rotation.copyFromFloats(0, 0, 0);
    object.rotationQuaternion && object.rotationQuaternion.copyFrom(impostor.getParentsRotation());

    object.rotationQuaternion && object.parent && object.rotationQuaternion.conjugateInPlace();

    const transform = object.computeWorldMatrix(true);
    // convert rawVerts to object space
    const transformedVertices = new Array<number>();
    let index: number;
    for (index = 0; index < rawVerts.length; index += 3) {
      Vector3.TransformCoordinates(Vector3.FromArray(rawVerts, index), transform).toArray(transformedVertices, index);
    }

    //now set back the transformation!
    object.position.copyFrom(oldPosition);
    oldRotation && object.rotation && object.rotation.copyFrom(oldRotation);
    oldQuaternion && object.rotationQuaternion && object.rotationQuaternion.copyFrom(oldQuaternion);


    const hasIndex = (indices.length > 0)
    const faceCount = hasIndex ? indices.length / 3 : transformedVertices.length / 9;

    return {
      indices,
      vertices: transformedVertices,
      faceCount
    }
  }

  private _createShape(impostor: PhysicsImpostor): Jolt.Shape {
    const impostorExtents = impostor.getObjectExtents();
    const checkWithEpsilon = (value: number): number => {
      return Math.max(value, Epsilon);
    };
    let returnValue: Jolt.Shape | undefined = undefined;
    switch (impostor.type) {
      case PhysicsImpostor.SphereImpostor:
        const radiusX = impostorExtents.x;
        const radiusY = impostorExtents.y;
        const radiusZ = impostorExtents.z;
        const size = Math.max(checkWithEpsilon(radiusX), checkWithEpsilon(radiusY), checkWithEpsilon(radiusZ)) / 2;
        returnValue = new this.Jolt.SphereShape(size, new this.Jolt.PhysicsMaterial())
        break;
      case PhysicsImpostor.CapsuleImpostor:
        //if(impostor.getParam("radiusTop") && impostor.getParam("radiusBottom")) {
        //  const radiusTop: number = impostor.getParam("radiusTop");
        //  const radiusBottom: number = impostor.getParam("radiusBottom");
        //  const capRadius = impostorExtents.x / 2;
        //  returnValue = new this.Jolt.TaperedCapsuleShapeSettings(impostorExtents.y / 2 - capRadius, radiusTop, radiusBottom, new this.Jolt.PhysicsMaterial()).Create().Get();
        //} else {
        const capRadius = impostorExtents.x / 2;
        returnValue = new this.Jolt.CapsuleShape(impostorExtents.y / 2 - capRadius, capRadius);
        //}
        break;
      case PhysicsImpostor.CylinderImpostor:
        returnValue = new this.Jolt.CylinderShapeSettings(0.5 * impostorExtents.y, 0.5 * impostorExtents.x).Create().Get();
        break;
      case PhysicsImpostor.PlaneImpostor:
      case PhysicsImpostor.BoxImpostor:
        this._tempVec3A.Set(impostorExtents.x / 2, impostorExtents.y / 2, impostorExtents.z / 2);
        returnValue = new this.Jolt.BoxShape(this._tempVec3A);
        break;
      case PhysicsImpostor.MeshImpostor: {
        // should transform the vertex data to world coordinates!!
        const vertexData = this._getMeshVertexData(impostor);
        const hasIndex = vertexData.indices.length > 0;
        const triangles = new this.Jolt.TriangleList();
        triangles.resize(vertexData.faceCount);
        for (let i = 0; i < vertexData.faceCount; i++) {
          const t = triangles.at(i);
          [0, 2, 1].forEach((j, k) => {
            const offset = i * 3 + j;
            const index = (hasIndex ? vertexData.indices[offset] : offset * 3) * 3;
            const v = t.get_mV(k)
            v.x = vertexData.vertices[index + 0];
            v.y = vertexData.vertices[index + 1];
            v.z = vertexData.vertices[index + 2];
          });
        }
        returnValue = new this.Jolt.MeshShapeSettings(triangles, new this.Jolt.PhysicsMaterialList).Create().Get();
      }
        break;
      case PhysicsImpostor.ConvexHullImpostor:
        const vertexData = this._getMeshVertexData(impostor);
        const hasIndex = vertexData.indices.length > 0;
        const hull = new this.Jolt.ConvexHullShapeSettings;
        for (let i = 0; i < vertexData.faceCount; i++) {
          for (let j = 0; j < 3; j++) {
            const offset = i * 3 + j;
            const index = (hasIndex ? vertexData.indices[offset] : offset * 3) * 3;
            const x = vertexData.vertices[index + 0];
            const y = vertexData.vertices[index + 1];
            const z = vertexData.vertices[index + 2];
            hull.mPoints.push_back(new this.Jolt.Vec3(x, y, z));
          }
        }
        returnValue = hull.Create().Get();
        break;
    }
    if (returnValue === undefined) {
      throw new Error("Unsupported Shape: " + impostor.type);
    }
    return returnValue;
  }

  generateJoint(impostorJoint: PhysicsImpostorJoint): void {
    const mainBody: Jolt.Body = impostorJoint.mainImpostor.physicsBody;
    const connectedBody: Jolt.Body = impostorJoint.connectedImpostor.physicsBody;
    if (!mainBody || !connectedBody) {
      return;
    }

    const jointData = impostorJoint.joint.jointData;
    if (!jointData.mainPivot) {
      jointData.mainPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedPivot) {
      jointData.connectedPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.mainAxis) {
      jointData.mainAxis = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedAxis) {
      jointData.connectedAxis = new Vector3(0, 0, 0);
    }
    const options = jointData.nativeParams || {};

    const setIfAvailable = <T extends Jolt.ConstraintSettings>(setting: T, k: keyof T, key: any) => {
      if (options[key] !== undefined) {
        setting[k] = options[key];
      }
    }

    const setPoints = (constraintSettings: { mPoint1: Jolt.Vec3, mPoint2: Jolt.Vec3 }) => {
      constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
      constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    }
    const setHindgeAxis = (constraintSettings: { mHingeAxis1: Jolt.Vec3, mHingeAxis2: Jolt.Vec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setSliderAxis = (constraintSettings: { mSliderAxis1: Jolt.Vec3, mSliderAxis2: Jolt.Vec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setNormalAxis = (constraintSettings: { mNormalAxis1: Jolt.Vec3, mNormalAxis2: Jolt.Vec3 }) => {
      if (options['normal-axis-1'] && options['normal-axis-2']) {
        const n1: Vector3 = options['normal-axis-1'];
        const n2: Vector3 = options['normal-axis-2'];
        constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
        constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
      }
    }

    const p1 = jointData.mainPivot;
    const p2 = jointData.connectedPivot;
    let constraint: Jolt.Constraint | undefined = undefined;
    switch (impostorJoint.joint.type) {
      case PhysicsJoint.DistanceJoint: {
        let constraintSettings = new this.Jolt.DistanceConstraintSettings();
        setPoints(constraintSettings);
        setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
        setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = this.Jolt.castObject(constraint, this.Jolt.DistanceConstraint);
      }
        break;
      case PhysicsJoint.HingeJoint: {
        let constraintSettings = new this.Jolt.HingeConstraintSettings();
        setPoints(constraintSettings);
        setHindgeAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = this.Jolt.castObject(constraint, this.Jolt.HingeConstraint);
      }
        break;
      case PhysicsJoint.SliderJoint: {
        let constraintSettings = new this.Jolt.SliderConstraintSettings();
        setPoints(constraintSettings);
        setSliderAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = this.Jolt.castObject(constraint, this.Jolt.SliderConstraint);
      }
        break;
    }
    if (constraint) {
      impostorJoint.mainImpostor._pluginData.toDispose.push(constraint);
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
    return this.jolt !== undefined;
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
      this._bodyInterface.SetPositionAndRotationWhenChanged(physicsBody.GetID(), position, rotation, this.Jolt.Activate);
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
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.GetMotionProperties().SetInverseMass(1.0 / mass);
    impostor._pluginData.mass = mass;
  }
  getBodyMass(impostor: PhysicsImpostor): number {
    return impostor._pluginData.mass || 0;
  }
  getBodyFriction(impostor: PhysicsImpostor): number {
    return impostor._pluginData.friction || 0;
  }
  setBodyFriction(impostor: PhysicsImpostor, friction: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetFriction(friction);
    impostor._pluginData.friction = friction;
  }
  getBodyRestitution(impostor: PhysicsImpostor): number {
    return impostor._pluginData.restitution || 0;
  }
  setBodyRestitution(impostor: PhysicsImpostor, restitution: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetRestitution(restitution);
    impostor._pluginData.restitution = restitution;
  }
  /*
  getBodyPressure?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyPressure?(impostor: PhysicsImpostor, pressure: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyStiffness?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyStiffness?(impostor: PhysicsImpostor, stiffness: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyVelocityIterations?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyVelocityIterations?(impostor: PhysicsImpostor, velocityIterations: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyPositionIterations?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyPositionIterations?(impostor: PhysicsImpostor, positionIterations: number): void {
    throw new Error("Method not implemented.");
  }
  appendAnchor?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, width: number, height: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error("Method not implemented.");
  }
  appendHook?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, length: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error("Method not implemented.");
  }*/

  sleepBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.DeactivateBody(physicsBody.GetID())
  }

  wakeUpBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.ActivateBody(physicsBody.GetID())
  }

  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    return this._raycaster.raycast(from, to);
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    return this._raycaster.raycastToRef(from, to, result);
  }
  updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void {
    if (joint.type !== PhysicsJoint.DistanceJoint) {
      const constraint: Jolt.DistanceConstraint = joint.physicsJoint;
      constraint.SetDistance(minDistance || 0, maxDistance);
    } else {
      throw new Error("updateDistanceJoint on non-distance constraint");
    }
  }
  setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined, motorIndex?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const constraint: Partial<PossibleMotors> = joint.physicsJoint;
      if (motorMode == 'position') {
        constraint.SetMotorState!(this.Jolt.EMotorState_Position);
        constraint.SetTargetAngle && constraint.SetTargetAngle(speed);
        constraint.SetTargetPosition && constraint.SetTargetPosition(speed);
      } else if (motorMode == 'velocity') {
        constraint.SetMotorState!(this.Jolt.EMotorState_Velocity);
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
      throw new Error("setMotor on non-motorized constraint");
    }
  }
  setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined, motorIndex?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const motorSettings: Jolt.MotorSettings = joint.physicsJoint.GetMotorSettings();
      if (upperLimit == 0 && lowerLimit == 0) {
        joint.physicsJoint.SetMotorState(this.Jolt.EMotorState_Off);
      }
      if (motorMode == 'position') {
        motorSettings.mMaxForceLimit = upperLimit;
        motorSettings.mMinForceLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      } else if (motorMode == 'velocity') {
        motorSettings.mMaxTorqueLimit = upperLimit;
        motorSettings.mMinTorqueLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      }
    } else {
      throw new Error("setLimit on non-motorized constraint");
    }
  }
  getRadius(impostor: PhysicsImpostor): number {
    const extents = impostor.getObjectExtents();
    return Math.max(extents.x, extents.y, extents.z) / 2;
  }
  getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void {
    const extents = impostor.getObjectExtents();
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
    // Dispose of world
    this.Jolt.destroy(this.world);

    // Dispose of temp variables
    this.Jolt.destroy(this._tempQuaternion);
    this.Jolt.destroy(this._tempVec3A);
    this.Jolt.destroy(this._tempVec3B);
    this._raycaster.dispose();
    (this.world as any) = null;
  }

}