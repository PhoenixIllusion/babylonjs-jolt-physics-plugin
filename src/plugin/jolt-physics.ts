import { Vector3, PhysicsImpostor, Quaternion, Nullable, PhysicsRaycastResult, PhysicsJoint, IMotorEnabledJoint, AbstractMesh, Epsilon, Logger, VertexBuffer } from "@babylonjs/core";
import { IPhysicsEnginePlugin, PhysicsImpostorJoint } from "@babylonjs/core/Physics/v1/IPhysicsEnginePlugin";
import type Jolt from 'jolt-physics';

type JoltNS = typeof Jolt;

class RayCastUtility {

  private _raycastResult: PhysicsRaycastResult;
  private _ray_settings: Jolt.RayCastSettings;
  private _ray: Jolt.RRayCast;
  private _ray_collector: Jolt.CastRayCollectorJS;

  private _bp_filter: Jolt.DefaultBroadPhaseLayerFilter;
  private _object_filter: Jolt.DefaultObjectLayerFilter;
  private _body_filter: Jolt.BodyFilter;
  private _shape_filter: Jolt.ShapeFilter;

  constructor(private Jolt: JoltNS, jolt: Jolt.JoltInterface) {

    this._raycastResult = new PhysicsRaycastResult();
    this._ray_settings = new Jolt.RayCastSettings();
    this._ray_collector = new Jolt.CastRayCollectorJS();

    this._bp_filter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), Jolt.MOVING);
    this._object_filter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), Jolt.MOVING);
    this._body_filter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
    this._shape_filter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes

    this._ray = new Jolt.RRayCast();
  }

  raycast(from: Vector3, to: Vector3): PhysicsRaycastResult {
    this.raycastToRef(from, to, this._raycastResult);
    return this._raycastResult;
  }

  raycastToRef(from: Vector3, to: Vector3, result: PhysicsRaycastResult): void {
    const delta = to.subtract(from);
    this._ray.mOrigin.Set(from.x, from.y, from.z);
    this._ray.mDirection.Set(delta.x, delta.y, delta.z);

    let body: Jolt.Body;

    const closestResult = {
      mFraction: 1.01,
      hitPoint: new Vector3(),
      hitNormal: new Vector3()
    }
    this._ray_collector.OnBody = (inBody: Jolt.Body) => {
      body = this.Jolt.wrapPointer(inBody as any as number, this.Jolt.Body);
    }
    this._ray_collector.AddHit = (inRayCastResult: Jolt.RayCastResult) => {
      inRayCastResult = this.Jolt.wrapPointer(inRayCastResult as any as number, this.Jolt.RayCastResult);
      if (inRayCastResult.mFraction <= closestResult.mFraction && inRayCastResult.mFraction <= 1.0) {
        closestResult.mFraction = inRayCastResult.mFraction;

        let hitPoint = this._ray.GetPointOnRay(inRayCastResult.mFraction);
        closestResult.hitPoint.set(hitPoint.GetX(), hitPoint.GetY(), hitPoint.GetZ());
        let hitNormal = body.GetWorldSpaceSurfaceNormal(inRayCastResult.mSubShapeID2, hitPoint);
        closestResult.hitNormal.set(hitNormal.GetX(), hitNormal.GetY(), hitNormal.GetZ());
      }
    }
    result.reset(from, to);
    if (closestResult.mFraction <= 1.0) {
      result.setHitData(closestResult.hitPoint, closestResult.hitNormal);
      result.calculateHitDistance();
    }
  }

  public dispose() {
    this.Jolt.destroy(this._raycastResult);
    this.Jolt.destroy(this._ray_settings);
    this.Jolt.destroy(this._ray_collector);

    this.Jolt.destroy(this._bp_filter);
    this.Jolt.destroy(this._object_filter);
    this.Jolt.destroy(this._body_filter);
    this.Jolt.destroy(this._shape_filter);
  }
}

export class JoltJSPlugin implements IPhysicsEnginePlugin {
  public world: Jolt.PhysicsSystem;
  public name = "JoltJSPlugin";

  private _timeStep: number = 1 / 60;
  private _fixedTimeStep: number = 1 / 60;
  private _maxSteps = 10;

  private _tempVec3A: Jolt.Vec3;
  private _tempVec3B: Jolt.Vec3;

  private _tempQuaternion: Jolt.Quat;
  private _tempQuaternionBJS = new Quaternion();
  private _bodyInterface: Jolt.BodyInterface;

  private _raycaster: RayCastUtility;


