import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GravityInterface } from "../gravity/types";
import Jolt from "../jolt-import";
import { GetJoltVec3, SetJoltQuat, SetJoltVec3 } from "../jolt-util";
import { CharacterState, GroundState } from "./type";

export interface CharacterVirtualInputHandler {
  up: Vector3;
  rotation: Quaternion;
  gravity?: GravityInterface;
  processCharacterData(character: Jolt.CharacterVirtual, physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, tmpVec3: Jolt.Vec3, tmpQuat: Jolt.Quat): void;
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

  public groundState: GroundState = GroundState.ON_GROUND;
  public userState: CharacterState = CharacterState.IDLE;

  updateInput(inMovementDirection: Vector3, inJump: boolean) {
    this.inMovementDirection.copyFrom(inMovementDirection);
    this.inJump = inJump;
  }

  private _new_velocity: Vector3 = new Vector3();

  public autoUp = true;
  public up: Vector3 = new Vector3(0, 1, 0);
  public rotation: Quaternion = Quaternion.Identity();
  public gravity?: GravityInterface;

  private _linVelocity: Vector3 = new Vector3();
  private _groundVelocity: Vector3 = new Vector3();

  processCharacterData(character: Jolt.CharacterVirtual, _physicsSys: Jolt.PhysicsSystem, gravity: Vector3, inDeltaTime: number, _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat) {

    const player_controls_horizontal_velocity = this.controlMovementDuringJump || character.IsSupported();
    if (player_controls_horizontal_velocity) {
      // True if the player intended to move
      this.allowSliding = !(this.inMovementDirection.length() < 1.0e-12);
      // Smooth the player input
      if (this.enableCharacterInertia) {
        const s = 0.25 * this.characterSpeed;
        this.mDesiredVelocity = this.mDesiredVelocity.multiplyByFloats(0.75, 0.75, 0.75).add(this.inMovementDirection.multiplyByFloats(s, s, s))
      } else {
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
      } else {
        this.userState = CharacterState.MOVING;
      }
    } else {
      if (moving_towards_ground) {
        this.groundState = GroundState.FALLING;
      } else {
        this.groundState = GroundState.RISING;
      }
    }
    if (groundState == Jolt.EGroundState_OnGround	// If on ground
      && (this.enableCharacterInertia ?
        moving_towards_ground													// Inertia enabled: And not moving away from ground
        : !character.IsSlopeTooSteep(character.GetGroundNormal())))			// Inertia disabled: And not on a slope that is too steep
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

  updateCharacter(character: Jolt.CharacterVirtual, tempVec: Jolt.Vec3): void {
    SetJoltVec3(this._new_velocity, tempVec);
    character.SetLinearVelocity(tempVec);
  }
}