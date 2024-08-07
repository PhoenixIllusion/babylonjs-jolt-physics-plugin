import Jolt from './jolt-import';
import { GetJoltVec3, LAYER_MOVING, SetJoltQuat, SetJoltVec3, wrapJolt } from './jolt-util';
import { getObjectLayer } from '.';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import './jolt-impostor';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    constructor(object, type, _options, _scene) {
        super(object, type, _options, _scene);
    }
    getParam(param) {
        super.getParam(param);
    }
    get controller() {
        return this._pluginData.controller;
    }
    set controller(controller) {
        this._pluginData.controller = controller;
    }
}
export var GroundState;
(function (GroundState) {
    GroundState[GroundState["ON_GROUND"] = 0] = "ON_GROUND";
    GroundState[GroundState["RISING"] = 1] = "RISING";
    GroundState[GroundState["FALLING"] = 2] = "FALLING";
})(GroundState || (GroundState = {}));
export var CharacterState;
(function (CharacterState) {
    CharacterState[CharacterState["IDLE"] = 0] = "IDLE";
    CharacterState[CharacterState["MOVING"] = 1] = "MOVING";
    CharacterState[CharacterState["JUMPING"] = 2] = "JUMPING";
})(CharacterState || (CharacterState = {}));
export class StandardCharacterVirtualHandler {
    constructor() {
        this.mDesiredVelocity = new Vector3();
        this.inMovementDirection = new Vector3();
        this.inJump = false;
        this.allowSliding = false;
        this.controlMovementDuringJump = true;
        this.characterSpeed = 6.0;
        this.jumpSpeed = 15.0;
        this.enableCharacterInertia = true;
        this.groundState = GroundState.ON_GROUND;
        this.userState = CharacterState.IDLE;
        this._new_velocity = new Vector3();
        this.autoUp = true;
        this.up = new Vector3(0, 1, 0);
        this.rotation = Quaternion.Identity();
        this._linVelocity = new Vector3();
        this._groundVelocity = new Vector3();
    }
    updateInput(inMovementDirection, inJump) {
        this.inMovementDirection.copyFrom(inMovementDirection);
        this.inJump = inJump;
    }
    processCharacterData(character, _physicsSys, gravity, inDeltaTime, _tmpVec3, _tmpQuat) {
        const player_controls_horizontal_velocity = this.controlMovementDuringJump || character.IsSupported();
        if (player_controls_horizontal_velocity) {
            // True if the player intended to move
            this.allowSliding = !(this.inMovementDirection.length() < 1.0e-12);
            // Smooth the player input
            if (this.enableCharacterInertia) {
                const s = 0.25 * this.characterSpeed;
                this.mDesiredVelocity = this.mDesiredVelocity.multiplyByFloats(0.75, 0.75, 0.75).add(this.inMovementDirection.multiplyByFloats(s, s, s));
            }
            else {
                const s = this.characterSpeed;
                this.mDesiredVelocity = this.inMovementDirection.multiplyByFloats(s, s, s);
            }
        }
        else {
            // While in air we allow sliding
            this.allowSliding = true;
        }
        const upRotation = this.rotation.clone();
        if (this.autoUp) {
            gravity.negateToRef(this.up);
            this.up.normalize();
            const rot = Quaternion.FromUnitVectorsToRef(new Vector3(0, 1, 0), this.up, new Quaternion());
            upRotation.multiplyInPlace(rot);
        }
        const characterUp = this.up;
        const character_up = SetJoltVec3(characterUp, _tmpVec3);
        const character_up_rotation = SetJoltQuat(upRotation, _tmpQuat);
        character.SetUp(character_up);
        character.SetRotation(character_up_rotation);
        character.UpdateGroundVelocity();
        const linearVelocity = GetJoltVec3(character.GetLinearVelocity(), this._linVelocity);
        const vVel = Vector3.Dot(linearVelocity, characterUp);
        const current_vertical_velocity = characterUp.multiplyByFloats(vVel, vVel, vVel);
        const ground_velocity = GetJoltVec3(character.GetGroundVelocity(), this._groundVelocity);
        const gVel = Vector3.Dot(this._groundVelocity, characterUp);
        const moving_towards_ground = (vVel - gVel) < 0.1;
        const groundState = character.GetGroundState();
        if (groundState == Jolt.EGroundState_OnGround) {
            this.groundState = GroundState.ON_GROUND;
            if (this.mDesiredVelocity.length() < 0.01) {
                this.userState = CharacterState.IDLE;
            }
            else {
                this.userState = CharacterState.MOVING;
            }
        }
        else {
            if (moving_towards_ground) {
                this.groundState = GroundState.FALLING;
            }
            else {
                this.groundState = GroundState.RISING;
            }
        }
        if (groundState == Jolt.EGroundState_OnGround // If on ground
            && (this.enableCharacterInertia ?
                moving_towards_ground // Inertia enabled: And not moving away from ground
                : !character.IsSlopeTooSteep(character.GetGroundNormal()))) // Inertia disabled: And not on a slope that is too steep
         {
            // Assume velocity of ground when on ground
            this._new_velocity.copyFrom(ground_velocity);
            // Jump
            if (this.inJump && moving_towards_ground) {
                this._new_velocity.addInPlace(characterUp.multiplyByFloats(this.jumpSpeed, this.jumpSpeed, this.jumpSpeed));
                this.userState = CharacterState.JUMPING;
            }
        }
        else
            this._new_velocity.copyFrom(current_vertical_velocity);
        // Gravity
        this._new_velocity.addInPlace(gravity.multiplyByFloats(inDeltaTime, inDeltaTime, inDeltaTime));
        if (player_controls_horizontal_velocity) {
            // Player input
            this._new_velocity.addInPlace(this.mDesiredVelocity.applyRotationQuaternion(upRotation));
        }
        else {
            // Preserve horizontal velocity
            const current_horizontal_velocity = linearVelocity.subtract(current_vertical_velocity);
            this._new_velocity.addInPlace(current_horizontal_velocity);
        }
    }
    updateCharacter(character, tempVec) {
        SetJoltVec3(this._new_velocity, tempVec);
        character.SetLinearVelocity(tempVec);
    }
}
class CharacterVirtualConfig {
    constructor(character, updateSettings) {
        this.character = character;
        this.updateSettings = updateSettings;
        this.enableWalkStairs = true;
        this.enableStickToFloor = true;
        this._stickToFloorStepDown = new Vector3();
        this._walkStairsStepUp = new Vector3();
    }
    get mass() { return this.character.GetMass(); }
    ;
    set mass(v) { this.character.SetMass(v); }
    ;
    set maxSlopeAngle(v) { this.character.SetMaxSlopeAngle(v); }
    ;
    get maxStrength() { return this.character.GetMaxStrength(); }
    ;
    set maxStrength(v) { this.character.SetMaxStrength(v); }
    ;
    get characterPadding() { return this.character.GetCharacterPadding(); }
    ;
    get penetrationRecoverySpeed() { return this.character.GetPenetrationRecoverySpeed(); }
    ;
    set penetrationRecoverySpeed(v) { this.character.SetPenetrationRecoverySpeed(v); }
    ;
    get stickToFloorStepDown() { return GetJoltVec3(this.updateSettings.mStickToFloorStepDown, this._stickToFloorStepDown); }
    set stickToFloorStepDown(v) { this._stickToFloorStepDown.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mStickToFloorStepDown); }
    get walkStairsStepUp() { return GetJoltVec3(this.updateSettings.mWalkStairsStepUp, this._walkStairsStepUp); }
    set walkStairsStepUp(v) { this._walkStairsStepUp.copyFrom(v); SetJoltVec3(this._stickToFloorStepDown, this.updateSettings.mWalkStairsStepUp); }
}
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
    }
    init() {
        const world = this.world;
        const impostor = this.impostor;
        this.mDisposables = impostor._pluginData.toDispose;
        this._jolt_temp1 = new Jolt.Vec3();
        this._jolt_tempQuat1 = new Jolt.Quat();
        this.mDisposables.push(this._jolt_temp1, this._jolt_tempQuat1);
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
        this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.world.physicsSystem);
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
        SetJoltVec3(position, this._jolt_temp1);
        this.mCharacter.SetPosition(this._jolt_temp1);
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
