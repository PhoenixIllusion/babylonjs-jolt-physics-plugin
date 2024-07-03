import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import Jolt from "../jolt-import";
import { CharacterVirtualConfig } from "./config";
import { JoltCharacterVirtualImpostor } from "./impostor";
import { CharacterVirtualInputHandler } from "./input";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { JoltJSPlugin } from "../jolt-physics";
type OnContactValidate = (body: PhysicsImpostor) => boolean;
type OnContactAdd = (body: PhysicsImpostor) => void;
type OnAdjustVelocity = (body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3) => void;
type CharacterListenerCallbacks<T> = {
    callback: T;
    otherImpostors: Array<PhysicsImpostor>;
};
interface WorldData {
    jolt: Jolt.JoltInterface;
    physicsSystem: Jolt.PhysicsSystem;
}
interface UpdateFiltersData {
    movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
    movingLayerFilter: Jolt.DefaultObjectLayerFilter;
    bodyFilter: Jolt.BodyFilter;
    shapeFilter: Jolt.ShapeFilter;
}
export declare class JoltCharacterVirtual {
    private impostor;
    private shape;
    private world;
    private plugin;
    private mCharacter;
    private mDisposables;
    private mUpdateSettings;
    updateFilterData: UpdateFiltersData;
    inputHandler?: CharacterVirtualInputHandler;
    contactListener?: Jolt.CharacterContactListenerJS;
    private _jolt_temp1;
    private _jolt_tempQuat1;
    config: CharacterVirtualConfig;
    private onPhysicsStep;
    constructor(impostor: JoltCharacterVirtualImpostor, shape: Jolt.Shape, world: WorldData, plugin: JoltJSPlugin);
    init(): void;
    setLayer(layer: number): void;
    onDestroy(): void;
    private _characterUp;
    private _temp1;
    private _temp2;
    private _gravity;
    prePhysicsUpdate(mDeltaTime: number): void;
    getCharacter(): Jolt.CharacterVirtual;
    setPosition(position: Vector3): void;
    _JoltPhysicsCallback: {
        'on-adjust-velocity': CharacterListenerCallbacks<OnAdjustVelocity>[];
        'on-contact-add': CharacterListenerCallbacks<OnContactAdd>[];
        'on-contact-validate': CharacterListenerCallbacks<OnContactValidate>[];
    };
    registerOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactAdd): void;
    registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidate): void;
    registerOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnAdjustVelocity): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactAdd): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidate): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnAdjustVelocity): void;
    onJoltCollide(kind: 'on-contact-add', event: {
        body: PhysicsImpostor;
    }): void;
    onJoltCollide(kind: 'on-contact-validate', event: {
        body: PhysicsImpostor;
    }): boolean | undefined;
    onJoltCollide(kind: 'on-adjust-velocity', event: {
        body: PhysicsImpostor;
        linearVelocity: Vector3;
        angularVelocity: Vector3;
    }): void;
}
export {};
