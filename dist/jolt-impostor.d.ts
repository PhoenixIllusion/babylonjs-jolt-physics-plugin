import { IPhysicsEnabledObject } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { OnContactCallback, OnContactValidateCallback, JoltContactSetting, OnContactValidateResponse, JoltPhysicsCollideCallbacks } from './jolt-contact';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IndicesArray, Nullable } from '@babylonjs/core/types';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { JoltJSPlugin } from './jolt-physics';
import Jolt from './jolt-import';
export declare class MinimalPhysicsNode extends TransformNode implements IPhysicsEnabledObject {
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
    getScene(): import("@babylonjs/core/scene").Scene;
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
type ImpostorNumberParamReq = 'mass';
type ImpostorNumberParam = 'friction' | 'restitution' | 'radiusBottom' | 'radiusTop';
type ImpostorVec3Param = 'extents' | 'centerOffMass';
type ImpostorMeshParam = 'mesh';
type ImpostorBoolParam = 'frozen' | 'sensor';
type ImpostorCollisionFilterParam = 'collision';
type ImpostorHeightMapParam = 'heightMap';
interface CollisionData {
    group?: number;
    subGroup?: number;
    filter?: Jolt.GroupFilter;
}
interface HeightMapData {
    data: Float32Array;
    size: number;
    alphaFilter?: number;
    blockSize?: number;
}
declare module '@babylonjs/core/Physics/v1/physicsImpostor' {
    interface PhysicsImpostorParameters {
        frozen?: boolean;
        extents?: Vector3;
        radiusBottom?: number;
        radiusTop?: number;
        centerOffMass?: Vector3;
        mesh?: IPhysicsEnabledObject;
        collision?: CollisionData;
        heightMap?: HeightMapData;
        sensor?: boolean;
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
        JoltPhysicsCallback: JoltPhysicsCollideCallbacks;
        registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
        registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
        unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
        unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
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
    mass: any;
    friction: any;
    restitution: any;
    frozen: boolean;
    plugin: JoltJSPlugin;
}
export {};
