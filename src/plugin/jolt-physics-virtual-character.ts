import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import Jolt from './jolt-import';

const JPH_PI = 3.14159265358979323846;
const DegreesToRadians = (deg: number) => deg * (JPH_PI / 180.0);

export class JoltCharacterVirtualImpostor extends PhysicsImpostor {


  public sControlMovementDuringJump = true;
  public sCharacterSpeed = 6.0;
  public sJumpSpeed = 15.0;

  public sEnableCharacterInertia = true;

  public sUpRotationX = 0;
  public sUpRotationZ = 0;
  public sMaxSlopeAngle = DegreesToRadians(45.0);
  public sMaxStrength = 100.0;
  public sCharacterPadding = 0.02;
  public sPenetrationRecoverySpeed = 1.0;
  public sPredictiveContactDistance = 0.1;
  public sEnableWalkStairs = true;
  public sEnableStickToFloor = true;


  constructor(
    object: IPhysicsEnabledObject,
    type: number,
    _options: PhysicsImpostorParameters,
    _scene?: Scene
  ) {
    super(object, type, _options, _scene);

  }
  public get controller(): JoltVirtualCharacter {
    return this._pluginData.controller;
  }
  public set controller(controller: JoltVirtualCharacter) {
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

export const wrapVec3 = (joltVec3: Jolt.Vec3, vector3: Vector3) => vector3.set(joltVec3.GetX(), joltVec3.GetY(), joltVec3.GetZ());
export const wrapQuat = (q: Jolt.Quat) => new Quaternion(q.GetX(), q.GetY(), q.GetZ(), q.GetW());

export class JoltVirtualCharacter {
  private mCharacter: Jolt.CharacterVirtual;
  private mDisposables: any[];

  private mUpdateSettings: Jolt.ExtendedUpdateSettings;
  private mUpdateFilterData: UpdateFiltersData;

  // @ts-ignore: Unused
  private mDesiredVelocity: Vector3 = new Vector3();

  private _jolt_temp1: Jolt.Vec3;
  constructor(private impostor: JoltCharacterVirtualImpostor, private shape: Jolt.Shape, private world: WorldData) {
    this.mDisposables = impostor._pluginData.toDispose;


    this.mUpdateSettings = new Jolt.ExtendedUpdateSettings();

    const settings = new Jolt.CharacterVirtualSettings();
    settings.mMass = 1000;
    settings.mMaxSlopeAngle = this.impostor.sMaxSlopeAngle;
    settings.mMaxStrength = this.impostor.sMaxStrength;
    settings.mShape = this.shape;
    settings.mCharacterPadding = this.impostor.sCharacterPadding;
    settings.mPenetrationRecoverySpeed = this.impostor.sPenetrationRecoverySpeed;
    settings.mPredictiveContactDistance = this.impostor.sPredictiveContactDistance;
    settings.mSupportingVolume = new Jolt.Plane(Jolt.Vec3.sAxisY(), -1);

    this.mCharacter = new Jolt.CharacterVirtual(settings, Jolt.Vec3.sZero(), Jolt.Quat.sIdentity(), this.world.physicsSystem);
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

    this._jolt_temp1 = new Jolt.Vec3();
    this.mDisposables.push(this._jolt_temp1);
  }

  private _characterUp: Vector3 = new Vector3();
  private _temp1: Vector3 = new Vector3();
  private _temp2: Vector3 = new Vector3();
  prePhysicsUpdate(mDeltaTime: number) {
    wrapVec3(this.mCharacter.GetUp(), this._characterUp);
    if (!this.impostor.sEnableStickToFloor) {
      this.mUpdateSettings.mStickToFloorStepDown.Set(0, 0, 0)
    }
    else {
      const len = -this.mUpdateSettings.mStickToFloorStepDown.Length();
      const vec = this._temp1;
      const scalar = this._temp2.set(len, len, len);
      this._characterUp.multiplyToRef(scalar, vec);
      this.mUpdateSettings.mStickToFloorStepDown.Set(vec.x, vec.y, vec.z);
    }

    if (!this.impostor.sEnableWalkStairs) {
      this.mUpdateSettings.mWalkStairsStepUp.Set(0, 0, 0);
    }
    else {
      const len = -this.mUpdateSettings.mWalkStairsStepUp.Length();
      const vec = this._temp1;
      const scalar = this._temp2.set(len, len, len);
      this._characterUp.multiplyToRef(scalar, vec);
      this.mUpdateSettings.mWalkStairsStepUp.Set(vec.x, vec.y, vec.z);
    }
    const gravLen = -this.world.physicsSystem.GetGravity().Length();
    const scalar = this._temp2.set(gravLen, gravLen, gravLen);
    const g = this._characterUp.multiplyInPlace(scalar);
    const inGravity = this._jolt_temp1;
    inGravity.Set(g.x, g.y, g.z);
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

  mAllowSliding = false;
  /*
  handleInput = (inMovementDirection: Vector3 , inJump: boolean, inSwitchStance, inDeltaTime: number) => {
		const player_controls_horizontal_velocity = this.impostor.sControlMovementDuringJump || this.mCharacter.IsSupported();
		if (player_controls_horizontal_velocity) {
			// True if the player intended to move
			this.mAllowSliding = !(inMovementDirection.length() < 1.0e-12);
			// Smooth the player input
			if (sEnableCharacterInertia) {
				mDesiredVelocity.multiplyScalar(0.75).add(inMovementDirection.multiplyScalar(0.25 * sCharacterSpeed))
			} else {
				mDesiredVelocity.copy(inMovementDirection).multiplyScalar(sCharacterSpeed);
			}
		}
		else {
			// While in air we allow sliding
			mAllowSliding = true;
		}
		const character_up_rotation = Jolt.Quat.prototype.sEulerAngles(new Jolt.Vec3(sUpRotationX, 0, sUpRotationZ));
		mCharacter.SetUp(character_up_rotation.RotateAxisY());
		mCharacter.SetRotation(character_up_rotation);
		const upRotation = wrapQuat(character_up_rotation);

		mCharacter.UpdateGroundVelocity();
		const characterUp = wrapVec3(mCharacter.GetUp());
		const linearVelocity = wrapVec3(mCharacter.GetLinearVelocity());
		const current_vertical_velocity = characterUp.clone().multiplyScalar(linearVelocity.dot(characterUp));
		const ground_velocity = wrapVec3(mCharacter.GetGroundVelocity());
		const gravity = wrapVec3(physicsSystem.GetGravity());

		let new_velocity;
		const moving_towards_ground = (current_vertical_velocity.y - ground_velocity.y) < 0.1;
		if (mCharacter.GetGroundState() == Jolt.OnGround	// If on ground
			&& (sEnableCharacterInertia ?
				moving_towards_ground													// Inertia enabled: And not moving away from ground
				: !mCharacter.IsSlopeTooSteep(mCharacter.GetGroundNormal())))			// Inertia disabled: And not on a slope that is too steep
		{
			// Assume velocity of ground when on ground
			new_velocity = ground_velocity;

			// Jump
			if (inJump && moving_towards_ground)
				new_velocity.add(characterUp.multiplyScalar(sJumpSpeed));
		}
		else
			new_velocity = current_vertical_velocity.clone();


		// Gravity
		new_velocity.add(gravity.multiplyScalar(inDeltaTime).applyQuaternion(upRotation));

		if (player_controls_horizontal_velocity) {
			// Player input
			new_velocity.add(mDesiredVelocity.clone().applyQuaternion(upRotation));
		}
		else {
			// Preserve horizontal velocity
			const current_horizontal_velocity = linearVelocity.sub(current_vertical_velocity);
			new_velocity.add(current_horizontal_velocity);
		}

		mCharacter.SetLinearVelocity(new Jolt.Vec3(new_velocity.x, new_velocity.y, new_velocity.z));
	}
  */

  getCharacter(): Jolt.CharacterVirtual {
    return this.mCharacter;
  }
}