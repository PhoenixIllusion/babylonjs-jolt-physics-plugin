import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import Jolt from './jolt-import';
import { GetJoltQuat, GetJoltVec3, SetJoltVec3 } from './jolt-util';


class CharacterVirtualConfig {
  public sMaxSlopeAngle = 45.0 * (Math.PI / 180.0);
  public sMaxStrength = 100.0;
  public sCharacterPadding = 0.02;
  public sPenetrationRecoverySpeed = 1.0;
  public sPredictiveContactDistance = 0.1;
  public sEnableWalkStairs = true;
  public sEnableStickToFloor = true;
}


export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
  constructor(
    object: IPhysicsEnabledObject,
    type: number,
    _options: PhysicsImpostorParameters,
    _scene?: Scene
  ) {
    super(object, type, _options, _scene);

  }
  public get controller(): JoltCharacterVirtual {
    return this._pluginData.controller;
  }
  public set controller(controller: JoltCharacterVirtual) {
    this._pluginData.controller = controller;
  }
}

interface WorldData {
  jolt: Jolt.JoltInterface,
  physicsSystem: Jolt.PhysicsSystem
}

interface UpdateFiltersData {
  movingBPFilter: Jolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: Jolt.DefaultObjectLayerFilter;
  bodyFilter: Jolt.BodyFilter;
  shapeFilter: Jolt.ShapeFilter
}

export interface CharacterVirtualInputHandler {
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number): void;
  updateCharacter(character: Jolt.CharacterVirtual, tmp: Jolt.Vec3): void;
}

export class StandardCharacterVirtualHandler implements CharacterVirtualInputHandler {
  private mDesiredVelocity: Vector3 = new Vector3();
  private inMovementDirection: Vector3 = new Vector3();
  private inJump = false;

  public allowSliding = false;

  public controlMovementDuringJump = true;
  public characterSpeed = 6.0;
  public jumpSpeed = 15.0;

  public enableCharacterInertia = true;

  public upRotationX = 0;
  public upRotationZ = 0;


  updateInput(inMovementDirection: Vector3 , inJump: boolean) {
    this.inMovementDirection.copyFrom(inMovementDirection);
    this.inJump = inJump;
  }

  private _new_velocity: Vector3 = new Vector3();

  private _charUpRot: Quaternion = new Quaternion();
  private _charUp: Vector3 = new Vector3();
  private _linVelocity: Vector3 = new Vector3();
  private _groundVelocity: Vector3 = new Vector3();
  private _gravity: Vector3 = new Vector3();
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, inDeltaTime: number) {

		const player_controls_horizontal_velocity = this.controlMovementDuringJump || character.IsSupported();
		if (player_controls_horizontal_velocity) {
			// True if the player intended to move
			this.allowSliding = !(this.inMovementDirection.length() < 1.0e-12);
			// Smooth the player input
			if (this.enableCharacterInertia) {
        const s = 0.25 * this.characterSpeed;
				this.mDesiredVelocity = this.mDesiredVelocity.multiplyByFloats(0.75,0.75,0.75).add(this.inMovementDirection.multiplyByFloats(s,s,s))
			} else {
        const s = this.characterSpeed;
				this.mDesiredVelocity = this.inMovementDirection.multiplyByFloats(s,s,s);
			}
		}
		else {
			// While in air we allow sliding
			this.allowSliding = true;
		}
		const character_up_rotation = Jolt.Quat.prototype.sEulerAngles(new Jolt.Vec3(this.upRotationX, 0, this.upRotationZ));
		character.SetUp(character_up_rotation.RotateAxisY());
		character.SetRotation(character_up_rotation);
		const upRotation = GetJoltQuat(character_up_rotation, this._charUpRot);

		character.UpdateGroundVelocity();
		const characterUp = GetJoltVec3(character.GetUp(), this._charUp);
		const linearVelocity = GetJoltVec3(character.GetLinearVelocity(), this._linVelocity);
    const vVel = Vector3.Dot(linearVelocity, characterUp);
		const current_vertical_velocity = characterUp.multiplyByFloats(vVel,vVel,vVel);
		const ground_velocity = GetJoltVec3(character.GetGroundVelocity(), this._groundVelocity);
		const gravity = GetJoltVec3(physicsSys.GetGravity(), this._gravity);

		const moving_towards_ground = (current_vertical_velocity.y - ground_velocity.y) < 0.1;
		if (character.GetGroundState() == Jolt.OnGround	// If on ground
			&& (this.enableCharacterInertia ?
				moving_towards_ground													// Inertia enabled: And not moving away from ground
				: !character.IsSlopeTooSteep(character.GetGroundNormal())))			// Inertia disabled: And not on a slope that is too steep
		{
			// Assume velocity of ground when on ground
			this._new_velocity.copyFrom(ground_velocity);

			// Jump
			if (this.inJump && moving_towards_ground)
      this._new_velocity.addInPlace(characterUp.multiplyByFloats(this.jumpSpeed,this.jumpSpeed,this.jumpSpeed));
		}
		else
      this._new_velocity.copyFrom(current_vertical_velocity);


		// Gravity
		this._new_velocity.addInPlace(gravity.multiplyByFloats(inDeltaTime,inDeltaTime,inDeltaTime).applyRotationQuaternion(upRotation));

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

  updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void {
    SetJoltVec3(this._new_velocity, tempVec);
    character.SetLinearVelocity(tempVec);
  }
}


