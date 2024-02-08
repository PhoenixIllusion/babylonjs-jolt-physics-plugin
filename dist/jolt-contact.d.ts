import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "./jolt-import";
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
interface ContactReporter {
    onContactRemove(body: number, withBody: number): void;
    onContactAdd(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactPersist(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactValidate(body: number, withBody: number): OnContactValidateResponse;
}
type CollisionRecords = {
    'on-contact-add': Record<number, boolean>;
    'on-contact-persist': Record<number, boolean>;
    'on-contact-validate': Record<number, boolean>;
    'on-contact-remove': Record<number, boolean>;
};
export type JoltCollisionKey = keyof CollisionRecords;
export declare class ContactCollector {
    private reporter;
    private _joltEventEnabled;
    private _contactSettings;
    constructor(listener: Jolt.ContactListenerJS, reporter: ContactReporter);
    registerImpostor(hash: number, kind: JoltCollisionKey): void;
    clear(): void;
}
export {};
