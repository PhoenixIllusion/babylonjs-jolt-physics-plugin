import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { Vector3, Quaternion, Matrix, TmpVectors } from "@babylonjs/core/Maths/math";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Observable } from "@babylonjs/core/Misc/observable";
import { PhysicsRaycastResult, IRaycastQuery } from "@babylonjs/core/Physics/physicsRaycastResult";
import { ConstrainedBodyPair, IBasePhysicsCollisionEvent, IPhysicsCollisionEvent, IPhysicsEnginePluginV2, PhysicsConstraintAxis, PhysicsConstraintAxisLimitMode, PhysicsConstraintMotorType, PhysicsMassProperties, PhysicsMotionType, PhysicsShapeParameters, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";
import { Nullable } from "@babylonjs/core/types";
import Jolt, { loadJolt } from "../jolt-import";
import { GetJoltVec3, LAYER_MOVING, LAYER_NON_MOVING, SetJoltVec3 } from "../jolt-util";
import { RayCastUtility } from "../jolt-raycast";
import { CollisionMap, ContactCollectorV2 } from "./jolt-contact";
import { JoltPhysicsShape, castJoltShape, createShape } from "./jolt-shape";
import { IJoltBodyData, JoltBodyManager, JoltPhysicsBody } from "./jolt-body";
import { JoltConstraintManager, JoltPhysicsConstraint } from "./jolt-constraint";
import { JoltContactSetting, OnContactValidateResponse } from "../jolt-contact";
import { MotorcycleController, Vehicle, WheeledVehicleController, WheeledVehicleInput } from "../jolt-physics-vehicle-controller";


export class JoltJSPlugin implements IPhysicsEnginePluginV2 {

  world: Jolt.PhysicsSystem;

  onCollisionObservable: Observable<IPhysicsCollisionEvent> = new Observable<IPhysicsCollisionEvent>();
  onCollisionEndedObservable: Observable<IBasePhysicsCollisionEvent> = new Observable<IBasePhysicsCollisionEvent>();
  onTriggerCollisionObservable: Observable<IBasePhysicsCollisionEvent> = new Observable<IBasePhysicsCollisionEvent>();


  public name = 'JoltJSPlugin';

  private _timeStep: number = 1 / 60;
  private _fixedTimeStep: number = 1 / 60;
  private _maxSteps = 10;

  private _tempVec3A: Jolt.Vec3;
  private _tempVec3B: Jolt.Vec3;

  private _tempQuaternion: Jolt.Quat;
  private _bodyInterface: Jolt.BodyInterface;

  private _raycaster: RayCastUtility;

  private _contactCollector: ContactCollectorV2;
  private _contactListener: Jolt.ContactListenerJS;

  private _physicsBodyHash: { [hash: number]: {body: JoltPhysicsBody, index: number} } = {};
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

    JoltBodyManager.init();
    this.toDispose.push(this.jolt, this._tempVec3A, this._tempVec3B, this._tempQuaternion, this._contactListener);
  }

  private GetPhysicsBodyForBodyId(seqAndNum: number): {body: JoltPhysicsBody, index: number} {
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

  executeStep(delta: number, physicsBodies: JoltPhysicsBody[]): void {
    this._contactCollector.clear();
    for (const physicsBody of physicsBodies) {
      JoltBodyManager.getAllPluginReference(physicsBody).forEach( (pluginData,i) => {
        if(!pluginData.body && pluginData.shape) {
            const body = pluginData.body = JoltBodyManager.generatePhysicsBody(this._bodyInterface, pluginData);
            this._bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
            const bodyID = body.GetID().GetIndexAndSequenceNumber();
            this._physicsBodyHash[bodyID] = { body: physicsBody, index: i};
            this._bodyHash[bodyID] = pluginData.body;
        }
        if(pluginData.body) {
          const bodyID = pluginData.body.GetID().GetIndexAndSequenceNumber();
          if(this._collisionCallbacks.add.has(bodyID)) {
            this._contactCollector.registerImpostor(bodyID);
          }
          while(pluginData.onAdd.length > 0) {
            pluginData.onAdd.pop()!(pluginData.body);
          }
        }
      })
      if (physicsBody.disablePreStep) {
          continue;
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
    JoltBodyManager.syncTransform(physicsBody, node);
  }

  getPluginVersion(): number {
    return 2;
  }

  _createPluginData(motionType: PhysicsMotionType, position: Vector3, orientation: Quaternion, massProperties: PhysicsMassProperties): IJoltBodyData {
    const $this: IJoltBodyData = {
      body: null,
      shape: null,
      motionType,
      position: position.clone(),
      orientation: orientation.clone(),
      massProperties,
      toDispose: [],
      onAdd: [],
      plugin: this
    }
    return $this;
  }

  initBody(body: JoltPhysicsBody, motionType: PhysicsMotionType, position: Vector3, orientation: Quaternion): void {
    body._pluginData = this._createPluginData(motionType, position, orientation, {});
  }

  initBodyInstances(body: JoltPhysicsBody, motionType: PhysicsMotionType, mesh: Mesh): void {
    const instancesCount = mesh._thinInstanceDataStorage?.instancesCount ?? 0;
    const matrixData = mesh._thinInstanceDataStorage.worldMatrices;
    if (!matrixData) {
        return; // TODO: error handling
    }
    body._pluginData = this._createPluginData(motionType,  new Vector3(),  new Quaternion(), {});
    body._pluginDataInstances = [];
    const position = TmpVectors.Vector3[0];
    const scale = TmpVectors.Vector3[1];
    const orientation = TmpVectors.Quaternion[0];
    for(let i=0; i< instancesCount; i++) {
      const mat44 = matrixData[i];
      mat44.decompose(scale, orientation, position);
      body._pluginDataInstances[i] = this._createPluginData(motionType, position, orientation, {});
    }
  }

  private _createOrUpdateBodyInstances(body: JoltPhysicsBody, motionType: PhysicsMotionType, matrixData: Matrix[], startIndex: number, endIndex: number, update: boolean): void {
    const position = TmpVectors.Vector3[0];
    const scale = TmpVectors.Vector3[1];
    const orientation = TmpVectors.Quaternion[0];
    for (let i = startIndex; i < endIndex; i++) {
        const mat44 = matrixData[i];
        mat44.decompose(scale, orientation, position);
        if (!update) {
            const pluginData = this._createPluginData(motionType, position, orientation, {});
            if (body._pluginDataInstances.length) {
                // If an instance already exists, copy any user-provided mass properties
                pluginData.massProperties = body._pluginDataInstances[0].massProperties;
                pluginData.shape = body._pluginDataInstances[0].shape;
            }
            body._pluginDataInstances.push(pluginData);
        } else {
          const data = JoltBodyManager.getPluginReference(body, i);
          data.position.copyFrom(position);
          data.orientation.copyFrom(orientation);
          if(data.body) {
            JoltBodyManager.syncBody(position, orientation, data.body, this._bodyInterface);
          }
        }
    }
}

  updateBodyInstances(body: JoltPhysicsBody, mesh: Mesh): void {
    const instancesCount = mesh._thinInstanceDataStorage?.instancesCount ?? 0;
    const matrixData = mesh._thinInstanceDataStorage.worldMatrices;
    if (!matrixData) {
        return; // TODO: error handling
    }
    const pluginInstancesCount = body._pluginDataInstances.length;
    const motionType = this.getMotionType(body);
    this._createOrUpdateBodyInstances(body, motionType, matrixData, 0, Math.min(instancesCount, pluginInstancesCount), true);
    if (instancesCount > pluginInstancesCount) {
        this._createOrUpdateBodyInstances(body, motionType, matrixData, pluginInstancesCount, instancesCount, false);
    } else if (instancesCount < pluginInstancesCount) {
        const instancesToRemove = pluginInstancesCount - instancesCount;
        for (let i = 0; i < instancesToRemove; i++) {
          const data = body._pluginDataInstances.pop()!;
          if(data.body) {
            this._bodyInterface.RemoveBody(data.body.GetID())
          }
          this._disposeJoltBody(data);
        }
        this._createOrUpdateBodyInstances(body, motionType, matrixData, 0, instancesCount, true);
    }
  }

  removeBody(body: JoltPhysicsBody): void {
    const _body = JoltBodyManager.getPluginReference(body);
    if(_body.body) {
      this._bodyInterface.RemoveBody(_body.body.GetID());
    }
  }

  sync(body: JoltPhysicsBody): void {
    this.syncTransform(body, body.transformNode);
  }

  syncTransform(body: JoltPhysicsBody, transformNode: TransformNode): void {
    JoltBodyManager.syncTransform(body, transformNode);
  }

  setShape(body: JoltPhysicsBody, shape: Nullable<JoltPhysicsShape>): void {
    if(shape) {
      JoltBodyManager.getAllPluginReference(body).forEach( data => {
        data.shape = shape;
        if(data.body) {
          this._bodyInterface.SetShape(data.body.GetID(), this._getJoltShape(shape), true, Jolt.EActivation_Activate);
        }
      });
    }
  }
  getShape(body: JoltPhysicsBody): Nullable<JoltPhysicsShape> {
    const _body = JoltBodyManager.getPluginReference(body);
    return _body.shape;
  }

  private _getJoltShape(shape: JoltPhysicsShape): Jolt.Shape {
    return shape._pluginData.shape as Jolt.Shape;
  }

  getShapeType(shape: JoltPhysicsShape): PhysicsShapeType {
    if (shape.type) {
        return shape.type;
    } else {
        //<todo This returns a native type!
        const _shape = shape._pluginData.shape as Jolt.Shape;
        return _shape.GetSubType();
    }
  }
  setEventMask(_body: JoltPhysicsBody, _eventMask: number, _instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }
  getEventMask(_body: JoltPhysicsBody, _instanceIndex?: number | undefined): number {
    throw new Error("Method not implemented.");
  }
  setMotionType(body: JoltPhysicsBody, motionType: PhysicsMotionType, instanceIndex?: number | undefined): void {
    body._pluginData.motionType = motionType;
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.motionType = motionType;
    _body.onAdd.push(body => 
      this._bodyInterface.SetMotionType(body.GetID(), JoltBodyManager.GetMotionType(motionType), Jolt.EActivation_Activate)
    );
  }
  getMotionType(body: JoltPhysicsBody, instanceIndex?: number | undefined): PhysicsMotionType {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    return _body.motionType;
  }
  computeMassProperties(body: JoltPhysicsBody, instanceIndex?: number | undefined): PhysicsMassProperties {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    return _body.massProperties;
  }
  setMassProperties(body: JoltPhysicsBody, massProps: PhysicsMassProperties, instanceIndex?: number | undefined): void {
    body._pluginData.massProperties = massProps;
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => {
      if(massProps.mass)
        body.GetMotionProperties().SetInverseMass(1/massProps.mass);
    });
  }
  getMassProperties(body: JoltPhysicsBody, instanceIndex?: number | undefined): PhysicsMassProperties {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    return _body.massProperties;
  }
  setLinearDamping(body: JoltPhysicsBody, damping: number, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => 
      body.GetMotionProperties().SetLinearDamping(damping)
    );
  }
  getLinearDamping(body: JoltPhysicsBody, instanceIndex?: number | undefined): number {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    if(_body.body) {
      _body.body.GetMotionProperties().GetLinearDamping();
    };
    return -1;
  }
  setAngularDamping(body: JoltPhysicsBody, damping: number, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => 
      body.GetMotionProperties().SetAngularDamping(damping)
    );
  }
  getAngularDamping(body: JoltPhysicsBody, instanceIndex?: number | undefined): number {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    if(_body.body) {
      _body.body.GetMotionProperties().GetAngularDamping();
    };
    return -1;
  }
  setLinearVelocity(body: JoltPhysicsBody, linVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => 
      body.SetLinearVelocity(SetJoltVec3(linVel, this._tempVec3A))
    );
  }
  getLinearVelocityToRef(body: JoltPhysicsBody, linVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    if(_body.body) {
      GetJoltVec3(_body.body.GetLinearVelocity(), linVel)
    };
  }
  applyImpulse(body: JoltPhysicsBody, impulse: Vector3, location: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => 
      body.AddImpulse(SetJoltVec3(impulse, this._tempVec3A),SetJoltVec3(location, this._tempVec3B))
    );
  }
  applyForce(body: JoltPhysicsBody, force: Vector3, location: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    if(_body.body) {
      _body.body.AddForce(SetJoltVec3(force, this._tempVec3A),SetJoltVec3(location, this._tempVec3B))
    };
  }
  setAngularVelocity(body: JoltPhysicsBody, angVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    _body.onAdd.push(body => 
      body.SetAngularVelocity(SetJoltVec3(angVel, this._tempVec3A))
    );
  }
  getAngularVelocityToRef(body: JoltPhysicsBody, angVel: Vector3, instanceIndex?: number | undefined): void {
    const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
    if(_body.body) {
      GetJoltVec3(_body.body.GetAngularVelocity(), angVel)
    };
    
  }

  getBodyGeometry(_body: JoltPhysicsBody): {} {
    throw new Error("Method not implemented.");
  }

  _disposeJoltBody(instance: IJoltBodyData) {
    const _body = instance.body;
    if(_body) {
      this._bodyInterface.DestroyBody(_body.GetID());
      delete this._physicsBodyHash[_body.GetID().GetIndexAndSequenceNumber()]
      delete this._bodyHash[_body.GetID().GetIndexAndSequenceNumber()]
    }

    instance.toDispose.forEach((d: any) => {
      Jolt.destroy(d);
    });
    instance.toDispose = [];
  }

  disposeBody(body: JoltPhysicsBody): void {
    if (this.world) {
      if (body._pluginDataInstances && body._pluginDataInstances.length > 0) {
        for (const instance of body._pluginDataInstances) {
            this._disposeJoltBody(instance);
        }
      }

      if (body._pluginData) {
        this._disposeJoltBody(body._pluginData);
      }
    }
  }

  setCollisionCallbackEnabled(_body: JoltPhysicsBody, _enabled: boolean, _instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }

  setCollisionEndedCallbackEnabled(_body: JoltPhysicsBody, _enabled: boolean, _instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }

  getCollisionObservable(_body: JoltPhysicsBody, _instanceIndex?: number | undefined): Observable<IPhysicsCollisionEvent> {
    throw new Error("Method not implemented.");
  }

  getCollisionEndedObservable(_body: JoltPhysicsBody, _instanceIndex?: number | undefined): Observable<IBasePhysicsCollisionEvent> {
    throw new Error("Method not implemented.");
  }

  setGravityFactor(_body: JoltPhysicsBody, _factor: number, _instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }

  getGravityFactor(_body: JoltPhysicsBody, _instanceIndex?: number | undefined): number {
    throw new Error("Method not implemented.");
  }

  setTargetTransform(_body: JoltPhysicsBody, _position: Vector3, _rotation: Quaternion, _instanceIndex?: number | undefined): void {
    throw new Error("Method not implemented.");
  }

  initShape(shape: JoltPhysicsShape, type: PhysicsShapeType, options: PhysicsShapeParameters): void {
    shape._pluginData = shape._pluginData || {};
    shape._pluginData.shape = createShape(type, options, this._tempVec3A);
  }

  setShapeFilterMembershipMask(_shape: JoltPhysicsShape, _membershipMask: number): void {
    throw new Error("Method not implemented.");
  }

  getShapeFilterMembershipMask(_shape: JoltPhysicsShape): number {
    throw new Error("Method not implemented.");
  }

  setShapeFilterCollideMask(_shape: JoltPhysicsShape, _collideMask: number): void {
    throw new Error("Method not implemented.");
  }

  getShapeFilterCollideMask(_shape: JoltPhysicsShape): number {
    throw new Error("Method not implemented.");
  }

  setMaterial(shape: JoltPhysicsShape, material: PhysicsMaterial): void {
    shape._pluginData.material = material;
  }

  getMaterial(shape: JoltPhysicsShape): PhysicsMaterial {
    return shape._pluginData.material || {};
  }

  setDensity(shape: JoltPhysicsShape, density: number): void {
    shape._pluginData.density = density;
    if(shape._pluginData.shape) {
      const _shape = castJoltShape(shape._pluginData.shape);
      if(_shape instanceof Jolt.ConvexShape) {
        _shape.SetDensity(density)
      }
    }
  }

  getDensity(shape: JoltPhysicsShape): number {
    let density = 0;
    if(shape._pluginData.shape) {
      const _shape = castJoltShape(shape._pluginData.shape);
      if(_shape instanceof Jolt.ConvexShape) {
        density = _shape.GetDensity()
      }
      shape._pluginData.density = density;
    }
    return shape._pluginData.density || 0;
  }

  addChild(shape: JoltPhysicsShape, newChild: JoltPhysicsShape, translation?: Vector3 | undefined, rotation?: Quaternion | undefined, scale?: Vector3 | undefined): void {
    if(shape.type != PhysicsShapeType.CONTAINER) {
      throw Error('Unable to add shapes to non-container');
    }
    if(shape._pluginData.shape != null) {
      shape._pluginData.children = shape._pluginData.children || [];
      shape._pluginData.children.push({ child: newChild, translation, rotation, scale}) 
    } else {
      throw Error('Container Shape already initialized. Static Containers only support modification prior to being added to Body .')
    }
    
  }

  removeChild(shape: JoltPhysicsShape, childIndex: number): void {
    if(shape.type != PhysicsShapeType.CONTAINER) {
      throw Error('Unable to remove shapes from non-container');
    }
    if(shape._pluginData.shape != null) {
      shape._pluginData.children = shape._pluginData.children || [];
      shape._pluginData.children.splice(childIndex, 1);
    } else {
      throw Error('Container Shape already initialized. Static Containers only support modification prior to being added to Body .')
    }
  }

  getNumChildren(shape: JoltPhysicsShape): number {
    if(shape.type != PhysicsShapeType.CONTAINER) {
      throw Error('Unable to add shapes to non-container');
    }
    return shape._pluginData.children.length;
  }
  
  getBoundingBox(_shape: JoltPhysicsShape): BoundingBox {
    return {} as BoundingBox;
  }

  disposeShape(shape: JoltPhysicsShape): void {
    const _shape = shape._pluginData.shape;
    if(_shape) {
      Jolt.destroy(_shape);
    }
  }

  setTrigger(shape: JoltPhysicsShape, isTrigger: boolean): void {
    shape._pluginData.isTrigger = isTrigger;
  }

  addConstraint(body: JoltPhysicsBody, childBody: JoltPhysicsBody, constraint: JoltPhysicsConstraint, instanceIndex?: number | undefined, childInstanceIndex?: number | undefined): void {
    this.initConstraint(constraint, body, childBody, instanceIndex, childInstanceIndex);
  }

  initConstraint(constraint: JoltPhysicsConstraint, body: JoltPhysicsBody, childBody: JoltPhysicsBody, instanceIndex?: number | undefined, childInstanceIndex?: number | undefined): void {
    constraint._pluginData = constraint._pluginData || {};
    constraint._pluginData.bodyPair = { parentBody: body, parentBodyIndex: instanceIndex || -1, childBody, childBodyIndex: childInstanceIndex || -1 };

    const bodyA = new Promise<Jolt.Body>(resolve => JoltBodyManager.getPluginReference(body, instanceIndex).onAdd.push((body: Jolt.Body) => resolve(body)));
    const bodyB = new Promise<Jolt.Body>(resolve => JoltBodyManager.getPluginReference(childBody, childInstanceIndex).onAdd.push((body: Jolt.Body) => resolve(body)));

    Promise.all([bodyA, bodyB]).then(([bodyA, bodyB]) => {
      const jConstraint = constraint._pluginData.constraint = JoltConstraintManager.CreateClassicConstraint(bodyA, bodyB, constraint);
      this.world.AddConstraint(jConstraint);
    })
  }
  setEnabled(constraint: JoltPhysicsConstraint, isEnabled: boolean): void {
    const _constraint = constraint._pluginData.constraint;
    _constraint.SetEnabled(isEnabled);
  }
  getEnabled(constraint: JoltPhysicsConstraint): boolean {
    const _constraint = constraint._pluginData.constraint;
    return _constraint.GetEnabled();
  }

  setCollisionsEnabled(_constraint: JoltPhysicsConstraint, _isEnabled: boolean): void {
    throw new Error("Method not implemented.");
  }
  getCollisionsEnabled(_constraint: JoltPhysicsConstraint): boolean {
    throw new Error("Method not implemented.");
  }
  setAxisFriction(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _friction: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisFriction(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMode(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _limitMode: PhysicsConstraintAxisLimitMode): void {
    throw new Error("Method not implemented.");
  }
  getAxisMode(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintAxisLimitMode> {
    throw new Error("Method not implemented.");
  }
  setAxisMinLimit(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _minLimit: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMinLimit(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMaxLimit(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _limit: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMaxLimit(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorType(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _motorType: PhysicsConstraintMotorType): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorType(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<PhysicsConstraintMotorType> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorTarget(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _target: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorTarget(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  setAxisMotorMaxForce(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis, _maxForce: number): void {
    throw new Error("Method not implemented.");
  }
  getAxisMotorMaxForce(_constraint: JoltPhysicsConstraint, _axis: PhysicsConstraintAxis): Nullable<number> {
    throw new Error("Method not implemented.");
  }
  disposeConstraint(constraint: JoltPhysicsConstraint): void {
    const _constraint = constraint._pluginData.constraint;
    this.world.RemoveConstraint(_constraint);
  }

  getBodiesUsingConstraint(constraint: JoltPhysicsConstraint): ConstrainedBodyPair[] {
    return [ constraint._pluginData.bodyPair ]
  }

  raycast(from: Vector3, to: Vector3, result: PhysicsRaycastResult, _query?: IRaycastQuery | undefined): void {
    return this._raycaster.raycastToRef(from, to, result);
  }

  dispose(): void {
    const outstandingBodies = Object.values(this._physicsBodyHash);
    outstandingBodies.forEach(impostor => {
      impostor.body.dispose();
    })
    this.toDispose.forEach(joltObj => {
      Jolt.destroy(joltObj);
    });
    this._raycaster.dispose();
    (this.world as any) = null;
    JoltBodyManager.dispose();
  }

  onContactRemove(_body: number, _withBody: number): void {
  }

  onContactAdd(_body: number, _withBody: number, _contactSettings: JoltContactSetting): void {
  }

  onContactPersist(_body: number, _withBody: number, _contactSettings: JoltContactSetting): void {
  }

  onContactValidate(_body: number, _withBody: number): OnContactValidateResponse {
    return OnContactValidateResponse.AcceptAllContactsForThisBodyPair;
  }


  async createWheeledVehicleController(impostor: JoltPhysicsBody, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.WheeledVehicleController> ): Promise<WheeledVehicleController> {
    const body = await new Promise<Jolt.Body>(resolve => impostor._pluginData.onAdd.push((body: Jolt.Body) => resolve(body)));
    return new WheeledVehicleController(
      {
        body,
        world: this.world,
        toDispose: impostor._pluginData.toDispose,
        registerPerPhysicsStepCallback: (cb) => this.registerPerPhysicsStepCallback(cb)
      },
      settings,
      input
    )
  }

  async createMotorcycleVehicleController(impostor: JoltPhysicsBody, settings: Vehicle.WheeledVehicleSettings, input: WheeledVehicleInput<Jolt.MotorcycleController> ): Promise<MotorcycleController> {
    const body = await new Promise<Jolt.Body>(resolve => impostor._pluginData.onAdd.push((body: Jolt.Body) => resolve(body)));
    return new MotorcycleController(
      {
        body,
        world: this.world,
        toDispose: impostor._pluginData.toDispose,
        registerPerPhysicsStepCallback: (cb) => this.registerPerPhysicsStepCallback(cb)
      },
      settings,
      input
    )
  }
}
