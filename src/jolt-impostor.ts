
import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { OnContactCallback, OnContactValidateCallback, JoltCollisionKey, JoltContactSetting, OnContactValidateResponse, JoltCollisionCallback, JoltPhysicsCollideCallbacks } from './jolt-contact';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IndicesArray, Nullable } from '@babylonjs/core/types';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { JoltJSPlugin } from './jolt-physics';
import Jolt from './jolt-import';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';
import { GravityInterface } from './gravity/types';
import { CollisionTableFilter } from './jolt-collision';
import { IRaycastQuery, PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { PhysicsEngine } from '@babylonjs/core/Physics/v1/physicsEngine';
import { BuoyancyInterface } from './buoyancy/type';

class TransformNodeWithImpostor extends TransformNode {
  _physicsImpostor: Nullable<PhysicsImpostor> = null;
  get physicsImpostor() {
    return this._physicsImpostor;
  }
  set physicsImpostor(value: Nullable<PhysicsImpostor>) {
    if (this._physicsImpostor === value) {
      return;
    }
    if (this._disposePhysicsObserver) {
      this.onDisposeObservable.remove(this._disposePhysicsObserver);
    }

    this._physicsImpostor = value;

    if (value) {
      this._disposePhysicsObserver = this.onDisposeObservable.add(() => {
        // Physics
        if (this.physicsImpostor) {
          this.physicsImpostor.dispose(/*!doNotRecurse*/);
          this.physicsImpostor = null;
        }
      });
    }
  }
}


export class MinimalPhysicsNode extends TransformNodeWithImpostor implements IPhysicsEnabledObject {
  boundingInfo: BoundingInfo;

  constructor(name: string, extents: Vector3, private mesh: AbstractMesh) {
    super(name, mesh.getScene());

    const { x, y, z } = extents;
    this.boundingInfo = new BoundingInfo(new Vector3(-x, -y, -z), new Vector3(x, y, z));
  }

  getBoundingInfo(): BoundingInfo {
    return this.boundingInfo;
  }
  getVerticesData(kind: string): Nullable<number[] | Float32Array> {
    return this.mesh.getVerticesData(kind);
  }
  getIndices?(): Nullable<IndicesArray> {
    return this.mesh.getIndices();
  }
}

export class ThinPhysicsNode implements IPhysicsEnabledObject {
  boundingInfo: BoundingInfo;

  public position: Vector3 = new class extends Vector3 {
    constructor(public thin: ThinPhysicsNode) { super(); }
    copyFrom(vec: Vector3): this {
      super.copyFrom(vec);
      this.thin._recompose();
      return this;
    }
    set(x: number, y: number, z: number): this {
      super.set(x, y, z);
      this.thin._recompose();
      return this;
    }
  }(this);
  public rotationQuaternion: Quaternion = new class extends Quaternion {
    constructor(public thin: ThinPhysicsNode) { super(); }
    copyFrom(quat: Quaternion): this {
      super.copyFrom(quat);
      this.thin._recompose();
      return this;
    }
    set(x: number, y: number, z: number, w: number): this {
      super.set(x, y, z, w);
      this.thin._recompose();
      return this;
    }
  }(this);
  public scaling: Vector3 = new class extends Vector3 {
    constructor(public thin: ThinPhysicsNode) { super(); }
    set(x: number, y: number, z: number): this {
      super.set(x, y, z);
      this.thin._recompose();
      return this;
    }
    copyFrom(vec: Vector3): this {
      super.copyFrom(vec);
      this.thin._recompose();
      return this;
    }
  }(this);
  private matrix: Matrix;
  rotation?: Vector3 | undefined;
  parent?: any;

  constructor(extents: Vector3, private index: number, private mesh: AbstractMesh & {
    thinInstanceCount: number,
    thinInstanceGetWorldMatrices(): Matrix[],
    thinInstanceSetMatrixAt(index: number, matrix: Matrix, refresh: boolean): void
  }) {
    const { x, y, z } = extents;
    this.boundingInfo = new BoundingInfo(new Vector3(-x, -y, -z), new Vector3(x, y, z));
    this.matrix = mesh.thinInstanceGetWorldMatrices()[index];
    this.matrix.decompose(this.scaling, this.rotationQuaternion, this.position);
  }

  getScene(): Scene {
    return this.mesh.getScene();
  }

  protected _recompose() {
    Matrix.ComposeToRef(this.scaling, this.rotationQuaternion, this.position, this.matrix);
    this.mesh.thinInstanceSetMatrixAt(this.index, this.matrix, this.index == this.mesh.thinInstanceCount - 1);
  }

  computeWorldMatrix(_force: boolean): Matrix {
    return this.matrix;
  }

  getAbsolutePosition(): Vector3 {
    return this.position;
  }
  getAbsolutePivotPoint(): Vector3 {
    return Vector3.Zero();
  }
  rotate(_axis: Vector3, _amount: number, _space?: Space | undefined): TransformNode {
    return {} as TransformNode;
  }
  translate(_axis: Vector3, _distance: number, _space?: Space | undefined): TransformNode {
    return {} as TransformNode;
  }
  setAbsolutePosition(_absolutePosition: Vector3): TransformNode {
    return {} as TransformNode;
  }
  getClassName(): string {
    return 'ThinPhysicsNode';
  }


  getBoundingInfo(): BoundingInfo {
    return this.boundingInfo;
  }
  getVerticesData(kind: string): Nullable<number[] | Float32Array> {
    return this.mesh.getVerticesData(kind);
  }
  getIndices?(): Nullable<IndicesArray> {
    return this.mesh.getIndices();
  }
}

export type MotionType = 'static' | 'dynamic' | 'kinematic'
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

  namespace PhysicsImpostor {
    export const EmptyImpostor: number;
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

    registerBuoyancyInterface(buoyancy: BuoyancyInterface | null): void;

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

Object.defineProperty(PhysicsImpostor, 'EmptyImpostor', {
  value: 200,
  writable: false
});

Object.defineProperty(PhysicsImpostor.prototype, "joltPluginData", {
  get: function (this: PhysicsImpostor) {
    return this._pluginData;
  },
  set: function (this: PhysicsImpostor, value: JoltPluginData) {
    this._pluginData = value;
  },
  enumerable: true,
  configurable: true,
});
Object.defineProperty(PhysicsImpostor.prototype, "JoltPhysicsCallback", {
  get: function (this: PhysicsImpostor) {
    (this as any)._JoltPhysicsCallback = (this as any)._JoltPhysicsCallback || { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [] };
    return (this as any)._JoltPhysicsCallback;
  },
  set: function (this: PhysicsImpostor, value: JoltPhysicsCollideCallbacks) {
    (this as any)._JoltPhysicsCallback = value;
  },
  enumerable: true,
  configurable: true,
});

PhysicsImpostor.prototype.registerOnJoltPhysicsCollide = function (kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
  func: OnContactCallback | OnContactValidateCallback): void {
  const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
    <Array<PhysicsImpostor>>collideAgainst
    : [<PhysicsImpostor>collideAgainst];
  if (kind == 'on-contact-validate') {
    const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this.JoltPhysicsCallback['on-contact-validate'];
    list.push({ callback: func as OnContactValidateCallback, otherImpostors: collidedAgainstList });
  } else {
    const list: JoltCollisionCallback<OnContactCallback>[] = this.JoltPhysicsCallback[kind];
    list.push({ callback: func as OnContactCallback, otherImpostors: collidedAgainstList });
  }
}
PhysicsImpostor.prototype.unregisterOnJoltPhysicsCollide = function (kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
  func: OnContactCallback | OnContactValidateCallback): void {
  const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
    <Array<PhysicsImpostor>>collideAgainst
    : [<PhysicsImpostor>collideAgainst];

  let index = -1;
  const found = this.JoltPhysicsCallback[kind].some((cbDef, idx) => {
    if (cbDef.callback === func && cbDef.otherImpostors.length === collidedAgainstList.length) {
      const sameList = cbDef.otherImpostors.every((impostor) => {
        return collidedAgainstList.indexOf(impostor) > -1;
      });
      if (sameList) {
        index = idx;
      }
      return sameList;
    }
    return false;
  });

  if (found) {
    this.JoltPhysicsCallback[kind].splice(index, 1);
  } else {
    Logger.Warn('Function to remove was not found');
  }
}

PhysicsImpostor.prototype.setShape = function (type: number, params: PhysicsImpostorParameters): void {
  this.joltPluginData.plugin.setShape(this, type, params);
}

PhysicsImpostor.prototype.getShapeVertexData = function (): VertexData {
  const body: Jolt.Body = this.physicsBody;
  const shape = body.GetShape();
  // Get triangle data
  let scale = new Jolt.Vec3(1, 1, 1);
  let triContext = new Jolt.ShapeGetTriangles(shape, Jolt.AABox.prototype.sBiggest(), shape.GetCenterOfMass(), Jolt.Quat.prototype.sIdentity(), scale);
  Jolt.destroy(scale);
  // Get a view on the triangle data (does not make a copy)
  let vertices = new Float32Array(Jolt.HEAPF32.buffer, triContext.GetVerticesData(), triContext.GetVerticesSize() / Float32Array.BYTES_PER_ELEMENT);
  Jolt.destroy(triContext);
  const indices: number[] = [];
  for (let i = 0; i < vertices.length / 3; i++) {
    indices.push(i);
  }
  // Create a three mesh
  var vertexData = new VertexData();
  vertexData.positions = vertices;
  vertexData.indices = indices;

  return vertexData;
}

PhysicsImpostor.prototype.onJoltCollide = function (kind: JoltCollisionKey, event: { body: PhysicsImpostor, ioSettings: JoltContactSetting } | { body: PhysicsImpostor }) {
  if (!this.JoltPhysicsCallback[kind].length) {
    return undefined;
  }
  if (event.body) {
    if (kind == 'on-contact-validate') {
      const ret: OnContactValidateResponse[] = [];
      const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this.JoltPhysicsCallback['on-contact-validate'];
      const e = event as { body: PhysicsImpostor };
      list.filter((obj) => {
        return obj.otherImpostors.indexOf(event.body) !== -1;
      }).forEach((obj) => {
        const r = obj.callback(e.body);
        if (r !== undefined) {
          ret.push(r);
        }
      });
      //if you have registered multiple validate callback between A & B and they disagree, you have big problems on your hand so I'm not trying to combine
      if (ret.length > 1) {
        console.warn(`Warning: [${ret.length}] Validation Listeners registered between: `, this, event.body);
      }
      return ret[0];
    } else {
      let collisionHandlerCount = 0;
      const list: JoltCollisionCallback<OnContactCallback>[] = this.JoltPhysicsCallback[kind];
      const e = event as { body: PhysicsImpostor, ioSettings: JoltContactSetting };
      list.filter((obj) => {
        return obj.otherImpostors.indexOf(event.body) !== -1;
      }).forEach((obj) => {
        obj.callback(e.body, new Vector3(), e.ioSettings);
        collisionHandlerCount++;
      });
      //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
      if (collisionHandlerCount > 1) {
        console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
      }
    }
  }
}

PhysicsImpostor.prototype.setGravityFactor = function (factor: number): void {
  this.joltPluginData.plugin.setGravityFactor(this, factor);
}

PhysicsImpostor.prototype.setGravityOverride = function (gravity: GravityInterface | null): void {
  this.joltPluginData.plugin.setGravityOverride(this, gravity);
}

PhysicsImpostor.prototype.registerBuoyancyInterface = function (buoyancy: BuoyancyInterface | null): void {
  this.joltPluginData.plugin.registerBuoyancyInterface(this, buoyancy);
}

PhysicsImpostor.prototype.moveKinematicPosition = function (position: Vector3, duration: number): void {
  this.joltPluginData.plugin.moveKinematic(this, position, null, duration);
}
PhysicsImpostor.prototype.moveKinematicRotation = function (rotation: Quaternion, duration: number): void {
  this.joltPluginData.plugin.moveKinematic(this, null, rotation, duration);
}
PhysicsImpostor.prototype.moveKinematic = function (position: Vector3, rotation: Quaternion, duration: number): void {
  this.joltPluginData.plugin.moveKinematic(this, position, rotation, duration);
}

PhysicsImpostor.prototype.setLayer = function (layer: number, mask?: number): void {
  this.joltPluginData.plugin.setLayer(this, layer, mask);
}

PhysicsImpostor.prototype.setMotionType = function (motionType: MotionType): void {
  this.joltPluginData.plugin.setMotionType(this, motionType);
}

PhysicsEngine.prototype.raycast = function (from: Vector3, to: Vector3, query?: IRaycastQuery): PhysicsRaycastResult {
  return (this.getPhysicsPlugin() as JoltJSPlugin).raycast(from, to, query);
}
PhysicsEngine.prototype.raycastToRef = function (from: Vector3, to: Vector3, ref: PhysicsRaycastResult, query?: IRaycastQuery): void {
  (this.getPhysicsPlugin() as JoltJSPlugin).raycastToRef(from, to, ref, query);
}