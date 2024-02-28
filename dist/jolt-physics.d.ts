import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from '@babylonjs/core/Physics/v1/IPhysicsEnginePlugin';
import Jolt from './jolt-import';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { IMotorEnabledJoint, PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { Nullable } from '@babylonjs/core/types';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { setJoltModule } from './jolt-import';
export declare const enum Jolt_Type {
    CHARACTER = 200,
    VIRTUAL_CHARACTER = 201
}
interface JoltPluginData {
    toDispose: never[];
    mass: any;
    friction: any;
    restitution: any;
    frozen: boolean;
    plugin: JoltJSPlugin;
}
declare class JoltImpostor extends PhysicsImpostor {
    _pluginData: JoltPluginData;
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
    executeStep(delta: number, impostors: JoltImpostor[]): void;
    private _stepSimulation;
    getPluginVersion(): number;
    applyImpulse(impostor: JoltImpostor, force: Vector3, contactPoint: Vector3): void;
    applyForce(impostor: JoltImpostor, force: Vector3, contactPoint: Vector3): void;
    generatePhysicsBody(impostor: JoltImpostor): void;
    GetImpostorForBodyId(id: number): JoltImpostor;
    /**
    * Removes the physics body from the imposter and disposes of the body's memory
    * @param impostor imposter to remove the physics body from
    */
    removePhysicsBody(impostor: JoltImpostor): void;
    private _getMeshVertexData;
    private _createShape;
    private _createShapeSettings;
    generateJoint(impostorJoint: PhysicsImpostorJoint): void;
    removeJoint(impostorJoint: PhysicsImpostorJoint): void;
    /**
     * If this plugin is supported
     * @returns true if its supported
     */
    isSupported(): boolean;
    setTransformationFromPhysicsBody(impostor: JoltImpostor): void;
    setPhysicsBodyTransformation(impostor: JoltImpostor, newPosition: Vector3, newRotation: Quaternion): void;
    /**
     * Sets the linear velocity of the physics body
     * @param impostor imposter to set the velocity on
     * @param velocity velocity to set
     */
    setLinearVelocity(impostor: JoltImpostor, velocity: Vector3): void;
    setAngularVelocity(impostor: JoltImpostor, velocity: Nullable<Vector3>): void;
    getLinearVelocity(impostor: JoltImpostor): Nullable<Vector3>;
    getAngularVelocity(impostor: JoltImpostor): Nullable<Vector3>;
    setBodyMass(impostor: JoltImpostor, mass: number): void;
    getBodyMass(impostor: JoltImpostor): number;
    getBodyFriction(impostor: JoltImpostor): number;
    setBodyFriction(impostor: JoltImpostor, friction: number): void;
    getBodyRestitution(impostor: JoltImpostor): number;
    setBodyRestitution(impostor: JoltImpostor, restitution: number): void;
    sleepBody(impostor: JoltImpostor): void;
    wakeUpBody(impostor: JoltImpostor): void;
    raycast(from: Vector3, to: Vector3): PhysicsRaycastResult;
    raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void;
    updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void;
    setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined): void;
    setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined): void;
    getRadius(impostor: JoltImpostor): number;
    getBoxSizeToRef(impostor: JoltImpostor, result: Vector3): void;
    syncMeshWithImpostor(mesh: AbstractMesh, impostor: JoltImpostor): void;
    dispose(): void;
}
