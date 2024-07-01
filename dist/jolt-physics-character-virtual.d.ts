import Jolt from './jolt-import';
import { JoltJSPlugin, JoltPluginData } from '.';
import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import './jolt-impostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GravityInterface } from './gravity/types';
type CharacterVirtualNumberParam = 'maxSlopeAngle' | 'maxStrength' | 'characterPadding' | 'penetrationRecoverySpeed' | 'predictiveContactDistance';
type CharacterVirtualBooleanParam = 'enableWalkStairs' | 'enableStickToFloor';
interface CharacterVirtualImpostorParameters extends PhysicsImpostorParameters {
    maxSlopeAngle?: number;
    maxStrength?: number;
    characterPadding?: number;
    penetrationRecoverySpeed?: number;
    predictiveContactDistance?: number;
    enableWalkStairs?: boolean;
    enableStickToFloor?: boolean;
}
interface JoltCharacterVirtualPluginData extends JoltPluginData {
    controller: JoltCharacterVirtual;
}
export declare class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    _pluginData: JoltCharacterVirtualPluginData;
    constructor(object: IPhysicsEnabledObject, type: number, _options: CharacterVirtualImpostorParameters, _scene?: Scene);
    get controller(): JoltCharacterVirtual;
    set controller(controller: JoltCharacterVirtual);
}
export interface JoltCharacterVirtualImpostor {
    getParam(param: CharacterVirtualNumberParam): number | undefined;
    getParam(param: CharacterVirtualBooleanParam): boolean | undefined;
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
    up: Vector3;
    rotation: Quaternion;
    gravity?: GravityInterface;
    processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, tmpVec3: Jolt.Vec3, tmpQuat: Jolt.Quat): void;
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
    autoUp: boolean;
    up: Vector3;
    rotation: Quaternion;
    gravity?: GravityInterface;
    private _linVelocity;
    private _groundVelocity;
    processCharacterData(character: Jolt.CharacterVirtual, _physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat): void;
    updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void;
}
declare class CharacterVirtualConfig {
    private character;
    private updateSettings;
    enableWalkStairs: boolean;
    enableStickToFloor: boolean;
    constructor(character: Jolt.CharacterVirtual, updateSettings: Jolt.ExtendedUpdateSettings);
    get mass(): number;
    set mass(v: number);
    set maxSlopeAngle(v: number);
    get maxStrength(): number;
    set maxStrength(v: number);
    get characterPadding(): number;
    get penetrationRecoverySpeed(): number;
    set penetrationRecoverySpeed(v: number);
    private _stickToFloorStepDown;
    get stickToFloorStepDown(): Vector3;
    set stickToFloorStepDown(v: Vector3);
    private _walkStairsStepUp;
    get walkStairsStepUp(): Vector3;
    set walkStairsStepUp(v: Vector3);
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
type OnContactValidate = (body: PhysicsImpostor) => boolean;
type OnContactAdd = (body: PhysicsImpostor) => void;
type OnAdjustVelocity = (body: PhysicsImpostor, linearVelocity: Vector3, angularVelocity: Vector3) => void;
type CharacterListenerCallbacks<T> = {
    callback: T;
    otherImpostors: Array<PhysicsImpostor>;
};
export {};