export class JoltCharacterVirtual {
  private mCharacter!: Jolt.CharacterVirtual;
  private mDisposables!: any[];

  private mUpdateSettings!: Jolt.ExtendedUpdateSettings;
  private mUpdateFilterData!: UpdateFiltersData;

  public inputHandler?: CharacterVirtualInputHandler;

  public config = new CharacterVirtualConfig();

  private _jolt_temp1!: Jolt.Vec3;
  constructor(private impostor: JoltCharacterVirtualImpostor, private shape: Jolt.Shape, private world: WorldData) {
  }
  init(): void {
    const world = this.world;
    const impostor = this.impostor;
    this.mDisposables = impostor._pluginData.toDispose;

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
    settings.mSupportingVolume = new Jolt.Plane(Jolt.Vec3.prototype.sAxisY(), -1);

    this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.prototype.sZero(), Jolt.Quat.prototype.sIdentity(), this.world.physicsSystem);
    this.mDisposables.push(this.mCharacter, this.mUpdateSettings, settings);


    const objectVsBroadPhaseLayerFilter = world.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = world.jolt.GetObjectLayerPairFilter();
    const filter = this.mUpdateFilterData = {
      movingBPFilter: new Jolt.DefaultBroadPhaseLayerFilter(objectVsBroadPhaseLayerFilter, Jolt.MOVING),
      movingLayerFilter: new Jolt.DefaultObjectLayerFilter(objectLayerPairFilter, Jolt.MOVING),
      bodyFilter: new Jolt.BodyFilter(),
      shapeFilter: new Jolt.ShapeFilter()
    };
    this.mDisposables.push(filter.bodyFilter, filter.shapeFilter, filter.movingBPFilter, filter.movingLayerFilter);

  }

  private _characterUp: Vector3 = new Vector3();
  private _temp1: Vector3 = new Vector3();
  private _temp2: Vector3 = new Vector3();
  
  prePhysicsUpdate(mDeltaTime: number) {
    GetJoltVec3(this.mCharacter.GetUp(), this._characterUp);
    if (!this.config.sEnableStickToFloor) {
      this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0)
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
      this._characterUp.multiplyToRef( this._temp2, vec);
      SetJoltVec3(vec, this.mUpdateSettings.mWalkStairsStepUp);
    }
    const gravLen = -this.world.physicsSystem.GetGravity().Length();
    this._temp2.set(gravLen, gravLen, gravLen);
    const g = this._characterUp.multiplyInPlace(this._temp2);

    if(this.inputHandler) {
      this.inputHandler.processCharacterData(this.mCharacter, this.world.physicsSystem, mDeltaTime);
      this.inputHandler.updateCharacter(this.mCharacter, this._jolt_temp1);
    }

    const inGravity =  SetJoltVec3(g,  this._jolt_temp1);
    
    const {
      movingBPFilter,
      movingLayerFilter,
      bodyFilter,
      shapeFilter } = this.mUpdateFilterData;
    this.mCharacter.ExtendedUpdate(mDeltaTime,
      inGravity,
      this.mUpdateSettings,
      movingBPFilter,
      movingLayerFilter,
      bodyFilter,
      shapeFilter,
      this.world.jolt.GetTempAllocator());
  }

  getCharacter(): Jolt.CharacterVirtual {
    return this.mCharacter;
  }
}