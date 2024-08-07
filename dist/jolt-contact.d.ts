import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import './jolt-impostor';
export declare class JoltContactSetting {
    combinedFriction: number;
    combinedRestitution: number;
    inverseMassScale1: number;
    inverseMassScale2: number;
    inverseInertiaScale1: number;
    inverseInertiaScale2: number;
    isSensor: boolean;
    relativeLinearSurfaceVelocity: Vector3;
    relativeAngularSurfaceVelocity: Vector3;
    constructor();
    marshall(jolt: Jolt.ContactSettings, rev: boolean): void;
    unmarshall(jolt: Jolt.ContactSettings, rev: boolean): void;
}
export declare const enum OnContactValidateResponse {
    AcceptAllContactsForThisBodyPair = 0,
    AcceptContact = 1,
    RejectContact = 2,
    RejectAllContactsForThisBodyPair = 3
}
export type OnContactValidateCallback = (body: PhysicsImpostor) => OnContactValidateResponse;
export type OnContactCallback = (body: PhysicsImpostor, offset: Vector3, contactSettings: JoltContactSetting) => void;
export interface JoltCollisionCallback<T extends OnContactValidateCallback | OnContactCallback> {
    callback: T;
    otherImpostors: Array<PhysicsImpostor>;
}
export interface JoltPhysicsCollideCallbacks {
    'on-contact-add': JoltCollisionCallback<OnContactCallback>[];
    'on-contact-persist': JoltCollisionCallback<OnContactCallback>[];
    'on-contact-validate': JoltCollisionCallback<OnContactValidateCallback>[];
}
export type JoltCollisionKey = keyof JoltPhysicsCollideCallbacks;
export declare class ContactCollector {
    listener: Jolt.ContactListenerJS;
    private _collisionEnabled;
    private _joltEventEnabled;
    private _imposterBodyHash;
    private _contactSettings;
    private _hasRegisteredListener;
    constructor(listener: Jolt.ContactListenerJS);
    registerImpostor(hash: number, impostor: PhysicsImpostor): void;
    clear(): void;
    get hasRegisteredListener(): boolean;
}
