import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltContactSetting, OnContactValidateResponse } from "../jolt-contact";
import Jolt from "../jolt-import";
export declare class ContactCollectorV1 {
    private _contactCollector;
    private _imposterBodyHash;
    constructor(contactListener: Jolt.ContactListenerJS);
    onContactRemove(body: number, withBody: number): void;
    onContactAdd(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactPersist(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactValidate(body: number, withBody: number): OnContactValidateResponse;
    clear(): void;
    registerImpostor(bodyID: number, impostor: PhysicsImpostor): void;
}
