
import { IPhysicsEnabledObject, PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { OnContactCallback, OnContactValidateCallback, JoltCollisionKey, JoltContactSetting, OnContactValidateResponse, JoltCollisionCallback, JoltPhysicsCollideCallbacks } from './jolt-contact';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { IndicesArray, Nullable } from '@babylonjs/core/types';
import { Space } from '@babylonjs/core/Maths/math.axis';


export class MinimalPhysicsNode extends TransformNode implements IPhysicsEnabledObject {
  boundingInfo: BoundingInfo;

  constructor(name: string, extents: Vector3, private mesh: AbstractMesh) {
    super(name);

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

  public position = new class extends Vector3 {
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
  public rotationQuaternion = new class extends Quaternion {
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
  public scaling = new class extends Vector3 {
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

  getScene() {
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


export class JoltPhysicsImpostor extends PhysicsImpostor {

  public _JoltPhysicsCallback: JoltPhysicsCollideCallbacks = { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [] }

  public registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public registerOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    if (kind == 'on-contact-validate') {
      const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
      list.push({ callback: func as OnContactValidateCallback, otherImpostors: collidedAgainstList });
    } else {
      const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
      list.push({ callback: func as OnContactCallback, otherImpostors: collidedAgainstList });
    }
  }
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    let index = -1;

    const found = this._JoltPhysicsCallback[kind].some((cbDef, idx) => {
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
      this._JoltPhysicsCallback[kind].splice(index, 1);
    } else {
      Logger.Warn('Function to remove was not found');
    }
  }

  public onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: { body: PhysicsImpostor, ioSettings: JoltContactSetting }): void;
  public onJoltCollide(kind: 'on-contact-validate', event: { body: PhysicsImpostor }): OnContactValidateResponse | undefined;
  public onJoltCollide(kind: JoltCollisionKey, event: { body: PhysicsImpostor, ioSettings: JoltContactSetting } | { body: PhysicsImpostor }): OnContactValidateResponse | undefined | void {
    if (!this._JoltPhysicsCallback[kind].length) {
      return undefined;
    }
    if (event.body) {
      if (kind == 'on-contact-validate') {
        const ret: OnContactValidateResponse[] = [];
        const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
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
        const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
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
}