import { IPhysicsEnabledObject, PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { OnContactCallback, OnContactValidateCallback, JoltContactSetting, OnContactValidateResponse, JoltPhysicsCollideCallbacks } from './jolt-contact';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IndicesArray, Nullable } from '@babylonjs/core/types';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { JoltJSPlugin } from './jolt-physics';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';
import { GravityInterface } from './gravity/types';
import { CollisionTableFilter } from './jolt-collision';
import { IRaycastQuery, PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { BuoyancyInterface } from './buoyancy/type';
declare class TransformNodeWithImpostor extends TransformNode {
    _physicsImpostor: Nullable<PhysicsImpostor>;
    get physicsImpostor(): Nullable<PhysicsImpostor>;
    set physicsImpostor(value: Nullable<PhysicsImpostor>);
}
export declare class MinimalPhysicsNode extends TransformNodeWithImpostor implements IPhysicsEnabledObject {
    private mesh;
    boundingInfo: BoundingInfo;
    constructor(name: string, extents: Vector3, mesh: AbstractMesh);
    getBoundingInfo(): BoundingInfo;
    getVerticesData(kind: string): Nullable<number[] | Float32Array>;
    getIndices?(): Nullable<IndicesArray>;
}
export declare class ThinPhysicsNode implements IPhysicsEnabledObject {
    private index;
    private mesh;
    boundingInfo: BoundingInfo;
    position: Vector3;
    rotationQuaternion: Quaternion;
    scaling: Vector3;
    private matrix;
    rotation?: Vector3 | undefined;
    parent?: any;
    constructor(extents: Vector3, index: number, mesh: AbstractMesh & {
        thinInstanceCount: number;
        thinInstanceGetWorldMatrices(): Matrix[];
        thinInstanceSetMatrixAt(index: number, matrix: Matrix, refresh: boolean): void;
    });
    getScene(): Scene;
    protected _recompose(): void;
    computeWorldMatrix(_force: boolean): Matrix;
    getAbsolutePosition(): Vector3;
    getAbsolutePivotPoint(): Vector3;
    rotate(_axis: Vector3, _amount: number, _space?: Space | undefined): TransformNode;
    translate(_axis: Vector3, _distance: number, _space?: Space | undefined): TransformNode;
    setAbsolutePosition(_absolutePosition: Vector3): TransformNode;
    getClassName(): string;
    getBoundingInfo(): BoundingInfo;
    getVerticesData(kind: string): Nullable<number[] | Float32Array>;
    getIndices?(): Nullable<IndicesArray>;
}
export type MotionType = 'static' | 'dynamic' | 'kinematic';
type ImpostorNumberParamReq = 'mass';
type ImpostorNumberParam = 'friction' | 'restitution' | 'radiusBottom' | 'radiusTop' | 'layer' | 'mask' | 'dof';
type ImpostorVec3Param = 'extents' | 'centerOfMass';
type ImpostorMeshParam = 'mesh';
type ImpostorBoolParam = 'frozen' | 'sensor' | 'allowDynamicOrKinematic';
type ImpostorCollisionFilterParam = 'collision';
type ImpostorHeightMapParam = 'heightMap';
type ImpostorShapeParam = 'copyShape';
interface CollisionData {
    group?: number;
    subGroup?: number;
    filter?: CollisionTableFilter;
}
interface HeightMapData {
    data: Float32Array;
    size: number;
    alphaFilter?: number;
    blockSize?: number;
}
declare module '@babylonjs/core/Physics/v1/physicsEngine' {
    interface PhysicsEngine {
        raycast(from: Vector3, to: Vector3, query?: IRaycastQuery): PhysicsRaycastResult;
        raycastToRef(from: Vector3, to: Vector3, ref: PhysicsRaycastResult, query?: IRaycastQuery): void;
    }
}
declare module '@babylonjs/core/Physics/v1/physicsImpostor' {
    interface PhysicsImpostorParameters {
        frozen?: boolean;
        extents?: Vector3;
        radiusBottom?: number;
        radiusTop?: number;
        centerOfMass?: Vector3;
        mesh?: IPhysicsEnabledObject;
        collision?: CollisionData;
        heightMap?: HeightMapData;
        sensor?: boolean;
        copyShape?: PhysicsImpostor;
        layer?: number;
        mask?: number;
        motionType?: MotionType;
        dof?: number;
        allowDynamicOrKinematic?: boolean;
    }
    interface PhysicsImpostor {
        get joltPluginData(): JoltPluginData;
        getParam(paramName: ImpostorBoolParam): boolean | undefined;
        getParam(paramName: ImpostorNumberParamReq): number;
        getParam(paramName: ImpostorMeshParam): IPhysicsEnabledObject | undefined;
        getParam(paramName: ImpostorNumberParam): number | undefined;
        getParam(param: ImpostorVec3Param): Vector3 | undefined;
        getParam(param: ImpostorCollisionFilterParam): CollisionData | undefined;
        getParam(param: ImpostorHeightMapParam): HeightMapData | undefined;
        getParam(param: ImpostorShapeParam): PhysicsImpostor | undefined;
        getParam(param: 'motionType'): MotionType | undefined;
        applyForce(force: Vector3): void;
        applyForce(force: Vector3, contactPoint?: Vector3): void;
        getShapeVertexData(): VertexData;
        setGravityFactor(percent: number): void;
        setGravityOverride(gravity: GravityInterface | null): void;
        moveKinematicPosition(position: Vector3, duration: number): void;
        moveKinematicRotation(rotation: Quaternion, duration: number): void;
        moveKinematic(position: Vector3, rotation: Quaternion, duration: number): void;
        setLayer(layer: number): void;
        setLayer(layer: number, mask?: number): void;
        setMotionType(motionType: MotionType): void;
        JoltPhysicsCallback: JoltPhysicsCollideCallbacks;
        registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
        registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
        unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
        unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
        setShape(type: number, param: PhysicsImpostorParameters): void;
        onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: {
            body: PhysicsImpostor;
            ioSettings: JoltContactSetting;
        }): void;
        onJoltCollide(kind: 'on-contact-validate', event: {
            body: PhysicsImpostor;
        }): OnContactValidateResponse | undefined;
    }
}
export interface JoltPluginData {
    toDispose: any[];
    gravity?: GravityInterface;
    buoyancy?: BuoyancyInterface;
    mass: number;
    friction?: number;
    restitution?: number;
    frozen: boolean;
    plugin: JoltJSPlugin;
}
export {};
