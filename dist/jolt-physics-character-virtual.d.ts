import Jolt from './jolt-import';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import type { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
declare class CharacterVirtualConfig {
    sMaxSlopeAngle: number;
    sMaxStrength: number;
    sCharacterPadding: number;
    sPenetrationRecoverySpeed: number;
    sPredictiveContactDistance: number;
    sEnableWalkStairs: boolean;
    sEnableStickToFloor: boolean;
}
export interface CharacterVirtualInputHandler {
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number, tmp: Jolt.Vec3): void;
    updateCharacter(character: Jolt.CharacterVirtual, tmp: Jolt.Vec3): void;
}
export declare const enum GroundState {
    ON_GROUND = 0,
    RISING = 1,
    FALLING = 2
}
export declare const enum CharacterState {
    IDLE = 0,
    MOVING = 1,
    JUMPING = 2
}
export declare class StandardCharacterVirtualHandler implements CharacterVirtualInputHandler {
    private mDesiredVelocity;
    private inMovementDirection;
    private inJump;
    allowSliding: boolean;
    controlMovementDuringJump: boolean;
    characterSpeed: number;
    jumpSpeed: number;
    enableCharacterInertia: boolean;
    upRotationX: number;
    upRotationZ: number;
    groundState: GroundState;
    userState: CharacterState;
    updateInput(inMovementDirection: Vector3, inJump: boolean): void;
    private _new_velocity;
    private _charUpRot;
    private _charUp;
    private _linVelocity;
    private _groundVelocity;
    private _gravity;
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number, _tmpVec3: Jolt.Vec3): void;
    updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void;
}
interface JoltCharacterRequired<T extends (PhysicsImpostor | PhysicsBody)> {
    toDispose: any[];
    jolt: Jolt.JoltInterface;
    physicsSystem: Jolt.PhysicsSystem;
    GetBodyForBodyId: (bodyIdSeqNum: number) => Jolt.Body;
    GetPhysicsBodyForBodyId: (bodyIdSeqNum: number) => T;
}
export declare class JoltCharacterVirtual<T extends (PhysicsImpostor | PhysicsBody)> {
    private data;
    private shape;
    private mCharacter;
    private mDisposables;
    private mUpdateSettings;
    private mUpdateFilterData;
    inputHandler?: CharacterVirtualInputHandler;
    config: CharacterVirtualConfig;
    contactListener?: Jolt.CharacterContactListenerJS;
    private _jolt_temp1;
    constructor(data: JoltCharacterRequired<T>, shape: Jolt.Shape);
    init(): void;
    private _characterUp;
    private _temp1;
    private _temp2;
    prePhysicsUpdate(mDeltaTime: number): void;
    getCharacter(): Jolt.CharacterVirtual;
    setPosition(position: Vector3): void;
    _JoltPhysicsCallback: {
        'on-adjust-velocity': CharacterListenerCallbacks<OnAdjustVelocity, T>[];
        'on-contact-add': CharacterListenerCallbacks<OnContactAdd, T>[];
        'on-contact-validate': CharacterListenerCallbacks<OnContactValidate, T>[];
    };
    registerOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: T | Array<T>, func: OnContactAdd): void;
    registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: T | Array<T>, func: OnContactValidate): void;
    registerOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: T | Array<T>, func: OnAdjustVelocity): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-add', collideAgainst: T | Array<T>, func: OnContactAdd): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: T | Array<T>, func: OnContactValidate): void;
    unregisterOnJoltPhysicsCollide(kind: 'on-adjust-velocity', collideAgainst: T | Array<T>, func: OnAdjustVelocity): void;
    onJoltCollide(kind: 'on-contact-add', event: {
        body: T;
    }): void;
    onJoltCollide(kind: 'on-contact-validate', event: {
        body: T;
    }): boolean | undefined;
    onJoltCollide(kind: 'on-adjust-velocity', event: {
        body: T;
        linearVelocity: Vector3;
        angularVelocity: Vector3;
    }): void;
}
type OnContactValidate = <T extends (PhysicsBody | PhysicsImpostor)>(body: T) => boolean;
type OnContactAdd = <T extends (PhysicsBody | PhysicsImpostor)>(body: T) => void;
type OnAdjustVelocity = <T extends (PhysicsBody | PhysicsImpostor)>(body: T, linearVelocity: Vector3, angularVelocity: Vector3) => void;
type CharacterListenerCallbacks<T, K extends (PhysicsBody | PhysicsImpostor)> = {
    callback: T;
    otherImpostors: Array<K>;
};
export {};
