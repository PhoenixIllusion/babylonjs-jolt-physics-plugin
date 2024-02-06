import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from '@babylonjs/core/Physics/v1/IPhysicsEnginePlugin';
import Jolt from './jolt-import';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { IMotorEnabledJoint, PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import { Nullable } from '@babylonjs/core/types';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { setJoltModule } from './jolt-import';
export declare const enum Jolt_Type {
    CHARACTER = 200,
    VIRTUAL_CHARACTER = 201
}
export declare class JoltJSPlugin implements IPhysicsEnginePlugin {
    private jolt;
    private _useDeltaForWorldStep;
    world: Jolt.PhysicsSystem;
    name: string;
    private _timeStep;
    private _fixedTimeStep;
    private _maxSteps;
    private _tempVec3A;
    private _tempVec3B;
    private _tempQuaternion;
    private _tempQuaternionBJS;
    private _bodyInterface;
    private _raycaster;
    private _contactCollector;
    private _contactListener;
    private _impostorLookup;
    private toDispose;
    static loadPlugin(_useDeltaForWorldStep?: boolean, physicsSettings?: any, importSettings?: any): Promise<JoltJSPlugin>;
    constructor(jolt: Jolt.JoltInterface, _useDeltaForWorldStep?: boolean);
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
    applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void;
    generatePhysicsBody(impostor: PhysicsImpostor): void;
    GetImpostorForBodyId(id: number): PhysicsImpostor;
    /**
    * Removes the physics body from the imposter and disposes of the body's memory
    * @param impostor imposter to remove the physics body from
    */
    removePhysicsBody(impostor: PhysicsImpostor): void;
    private _getMeshVertexData;
    private _createShape;
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
    sleepBody(impostor: PhysicsImpostor): void;
    wakeUpBody(impostor: PhysicsImpostor): void;
    raycast(from: Vector3, to: Vector3): PhysicsRaycastResult;
    raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void;
    updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void;
    setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined): void;
    setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined): void;
    getRadius(impostor: PhysicsImpostor): number;
    getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void;
    syncMeshWithImpostor(mesh: AbstractMesh, impostor: PhysicsImpostor): void;
    dispose(): void;
}
