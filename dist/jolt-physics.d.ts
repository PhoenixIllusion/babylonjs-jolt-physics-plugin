import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from '@babylonjs/core/Physics/v1/IPhysicsEnginePlugin';
import Jolt from './jolt-import';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { IMotorEnabledJoint, PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { Nullable } from '@babylonjs/core/types';
import { IRaycastQuery, PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import './jolt-impostor';
import { GravityInterface } from './gravity/types';
import { SystemCollisionConfiguration } from './jolt-collision';
import { MotionType } from './jolt-impostor';
import { BuoyancyImpulse, BuoyancyInterface } from './buoyancy/type';
export { setJoltModule } from './jolt-import';
export declare enum AllowedDOFs {
    None = 0,
    All = 63,
    TranslationX = 1,
    TranslationY = 2,
    TranslationZ = 4,
    RotationX = 8,
    RotationY = 16,
    RotationZ = 32,
    Plane2D = 35
}
export declare const enum Jolt_Type {
    CHARACTER = 200,
    VIRTUAL_CHARACTER = 201
}
export interface PhysicsSettings {
    collision?: SystemCollisionConfiguration;
    maxBodies?: number;
    maxPairs?: number;
}
export declare class JoltJSPlugin implements IPhysicsEnginePlugin {
    private jolt;
    settings: PhysicsSettings | undefined;
    private _useDeltaForWorldStep;
    world: Jolt.PhysicsSystem;
    name: string;
    private _timeStep;
    private _fixedTimeStep;
    private _maxSteps;
    private _tempVec3A;
    private _tempVec3B;
    private _tempVec3C;
    private _tempVec3D;
    private _tempQuaternion;
    private _tempQuaternionBJS;
    private _bodyInterface;
    private _raycaster;
    private _contactCollector;
    private _contactListener;
    private _impostorLookup;
    private toDispose;
    static loadPlugin(_useDeltaForWorldStep?: boolean, physicsSettings?: PhysicsSettings, importSettings?: any): Promise<JoltJSPlugin>;
    constructor(jolt: Jolt.JoltInterface, settings: PhysicsSettings | undefined, _useDeltaForWorldStep?: boolean);
    setGravity(gravity: Vector3): void;
    setTimeStep(timeStep: number): void;
    /**
     * Increment to step forward in the physics engine (If timeStep is set to 1/60 and fixedTimeStep is set to 1/120 the physics engine should run 2 steps per frame) (Default: 1/60)
     * @param fixedTimeStep fixedTimeStep to use in seconds
     */
    setFixedTimeStep(fixedTimeStep: number): void;
    /**
     * Sets the maximum number of steps by the physics engine per frame (Default: 5)
     * @param maxSteps the maximum number of steps by the physics engine per frame
     */
    setMaxSteps(maxSteps: number): void;
    /**
     * Gets the current timestep (only used if useDeltaForWorldStep is false in the constructor)
     * @returns the current timestep in seconds
     */
    getTimeStep(): number;
    private _perPhysicsStepCallbacks;
    registerPerPhysicsStepCallback(listener: (timeStep: number) => void): void;
    unregisterPerPhysicsStepCallback(listener: (timeStep: number) => void): void;
    executeStep(delta: number, impostors: PhysicsImpostor[]): void;
    private _stepSimulation;
    getPluginVersion(): number;
    applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void;
    applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint?: Vector3): void;
    generatePhysicsBody(impostor: PhysicsImpostor): void;
    GetImpostorForBodyId(id: number): PhysicsImpostor;
    /**
    * Removes the physics body from the imposter and disposes of the body's memory
    * @param impostor imposter to remove the physics body from
    */
    removePhysicsBody(impostor: PhysicsImpostor): void;
    generateJoint(impostorJoint: PhysicsImpostorJoint): void;
    removeJoint(impostorJoint: PhysicsImpostorJoint): void;
    /**
     * If this plugin is supported
     * @returns true if its supported
     */
    isSupported(): boolean;
    setTransformationFromPhysicsBody(impostor: PhysicsImpostor): void;
    setPhysicsBodyTransformation(impostor: PhysicsImpostor, newPosition: Vector3, newRotation: Quaternion): void;
    /**
     * Sets the linear velocity of the physics body
     * @param impostor imposter to set the velocity on
     * @param velocity velocity to set
     */
    setLinearVelocity(impostor: PhysicsImpostor, velocity: Vector3): void;
    setAngularVelocity(impostor: PhysicsImpostor, velocity: Nullable<Vector3>): void;
    getLinearVelocity(impostor: PhysicsImpostor): Nullable<Vector3>;
    getAngularVelocity(impostor: PhysicsImpostor): Nullable<Vector3>;
    setBodyMass(impostor: PhysicsImpostor, mass: number): void;
    getBodyMass(impostor: PhysicsImpostor): number;
    getBodyFriction(impostor: PhysicsImpostor): number;
    setBodyFriction(impostor: PhysicsImpostor, friction: number): void;
    getBodyRestitution(impostor: PhysicsImpostor): number;
    setBodyRestitution(impostor: PhysicsImpostor, restitution: number): void;
    setShape(impostor: PhysicsImpostor, type: number, params: PhysicsImpostorParameters): void;
    sleepBody(impostor: PhysicsImpostor): void;
    wakeUpBody(impostor: PhysicsImpostor): void;
    raycast(from: Vector3, to: Vector3, query?: IRaycastQuery): PhysicsRaycastResult;
    raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult, query?: IRaycastQuery): void;
    updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void;
    setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined): void;
    setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined): void;
    getRadius(impostor: PhysicsImpostor): number;
    getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void;
    syncMeshWithImpostor(mesh: AbstractMesh, impostor: PhysicsImpostor): void;
    dispose(): void;
    setGravityOverride(impostor: PhysicsImpostor, gravity: GravityInterface | null): void;
    setGravityFactor(impostor: PhysicsImpostor, factor: number): void;
    moveKinematic(impostor: PhysicsImpostor, position: Vector3 | null, rotation: Quaternion | null, duration: number): void;
    setLayer(impostor: PhysicsImpostor, layer: number, mask?: number): void;
    setMotionType(impostor: PhysicsImpostor, motionType: MotionType): void;
    registerBuoyancyInterface(impostor: PhysicsImpostor, buoyancy: BuoyancyInterface | null): void;
    applyBuoyancyImpulse(impostor: PhysicsImpostor, impulse: BuoyancyImpulse, deltaTime: number): void;
}
