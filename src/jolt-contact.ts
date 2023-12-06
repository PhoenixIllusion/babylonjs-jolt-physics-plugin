
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { JoltPhysicsImpostor } from './jolt-impostor';
import { GetJoltQuat, GetJoltVec3, SetJoltVec3 } from './jolt-util';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';

export class JoltContactSetting {
  combinedFriction: number = 0;
  combinedRestitution: number = 0;
  inverseMassScale1 = 0;
  inverseMassScale2 = 0;
  inverseInertiaScale1 = 0;
  inverseInertiaScale2 = 0;
  isSensor = false;
  relativeLinearSurfaceVelocity = new Vector3();
  relativeAngularSurfaceVelocity = new Vector3();
  constructor() {

  }
  marshall(jolt: Jolt.ContactSettings, rev: boolean) {
    const { mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor } = jolt;
    let [combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor] =
      [mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor];
    if (rev) {
      [inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2] =
        [inverseMassScale2, inverseMassScale1, inverseInertiaScale2, inverseInertiaScale1]
    }
    Object.assign(this, { combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor });
    GetJoltVec3(jolt.mRelativeLinearSurfaceVelocity, this.relativeLinearSurfaceVelocity);
    GetJoltVec3(jolt.mRelativeAngularSurfaceVelocity, this.relativeAngularSurfaceVelocity);
    if (rev) {

    }
  }

  unmarshall(jolt: Jolt.ContactSettings, rev: boolean) {
    let { combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor } = this;
    if (rev) {
      [inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2] =
        [inverseMassScale2, inverseMassScale1, inverseInertiaScale2, inverseInertiaScale1]
    }
    const [mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor] =
      [combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor];
    Object.assign(jolt, { mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor })

    SetJoltVec3(this.relativeLinearSurfaceVelocity, jolt.mRelativeLinearSurfaceVelocity);
    SetJoltVec3(this.relativeAngularSurfaceVelocity, jolt.mRelativeAngularSurfaceVelocity);
  }

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
  private _contactSettings = new JoltContactSetting();

  constructor(listener: Jolt.ContactListenerJS) {
    const withChecks = (inBody1: Jolt.Body, inBody2: Jolt.Body, type: keyof CollisionRecords | 'regular', withImpostors: (body1: PhysicsImpostor, body2: PhysicsImpostor, rev: boolean) => void) => {


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
      this._contactSettings.marshall(ioSettings, rev);
      withSettings(this._contactSettings);
      this._contactSettings.unmarshall(ioSettings, rev);

    }
    const wrapContactValidate = (inBody1: Jolt.Body, inBody2: Jolt.Body): OnContactValidateResponse => {
      const kind = 'on-contact-validate'
      let ret: OnContactValidateResponse[] = [];
      withChecks(inBody1, inBody2, kind,
        (body1, body2) => {
          if (body1 instanceof JoltPhysicsImpostor) {
            const resp = body1.onJoltCollide(kind, { body: body2 });
            if (resp !== undefined) {
              ret.push(resp);
            }
          }
        }
      );
      if (ret[0] !== undefined) {
        return ret[0];
      }
      return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
    }
    const _quat1 = new Quaternion();
    const _quat2 = new Quaternion();
    const _com1 = new Vector3();
    const _com2 = new Vector3();
    const wrapContactEvent = (kind: 'on-contact-add' | 'on-contact-persist',
      inBody1: Jolt.Body, inBody2: Jolt.Body, inCollision: Jolt.ContactSettings) => {
      const rotation1 = GetJoltQuat(inBody1.GetRotation(), _quat1);
      const rotation2 = GetJoltQuat(inBody2.GetRotation(), _quat2);
      withChecks(inBody1, inBody2, kind,
        (body1, body2, rev) => {
          wrapContactSettings(inCollision, rev, (ioSettings) => {
            body1.onCollide({ body: body2.physicsBody, point: null, distance: 0, impulse: 0, normal: null });
            if (body1 instanceof JoltPhysicsImpostor) {
              body1.onJoltCollide(kind, { body: body2, ioSettings });
              if (ioSettings.relativeLinearSurfaceVelocity.length() > 0) {
                const cLocalSpaceVelocity = ioSettings.relativeLinearSurfaceVelocity;
                const body1_linear_surface_velocity = !rev ? cLocalSpaceVelocity.applyRotationQuaternion(rotation1) : new Vector3(0, 0, 0);
                const body2_linear_surface_velocity = rev ? cLocalSpaceVelocity.applyRotationQuaternion(rotation2) : new Vector3(0, 0, 0);
                ioSettings.relativeLinearSurfaceVelocity.copyFrom(body2_linear_surface_velocity.subtract(body1_linear_surface_velocity));
              }
              if (ioSettings.relativeAngularSurfaceVelocity.length() > 0) {
                const cLocalSpaceAngularVelocity = ioSettings.relativeAngularSurfaceVelocity;
                const body1_angular_surface_velocity = !rev ? cLocalSpaceAngularVelocity.applyRotationQuaternion(rotation1) : new Vector3(0, 0, 0);
                const body2_angular_surface_velocity = rev ? cLocalSpaceAngularVelocity.applyRotationQuaternion(rotation2) : new Vector3(0, 0, 0);

                // Note that the angular velocity is the angular velocity around body 1's center of mass, so we need to add the linear velocity of body 2's center of mass
                const COM1 = GetJoltVec3(inBody1.GetCenterOfMassPosition(), _com1);
                const COM2 = GetJoltVec3(inBody2.GetCenterOfMassPosition(), _com2);
                const body2_linear_surface_velocity = rev ?
                  body2_angular_surface_velocity.cross(COM1.subtract(COM2)) : new Vector3(0, 0, 0);

                ioSettings.relativeLinearSurfaceVelocity.copyFrom(body2_linear_surface_velocity);
                ioSettings.relativeAngularSurfaceVelocity.copyFrom(body2_angular_surface_velocity.subtract(body1_angular_surface_velocity));
              }
            }
          })
        })
    }

    // @ts-ignore: Unused
    listener.OnContactValidate = (inBody1, inBody2, inBaseOffset, inCollisionResult) => {
      inBody1 = Jolt.wrapPointer(inBody1 as any as number, Jolt.Body);
      inBody2 = Jolt.wrapPointer(inBody2 as any as number, Jolt.Body);
      return wrapContactValidate(inBody1, inBody2);
    }
    // @ts-ignore: Unused
    listener.OnContactRemoved = (shapeIdPair) => { /* do nothing */ }
    // @ts-ignore: Unused
    listener.OnContactAdded = (inBody1, inBody2, inManifold, ioSettings) => {
      inBody1 = Jolt.wrapPointer(inBody1 as any as number, Jolt.Body);
      inBody2 = Jolt.wrapPointer(inBody2 as any as number, Jolt.Body);
      wrapContactEvent('on-contact-add', inBody1, inBody2, ioSettings);
    }
    // @ts-ignore: Unused
    listener.OnContactPersisted = (inBody1, inBody2, inManifold, ioSettings) => {
      inBody1 = Jolt.wrapPointer(inBody1 as any as number, Jolt.Body);
      inBody2 = Jolt.wrapPointer(inBody2 as any as number, Jolt.Body);
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