import { JoltContactSetting, OnContactValidateResponse } from "../jolt-contact";
import Jolt from "../jolt-import";
import { JoltJSPlugin } from "./jolt-physics";
export type CollisionMap = {
    'add': Set<number>;
    'remove': Set<number>;
    'persist': Set<number>;
};
export declare class ContactCollectorV2 {
    private joltV2;
    private collisionMap;
    private _contactCollector;
    constructor(joltV2: JoltJSPlugin, contactListener: Jolt.ContactListenerJS, collisionMap: CollisionMap);
    onContactRemove(body: number, withBody: number): void;
    onContactAdd(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactPersist(body: number, withBody: number, contactSettings: JoltContactSetting): void;
    onContactValidate(body: number, withBody: number): OnContactValidateResponse;
    registerImpostor(bodyID: number): void;
    clear(): void;
}
