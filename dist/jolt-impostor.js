import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
class TransformNodeWithImpostor extends TransformNode {
    constructor() {
        super(...arguments);
        this._physicsImpostor = null;
    }
    get physicsImpostor() {
        return this._physicsImpostor;
    }
    set physicsImpostor(value) {
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
                    this.physicsImpostor.dispose( /*!doNotRecurse*/);
                    this.physicsImpostor = null;
                }
            });
        }
    }
}
export class MinimalPhysicsNode extends TransformNodeWithImpostor {
    constructor(name, extents, mesh) {
        super(name, mesh.getScene());
        this.mesh = mesh;
        const { x, y, z } = extents;
        this.boundingInfo = new BoundingInfo(new Vector3(-x, -y, -z), new Vector3(x, y, z));
    }
    getBoundingInfo() {
        return this.boundingInfo;
    }
    getVerticesData(kind) {
        return this.mesh.getVerticesData(kind);
    }
    getIndices() {
        return this.mesh.getIndices();
    }
}
export class ThinPhysicsNode {
    constructor(extents, index, mesh) {
        this.index = index;
        this.mesh = mesh;
        this.position = new class extends Vector3 {
            constructor(thin) {
                super();
                this.thin = thin;
            }
            copyFrom(vec) {
                super.copyFrom(vec);
                this.thin._recompose();
                return this;
            }
            set(x, y, z) {
                super.set(x, y, z);
                this.thin._recompose();
                return this;
            }
        }(this);
        this.rotationQuaternion = new class extends Quaternion {
            constructor(thin) {
                super();
                this.thin = thin;
            }
            copyFrom(quat) {
                super.copyFrom(quat);
                this.thin._recompose();
                return this;
            }
            set(x, y, z, w) {
                super.set(x, y, z, w);
                this.thin._recompose();
                return this;
            }
        }(this);
        this.scaling = new class extends Vector3 {
            constructor(thin) {
                super();
                this.thin = thin;
            }
            set(x, y, z) {
                super.set(x, y, z);
                this.thin._recompose();
                return this;
            }
            copyFrom(vec) {
                super.copyFrom(vec);
                this.thin._recompose();
                return this;
            }
        }(this);
        const { x, y, z } = extents;
        this.boundingInfo = new BoundingInfo(new Vector3(-x, -y, -z), new Vector3(x, y, z));
        this.matrix = mesh.thinInstanceGetWorldMatrices()[index];
        this.matrix.decompose(this.scaling, this.rotationQuaternion, this.position);
    }
    getScene() {
        return this.mesh.getScene();
    }
    _recompose() {
        Matrix.ComposeToRef(this.scaling, this.rotationQuaternion, this.position, this.matrix);
        this.mesh.thinInstanceSetMatrixAt(this.index, this.matrix, this.index == this.mesh.thinInstanceCount - 1);
    }
    computeWorldMatrix(_force) {
        return this.matrix;
    }
    getAbsolutePosition() {
        return this.position;
    }
    getAbsolutePivotPoint() {
        return Vector3.Zero();
    }
    rotate(_axis, _amount, _space) {
        return {};
    }
    translate(_axis, _distance, _space) {
        return {};
    }
    setAbsolutePosition(_absolutePosition) {
        return {};
    }
    getClassName() {
        return 'ThinPhysicsNode';
    }
    getBoundingInfo() {
        return this.boundingInfo;
    }
    getVerticesData(kind) {
        return this.mesh.getVerticesData(kind);
    }
    getIndices() {
        return this.mesh.getIndices();
    }
}
Object.defineProperty(PhysicsImpostor.prototype, "joltPluginData", {
    get: function () {
        return this._pluginData;
    },
    set: function (value) {
        this._pluginData = value;
    },
    enumerable: true,
    configurable: true,
});
Object.defineProperty(PhysicsImpostor.prototype, "JoltPhysicsCallback", {
    get: function () {
        this._JoltPhysicsCallback = this._JoltPhysicsCallback || { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [] };
        return this._JoltPhysicsCallback;
    },
    set: function (value) {
        this._JoltPhysicsCallback = value;
    },
    enumerable: true,
    configurable: true,
});
PhysicsImpostor.prototype.registerOnJoltPhysicsCollide = function (kind, collideAgainst, func) {
    const collidedAgainstList = collideAgainst instanceof Array ?
        collideAgainst
        : [collideAgainst];
    if (kind == 'on-contact-validate') {
        const list = this.JoltPhysicsCallback['on-contact-validate'];
        list.push({ callback: func, otherImpostors: collidedAgainstList });
    }
    else {
        const list = this.JoltPhysicsCallback[kind];
        list.push({ callback: func, otherImpostors: collidedAgainstList });
    }
};
PhysicsImpostor.prototype.unregisterOnJoltPhysicsCollide = function (kind, collideAgainst, func) {
    const collidedAgainstList = collideAgainst instanceof Array ?
        collideAgainst
        : [collideAgainst];
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
    }
    else {
        Logger.Warn('Function to remove was not found');
    }
};
PhysicsImpostor.prototype.onJoltCollide = function (kind, event) {
    if (!this.JoltPhysicsCallback[kind].length) {
        return undefined;
    }
    if (event.body) {
        if (kind == 'on-contact-validate') {
            const ret = [];
            const list = this.JoltPhysicsCallback['on-contact-validate'];
            const e = event;
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
        }
        else {
            let collisionHandlerCount = 0;
            const list = this.JoltPhysicsCallback[kind];
            const e = event;
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
};
