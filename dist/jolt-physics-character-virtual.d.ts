import Jolt from './jolt-import';
import { JoltJSPlugin, JoltPluginData } from '.';
import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
declare class CharacterVirtualConfig {
    maxSlopeAngle: number;
    mass: number;
    maxStrength: number;
    characterPadding: number;
    penetrationRecoverySpeed: number;
    predictiveContactDistance: number;
    enableWalkStairs: boolean;
    enableStickToFloor: boolean;
}
interface JoltCharacterVirtualPluginData extends JoltPluginData {
    controller: JoltCharacterVirtual;
}
export declare class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    _pluginData: JoltCharacterVirtualPluginData;
    constructor(object: IPhysicsEnabledObject, type: number, _options: PhysicsImpostorParameters, _scene?: Scene);
    get controller(): JoltCharacterVirtual;
    set controller(controller: JoltCharacterVirtual);
}
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
export interface CharacterVirtualInputHandler {
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number, tmpVec3: Jolt.Vec3, tmpQuat: Jolt.Quat): void;
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
    groundState: GroundState;
    userState: CharacterState;
    updateInput(inMovementDirection: Vector3, inJump: boolean): void;
    private _new_velocity;
    up: Vector3;
    rotation: Quaternion;
    private _linVelocity;
    private _groundVelocity;
    private _gravity;
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number, _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat): void;
    updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void;
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
    config: CharacterVirtualConfig;
    contactListener?: Jolt.CharacterContactListenerJS;
    private _jolt_temp1;
    private _jolt_tempQuat1;
    constructor(impostor: JoltCharacterVirtualImpostor, shape: Jolt.Shape, world: WorldData, plugin: JoltJSPlugin);
    init(): void;
    private _characterUp;
    private _temp1;
    private _temp2;
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
type OnContactValidate = (body: PhysicsImpostor) => boolean;
type OnContactAdd = (body: PhysicsImpostor) => void;
type OnAdjustVelocity = (body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3) => void;
type CharacterListenerCallbacks<T> = {
    callback: T;
    otherImpostors: Array<PhysicsImpostor>;
};
export {};
