import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { JoltContactSetting, OnContactValidateResponse } from '../jolt-contact';
export type OnContactValidateCallback = (body: PhysicsImpostor) => OnContactValidateResponse;
export type OnContactRemoveCallback = (body: PhysicsImpostor) => void;
export type OnContactCallback = (body: PhysicsImpostor, offset: Vector3, contactSettings: JoltContactSetting) => void;
export interface JoltCollisionCallback<T extends OnContactValidateCallback | OnContactCallback> {
    callback: T;
    otherImpostors: Array<PhysicsImpostor>;
}
export interface JoltPhysicsCollideCallbacks {
    'on-contact-add': JoltCollisionCallback<OnContactCallback>[];
    'on-contact-remove': JoltCollisionCallback<OnContactRemoveCallback>[];
    'on-contact-persist': JoltCollisionCallback<OnContactCallback>[];
    'on-contact-validate': JoltCollisionCallback<OnContactValidateCallback>[];
}
export declare class JoltPhysicsImpostor extends PhysicsImpostor {
    _JoltPhysicsCallback: JoltPhysicsCollideCallbacks;
    registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
    registerOnJoltPhysicsCollide(kind: 'on-contact-remove', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactRemoveCallback): void;
    registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-remove', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactRemoveCallback): void;
    onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: {
        body: PhysicsImpostor;
        ioSettings: JoltContactSetting;
    }): void;
    onJoltCollide(kind: 'on-contact-validate', event: {
        body: PhysicsImpostor;
    }): OnContactValidateResponse | undefined;
    onJoltCollide(kind: 'on-contact-remove', event: {
        body: PhysicsImpostor;
    }): void;
}
