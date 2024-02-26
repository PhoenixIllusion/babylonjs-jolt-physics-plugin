import Jolt from './jolt-import';
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, SetJoltVec3 } from './jolt-util';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
class CharacterVirtualConfig {
    constructor() {
        this.sMaxSlopeAngle = 45.0 * (Math.PI / 180.0);
        this.sMaxStrength = 100.0;
        this.sCharacterPadding = 0.02;
        this.sPenetrationRecoverySpeed = 1.0;
        this.sPredictiveContactDistance = 0.1;
        this.sEnableWalkStairs = true;
        this.sEnableStickToFloor = true;
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
        this.upRotationX = 0;
        this.upRotationZ = 0;
        this.groundState = GroundState.ON_GROUND;
        this.userState = CharacterState.IDLE;
        this._new_velocity = new Vector3();
        this._charUpRot = new Quaternion();
        this._charUp = new Vector3();
        this._linVelocity = new Vector3();
        this._groundVelocity = new Vector3();
        this._gravity = new Vector3();
    }
    updateInput(inMovementDirection, inJump) {
        this.inMovementDirection.copyFrom(inMovementDirection);
        this.inJump = inJump;
    }
    processCharacterData(character, physicsSys, inDeltaTime, _tmpVec3) {
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
        const upRot = _tmpVec3;
        upRot.Set(this.upRotationX, 0, this.upRotationZ);
        const character_up_rotation = Jolt.Quat.prototype.sEulerAngles(upRot);
        character.SetUp(character_up_rotation.RotateAxisY());
        character.SetRotation(character_up_rotation);
        const upRotation = GetJoltQuat(character_up_rotation, this._charUpRot);
        character.UpdateGroundVelocity();
        const characterUp = GetJoltVec3(character.GetUp(), this._charUp);
        const linearVelocity = GetJoltVec3(character.GetLinearVelocity(), this._linVelocity);
        const vVel = Vector3.Dot(linearVelocity, characterUp);
        const current_vertical_velocity = characterUp.multiplyByFloats(vVel, vVel, vVel);
        const ground_velocity = GetJoltVec3(character.GetGroundVelocity(), this._groundVelocity);
        const gravity = GetJoltVec3(physicsSys.GetGravity(), this._gravity);
        const moving_towards_ground = (current_vertical_velocity.y - ground_velocity.y) < 0.1;
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
        this._new_velocity.addInPlace(gravity.multiplyByFloats(inDeltaTime, inDeltaTime, inDeltaTime).applyRotationQuaternion(upRotation));
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
export class JoltCharacterVirtual {
    constructor(data, shape) {
        this.data = data;
        this.shape = shape;
        this.config = new CharacterVirtualConfig();
        this._characterUp = new Vector3();
        this._temp1 = new Vector3();
        this._temp2 = new Vector3();
        this._JoltPhysicsCallback = { 'on-adjust-velocity': [], 'on-contact-add': [], 'on-contact-validate': [] };
    }
    init() {
        this.mDisposables = this.data.toDispose;
        this._jolt_temp1 = new Jolt.Vec3();
        this.mDisposables.push(this._jolt_temp1);
        this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();
        const settings = new Jolt.CharacterVirtualSettings();
        settings.mMass = 1000;
        settings.mMaxSlopeAngle = this.config.sMaxSlopeAngle;
        settings.mMaxStrength = this.config.sMaxStrength;
        settings.mShape = this.shape;
        settings.mCharacterPadding = this.config.sCharacterPadding;
        settings.mPenetrationRecoverySpeed = this.config.sPenetrationRecoverySpeed;
        settings.mPredictiveContactDistance = this.config.sPredictiveContactDistance;
        const mSupportingVolume = new Jolt.Plane(Jolt.Vec3.prototype.sAxisY(), -1);
        settings.mSupportingVolume = mSupportingVolume;
        Jolt.destroy(mSupportingVolume);
        this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.data.physicsSystem);
        Jolt.destroy(settings);
        this.mDisposables.push(this.mCharacter, this.mUpdateSettings);
        const objectVsBroadPhaseLayerFilter = this.data.jolt.GetObjectVsBroadPhaseLayerFilter();
        const objectLayerPairFilter = this.data.jolt.GetObjectLayerPairFilter();
        const filter = this.mUpdateFilterData = {
            movingBPFilter: new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, LAYER_MOVING),
            movingLayerFilter: new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, LAYER_MOVING),
            bodyFilter: new Jolt.BodyFilter(),
            shapeFilter: new Jolt.ShapeFilter()
        };
        this.mDisposables.push(filter.bodyFilter, filter.shapeFilter, filter.movingBPFilter, filter.movingLayerFilter);
    }
    prePhysicsUpdate(mDeltaTime) {
        GetJoltVec3(this.mCharacter.GetUp(), this._characterUp);
        if (!this.config.sEnableStickToFloor) {
            this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0);
        }
        else {
            const len = -this.mUpdateSettings.mStickToFloorStepDown.Length();
            const vec = this._temp1;
            this._temp2.set(len, len, len);
            this._characterUp.multiplyToRef(this._temp2, vec);
            SetJoltVec3(vec, this.mUpdateSettings.mStickToFloorStepDown);
        }
        if (!this.config.sEnableWalkStairs) {
            this.mUpdateSettings.mWalkStairsStepUp.Set(0, 0, 0);
        }
        else {
            const len = -this.mUpdateSettings.mWalkStairsStepUp.Length();
            const vec = this._temp1;
            this._temp2.set(len, len, len);
            this._characterUp.multiplyToRef(this._temp2, vec);
            SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
        }
        const gravLen = -this.data.physicsSystem.GetGravity().Length();
        this._temp2.set(gravLen, gravLen, gravLen);
        const g = this._characterUp.multiplyInPlace(this._temp2);
        if (this.inputHandler) {
            this.inputHandler.processCharacterData(this.mCharacter, this.data.physicsSystem, mDeltaTime, this._jolt_temp1);
            this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);
        }
        const inGravity = SetJoltVec3(g, this._jolt_temp1);
        const { movingBPFilter, movingLayerFilter, bodyFilter, shapeFilter } = this.mUpdateFilterData;
        this.mCharacter.ExtendedUpdate(mDeltaTime, inGravity, this.mUpdateSettings, movingBPFilter, movingLayerFilter, bodyFilter, shapeFilter, this.data.jolt.GetTempAllocator());
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
            this.contactListener.OnAdjustBodyVelocity = (_inCharacter, inBody2, lVelocity, aVelocity) => {
                inBody2 = Jolt.wrapPointer(inBody2, Jolt.Body);
                lVelocity = Jolt.wrapPointer(lVelocity, Jolt.Vec3);
                aVelocity = Jolt.wrapPointer(aVelocity, Jolt.Vec3);
                const impostor = this.data.GetPhysicsBodyForBodyId(inBody2.GetID().GetIndexAndSequenceNumber());
                GetJoltVec3(lVelocity, _lVelocity);
                GetJoltVec3(aVelocity, _aVelocity);
                this.onJoltCollide('on-adjust-velocity', { body: impostor, linearVelocity: _lVelocity, angularVelocity: _aVelocity });
                SetJoltVec3(_aVelocity, aVelocity);
                SetJoltVec3(_lVelocity, lVelocity);
            };
            this.contactListener.OnContactAdded = (_inCharacter, inBodyID2, _inSubShapeID2, _inContactPosition, _inContactNormal, _ioSettings) => {
                inBodyID2 = Jolt.wrapPointer(inBodyID2, Jolt.BodyID);
                const impostor = this.data.GetPhysicsBodyForBodyId(inBodyID2.GetIndexAndSequenceNumber());
                this.onJoltCollide('on-contact-add', { body: impostor });
            };
            this.contactListener.OnContactValidate = (_inCharacter, inBodyID2, _inSubShapeID2) => {
                inBodyID2 = Jolt.wrapPointer(inBodyID2, Jolt.BodyID);
                const impostor = this.data.GetPhysicsBodyForBodyId(inBodyID2.GetIndexAndSequenceNumber());
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
            console.warn('Function to remove was not found');
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
