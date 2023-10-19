import { Vector3, PhysicsImpostor, Logger } from "@babylonjs/core";
import { WrapJolt, WrapJoltReversable } from "./jolt-util";
import Jolt from "./jolt-import";
import { JoltPhysicsImpostor } from "./jolt-impostor";


export class JoltContactSetting {
  constructor( public jolt: Jolt.ContactSettings, public rev: boolean) { }
  @WrapJolt(Jolt.ContactSettings, 'mCombinedFriction') accessor combinedFriction: number = 0;
  @WrapJolt(Jolt.ContactSettings, 'mCombinedRestitution') accessor combinedRestitution: number = 0;
  @WrapJoltReversable(Jolt.ContactSettings, 'mInvMassScale1', 'mInvMassScale2') accessor inverseMassScale1 = 0;
  @WrapJoltReversable(Jolt.ContactSettings, 'mInvMassScale2', 'mInvMassScale1') accessor inverseMassScale2 = 0;
  @WrapJoltReversable(Jolt.ContactSettings, 'mInvInertiaScale1', 'mInvInertiaScale2') accessor inverseInertiaScale1 = 0;
  @WrapJoltReversable(Jolt.ContactSettings, 'mInvInertiaScale2', 'mInvInertiaScale1') accessor inverseInertiaScale2 = 0;
  @WrapJolt(Jolt.ContactSettings, 'mIsSensor') accessor isSensor = false;
  relativeLinearSurfaceVelocity = new Vector3();
  relativeAngularSurfaceVelocity = new Vector3();
}

export const enum OnContactValidateResponse {
  AcceptAllContactsForThisBodyPair = 0,							///< Accept this and any further contact points for this body pair
  AcceptContact = 1,												///< Accept this contact only (and continue calling this callback for every contact manifold for the same body pair)
  RejectContact = 2,												///< Reject this contact only (but process any other contact manifolds for the same body pair)
  RejectAllContactsForThisBodyPair = 3							///< Rejects this and any further contact points for this body pair
}
export type OnContactValidateCallback = (body: PhysicsImpostor) => OnContactValidateResponse;
export type OnContactCallback = (body: PhysicsImpostor, offset: Vector3, contactSettings: JoltContactSetting) => void;

export interface JoltCollisionCallback<T extends OnContactValidateCallback | OnContactCallback> { callback: T, otherImpostors: Array<PhysicsImpostor> }


export interface JoltPhysicsCollideCallbacks {
  'on-contact-add': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-persist': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-validate': JoltCollisionCallback<OnContactValidateCallback>[]
}
export type JoltCollisionKey = keyof JoltPhysicsCollideCallbacks;

type CollisionRecords = { 'on-contact-add': Record<number, boolean>, 'on-contact-persist': Record<number, boolean>, 'on-contact-validate': Record<number, boolean> };

export class ContactCollector {

  private _collisionEnabled: Record<number, boolean> = {};
  private _joltEventEnabled: CollisionRecords = { 'on-contact-add': {}, 'on-contact-persist': {}, 'on-contact-validate': {} };

  private _imposterBodyHash: { [hash: number]: PhysicsImpostor } = {};

  constructor(listener: Jolt.ContactListenerJS) {
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
      const contactSettings = new JoltContactSetting(ioSettings, rev);
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