import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { getObjectLayer } from "../jolt-collision";
import Jolt from "../jolt-import";
import { GetJoltVec3, LAYER_MOVING, SetJoltVec3, wrapJolt } from "../jolt-util";
import { CharacterVirtualConfig } from "./config";
import { Logger } from "@babylonjs/core/Misc/logger";
export class JoltCharacterVirtual {
    constructor(impostor, shape, world, plugin) {
        this.impostor = impostor;
        this.shape = shape;
        this.world = world;
        this.plugin = plugin;
        this._characterUp = new Vector3();
        this._temp1 = new Vector3();
        this._temp2 = new Vector3();
        this._gravity = new Vector3();
        this._JoltPhysicsCallback = { 'on-adjust-velocity': [], 'on-contact-add': [], 'on-contact-validate': [] };
        this.onPhysicsStep = this.prePhysicsUpdate.bind(this);
    }
    init() {
        const world = this.world;
        const impostor = this.impostor;
        this.mDisposables = impostor._pluginData.toDispose;
        this._jolt_temp1 = new Jolt.Vec3();
        this._jolt_tempQuat1 = new Jolt.Quat();
        this._jolt_temp1R = new Jolt.RVec3();
        this.mDisposables.push(this._jolt_temp1, this._jolt_tempQuat1, this._jolt_temp1R);
        const settings = new Jolt.CharacterVirtualSettings();
        settings.mMass = this.impostor.getParam('mass') | 70;
        settings.mMaxSlopeAngle = this.impostor.getParam('maxSlopeAngle') || (45.0 * (Math.PI / 180.0));
        settings.mMaxStrength = this.impostor.getParam('maxStrength') || 100;
        settings.mCharacterPadding = this.impostor.getParam('characterPadding') || 0.02;
        settings.mPenetrationRecoverySpeed = this.impostor.getParam('penetrationRecoverySpeed') || 1;
        settings.mPredictiveContactDistance = this.impostor.getParam('predictiveContactDistance') || 0.1;
        settings.mShape = this.shape;
        const mSupportingVolume = new Jolt.Plane(Jolt.Vec3.prototype.sAxisY(), -1);
        settings.mSupportingVolume = mSupportingVolume;
        Jolt.destroy(mSupportingVolume);
        this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.RVec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.world.physicsSystem);
        Jolt.destroy(settings);
        this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();
        this.mDisposables.push(this.mCharacter, this.mUpdateSettings);
        this.config = new CharacterVirtualConfig(this.mCharacter, this.mUpdateSettings);
        this.config.enableStickToFloor = this.impostor.getParam('enableStickToFloor') || false;
        this.config.enableWalkStairs = this.impostor.getParam('enableWalkStairs') || true;
        const objectVsBroadPhaseLayerFilter = world.jolt.GetObjectVsBroadPhaseLayerFilter();
        const objectLayerPairFilter = world.jolt.GetObjectLayerPairFilter();
        const layer = getObjectLayer(this.impostor.getParam('layer') || LAYER_MOVING, this.impostor.getParam('mask'), this.plugin.settings);
        this.updateFilterData = {
            movingBPFilter: new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, layer),
            movingLayerFilter: new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, layer),
            bodyFilter: new Jolt.BodyFilter(),
            shapeFilter: new Jolt.ShapeFilter()
        };
        this.plugin.registerPerPhysicsStepCallback(this.onPhysicsStep);
    }
    setLayer(layer) {
        Jolt.destroy(this.updateFilterData.movingBPFilter);
        Jolt.destroy(this.updateFilterData.movingLayerFilter);
        const objectVsBroadPhaseLayerFilter = this.world.jolt.GetObjectVsBroadPhaseLayerFilter();
        const objectLayerPairFilter = this.world.jolt.GetObjectLayerPairFilter();
        this.updateFilterData.movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, layer);
        this.updateFilterData.movingLayerFilter = new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, layer);
    }
    onDestroy() {
        Jolt.destroy(this.updateFilterData.movingBPFilter);
        Jolt.destroy(this.updateFilterData.movingLayerFilter);
        Jolt.destroy(this.updateFilterData.bodyFilter);
        Jolt.destroy(this.updateFilterData.shapeFilter);
        this.plugin.unregisterPerPhysicsStepCallback(this.onPhysicsStep);
    }
    prePhysicsUpdate(mDeltaTime) {
        if (this.inputHandler) {
            this._characterUp.copyFrom(this.inputHandler.up);
            if (!this.config.enableStickToFloor) {
                this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0);
            }
            else {
                const len = -this.mUpdateSettings.mStickToFloorStepDown.Length();
                const vec = this._temp1;
                this._temp2.set(len, len, len);
                this._characterUp.multiplyToRef(this._temp2, vec);
                SetJoltVec3(vec, this.mUpdateSettings.mStickToFloorStepDown);
            }
            if (!this.config.enableWalkStairs) {
                this.mUpdateSettings.mWalkStairsStepUp.Set(0, 0, 0);
            }
            else {
                const len = this.mUpdateSettings.mWalkStairsStepUp.Length();
                const vec = this._temp1;
                this._temp2.set(len, len, len);
                this._characterUp.multiplyToRef(this._temp2, vec);
                SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
            }
            const gravity = this.inputHandler.gravity;
            if (!gravity) {
                GetJoltVec3(this.world.physicsSystem.GetGravity(), this._gravity);
            }
            else {
                this._gravity.copyFrom(gravity.getGravity(this.impostor, () => GetJoltVec3(this.mCharacter.GetPosition(), this._temp1)));
            }
            this.inputHandler.processCharacterData(this.mCharacter, this.world.physicsSystem, this._gravity, mDeltaTime, this._jolt_temp1, this._jolt_tempQuat1);
            this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);
            const inGravity = SetJoltVec3(this._gravity, this._jolt_temp1);
            const { movingBPFilter, movingLayerFilter, bodyFilter, shapeFilter } = this.updateFilterData;
            this.mCharacter.ExtendedUpdate(mDeltaTime, inGravity, this.mUpdateSettings, movingBPFilter, movingLayerFilter, bodyFilter, shapeFilter, this.world.jolt.GetTempAllocator());
        }
    }
    getCharacter() {
        return this.mCharacter;
    }
    setPosition(position) {
        this.mCharacter.SetPosition(SetJoltVec3(position, this._jolt_temp1R));
    }
    registerOnJoltPhysicsCollide(kind, collideAgainst, func) {
        let _lVelocity = new Vector3();
        let _aVelocity = new Vector3();
        if (!this.contactListener) {
            this.contactListener = new Jolt.CharacterContactListenerJS();
            this.contactListener.OnAdjustBodyVelocity = (_inCharacter, inBody2Ptr, lVelocityPtr, aVelocityPtr) => {
                const inBody2 = wrapJolt(inBody2Ptr, Jolt.Body);
                const lVelocity = wrapJolt(lVelocityPtr, Jolt.Vec3);
                const aVelocity = wrapJolt(aVelocityPtr, Jolt.Vec3);
                const impostor = this.plugin.GetImpostorForBodyId(inBody2.GetID().GetIndexAndSequenceNumber());
                GetJoltVec3(lVelocity, _lVelocity);
                GetJoltVec3(aVelocity, _aVelocity);
                this.onJoltCollide('on-adjust-velocity', { body: impostor, linearVelocity: _lVelocity, angularVelocity: _aVelocity });
                SetJoltVec3(_aVelocity, aVelocity);
                SetJoltVec3(_lVelocity, lVelocity);
            };
            this.contactListener.OnContactAdded = (_inCharacter, inBodyID2Ptr, _inSubShapeID2, _inContactPosition, _inContactNormal, _ioSettings) => {
                const inBodyID2 = wrapJolt(inBodyID2Ptr, Jolt.BodyID);
                const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
                this.onJoltCollide('on-contact-add', { body: impostor });
            };
            this.contactListener.OnContactValidate = (_inCharacter, inBodyID2Ptr, _inSubShapeID2) => {
                const inBodyID2 = wrapJolt(inBodyID2Ptr, Jolt.BodyID);
                const impostor = this.plugin.GetImpostorForBodyId(inBodyID2.GetIndexAndSequenceNumber());
                const ret = this.onJoltCollide('on-contact-validate', { body: impostor });
                if (ret !== undefined) {
                    return ret;
                }
                return true;
            };
            this.contactListener.OnContactSolve = (_inCharacter, _inBodyID2, _inSubShapeID2, _inContactPosition, _inContactNormal, _inContactVelocity, _inContactMaterial, _inCharacterVelocity, _ioNewCharacterVelocity) => {
            };
            this.mCharacter.SetListener(this.contactListener);
            this.mDisposables.push(this.contactListener);
        }
        const collidedAgainstList = collideAgainst instanceof Array ?
            collideAgainst
            : [collideAgainst];
        if (kind == 'on-contact-add') {
            const list = this._JoltPhysicsCallback['on-contact-add'];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
        if (kind == 'on-contact-validate') {
            const list = this._JoltPhysicsCallback['on-contact-validate'];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
        if (kind == 'on-adjust-velocity') {
            const list = this._JoltPhysicsCallback[kind];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
    }
    unregisterOnJoltPhysicsCollide(kind, collideAgainst, func) {
        const collidedAgainstList = collideAgainst instanceof Array ?
            collideAgainst
            : [collideAgainst];
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
        }
        else {
            Logger.Warn('Function to remove was not found');
        }
    }
    onJoltCollide(kind, event) {
        if (!this._JoltPhysicsCallback[kind].length) {
            return undefined;
        }
        if (event.body) {
            if (kind == 'on-contact-validate') {
                const e = event;
                const ret = [];
                const list = this._JoltPhysicsCallback['on-contact-validate'];
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
                if (kind === 'on-adjust-velocity') {
                    const list = this._JoltPhysicsCallback[kind];
                    const e = event;
                    list.filter((obj) => {
                        return obj.otherImpostors.indexOf(event.body) !== -1;
                    }).forEach((obj) => {
                        obj.callback(e.body, e.linearVelocity, e.angularVelocity);
                        collisionHandlerCount++;
                    });
                }
                else if (kind === 'on-contact-add') {
                    const list = this._JoltPhysicsCallback[kind];
                    const e = event;
                    list.filter((obj) => {
                        return obj.otherImpostors.indexOf(event.body) !== -1;
                    }).forEach((obj) => {
                        obj.callback(e.body);
                        collisionHandlerCount++;
                    });
                }
                //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
                if (collisionHandlerCount > 1) {
                    console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
                }
            }
        }
    }
}