  constructor(private Jolt: JoltNS, private jolt: Jolt.JoltInterface, private _useDeltaForWorldStep: boolean = true) {
    this.world = jolt.GetPhysicsSystem();
    this._bodyInterface = this.world.GetBodyInterface();
    this._tempVec3A = new Jolt.Vec3();
    this._tempVec3B = new Jolt.Vec3();
    this._tempQuaternion = new Jolt.Quat();
    this._raycaster = new RayCastUtility(Jolt, jolt);
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
    for (const impostor of impostors) {
      // Update physics world objects to match babylon world
      if (!impostor.soft) {
        impostor.beforeStep();
      }
    }
    this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep);

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
  private _stepSimulation(timeStep: number = 1 / 60, maxSteps: number = 10, fixedTimeStep: number = 1 / 60) {
    if (maxSteps == 0) {
      this.jolt.Step(timeStep, 1);
    } else {
      while (maxSteps > 0 && timeStep > 0) {
        if (timeStep - fixedTimeStep < fixedTimeStep) {
          this.jolt.Step(timeStep, 1);
          timeStep = 0;
        } else {
          timeStep -= fixedTimeStep;
          this.jolt.Step(fixedTimeStep, 1);
        }
        maxSteps--;
      }
    }
  }

  getPluginVersion(): number {
    return 1;
  }

