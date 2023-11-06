import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { OnContactCallback, OnContactValidateCallback, JoltContactSetting, OnContactValidateResponse, JoltPhysicsCollideCallbacks } from './jolt-contact';
export declare class JoltPhysicsImpostor extends PhysicsImpostor {
    _JoltPhysicsCallback: JoltPhysicsCollideCallbacks;
    registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
    registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
    onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: {
        body: PhysicsImpostor;
        ioSettings: JoltContactSetting;
    }): void;
    onJoltCollide(kind: 'on-contact-validate', event: {
        body: PhysicsImpostor;
    }): OnContactValidateResponse | undefined;
}
