import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { Vector3, Quaternion, Matrix, TmpVectors } from "@babylonjs/core/Maths/math";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { PhysicsRaycastResult, IRaycastQuery } from "@babylonjs/core/Physics/physicsRaycastResult";
import { ConstrainedBodyPair, IBasePhysicsCollisionEvent, IPhysicsCollisionEvent, IPhysicsEnginePluginV2, PhysicsConstraintAxis, PhysicsConstraintAxisLimitMode, PhysicsConstraintMotorType, PhysicsMassProperties, PhysicsMotionType, PhysicsShapeParameters, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";
import { PhysicsShape } from "@babylonjs/core/Physics/v2/physicsShape";
import { Nullable } from "@babylonjs/core/types";
import Jolt, { loadJolt } from "../jolt-import";
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, LAYER_NON_MOVING, SetJoltQuat, SetJoltVec3 } from "../jolt-util";
import { RayCastUtility } from "../jolt-raycast";
import { CollisionMap, ContactCollectorV2 } from "./jolt-contact";
import { castJoltShape } from "./jolt-shape";
import { JoltBodyManager } from "./jolt-body";

interface IJoltBodyData {
  body: Jolt.Body;
  massProperties: PhysicsMassProperties
}

export class JoltPhysicsBody extends PhysicsBody {
  _pluginDataInstances: IJoltBodyData[] = [];
  _pluginData!: IJoltBodyData;
}


export class JoltJSPlugin implements IPhysicsEnginePluginV2 {

  world: Jolt.PhysicsSystem;

  onCollisionObservable: Observable<IPhysicsCollisionEvent>;
  onCollisionEndedObservable: Observable<IBasePhysicsCollisionEvent>;
  onTriggerCollisionObservable: Observable<IBasePhysicsCollisionEvent>;


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

  private _contactCollector: ContactCollectorV2;
  private _contactListener: Jolt.ContactListenerJS;

  private _physicsBodyHash: { [hash: number]: PhysicsBody} = {};
  private _bodyHash: { [hash: number]: Jolt.Body} = {};

  private toDispose: any[] = []; 
  private _collisionCallbacks: CollisionMap;