  applyImpulse(impostor: PhysicsImpostor, force: Vector3, contactPoint?: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;

      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      impulse.Set(force.x, force.y, force.z);

      if (contactPoint) {
        // Convert contactPoint relative to center of mass
        if (impostor.object && impostor.object.getWorldMatrix) {
          const localTranslation = impostor.object.getWorldMatrix().getTranslation();
          worldPoint.Set(contactPoint.x - localTranslation.x, contactPoint.y - localTranslation.y, contactPoint.z - localTranslation.z);
        } else {
          worldPoint.Set(contactPoint.x, contactPoint.y, contactPoint.z);
        }
        physicsBody.AddImpulse(impulse, worldPoint);
      } else {
        physicsBody.AddImpulse(impulse);
      }
    } else {
      Logger.Warn("Cannot be applied to a soft body");
    }

  }

  applyForce(impostor: PhysicsImpostor, force: Vector3, contactPoint: Vector3): void {
    if (!impostor.soft) {
      const physicsBody: Jolt.Body = impostor.physicsBody;

      const worldPoint = this._tempVec3A;
      const impulse = this._tempVec3B;
      impulse.Set(force.x, force.y, force.z);

      if (contactPoint) {
        // Convert contactPoint relative to center of mass
        if (impostor.object && impostor.object.getWorldMatrix) {
          const localTranslation = impostor.object.getWorldMatrix().getTranslation();
          worldPoint.Set(contactPoint.x - localTranslation.x, contactPoint.y - localTranslation.y, contactPoint.z - localTranslation.z);
        } else {
          worldPoint.Set(contactPoint.x, contactPoint.y, contactPoint.z);
        }
        physicsBody.AddForce(impulse, worldPoint);
      } else {
        physicsBody.AddForce(impulse);
      }
    } else {
      Logger.Warn("Cannot be applied to a soft body");
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
      const colShape = this._createShape(impostor);
      const mass = impostor.getParam("mass");
      const friction = impostor.getParam("friction");
      const restitution = impostor.getParam("restitution");
      const collisionGroup: number = impostor.getParam("collision-group");
      const collisionSubGroup: number = impostor.getParam("collision-sub-group");
      const collisionFilter: Jolt.GroupFilter = impostor.getParam("collision-filter");

      impostor.object.computeWorldMatrix(true);
      this._tempVec3A.Set(impostor.object.position.x, impostor.object.position.y, impostor.object.position.z);
      this._tempQuaternion.Set(
        impostor.object.rotationQuaternion!.x,
        impostor.object.rotationQuaternion!.y,
        impostor.object.rotationQuaternion!.z,
        impostor.object.rotationQuaternion!.w
      );
      const isStatic = (mass === 0) ? this.Jolt.Static : this.Jolt.Dynamic;
      const layer = (mass === 0) ? this.Jolt.NON_MOVING : this.Jolt.MOVING;
      const settings = new this.Jolt.BodyCreationSettings(colShape, this._tempVec3A, this._tempQuaternion, isStatic, layer);
      if(collisionGroup !== undefined) {
        settings.mCollisionGroup.SetGroupID(collisionGroup);
      }
      if(collisionSubGroup !== undefined) {
        settings.mCollisionGroup.SetSubGroupID(collisionGroup);
      }
      if(collisionFilter !== undefined) {
        settings.mCollisionGroup.SetGroupFilter(collisionFilter);
      }
      impostor._pluginData.mass = mass;
      impostor._pluginData.friction = friction;
      impostor._pluginData.restitution = restitution;
      settings.mRestitution = restitution;
      settings.mFriction = friction;
      if (mass !== 0) {
        settings.mOverrideMassProperties = this.Jolt.CalculateInertia;
        settings.mMassPropertiesOverride.mMass = mass;
      }
      const body = impostor.physicsBody = this._bodyInterface.CreateBody(settings);
      this._bodyInterface.AddBody(body.GetID(), this.Jolt.Activate)
    }
  }
  /**
  * Removes the physics body from the imposter and disposes of the body's memory
  * @param impostor imposter to remove the physics body from
  */
  public removePhysicsBody(impostor: PhysicsImpostor) {
    if (this.world) {
      if (impostor.soft) {
        this._bodyInterface.RemoveBody(impostor.physicsBody);
      }

      if (impostor._pluginData) {
        impostor._pluginData.toDispose.forEach((d: any) => {
          this.Jolt.destroy(d);
        });
        impostor._pluginData.toDispose = [];
      }
    }
  }

  private _createShape(impostor: PhysicsImpostor): Jolt.Shape {
    const object = impostor.object;

    const impostorExtents = impostor.getObjectExtents();
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
        returnValue = new this.Jolt.SphereShape(size, new this.Jolt.PhysicsMaterial())
        break;
      case PhysicsImpostor.CapsuleImpostor:
        const capRadius = impostorExtents.x / 2;
        returnValue = new this.Jolt.CapsuleShape(impostorExtents.y / 2 - capRadius, capRadius);
        break;
      case PhysicsImpostor.CylinderImpostor:
        returnValue = new this.Jolt.CylinderShapeSettings(0.5 * impostorExtents.y, 0.5 * impostorExtents.x).Create().Get();
        break;
      case PhysicsImpostor.PlaneImpostor:
      case PhysicsImpostor.BoxImpostor:
        this._tempVec3A.Set(impostorExtents.x / 2, impostorExtents.y / 2, impostorExtents.z / 2);
        returnValue = new this.Jolt.BoxShape(this._tempVec3A);
        break;
      case PhysicsImpostor.MeshImpostor:
        // should transform the vertex data to world coordinates!!
        const rawVerts = object.getVerticesData ? object.getVerticesData(VertexBuffer.PositionKind) : [];
        const rawFaces = object.getIndices ? object.getIndices() : [];
        if (!rawVerts) {
          throw new Error("Tried to create a MeshImpostor for an object without vertices. This will fail.");
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
        const triangles = new this.Jolt.TriangleList();
        const hasIndex = (rawFaces && rawFaces.length > 0)
        const faceCount = hasIndex ? rawFaces.length / 3 : transformedVertices.length / 9;
        triangles.resize(faceCount);
        for (let i = 0; i < faceCount; i++) {
          const t = triangles.at(i);
          [0, 2, 1].forEach((j, k) => {
            const offset = i * 3 + j;
            const index = (hasIndex ? rawFaces[offset] : offset * 3) * 3;
            const v = t.get_mV(k)
            v.x = transformedVertices[index + 0];
            v.y = transformedVertices[index + 1];
            v.z = transformedVertices[index + 2];
          });
        }
        returnValue = new this.Jolt.MeshShapeSettings(triangles, new this.Jolt.PhysicsMaterialList).Create().Get();
        //now set back the transformation!
        object.position.copyFrom(oldPosition);
        oldRotation && object.rotation && object.rotation.copyFrom(oldRotation);
        oldQuaternion && object.rotationQuaternion && object.rotationQuaternion.copyFrom(oldQuaternion);
    }
    if (returnValue === undefined) {
      throw new Error("Unsupported Shape: " + impostor.type);
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
      if(options[key] !== undefined) {
        setting[k] = options[key];
      }
    }

    const setPoints = (constraintSettings: {mPoint1: Jolt.Vec3, mPoint2: Jolt.Vec3}) => {
      constraintSettings.mPoint1.Set(p1.x, p1.y, p1.z);
      constraintSettings.mPoint2.Set(p2.x, p2.y, p2.z);
    }
    const setHindgeAxis = (constraintSettings: {mHingeAxis1: Jolt.Vec3, mHingeAxis2: Jolt.Vec3}) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mHingeAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mHingeAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setSliderAxis = (constraintSettings: {mSliderAxis1: Jolt.Vec3, mSliderAxis2: Jolt.Vec3}) => {
      const h1 = jointData.mainAxis!;
      const h2 = jointData.connectedAxis!;
      constraintSettings.mSliderAxis1.Set(h1.x, h1.y, h1.z);
      constraintSettings.mSliderAxis2.Set(h2.x, h2.y, h2.z);
    }
    const setNormalAxis = (constraintSettings: {mNormalAxis1: Jolt.Vec3, mNormalAxis2: Jolt.Vec3}) => {
      if(options['normal-axis-1'] && options['normal-axis-2']) {
        const n1: Vector3 = options['normal-axis-1'];
        const n2: Vector3 = options['normal-axis-2'];
        constraintSettings.mNormalAxis1.Set(n1.x, n1.y, n1.z);
        constraintSettings.mNormalAxis2.Set(n2.x, n2.y, n2.z);
      }
    }

    const p1 = jointData.mainPivot;
    const p2 = jointData.connectedPivot;
    switch (impostorJoint.joint.type) {
      case PhysicsJoint.DistanceJoint: {
          let constraintSettings = new this.Jolt.DistanceConstraintSettings();
          setPoints(constraintSettings);
          setIfAvailable(constraintSettings, 'mMinDistance', 'min-distance');
          setIfAvailable(constraintSettings, 'mMaxDistance', 'max-distance');
          impostorJoint.joint.physicsJoint = this.world.AddConstraint(constraintSettings.Create(mainBody, connectedBody));
        }
        return;
      case PhysicsJoint.HingeJoint: {
          let constraintSettings = new this.Jolt.HingeConstraintSettings();
          setPoints(constraintSettings);
          setHindgeAxis(constraintSettings);
          setNormalAxis(constraintSettings);
          setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
          setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
          impostorJoint.joint.physicsJoint = this.world.AddConstraint(constraintSettings.Create(mainBody, connectedBody));
        }
        return;
      case PhysicsJoint.SliderJoint: {
          let constraintSettings = new this.Jolt.SliderConstraintSettings();
          setPoints(constraintSettings);
          setSliderAxis(constraintSettings);
          setNormalAxis(constraintSettings);
          setIfAvailable(constraintSettings, 'mLimitsMin', 'min-limit');
          setIfAvailable(constraintSettings, 'mLimitsMax', 'max-limit');
          impostorJoint.joint.physicsJoint = this.world.AddConstraint(constraintSettings.Create(mainBody, connectedBody));
        }
        return;
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
    return this.jolt !== undefined;
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
    const physicsBody: Jolt.Body = impostor.physicsBody;

    this._tempVec3A.Set(newPosition.x, newPosition.y, newPosition.z);
    this._tempQuaternion.Set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);

    this._bodyInterface.SetPositionAndRotationWhenChanged(physicsBody.GetID(), this._tempVec3A, this._tempQuaternion, this.Jolt.Activate);
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
    throw new Error("Method not implemented.");
  }
  setBodyPressure?(impostor: PhysicsImpostor, pressure: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyStiffness?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyStiffness?(impostor: PhysicsImpostor, stiffness: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyVelocityIterations?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyVelocityIterations?(impostor: PhysicsImpostor, velocityIterations: number): void {
    throw new Error("Method not implemented.");
  }
  getBodyPositionIterations?(impostor: PhysicsImpostor): number {
    throw new Error("Method not implemented.");
  }
  setBodyPositionIterations?(impostor: PhysicsImpostor, positionIterations: number): void {
    throw new Error("Method not implemented.");
  }
  appendAnchor?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, width: number, height: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error("Method not implemented.");
  }
  appendHook?(impostor: PhysicsImpostor, otherImpostor: PhysicsImpostor, length: number, influence: number, noCollisionBetweenLinkedBodies: boolean): void {
    throw new Error("Method not implemented.");
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
    console.error("updateDistanceJoint", joint, maxDistance, minDistance);
    throw new Error("Method not implemented.");
  }
  setMotor(joint: IMotorEnabledJoint, speed: number, maxForce?: number | undefined, motorIndex?: number | undefined): void {
    console.error("IMotorEnabledJoint", joint, speed, maxForce, motorIndex);
    throw new Error("Method not implemented.");
  }
  setLimit(joint: IMotorEnabledJoint, upperLimit: number, lowerLimit?: number | undefined, motorIndex?: number | undefined): void {
    console.error("setLimit", joint, upperLimit, lowerLimit, motorIndex);
    throw new Error("Method not implemented.");
  }
  getRadius(impostor: PhysicsImpostor): number {
    const extents = impostor.getObjectExtents();
    return Math.max(extents.x, extents.y, extents.z) / 2;
  }
  getBoxSizeToRef(impostor: PhysicsImpostor, result: Vector3): void {
    const extents = impostor.getObjectExtents();
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
    this.Jolt.destroy(this.world);

    // Dispose of temp variables
    this.Jolt.destroy(this._tempQuaternion);
    this.Jolt.destroy(this._tempVec3A);
    this.Jolt.destroy(this._tempVec3B);
    this._raycaster.dispose();
    (this.world as any) = null;
  }

}