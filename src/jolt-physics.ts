
import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from '@babylonjs/core/Physics/v1/IPhysicsEnginePlugin';
import { JoltCharacterVirtualImpostor, JoltCharacterVirtual } from './jolt-physics-character-virtual';
import Jolt, { loadJolt } from './jolt-import';
import { ContactCollector } from './jolt-contact';
import { RayCastUtility } from './jolt-raycast';
import { SetJoltVec3 } from './jolt-util';
import { Epsilon, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { IPhysicsEnabledObject, PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Logger } from '@babylonjs/core/Misc/logger';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { IMotorEnabledJoint, MotorEnabledJoint, PhysicsJoint, PhysicsJointData } from '@babylonjs/core/Physics/v1/physicsJoint';
import { IndicesArray, Nullable } from '@babylonjs/core/types';
import { PhysicsRaycastResult } from '@babylonjs/core/Physics/physicsRaycastResult';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

interface MeshVertexData {
  indices: IndicesArray | number[];
  vertices: Float32Array | number[];
  faceCount: number;
}

interface PossibleMotors {
  SetMotorState(state: Jolt.EMotorState): void;
  SetTargetAngularVelocity(val: number): void;
  SetTargetAngle(val: number): void;
  SetTargetVelocity(val: number): void;
  SetTargetPosition(val: number): void;
}

export const enum Jolt_Type {
  CHARACTER = 200,
  VIRTUAL_CHARACTER = 201,
}


export class JoltJSPlugin implements IPhysicsEnginePlugin {
  public world: Jolt.PhysicsSystem;
  public name = 'JoltJSPlugin';

  private _timeStep: number = 1 / 60;
  private _fixedTimeStep: number = 1 / 60;
  private _maxSteps = 10;

  private _tempVec3A: Jolt.Vec3;
  private _tempVec3B: Jolt.Vec3;

  private _tempQuaternion: Jolt.Quat;
  private _tempQuaternionBJS = new Quaternion();
  private _bodyInterface: Jolt.BodyInterface;

  private _raycaster: RayCastUtility;

  private _contactCollector: ContactCollector;
  private _contactListener: Jolt.ContactListenerJS;

  private _impostorLookup: Record<number, PhysicsImpostor> = {};


  static async loadPlugin(_useDeltaForWorldStep: boolean = true, physicsSettings?: any, importSettings?: any): Promise<JoltJSPlugin> {
    await loadJolt(importSettings);
    const settings = new Jolt.JoltSettings();
    Object.assign(settings, physicsSettings);
    const joltInterface = new Jolt.JoltInterface(settings);
    return new JoltJSPlugin(joltInterface, _useDeltaForWorldStep);
  }

  constructor(private jolt: Jolt.JoltInterface, private _useDeltaForWorldStep: boolean = true) {
    this.world = jolt.GetPhysicsSystem();
    this._bodyInterface = this.world.GetBodyInterface();
    this._tempVec3A = new Jolt.Vec3();
    this._tempVec3B = new Jolt.Vec3();
    this._tempQuaternion = new Jolt.Quat();
    this._raycaster = new RayCastUtility(jolt);
    this._contactListener = new Jolt.ContactListenerJS();
    this._contactCollector = new ContactCollector(this._contactListener);
    this.world.SetContactListener(this._contactListener);

  }

  setGravity(gravity: Vector3): void {
    this._tempVec3A.Set(gravity.x, gravity.y, gravity.z);
    this.world.SetGravity(this._tempVec3A);
  }

  public setTimeStep(timeStep: number) {
    this._timeStep = timeStep;
  }

  /**
   * Increment to step forward in the physics engine (If timeStep is set to 1/60 and fixedTimeStep is set to 1/120 the physics engine should run 2 steps per frame) (Default: 1/60)
   * @param fixedTimeStep fixedTimeStep to use in seconds
   */
  public setFixedTimeStep(fixedTimeStep: number) {
    this._fixedTimeStep = fixedTimeStep;
  }

  /**
   * Sets the maximum number of steps by the physics engine per frame (Default: 5)
   * @param maxSteps the maximum number of steps by the physics engine per frame
   */
  public setMaxSteps(maxSteps: number) {
    this._maxSteps = maxSteps;
  }

  /**
   * Gets the current timestep (only used if useDeltaForWorldStep is false in the constructor)
   * @returns the current timestep in seconds
   */
  public getTimeStep(): number {
    return this._timeStep;
  }

  executeStep(delta: number, impostors: PhysicsImpostor[]): void {
    this._contactCollector.clear();
    const characterVirtuals: JoltCharacterVirtualImpostor[] = [];
    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft) {
        impostor.beforeStep();
      }
      if (impostor.physicsBody instanceof Jolt.Body) {
        const body: Jolt.Body = impostor.physicsBody;
        const bodyID = body.GetID().GetIndexAndSequenceNumber();
        this._contactCollector.registerImpostor(bodyID, impostor);
      }
      if (impostor instanceof JoltCharacterVirtualImpostor) {
        characterVirtuals.push(impostor as JoltCharacterVirtualImpostor);
      }
    }

    this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep,
      (timeStep) => {
        characterVirtuals.forEach(vChar => vChar.controller?.prePhysicsUpdate(timeStep));
      });

    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft) {
        impostor.afterStep();
      }
    }
  }

  // Ammo's behavior when maxSteps > 0 does not behave as described in docs
  // @see http://www.bulletphysics.org/mediawiki-1.5.8/index.php/Stepping_The_World
  //
  // When maxSteps is 0 do the entire simulation in one step
  // When maxSteps is > 0, run up to maxStep times, if on the last step the (remaining step - fixedTimeStep) is < fixedTimeStep, the remainder will be used for the step. (eg. if remainder is 1.001 and fixedTimeStep is 1 the last step will be 1.001, if instead it did 2 steps (1, 0.001) issues occuered when having a tiny step in ammo)
  // Note: To get deterministic physics, timeStep would always need to be divisible by fixedTimeStep
  private _stepSimulation(timeStep: number = 1 / 60, maxSteps: number = 10, fixedTimeStep: number = 1 / 60, perStep: (timeStep: number) => void) {
    if (maxSteps == 0) {
      perStep(timeStep);
      this.jolt.Step(timeStep, 1);
    } else {
      while (maxSteps > 0 && timeStep > 0) {
        if (timeStep - fixedTimeStep < fixedTimeStep) {
          perStep(timeStep);
          this.jolt.Step(timeStep, 1);
          timeStep = 0;
        } else {
          timeStep -= fixedTimeStep;
          perStep(fixedTimeStep);
          this.jolt.Step(fixedTimeStep, 1);
        }
        maxSteps--;
      }
    }
  }

  getPluginVersion(): number {
    return 1;
  }

  applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;

      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      SetJoltVec3(force, impulse)
      SetJoltVec3(contactPoint, worldPoint)

      physicsBody.AddImpulse(impulse, worldPoint);
    } else {
      Logger.Warn('Cannot be applied to a soft body');
    }

  }

  applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;
      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      SetJoltVec3(force, impulse)
      SetJoltVec3(contactPoint, worldPoint)
      physicsBody.AddForce(impulse, worldPoint);
    } else {
      Logger.Warn('Cannot be applied to a soft body');
    }
  }

  generatePhysicsBody(impostor: PhysicsImpostor): void {
    impostor._pluginData.toDispose = [];

    //parent-child relationship
    if (impostor.parent) {
      if (impostor.physicsBody) {
        this.removePhysicsBody(impostor);
        impostor.forceUpdate();
      }
      return;
    }
    if (impostor.isBodyInitRequired()) {
      if (impostor instanceof JoltCharacterVirtualImpostor) {
        const imp = impostor as JoltCharacterVirtualImpostor;
        const shape = this._createShape(imp);
        const char = new JoltCharacterVirtual(imp, shape, { physicsSystem: this.world, jolt: this.jolt }, this);
        char.init();
        imp.physicsBody = char.getCharacter();
        imp._pluginData.controller = char;
        return;
      }
      const colShape = this._createShape(impostor);
      const mass = impostor.getParam('mass');
      const friction = impostor.getParam('friction');
      const restitution = impostor.getParam('restitution');
      const collisionGroup: number = impostor.getParam('collision-group');
      const collisionSubGroup: number = impostor.getParam('collision-sub-group');
      const collisionFilter: Jolt.GroupFilter = impostor.getParam('collision-filter');

      impostor.object.computeWorldMatrix(true);
      SetJoltVec3(impostor.object.position, this._tempVec3A);
      this._tempQuaternion.Set(
        impostor.object.rotationQuaternion!.x,
        impostor.object.rotationQuaternion!.y,
        impostor.object.rotationQuaternion!.z,
        impostor.object.rotationQuaternion!.w
      );
      const isStatic = (mass === 0) ? Jolt.Static : Jolt.Dynamic;
      const layer = (mass === 0) ? Jolt.NON_MOVING : Jolt.MOVING;
      const settings = new Jolt.BodyCreationSettings(colShape, this._tempVec3A, this._tempQuaternion, isStatic, layer);
      if (collisionGroup !== undefined) {
        settings.mCollisionGroup.SetGroupID(collisionGroup);
      }
      if (collisionSubGroup !== undefined) {
        settings.mCollisionGroup.SetSubGroupID(collisionGroup);
      }
      if (collisionFilter !== undefined) {
        settings.mCollisionGroup.SetGroupFilter(collisionFilter);
      }
      impostor._pluginData.mass = mass;
      impostor._pluginData.friction = friction;
      impostor._pluginData.restitution = restitution;
      settings.mRestitution = restitution;
      settings.mFriction = friction;
      if (mass !== 0) {
        settings.mOverrideMassProperties = Jolt.CalculateInertia;
        settings.mMassPropertiesOverride.mMass = mass;
      }
      const body = impostor.physicsBody = this._bodyInterface.CreateBody(settings);
      this._bodyInterface.AddBody(body.GetID(), Jolt.Activate);
      this._impostorLookup[body.GetID().GetIndexAndSequenceNumber()] = impostor;
    }
  }

  public GetImpostorForBodyId(id: number) {
    return this._impostorLookup[id];
  }

  /**
  * Removes the physics body from the imposter and disposes of the body's memory
  * @param impostor imposter to remove the physics body from
  */
  public removePhysicsBody(impostor: PhysicsImpostor) {
    if (this.world) {
      delete this._impostorLookup[impostor.physicsBody.GetID().GetIndexAndSequenceNumber()];
      this._bodyInterface.RemoveBody(impostor.physicsBody.GetID());
      this._bodyInterface.DestroyBody(impostor.physicsBody.GetID());


      if (impostor._pluginData) {
        impostor._pluginData.toDispose.forEach((d: any) => {
          Jolt.destroy(d);
        });
        impostor._pluginData.toDispose = [];
      }
    }
  }

  private _getMeshVertexData(impostor: PhysicsImpostor): MeshVertexData {
    const object = (impostor.getParam('mesh') as IPhysicsEnabledObject)||impostor.object;
    const rawVerts = object.getVerticesData ? object.getVerticesData(VertexBuffer.PositionKind) : [];
    const indices = (object.getIndices && object.getIndices()) ? object.getIndices()! : [];
    if (!rawVerts) {
      throw new Error('Tried to create a MeshImpostor for an object without vertices. This will fail.');
    }
    // get only scale! so the object could transform correctly.
    const oldPosition = object.position.clone();
    const oldRotation = object.rotation && object.rotation.clone();
    const oldQuaternion = object.rotationQuaternion && object.rotationQuaternion.clone();
    object.position.copyFromFloats(0, 0, 0);
    object.rotation && object.rotation.copyFromFloats(0, 0, 0);
    object.rotationQuaternion && object.rotationQuaternion.copyFrom(impostor.getParentsRotation());

    object.rotationQuaternion && object.parent && object.rotationQuaternion.conjugateInPlace();

    const transform = object.computeWorldMatrix(true);
    // convert rawVerts to object space
    const transformedVertices = new Array<number>();
    let index: number;
    for (index = 0; index < rawVerts.length; index += 3) {
      Vector3.TransformCoordinates(Vector3.FromArray(rawVerts, index), transform).toArray(transformedVertices, index);
    }

    //now set back the transformation!
    object.position.copyFrom(oldPosition);
    oldRotation && object.rotation && object.rotation.copyFrom(oldRotation);
    oldQuaternion && object.rotationQuaternion && object.rotationQuaternion.copyFrom(oldQuaternion);


    const hasIndex = (indices.length > 0)
    const faceCount = hasIndex ? indices.length / 3 : transformedVertices.length / 9;

    return {
      indices,
      vertices: transformedVertices,
      faceCount
    }
  }

  private _createShape(impostor: PhysicsImpostor): Jolt.Shape {
    const impostorExtents = impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
    const checkWithEpsilon = (value: number): number => {
      return Math.max(value, Epsilon);
    };
    let returnValue: Jolt.Shape | undefined = undefined;
    switch (impostor.type) {
      case PhysicsImpostor.SphereImpostor:
        const radiusX = impostorExtents.x;
        const radiusY = impostorExtents.y;
        const radiusZ = impostorExtents.z;
        const size = Math.max(checkWithEpsilon(radiusX), checkWithEpsilon(radiusY), checkWithEpsilon(radiusZ)) / 2;
        returnValue = new Jolt.SphereShape(size, new Jolt.PhysicsMaterial())
        break;
      case PhysicsImpostor.CapsuleImpostor:
        //if(impostor.getParam('radiusTop') && impostor.getParam('radiusBottom')) {
        //  const radiusTop: number = impostor.getParam('radiusTop');
        //  const radiusBottom: number = impostor.getParam('radiusBottom');
        //  const capRadius = impostorExtents.x / 2;
        //  returnValue = new Jolt.TaperedCapsuleShapeSettings(impostorExtents.y / 2 - capRadius, radiusTop, radiusBottom, new Jolt.PhysicsMaterial()).Create().Get();
        //} else {
        const capRadius = impostorExtents.x / 2;
        returnValue = new Jolt.CapsuleShape(impostorExtents.y / 2 - capRadius, capRadius);
        //}
        break;
      case PhysicsImpostor.CylinderImpostor:
        returnValue = new Jolt.CylinderShapeSettings(0.5 * impostorExtents.y, 0.5 * impostorExtents.x).Create().Get();
        break;
      case PhysicsImpostor.PlaneImpostor:
      case PhysicsImpostor.BoxImpostor:
        this._tempVec3A.Set(impostorExtents.x / 2, impostorExtents.y / 2, impostorExtents.z / 2);
        returnValue = new Jolt.BoxShape(this._tempVec3A);
        break;
      case PhysicsImpostor.MeshImpostor: {
        // should transform the vertex data to world coordinates!!
        const vertexData = this._getMeshVertexData(impostor);
        const hasIndex = vertexData.indices.length > 0;
        const triangles = new Jolt.TriangleList();
        triangles.resize(vertexData.faceCount);
        for (let i = 0; i < vertexData.faceCount; i++) {
          const t = triangles.at(i);
          [0, 2, 1].forEach((j, k) => {
            const offset = i * 3 + j;
            const index = (hasIndex ? vertexData.indices[offset] : offset * 3) * 3;
            const v = t.get_mV(k)
            v.x = vertexData.vertices[index + 0];
            v.y = vertexData.vertices[index + 1];
            v.z = vertexData.vertices[index + 2];
          });
        }
        returnValue = new Jolt.MeshShapeSettings(triangles, new Jolt.PhysicsMaterialList).Create().Get();
      }
        break;
      case PhysicsImpostor.ConvexHullImpostor:
        const vertexData = this._getMeshVertexData(impostor);
        const hasIndex = vertexData.indices.length > 0;
        const hull = new Jolt.ConvexHullShapeSettings;
        for (let i = 0; i < vertexData.faceCount; i++) {
          for (let j = 0; j < 3; j++) {
            const offset = i * 3 + j;
            const index = (hasIndex ? vertexData.indices[offset] : offset * 3) * 3;
            const x = vertexData.vertices[index + 0];
            const y = vertexData.vertices[index + 1];
            const z = vertexData.vertices[index + 2];
            hull.mPoints.push_back(new Jolt.Vec3(x, y, z));
          }
        }
        returnValue = hull.Create().Get();
        break;
    }
    if (returnValue === undefined) {
      throw new Error('Unsupported Shape: ' + impostor.type);
    }
    return returnValue;
  }

  generateJoint(impostorJoint: PhysicsImpostorJoint): void {
    const mainBody: Jolt.Body = impostorJoint.mainImpostor.physicsBody;
    const connectedBody: Jolt.Body = impostorJoint.connectedImpostor.physicsBody;
    if (!mainBody || !connectedBody) {
      return;
    }

    const jointData = impostorJoint.joint.jointData;
    if (!jointData.mainPivot) {
      jointData.mainPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedPivot) {
      jointData.connectedPivot = new Vector3(0, 0, 0);
    }
    if (!jointData.mainAxis) {
      jointData.mainAxis = new Vector3(0, 0, 0);
    }
    if (!jointData.connectedAxis) {
      jointData.connectedAxis = new Vector3(0, 0, 0);
    }
    const options = jointData.nativeParams || {};

    const setIfAvailable = <T extends Jolt.ConstraintSettings>(setting: T, k: keyof T, key: any) => {
      if (options[key] !== undefined) {
        setting[k] = options[key];
      }
    }

    const setPoints = (constraintSettings: { mPoint1: Jolt.Vec3, mPoint2: Jolt.Vec3 }) => {
      constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
      constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    }
    const setHindgeAxis = (constraintSettings: { mHingeAxis1: Jolt.Vec3, mHingeAxis2: Jolt.Vec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setSliderAxis = (constraintSettings: { mSliderAxis1: Jolt.Vec3, mSliderAxis2: Jolt.Vec3 }) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setNormalAxis = (constraintSettings: { mNormalAxis1: Jolt.Vec3, mNormalAxis2: Jolt.Vec3 }) => {
      if (options['normal-axis-1'] && options['normal-axis-2']) {
        const n1: Vector3 = options['normal-axis-1'];
        const n2: Vector3 = options['normal-axis-2'];
        constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
        constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
      }
    }

    const p1 = jointData.mainPivot;
    const p2 = jointData.connectedPivot;
    let constraint: Jolt.Constraint | undefined = undefined;
    switch (impostorJoint.joint.type) {
      case PhysicsJoint.DistanceJoint: {
        let constraintSettings = new Jolt.DistanceConstraintSettings();
        setPoints(constraintSettings);
        setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
        setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.DistanceConstraint);
      }
        break;
      case PhysicsJoint.HingeJoint: {
        let constraintSettings = new Jolt.HingeConstraintSettings();
        setPoints(constraintSettings);
        setHindgeAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.HingeConstraint);
      }
        break;
      case PhysicsJoint.SliderJoint: {
        let constraintSettings = new Jolt.SliderConstraintSettings();
        setPoints(constraintSettings);
        setSliderAxis(constraintSettings);
        setNormalAxis(constraintSettings);
        setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
        setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
        constraint = constraintSettings.Create(mainBody, connectedBody);
        constraint = Jolt.castObject(constraint, Jolt.SliderConstraint);
      }
        break;
    }
    if (constraint) {
      impostorJoint.mainImpostor._pluginData.toDispose.push(constraint);
      this.world.AddConstraint(constraint);
      impostorJoint.joint.physicsJoint = constraint;
      impostorJoint.joint.jointData.nativeParams.body1 = mainBody;
      impostorJoint.joint.jointData.nativeParams.body2 = connectedBody;
    }

  }

  removeJoint(impostorJoint: PhysicsImpostorJoint): void {
    if (this.world) {
      this.world.RemoveConstraint(impostorJoint.joint.physicsJoint);
    }
  }
  /**
   * If this plugin is supported
   * @returns true if its supported
   */
  public isSupported(): boolean {
    return Jolt !== undefined;
  }

  setTransformationFromPhysicsBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;

    const position = physicsBody.GetPosition();
    impostor.object.position.set(position.GetX(), position.GetY(), position.GetZ());
    const quat = physicsBody.GetRotation();
    this._tempQuaternionBJS.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());

    if (!impostor.object.rotationQuaternion) {
      if (impostor.object.rotation) {
        this._tempQuaternionBJS.toEulerAnglesToRef(impostor.object.rotation);
      }
    } else {
      impostor.object.rotationQuaternion.copyFrom(this._tempQuaternionBJS);
    }

  }

  setPhysicsBodyTransformation(impostor: PhysicsImpostor, newPosition: Vector3, newRotation: Quaternion): void {
    const position = this._tempVec3A;
    const rotation = this._tempQuaternion;
    position.Set(newPosition.x, newPosition.y, newPosition.z);
    rotation.Set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);

    if (impostor instanceof JoltCharacterVirtualImpostor) {
      const character: Jolt.CharacterVirtual = impostor.physicsBody;
      character.SetPosition(position);
      character.SetRotation(rotation);
    } else {
      const physicsBody: Jolt.Body = impostor.physicsBody;
      this._bodyInterface.SetPositionAndRotationWhenChanged(physicsBody.GetID(), position, rotation, Jolt.Activate);
    }
  }

  /**
   * Sets the linear velocity of the physics body
   * @param impostor imposter to set the velocity on
   * @param velocity velocity to set
   */
  public setLinearVelocity(impostor: PhysicsImpostor, velocity: Vector3) {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
    physicsBody.SetLinearVelocity(this._tempVec3A);
  }


  setAngularVelocity(impostor: PhysicsImpostor, velocity: Nullable<Vector3>): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    if (velocity) {
      this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
    } else {
      this._tempVec3A.Set(0, 0, 0);
    }
    physicsBody.SetAngularVelocity(this._tempVec3A);
  }
  getLinearVelocity(impostor: PhysicsImpostor): Nullable<Vector3> {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    const velocity = physicsBody.GetLinearVelocity();
    return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
  }
  getAngularVelocity(impostor: PhysicsImpostor): Nullable<Vector3> {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    const velocity = physicsBody.GetAngularVelocity();
    return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
  }
  setBodyMass(impostor: PhysicsImpostor, mass: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.GetMotionProperties().SetInverseMass(1.0 / mass);
    impostor._pluginData.mass = mass;
  }
  getBodyMass(impostor: PhysicsImpostor): number {
    return impostor._pluginData.mass || 0;
  }
  getBodyFriction(impostor: PhysicsImpostor): number {
    return impostor._pluginData.friction || 0;
  }
  setBodyFriction(impostor: PhysicsImpostor, friction: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetFriction(friction);
    impostor._pluginData.friction = friction;
  }
  getBodyRestitution(impostor: PhysicsImpostor): number {
    return impostor._pluginData.restitution || 0;
  }
  setBodyRestitution(impostor: PhysicsImpostor, restitution: number): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    physicsBody.SetRestitution(restitution);
    impostor._pluginData.restitution = restitution;
  }
  /*
  getBodyPressure?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyPressure?(impostor: PhysicsImpostor, pressure: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyStiffness?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyStiffness?(impostor: PhysicsImpostor, stiffness: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyVelocityIterations?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyVelocityIterations?(impostor: PhysicsImpostor, velocityIterations: number): void {
    throw new Error('Method not implemented.');
  }
  getBodyPositionIterations?(impostor: PhysicsImpostor): number {
    throw new Error('Method not implemented.');
  }
  setBodyPositionIterations?(impostor: PhysicsImpostor, positionIterations: number): void {
    throw new Error('Method not implemented.');
  }
  appendAnchor?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, width: number, height: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error('Method not implemented.');
  }
  appendHook?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, length: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error('Method not implemented.');
  }*/

  sleepBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.DeactivateBody(physicsBody.GetID())
  }

  wakeUpBody(impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;
    this._bodyInterface.ActivateBody(physicsBody.GetID())
  }

  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    return this._raycaster.raycast(from, to);
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    return this._raycaster.raycastToRef(from, to, result);
  }
  updateDistanceJoint(joint: PhysicsJoint, maxDistance: number, minDistance?: number | undefined): void {
    if (joint.type !== PhysicsJoint.DistanceJoint) {
      const constraint: Jolt.DistanceConstraint = joint.physicsJoint;
      constraint.SetDistance(minDistance || 0, maxDistance);
    } else {
      throw new Error('updateDistanceJoint on non-distance constraint');
    }
  }
  setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const constraint: Partial<PossibleMotors> = joint.physicsJoint;
      if (motorMode == 'position') {
        constraint.SetMotorState!(Jolt.EMotorState_Position);
        constraint.SetTargetAngle && constraint.SetTargetAngle(speed);
        constraint.SetTargetPosition && constraint.SetTargetPosition(speed);
      } else if (motorMode == 'velocity') {
        constraint.SetMotorState!(Jolt.EMotorState_Velocity);
        constraint.SetTargetAngularVelocity && constraint.SetTargetAngularVelocity(speed);
        constraint.SetTargetVelocity && constraint.SetTargetVelocity(speed);
      }
      if (joint instanceof MotorEnabledJoint) {
        const motorJoint = joint as MotorEnabledJoint;
        const body1: Jolt.Body = motorJoint.jointData.nativeParams?.body1;
        const body2: Jolt.Body = motorJoint.jointData.nativeParams?.body2;
        body1 && this._bodyInterface.ActivateBody(body1.GetID());
        body2 && this._bodyInterface.ActivateBody(body2.GetID());
      }
      if (maxForce) {
        this.setLimit(joint, maxForce);
      }

    } else {
      throw new Error('setMotor on non-motorized constraint');
    }
  }
  setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined): void {
    let motorMode = 'position';
    if ((joint as any).jointData) {
      const jointData: PhysicsJointData = (joint as any).jointData;
      motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
    }
    if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
      const motorSettings: Jolt.MotorSettings = joint.physicsJoint.GetMotorSettings();
      if (upperLimit == 0 && lowerLimit == 0) {
        joint.physicsJoint.SetMotorState(Jolt.EMotorState_Off);
      }
      if (motorMode == 'position') {
        motorSettings.mMaxForceLimit = upperLimit;
        motorSettings.mMinForceLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      } else if (motorMode == 'velocity') {
        motorSettings.mMaxTorqueLimit = upperLimit;
        motorSettings.mMinTorqueLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
      }
    } else {
      throw new Error('setLimit on non-motorized constraint');
    }
  }
  getRadius(impostor: PhysicsImpostor): number {
    const extents =  impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
    return Math.max(extents.x, extents.y, extents.z) / 2;
  }
  getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void {
    const extents =  impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
    result.x = extents.x;
    result.y = extents.y;
    result.z = extents.z;
  }
  syncMeshWithImpostor(mesh: AbstractMesh, impostor: PhysicsImpostor): void {
    const physicsBody: Jolt.Body = impostor.physicsBody;

    const position = physicsBody.GetPosition();
    mesh.position.set(position.GetX(), position.GetY(), position.GetZ());

    if (mesh.rotationQuaternion) {
      const quat = physicsBody.GetRotation();
      mesh.rotationQuaternion.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());
    }
  }

  dispose(): void {
    // Dispose of world
    Jolt.destroy(this.world);

    // Dispose of temp variables
    Jolt.destroy(this._tempQuaternion);
    Jolt.destroy(this._tempVec3A);
    Jolt.destroy(this._tempVec3B);
    this._raycaster.dispose();
    (this.world as any) = null;
  }

}