  static async loadPlugin(_useDeltaForWorldStep: boolean = true, physicsSettings?: any, importSettings?: any): Promise<JoltJSPlugin> {
    await loadJolt(importSettings);
    const settings = new Jolt.JoltSettings();
    Object.assign(settings, physicsSettings);

    let object_filter = new Jolt.ObjectLayerPairFilterTable(2);
    object_filter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
    object_filter.EnableCollision(LAYER_MOVING, LAYER_MOVING);

    // We use a 1-to-1 mapping between object layers and broadphase layers
    const BP_LAYER_NON_MOVING = new Jolt.BroadPhaseLayer(0);
    const BP_LAYER_MOVING = new Jolt.BroadPhaseLayer(1);
    let bp_interface = new Jolt.BroadPhaseLayerInterfaceTable(2, 2);
    bp_interface.MapObjectToBroadPhaseLayer(LAYER_NON_MOVING, BP_LAYER_NON_MOVING);
    bp_interface.MapObjectToBroadPhaseLayer(LAYER_MOVING, BP_LAYER_MOVING);
    Jolt.destroy(BP_LAYER_MOVING);
    Jolt.destroy(BP_LAYER_NON_MOVING);
    // Initialize Jolt
    settings.mObjectLayerPairFilter = object_filter;
    settings.mBroadPhaseLayerInterface = bp_interface;
    settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(settings.mBroadPhaseLayerInterface, 2, settings.mObjectLayerPairFilter, 2);

    const joltInterface = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);
    return new JoltJSPlugin(joltInterface, _useDeltaForWorldStep);
  }

  constructor(private jolt: Jolt.JoltInterface, private _useDeltaForWorldStep: boolean = true) {
    this.world = jolt.GetPhysicsSystem();
    this._bodyInterface = this.world.GetBodyInterface();
    this._tempVec3A = new Jolt.Vec3();
    this._tempVec3B = new Jolt.Vec3();
    this._tempQuaternion = new Jolt.Quat();
    this._raycaster = new RayCastUtility(jolt, {
      world: this.world,
      GetBodyForBodyId: (seqAndNum: number) => this.GetBodyForBodyId(seqAndNum),
      GetPhysicsBodyForBodyId: (seqAndNum: number) => this.GetPhysicsBodyForBodyId(seqAndNum)
    });
    this._contactListener = new Jolt.ContactListenerJS();
    this._collisionCallbacks = { add: new Set(), remove: new Set(), persist: new Set()};
    this._contactCollector = new ContactCollectorV2(this, this._contactListener, this._collisionCallbacks);
    this.world.SetContactListener(this._contactListener);

    this.toDispose.push(this.jolt, this._tempVec3A, this._tempVec3B, this._tempQuaternion, this._contactListener);
  }

  private GetPhysicsBodyForBodyId(seqAndNum: number): PhysicsBody {
    return this._physicsBodyHash[seqAndNum];
  }

  private GetBodyForBodyId(seqAndNum: number): Jolt.Body {
    return this._bodyHash[seqAndNum];
  }

  setGravity(gravity: Vector3): void {
    this._tempVec3A.Set(gravity.x, gravity.y, gravity.z);
    this.world.SetGravity(this._tempVec3A);
  }

  setTimeStep(timeStep: number) {
    this._timeStep = timeStep;
  }

  setFixedTimeStep(fixedTimeStep: number) {
    this._fixedTimeStep = fixedTimeStep;
  }

  setMaxSteps(maxSteps: number) {
    this._maxSteps = maxSteps;
  }

  getTimeStep(): number {
    return this._timeStep;
  }

  private _perPhysicsStepCallbacks: ((timeStep: number) => void)[] = [];
  registerPerPhysicsStepCallback(listener: (timeStep: number) => void): void {
    this._perPhysicsStepCallbacks.push(listener);
  }
  unregisterPerPhysicsStepCallback(listener: (timeStep: number) => void): void {
    const index = this._perPhysicsStepCallbacks.indexOf(listener);
    if (index > 0) {
      this._perPhysicsStepCallbacks.splice(index, 1);
    }
  }

  executeStep(delta: number, physicsBodies: PhysicsBody[]): void {
    this._contactCollector.clear();
    for (const physicsBody of physicsBodies) {
      if (physicsBody.disablePreStep) {
          continue;
      }
      if (physicsBody._pluginData.body instanceof Jolt.Body) {
        const body: Jolt.Body = physicsBody._pluginData.body;
        const bodyID = body.GetID().GetIndexAndSequenceNumber();
        if(this._collisionCallbacks.add.has(bodyID)) {
          this._contactCollector.registerImpostor(bodyID);
        }
      }
      this.setPhysicsBodyTransformation(physicsBody, physicsBody.transformNode);
    }
    this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep,
      (timeStep) => {
        this._perPhysicsStepCallbacks.forEach(listener => listener(timeStep));
    });
    for (const physicsBody of physicsBodies) {
      this.sync(physicsBody);
    }
  }
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
  private setPhysicsBodyTransformation(physicsBody: JoltPhysicsBody, node: TransformNode) {
    const transformNode = physicsBody.transformNode;
    if (physicsBody.numInstances > 0) {
        // instances
        const m = transformNode as Mesh;
        const matrixData = m._thinInstanceDataStorage.matrixData;
        if (!matrixData) {
            return; // TODO: error handling
        }
        const instancesCount = physicsBody.numInstances;
        this._createOrUpdateBodyInstances(physicsBody, physicsBody.getMotionType(), matrixData, 0, instancesCount, true);
    } else {
        // regular
        const _body = this._getPluginReference(physicsBody);
        if (node.parent) {
          node.computeWorldMatrix(true);
          const position = node.absolutePosition;
          const rotation = node.absoluteRotationQuaternion;
          this._bodyInterface.SetPositionAndRotationWhenChanged(_body.GetID(),
                SetJoltVec3(position, this._tempVec3A),
                SetJoltQuat(rotation, this._tempQuaternion), Jolt.EActivation_Activate);
        } else {
          let rotation = TmpVectors.Quaternion[0];
          const position =  node.position;
          if (node.rotationQuaternion) {
            rotation = node.rotationQuaternion;
          } else {
              const r = node.rotation;
              Quaternion.FromEulerAnglesToRef(r.x, r.y, r.z, rotation);
          }
          this._bodyInterface.SetPositionAndRotationWhenChanged(_body.GetID(),
                SetJoltVec3(position, this._tempVec3A),
                SetJoltQuat(rotation, this._tempQuaternion), Jolt.EActivation_Activate);
        }
    }
  }

  private _getPluginReference(body: JoltPhysicsBody, instanceIndex?: number): IJoltBodyData {
    return body._pluginDataInstances?.length ? body._pluginDataInstances[instanceIndex ?? 0] : body._pluginData;
  }

  getPluginVersion(): number {
    return 2;
  }

  initBody(body: PhysicsBody, motionType: PhysicsMotionType, position: Vector3, orientation: Quaternion): void {
    throw new Error("Method not implemented.");
  }

  initBodyInstances(body: PhysicsBody, motionType: PhysicsMotionType, mesh: Mesh): void {
    throw new Error("Method not implemented.");
  }

  private _createOrUpdateBodyInstances(body: PhysicsBody, motionType: PhysicsMotionType, matrixData: Float32Array, startIndex: number, endIndex: number, update: boolean): void {
    const rotation = TmpVectors.Quaternion[0];
    const rotationMatrix = Matrix.Identity();
    for (let i = startIndex; i < endIndex; i++) {
        const position = [matrixData[i * 16 + 12], matrixData[i * 16 + 13], matrixData[i * 16 + 14]];
        let hkbody;
        if (!update) {
            hkbody = this._hknp.HP_Body_Create()[1];
        } else {
            hkbody = body._pluginDataInstances[i].hpBodyId;
        }
        rotationMatrix.setRowFromFloats(0, matrixData[i * 16 + 0], matrixData[i * 16 + 1], matrixData[i * 16 + 2], 0);
        rotationMatrix.setRowFromFloats(1, matrixData[i * 16 + 4], matrixData[i * 16 + 5], matrixData[i * 16 + 6], 0);
        rotationMatrix.setRowFromFloats(2, matrixData[i * 16 + 8], matrixData[i * 16 + 9], matrixData[i * 16 + 10], 0);
        Quaternion.FromRotationMatrixToRef(rotationMatrix, rotation);
        const transform = [position, [rotation.x, rotation.y, rotation.z, rotation.w]];
        this._hknp.HP_Body_SetQTransform(hkbody, transform);
        if (!update) {
            const pluginData = new BodyPluginData(hkbody);
            if (body._pluginDataInstances.length) {
                // If an instance already exists, copy any user-provided mass properties
                pluginData.userMassProps = body._pluginDataInstances[0].userMassProps;
            }
            this._internalSetMotionType(pluginData, motionType);
            this._internalUpdateMassProperties(pluginData);
            body._pluginDataInstances.push(pluginData);
            this._hknp.HP_World_AddBody(this.world, hkbody, body.startAsleep);
            pluginData.worldTransformOffset = this._hknp.HP_Body_GetWorldTransformOffset(hkbody)[1];
        }
    }
}

  updateBodyInstances(body: PhysicsBody, mesh: Mesh): void {
    const instancesCount = mesh._thinInstanceDataStorage?.instancesCount ?? 0;
    const matrixData = mesh._thinInstanceDataStorage.matrixData;
    if (!matrixData) {
        return; // TODO: error handling
    }
    const pluginInstancesCount = body._pluginDataInstances.length;
    const motionType = this.getMotionType(body);
    if (instancesCount > pluginInstancesCount) {
        this._createOrUpdateBodyInstances(body, motionType, matrixData, pluginInstancesCount, instancesCount, false);
         for (let i = pluginInstancesCount; i < instancesCount; i++) {
          this._hknp.HP_Body_SetShape(body._pluginDataInstances[i].hpBodyId, firstBodyShape);
          this._internalUpdateMassProperties(body._pluginDataInstances[i]);
          this._bodies.set(body._pluginDataInstances[i].hpBodyId[0], { body: body, index: i });
      }
  } else if (instancesCount < pluginInstancesCount) {
      const instancesToRemove = pluginInstancesCount - instancesCount;
      for (let i = 0; i < instancesToRemove; i++) {
          const hkbody = body._pluginDataInstances.pop();
          this._bodies.delete(hkbody.hpBodyId[0]);
          this._hknp.HP_World_RemoveBody(this.world, hkbody.hpBodyId);
          this._hknp.HP_Body_Release(hkbody.hpBodyId);
      }
      this._createOrUpdateBodyInstances(body, motionType, matrixData, 0, instancesCount, true);
  }
  }

  removeBody(body: PhysicsBody): void {
    const _body = this._getPluginReference(body);
    this._bodyInterface.RemoveBody(_body.GetID());
  }

  sync(body: PhysicsBody): void {
    this.syncTransform(body, body.transformNode);
  }

  syncTransform(body: PhysicsBody, transformNode: TransformNode): void {
    JoltBodyManager.syncTransform(body, transformNode);
  }

  setShape(body: PhysicsBody, shape: Nullable<PhysicsShape>): void {
    const shapeHandle = shape && shape._pluginData ? shape._pluginData : BigInt(0);
    if (!(body.transformNode instanceof Mesh) || !body.transformNode._thinInstanceDataStorage?.matrixData) {
        const _body = this._getPluginReference(body);
        this._jol
        this._internalUpdateMassProperties(body._pluginData);
        return;
    }
    const m = body.transformNode as Mesh;
    const instancesCount = m._thinInstanceDataStorage?.instancesCount ?? 0;
    for (let i = 0; i < instancesCount; i++) {
        this._hknp.HP_Body_SetShape(body._pluginDataInstances[i].hpBodyId, shapeHandle);
        this._internalUpdateMassProperties(body._pluginDataInstances[i]);
    }

  }
  getShape(body: PhysicsBody): Nullable<PhysicsShape> {
    throw new Error("Method not implemented.");
  }
  getShapeType(shape: PhysicsShape): PhysicsShapeType {
    if (shape.type) {
        return shape.type;
    } else {
        //<todo This returns a native type!
        const _shape = shape._pluginData.shape as Jolt.Shape;
        return _shape.GetSubType();
    }
  }
  setEventMask(body: PhysicsBody, eventMask: number, instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  getEventMask(body: PhysicsBody, instanceIndex?: number | undefined): number {
    throw new Error("Method not implemented.");
  }
  setMotionType(body: PhysicsBody, motionType: PhysicsMotionType, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    this._bodyInterface.SetMotionType(_body.GetID(), JoltBodyManager.GetMotionType(motionType), Jolt.EActivation_Activate);
  }
  getMotionType(body: PhysicsBody, instanceIndex?: number | undefined): PhysicsMotionType {
    const _body = this._getPluginReference(body, instanceIndex);
    switch(_body.GetMotionType()) {
      case Jolt.EMotionType_Static:
        return PhysicsMotionType.STATIC;
      case Jolt.EMotionType_Dynamic:
        return PhysicsMotionType.DYNAMIC;
      case Jolt.EMotionType_Kinematic:
        return PhysicsMotionType.ANIMATED;
    }
    throw new Error('Unknown Motion Type: '+_body.GetMotionType());
  }
  computeMassProperties(body: PhysicsBody, instanceIndex?: number | undefined): PhysicsMassProperties {
    return this.getMassProperties(body, instanceIndex);
  }
  setMassProperties(body: PhysicsBody, massProps: PhysicsMassProperties, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    if(massProps.mass)
      _body.GetMotionProperties().SetInverseMass(1/massProps.mass);
  }
  getMassProperties(body: PhysicsBody, instanceIndex?: number | undefined): PhysicsMassProperties {
    const _body = this._getPluginReference(body, instanceIndex);
    const _COM = _body.GetCenterOfMassPosition();
    const _mass = _body.GetMotionProperties().GetInverseMass();
    return {
      mass: 1/_mass,
      centerOfMass: GetJoltVec3 (_COM, new Vector3())
    }
  }
  setLinearDamping(body: PhysicsBody, damping: number, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.GetMotionProperties().SetLinearDamping(damping);
  }
  getLinearDamping(body: PhysicsBody, instanceIndex?: number | undefined): number {
    const _body = this._getPluginReference(body, instanceIndex);
    return _body.GetMotionProperties().GetLinearDamping();
  }
  setAngularDamping(body: PhysicsBody, damping: number, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.GetMotionProperties().SetAngularDamping(damping);
  }
  getAngularDamping(body: PhysicsBody, instanceIndex?: number | undefined): number {
    const _body = this._getPluginReference(body, instanceIndex);
    return _body.GetMotionProperties().GetAngularDamping();
  }
  setLinearVelocity(body: PhysicsBody, linVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.SetLinearVelocity(SetJoltVec3(linVel, this._tempVec3A));
  }
  getLinearVelocityToRef(body: PhysicsBody, linVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    GetJoltVec3(_body.GetLinearVelocity(), linVel)
  }
  applyImpulse(body: PhysicsBody, impulse: Vector3, location: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.AddImpulse(SetJoltVec3(impulse, this._tempVec3A),SetJoltVec3(location, this._tempVec3B))
  }
  applyForce(body: PhysicsBody, force: Vector3, location: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.AddForce(SetJoltVec3(force, this._tempVec3A),SetJoltVec3(location, this._tempVec3B))
  }
  setAngularVelocity(body: PhysicsBody, angVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    _body.SetAngularVelocity(SetJoltVec3(angVel, this._tempVec3A));
  }
  getAngularVelocityToRef(body: PhysicsBody, angVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = this._getPluginReference(body, instanceIndex);
    GetJoltVec3(_body.GetAngularVelocity(), angVel)
  }
  getBodyGeometry(body: PhysicsBody): {} {
    throw new Error("Method not implemented.");
  }
  disposeBody(body: PhysicsBody): void {
    if (this.world) {
      if (body._pluginDataInstances && body._pluginDataInstances.length > 0) {
        for (const instance of body._pluginDataInstances) {
            const _body: Jolt.Body = instance.body;
            this._bodyInterface.RemoveBody(_body.GetID());
            this._bodyInterface.DestroyBody(_body.GetID());
    
            instance.toDispose.forEach((d: any) => {
              Jolt.destroy(d);
            });
            instance.toDispose = [];
            delete this._physicsBodyHash[_body.GetID().GetIndexAndSequenceNumber()]
            delete this._bodyHash[_body.GetID().GetIndexAndSequenceNumber()]
        }
      }

      if (body._pluginData) {
        const _body: Jolt.Body = body._pluginData.body;
        this._bodyInterface.RemoveBody(_body.GetID());
        this._bodyInterface.DestroyBody(_body.GetID());

        body._pluginData.toDispose.forEach((d: any) => {
          Jolt.destroy(d);
        });
        body._pluginData.toDispose = [];
        delete this._physicsBodyHash[_body.GetID().GetIndexAndSequenceNumber()]
        delete this._bodyHash[_body.GetID().GetIndexAndSequenceNumber()]
      }
    }
  }

  setCollisionCallbackEnabled(body: PhysicsBody, enabled: boolean, instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  setCollisionEndedCallbackEnabled(body: PhysicsBody, enabled: boolean, instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }

  getCollisionObservable(body: PhysicsBody, instanceIndex?: number | undefined): Observable<IPhysicsCollisionEvent> {
    throw new Error("Method not implemented.");
  }
  getCollisionEndedObservable(body: PhysicsBody, instanceIndex?: number | undefined): Observable<IBasePhysicsCollisionEvent> {
    throw new Error("Method not implemented.");
  }
  setGravityFactor(body: PhysicsBody, factor: number, instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  getGravityFactor(body: PhysicsBody, instanceIndex?: number | undefined): number {
    throw new Error("Method not implemented.");
  }
  setTargetTransform(body: PhysicsBody, position: Vector3, rotation: Quaternion, instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  initShape(shape: PhysicsShape, type: PhysicsShapeType, options: PhysicsShapeParameters): void {
    throw new Error("Method not implemented.");
  }
  setShapeFilterMembershipMask(shape: PhysicsShape, membershipMask: number): void {
    throw new Error("Method not implemented.");
  }
  getShapeFilterMembershipMask(shape: PhysicsShape): number {
    throw new Error("Method not implemented.");
  }
  setShapeFilterCollideMask(shape: PhysicsShape, collideMask: number): void {
    throw new Error("Method not implemented.");
  }
  getShapeFilterCollideMask(shape: PhysicsShape): number {
    throw new Error("Method not implemented.");
  }

  setMaterial(shape: PhysicsShape, material: PhysicsMaterial): void {
    throw new Error("Method not implemented.");
  }
  getMaterial(shape: PhysicsShape): PhysicsMaterial {
    throw new Error("Method not implemented.");
  }
  setDensity(shape: PhysicsShape, density: number): void {
    const _shape = castJoltShape(shape._pluginData.shape as Jolt.Shape);
    if(_shape instanceof Jolt.ConvexShape) {
      _shape.SetDensity(density)
    }
  }
  getDensity(shape: PhysicsShape): number {
    const _shape = castJoltShape(shape._pluginData.shape as Jolt.Shape);
    let density = 0;
    if(_shape instanceof Jolt.ConvexShape) {
      density = _shape.GetDensity()
    }
    return density;
  }
  addChild(shape: PhysicsShape, newChild: PhysicsShape, translation?: Vector3 | undefined, rotation?: Quaternion | undefined, scale?: Vector3 | undefined): void {
    throw new Error("Method not implemented.");
  }
  removeChild(shape: PhysicsShape, childIndex: number): void {
    throw new Error("Method not implemented.");
  }
  getNumChildren(shape: PhysicsShape): number {
    throw new Error("Method not implemented.");
  }
  getBoundingBox(shape: PhysicsShape): BoundingBox {
    throw new Error("Method not implemented.");
  }
  disposeShape(shape: PhysicsShape): void {
    const _shape = shape._pluginData.shape as Jolt.Shape;
    Jolt.destroy(_shape);
  }

  setTrigger(shape: PhysicsShape, isTrigger: boolean): void {
    throw new Error("Method not implemented.");
  }

  addConstraint(body: PhysicsBody, childBody: PhysicsBody, constraint: PhysicsConstraint, instanceIndex?: number | undefined, childInstanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  initConstraint(constraint: PhysicsConstraint, body: PhysicsBody, childBody: PhysicsBody): void {
    throw new Error("Method not implemented.");
  }
  setEnabled(constraint: PhysicsConstraint, isEnabled: boolean): void {
    const _constraint = constraint._pluginData.constraint as Jolt.Constraint;
    _constraint.SetEnabled(isEnabled);
  }
  getEnabled(constraint: PhysicsConstraint): boolean {
    const _constraint = constraint._pluginData.constraint as Jolt.Constraint;
    return _constraint.GetEnabled();
  }
  setCollisionsEnabled(constraint: PhysicsConstraint, isEnabled: boolean): void {
    throw new Error("Method not implemented.");
  }
  getCollisionsEnabled(constraint: PhysicsConstraint): boolean {
    throw new Error("Method not implemented.");
  }
  setAxisFriction(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, friction: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisFriction(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMode(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, limitMode: PhysicsConstraintAxisLimitMode): void {
    throw new Error("Method not implemented.");
  }
  getAxisMode(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintAxisLimitMode> {
    throw new Error("Method not implemented.");
  }
  setAxisMinLimit(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, minLimit: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMinLimit(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMaxLimit(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, limit: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMaxLimit(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorType(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, motorType: PhysicsConstraintMotorType): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorType(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintMotorType> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorTarget(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, target: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorTarget(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorMaxForce(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis, maxForce: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorMaxForce(constraint: PhysicsConstraint, axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  disposeConstraint(constraint: PhysicsConstraint): void {
    throw new Error("Method not implemented.");
  }
  getBodiesUsingConstraint(constraint: PhysicsConstraint): ConstrainedBodyPair[] {
    throw new Error("Method not implemented.");
  }
  raycast(from: Vector3, to: Vector3, result: PhysicsRaycastResult, query?: IRaycastQuery | undefined): void {
    throw new Error("Method not implemented.");
  }
  dispose(): void {
    const outstandingBodies = Object.values(this._physicsBodyHash);
    outstandingBodies.forEach(impostor => {
      impostor.dispose();
    })
    this.toDispose.forEach(joltObj => {
      Jolt.destroy(joltObj);
    });
    this._raycaster.dispose();
    (this.world as any) = null;
  }

  }
}