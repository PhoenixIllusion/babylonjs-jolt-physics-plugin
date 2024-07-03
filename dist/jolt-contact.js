import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { GetJoltQuat, GetJoltVec3, SetJoltVec3 } from './jolt-util';
import './jolt-impostor';
export class JoltContactSetting {
    constructor() {
        this.combinedFriction = 0;
        this.combinedRestitution = 0;
        this.inverseMassScale1 = 0;
        this.inverseMassScale2 = 0;
        this.inverseInertiaScale1 = 0;
        this.inverseInertiaScale2 = 0;
        this.isSensor = false;
        this.relativeLinearSurfaceVelocity = new Vector3();
        this.relativeAngularSurfaceVelocity = new Vector3();
    }
    marshall(jolt, rev) {
        const { mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor } = jolt;
        let [combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor] = [mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor];
        if (rev) {
            [inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2] =
                [inverseMassScale2, inverseMassScale1, inverseInertiaScale2, inverseInertiaScale1];
        }
        Object.assign(this, { combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor });
        GetJoltVec3(jolt.mRelativeLinearSurfaceVelocity, this.relativeLinearSurfaceVelocity);
        GetJoltVec3(jolt.mRelativeAngularSurfaceVelocity, this.relativeAngularSurfaceVelocity);
        if (rev) {
        }
    }
    unmarshall(jolt, rev) {
        let { combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor } = this;
        if (rev) {
            [inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2] =
                [inverseMassScale2, inverseMassScale1, inverseInertiaScale2, inverseInertiaScale1];
        }
        const [mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor] = [combinedFriction, combinedRestitution, inverseMassScale1, inverseMassScale2, inverseInertiaScale1, inverseInertiaScale2, isSensor];
        Object.assign(jolt, { mCombinedFriction, mCombinedRestitution, mInvMassScale1, mInvMassScale2, mInvInertiaScale1, mInvInertiaScale2, mIsSensor });
        SetJoltVec3(this.relativeLinearSurfaceVelocity, jolt.mRelativeLinearSurfaceVelocity);
        SetJoltVec3(this.relativeAngularSurfaceVelocity, jolt.mRelativeAngularSurfaceVelocity);
    }
}
export var OnContactValidateResponse;
(function (OnContactValidateResponse) {
    OnContactValidateResponse[OnContactValidateResponse["AcceptAllContactsForThisBodyPair"] = 0] = "AcceptAllContactsForThisBodyPair";
    OnContactValidateResponse[OnContactValidateResponse["AcceptContact"] = 1] = "AcceptContact";
    OnContactValidateResponse[OnContactValidateResponse["RejectContact"] = 2] = "RejectContact";
    OnContactValidateResponse[OnContactValidateResponse["RejectAllContactsForThisBodyPair"] = 3] = "RejectAllContactsForThisBodyPair"; ///< Rejects this and any further contact points for this body pair
})(OnContactValidateResponse || (OnContactValidateResponse = {}));
export class ContactCollector {
    constructor(listener) {
        this.listener = listener;
        this._collisionEnabled = {};
        this._joltEventEnabled = { 'on-contact-add': {}, 'on-contact-persist': {}, 'on-contact-validate': {} };
        this._imposterBodyHash = {};
        this._contactSettings = new JoltContactSetting();
        this._hasRegisteredListener = false;
        const withChecks = (inBody1, inBody2, type, withImpostors) => {
            const body1Hash = inBody1.GetID().GetIndexAndSequenceNumber();
            const body2Hash = inBody2.GetID().GetIndexAndSequenceNumber();
            const hash = type === 'regular' ? this._collisionEnabled : this._joltEventEnabled[type];
            const body1Enabled = hash[body1Hash];
            const body2Enabled = hash[body2Hash];
            if (body1Enabled || body2Enabled) {
                const body1 = this._imposterBodyHash[body1Hash];
                const body2 = this._imposterBodyHash[body2Hash];
                if (body1Enabled) {
                    withImpostors(body1, body2, false);
                }
                if (body2Enabled) {
                    withImpostors(body2, body1, true);
                }
            }
        };
        const wrapContactSettings = (ioSettings, rev, withSettings) => {
            this._contactSettings.marshall(ioSettings, rev);
            withSettings(this._contactSettings);
            this._contactSettings.unmarshall(ioSettings, rev);
        };
        const wrapContactValidate = (inBody1, inBody2) => {
            const kind = 'on-contact-validate';
            let ret = [];
            withChecks(inBody1, inBody2, kind, (body1, body2) => {
                const resp = body1.onJoltCollide(kind, { body: body2 });
                if (resp !== undefined) {
                    ret.push(resp);
                }
            });
            if (ret[0] !== undefined) {
                return ret[0];
            }
            return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
        };
        const _quat1 = new Quaternion();
        const _quat2 = new Quaternion();
        const _com1 = new Vector3();
        const _com2 = new Vector3();
        const wrapContactEvent = (kind, inBody1, inBody2, inCollision) => {
            const rotation1 = GetJoltQuat(inBody1.GetRotation(), _quat1);
            const rotation2 = GetJoltQuat(inBody2.GetRotation(), _quat2);
            withChecks(inBody1, inBody2, kind, (body1, body2, rev) => {
                wrapContactSettings(inCollision, rev, (ioSettings) => {
                    body1.onCollide({ body: body2.physicsBody, point: null, distance: 0, impulse: 0, normal: null });
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
                });
            });
        };
        // @ts-ignore: Unused
        listener.OnContactValidate = (inBody1ptr, inBody2ptr, inBaseOffset, inCollisionResult) => {
            const inBody1 = Jolt.wrapPointer(inBody1ptr, Jolt.Body);
            const inBody2 = Jolt.wrapPointer(inBody2ptr, Jolt.Body);
            return wrapContactValidate(inBody1, inBody2);
        };
        // @ts-ignore: Unused
        listener.OnContactRemoved = (shapeIdPair) => { };
        // @ts-ignore: Unused
        listener.OnContactAdded = (inBody1ptr, inBody2ptr, inManifold, ioSettingsPtr) => {
            const inBody1 = Jolt.wrapPointer(inBody1ptr, Jolt.Body);
            const inBody2 = Jolt.wrapPointer(inBody2ptr, Jolt.Body);
            const ioSettings = Jolt.wrapPointer(ioSettingsPtr, Jolt.ContactSettings);
            wrapContactEvent('on-contact-add', inBody1, inBody2, ioSettings);
        };
        // @ts-ignore: Unused
        listener.OnContactPersisted = (inBody1ptr, inBody2ptr, inManifold, ioSettingsPtr) => {
            const inBody1 = Jolt.wrapPointer(inBody1ptr, Jolt.Body);
            const inBody2 = Jolt.wrapPointer(inBody2ptr, Jolt.Body);
            const ioSettings = Jolt.wrapPointer(ioSettingsPtr, Jolt.ContactSettings);
            wrapContactEvent('on-contact-persist', inBody1, inBody2, ioSettings);
        };
    }
    registerImpostor(hash, impostor) {
        this._imposterBodyHash[hash] = impostor;
        if (impostor._onPhysicsCollideCallbacks.length > 0) {
            this._collisionEnabled[hash] = true;
            this._hasRegisteredListener = true;
        }
        Object.keys(this._joltEventEnabled).forEach((key) => {
            if (impostor.JoltPhysicsCallback[key].length > 0) {
                this._joltEventEnabled[key][hash] = true;
                this._hasRegisteredListener = true;
            }
        });
    }
    clear() {
        this._imposterBodyHash = {};
        this._collisionEnabled = {};
        this._joltEventEnabled = { 'on-contact-add': {}, 'on-contact-persist': {}, 'on-contact-validate': {} };
        this._hasRegisteredListener = false;
    }
    get hasRegisteredListener() { return this._hasRegisteredListener; }
}
