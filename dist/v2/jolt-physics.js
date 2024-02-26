import { Vector3, Quaternion, TmpVectors } from "@babylonjs/core/Maths/math";
import "@babylonjs/core/Meshes/instancedMesh";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import { Observable } from "@babylonjs/core/Misc/observable";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import Jolt, { loadJolt } from "../jolt-import";
import { GetJoltVec3, LAYER_MOVING, LAYER_NON_MOVING, SetJoltVec3 } from "../jolt-util";
import { RayCastUtility } from "../jolt-raycast";
import { ContactCollectorV2 } from "./jolt-contact";
import { castJoltShape, createShape } from "./jolt-shape";
import { JoltBodyManager } from "./jolt-body";
import { JoltConstraintManager } from "./jolt-constraint";
import { OnContactValidateResponse } from "../jolt-contact";
import { MotorcycleController, WheeledVehicleController } from "../jolt-physics-vehicle-controller";
export class JoltJSPlugin {
    static async loadPlugin(_useDeltaForWorldStep = true, physicsSettings, importSettings) {
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
    constructor(jolt, _useDeltaForWorldStep = true) {
        this.jolt = jolt;
        this._useDeltaForWorldStep = _useDeltaForWorldStep;
        this.onCollisionObservable = new Observable();
        this.onCollisionEndedObservable = new Observable();
        this.onTriggerCollisionObservable = new Observable();
        this.name = 'JoltJSPlugin';
        this._timeStep = 1 / 60;
        this._fixedTimeStep = 1 / 60;
        this._maxSteps = 10;
        this._physicsBodyHash = {};
        this._bodyHash = {};
        this.toDispose = [];
        this._perPhysicsStepCallbacks = [];
        this.world = jolt.GetPhysicsSystem();
        this._bodyInterface = this.world.GetBodyInterface();
        this._tempVec3A = new Jolt.Vec3();
        this._tempVec3B = new Jolt.Vec3();
        this._tempQuaternion = new Jolt.Quat();
        this._raycaster = new RayCastUtility(jolt, {
            world: this.world,
            GetBodyForBodyId: (seqAndNum) => this.GetBodyForBodyId(seqAndNum),
            GetPhysicsBodyForBodyId: (seqAndNum) => this.GetPhysicsBodyForBodyId(seqAndNum)
        });
        this._contactListener = new Jolt.ContactListenerJS();
        this._collisionCallbacks = { add: new Set(), remove: new Set(), persist: new Set() };
        this._contactCollector = new ContactCollectorV2(this, this._contactListener, this._collisionCallbacks);
        this.world.SetContactListener(this._contactListener);
        JoltBodyManager.init();
        this.toDispose.push(this.jolt, this._tempVec3A, this._tempVec3B, this._tempQuaternion, this._contactListener);
    }
    GetPhysicsBodyForBodyId(seqAndNum) {
        return this._physicsBodyHash[seqAndNum];
    }
    GetBodyForBodyId(seqAndNum) {
        return this._bodyHash[seqAndNum];
    }
    setGravity(gravity) {
        this._tempVec3A.Set(gravity.x, gravity.y, gravity.z);
        this.world.SetGravity(this._tempVec3A);
    }
    setTimeStep(timeStep) {
        this._timeStep = timeStep;
    }
    setFixedTimeStep(fixedTimeStep) {
        this._fixedTimeStep = fixedTimeStep;
    }
    setMaxSteps(maxSteps) {
        this._maxSteps = maxSteps;
    }
    getTimeStep() {
        return this._timeStep;
    }
    registerPerPhysicsStepCallback(listener) {
        this._perPhysicsStepCallbacks.push(listener);
    }
    unregisterPerPhysicsStepCallback(listener) {
        const index = this._perPhysicsStepCallbacks.indexOf(listener);
        if (index > 0) {
            this._perPhysicsStepCallbacks.splice(index, 1);
        }
    }
    executeStep(delta, physicsBodies) {
        this._contactCollector.clear();
        for (const physicsBody of physicsBodies) {
            JoltBodyManager.getAllPluginReference(physicsBody).forEach((pluginData, i) => {
                if (!pluginData.body && pluginData.shape) {
                    const body = pluginData.body = JoltBodyManager.generatePhysicsBody(this._bodyInterface, pluginData);
                    this._bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
                    const bodyID = body.GetID().GetIndexAndSequenceNumber();
                    this._physicsBodyHash[bodyID] = { body: physicsBody, index: i };
                    this._bodyHash[bodyID] = pluginData.body;
                }
                if (pluginData.body) {
                    const bodyID = pluginData.body.GetID().GetIndexAndSequenceNumber();
                    if (this._collisionCallbacks.add.has(bodyID)) {
                        this._contactCollector.registerImpostor(bodyID);
                    }
                    while (pluginData.onAdd.length > 0) {
                        pluginData.onAdd.pop()(pluginData.body);
                    }
                }
            });
            if (physicsBody.disablePreStep) {
                continue;
            }
            this.setPhysicsBodyTransformation(physicsBody, physicsBody.transformNode);
        }
        this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep, (timeStep) => {
            this._perPhysicsStepCallbacks.forEach(listener => listener(timeStep));
        });
        for (const physicsBody of physicsBodies) {
            this.sync(physicsBody);
        }
    }
    _stepSimulation(timeStep = 1 / 60, maxSteps = 10, fixedTimeStep = 1 / 60, perStep) {
        if (maxSteps == 0) {
            perStep(timeStep);
            this.jolt.Step(timeStep, 1);
        }
        else {
            while (maxSteps > 0 && timeStep > 0) {
                if (timeStep - fixedTimeStep < fixedTimeStep) {
                    perStep(timeStep);
                    this.jolt.Step(timeStep, 1);
                    timeStep = 0;
                }
                else {
                    timeStep -= fixedTimeStep;
                    perStep(fixedTimeStep);
                    this.jolt.Step(fixedTimeStep, 1);
                }
                maxSteps--;
            }
        }
    }
    setPhysicsBodyTransformation(physicsBody, node) {
        JoltBodyManager.syncTransform(physicsBody, node);
    }
    getPluginVersion() {
        return 2;
    }
    _createPluginData(motionType, position, orientation, massProperties) {
        const $this = {
            body: null,
            shape: null,
            motionType,
            position: position.clone(),
            orientation: orientation.clone(),
            massProperties,
            toDispose: [],
            onAdd: [],
            plugin: this
        };
        return $this;
    }
    initBody(body, motionType, position, orientation) {
        body._pluginData = this._createPluginData(motionType, position, orientation, {});
    }
    initBodyInstances(body, motionType, mesh) {
        const instancesCount = mesh._thinInstanceDataStorage?.instancesCount ?? 0;
        const matrixData = mesh._thinInstanceDataStorage.worldMatrices;
        if (!matrixData) {
            return; // TODO: error handling
        }
        body._pluginData = this._createPluginData(motionType, new Vector3(), new Quaternion(), {});
        body._pluginDataInstances = [];
        const position = TmpVectors.Vector3[0];
        const scale = TmpVectors.Vector3[1];
        const orientation = TmpVectors.Quaternion[0];
        for (let i = 0; i < instancesCount; i++) {
            const mat44 = matrixData[i];
            mat44.decompose(scale, orientation, position);
            body._pluginDataInstances[i] = this._createPluginData(motionType, position, orientation, {});
        }
    }
    _createOrUpdateBodyInstances(body, motionType, matrixData, startIndex, endIndex, update) {
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
            }
            else {
                const data = JoltBodyManager.getPluginReference(body, i);
                data.position.copyFrom(position);
                data.orientation.copyFrom(orientation);
                if (data.body) {
                    JoltBodyManager.syncBody(position, orientation, data.body, this._bodyInterface);
                }
            }
        }
    }
    updateBodyInstances(body, mesh) {
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
        }
        else if (instancesCount < pluginInstancesCount) {
            const instancesToRemove = pluginInstancesCount - instancesCount;
            for (let i = 0; i < instancesToRemove; i++) {
                const data = body._pluginDataInstances.pop();
                if (data.body) {
                    this._bodyInterface.RemoveBody(data.body.GetID());
                }
                this._disposeJoltBody(data);
            }
            this._createOrUpdateBodyInstances(body, motionType, matrixData, 0, instancesCount, true);
        }
    }
    removeBody(body) {
        const _body = JoltBodyManager.getPluginReference(body);
        if (_body.body) {
            this._bodyInterface.RemoveBody(_body.body.GetID());
        }
    }
    sync(body) {
        this.syncTransform(body, body.transformNode);
    }
    syncTransform(body, transformNode) {
        JoltBodyManager.syncTransform(body, transformNode);
    }
    setShape(body, shape) {
        if (shape) {
            JoltBodyManager.getAllPluginReference(body).forEach(data => {
                data.shape = shape;
                if (data.body) {
                    this._bodyInterface.SetShape(data.body.GetID(), this._getJoltShape(shape), true, Jolt.EActivation_Activate);
                }
            });
        }
    }
    getShape(body) {
        const _body = JoltBodyManager.getPluginReference(body);
        return _body.shape;
    }
    _getJoltShape(shape) {
        return shape._pluginData.shape;
    }
    getShapeType(shape) {
        if (shape.type) {
            return shape.type;
        }
        else {
            //<todo This returns a native type!
            const _shape = shape._pluginData.shape;
            return _shape.GetSubType();
        }
    }
    setEventMask(_body, _eventMask, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    getEventMask(_body, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    setMotionType(body, motionType, instanceIndex) {
        body._pluginData.motionType = motionType;
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.motionType = motionType;
        _body.onAdd.push(body => this._bodyInterface.SetMotionType(body.GetID(), JoltBodyManager.GetMotionType(motionType), Jolt.EActivation_Activate));
    }
    getMotionType(body, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        return _body.motionType;
    }
    computeMassProperties(body, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        return _body.massProperties;
    }
    setMassProperties(body, massProps, instanceIndex) {
        body._pluginData.massProperties = massProps;
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => {
            if (massProps.mass)
                body.GetMotionProperties().SetInverseMass(1 / massProps.mass);
        });
    }
    getMassProperties(body, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        return _body.massProperties;
    }
    setLinearDamping(body, damping, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => body.GetMotionProperties().SetLinearDamping(damping));
    }
    getLinearDamping(body, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        if (_body.body) {
            _body.body.GetMotionProperties().GetLinearDamping();
        }
        ;
        return -1;
    }
    setAngularDamping(body, damping, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => body.GetMotionProperties().SetAngularDamping(damping));
    }
    getAngularDamping(body, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        if (_body.body) {
            _body.body.GetMotionProperties().GetAngularDamping();
        }
        ;
        return -1;
    }
    setLinearVelocity(body, linVel, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => body.SetLinearVelocity(SetJoltVec3(linVel, this._tempVec3A)));
    }
    getLinearVelocityToRef(body, linVel, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        if (_body.body) {
            GetJoltVec3(_body.body.GetLinearVelocity(), linVel);
        }
        ;
    }
    applyImpulse(body, impulse, location, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => body.AddImpulse(SetJoltVec3(impulse, this._tempVec3A), SetJoltVec3(location, this._tempVec3B)));
    }
    applyForce(body, force, location, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        if (_body.body) {
            _body.body.AddForce(SetJoltVec3(force, this._tempVec3A), SetJoltVec3(location, this._tempVec3B));
        }
        ;
    }
    setAngularVelocity(body, angVel, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        _body.onAdd.push(body => body.SetAngularVelocity(SetJoltVec3(angVel, this._tempVec3A)));
    }
    getAngularVelocityToRef(body, angVel, instanceIndex) {
        const _body = JoltBodyManager.getPluginReference(body, instanceIndex);
        if (_body.body) {
            GetJoltVec3(_body.body.GetAngularVelocity(), angVel);
        }
        ;
    }
    getBodyGeometry(_body) {
        throw new Error("Method not implemented.");
    }
    _disposeJoltBody(instance) {
        const _body = instance.body;
        if (_body) {
            this._bodyInterface.DestroyBody(_body.GetID());
            delete this._physicsBodyHash[_body.GetID().GetIndexAndSequenceNumber()];
            delete this._bodyHash[_body.GetID().GetIndexAndSequenceNumber()];
        }
        instance.toDispose.forEach((d) => {
            Jolt.destroy(d);
        });
        instance.toDispose = [];
    }
    disposeBody(body) {
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
    setCollisionCallbackEnabled(_body, _enabled, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    setCollisionEndedCallbackEnabled(_body, _enabled, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    getCollisionObservable(_body, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    getCollisionEndedObservable(_body, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    setGravityFactor(_body, _factor, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    getGravityFactor(_body, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    setTargetTransform(_body, _position, _rotation, _instanceIndex) {
        throw new Error("Method not implemented.");
    }
    initShape(shape, type, options) {
        shape._pluginData = shape._pluginData || {};
        shape._pluginData.shape = createShape(type, options, this._tempVec3A);
    }
    setShapeFilterMembershipMask(_shape, _membershipMask) {
        throw new Error("Method not implemented.");
    }
    getShapeFilterMembershipMask(_shape) {
        throw new Error("Method not implemented.");
    }
    setShapeFilterCollideMask(_shape, _collideMask) {
        throw new Error("Method not implemented.");
    }
    getShapeFilterCollideMask(_shape) {
        throw new Error("Method not implemented.");
    }
    setMaterial(shape, material) {
        shape._pluginData.material = material;
    }
    getMaterial(shape) {
        return shape._pluginData.material || {};
    }
    setDensity(shape, density) {
        shape._pluginData.density = density;
        if (shape._pluginData.shape) {
            const _shape = castJoltShape(shape._pluginData.shape);
            if (_shape instanceof Jolt.ConvexShape) {
                _shape.SetDensity(density);
            }
        }
    }
    getDensity(shape) {
        let density = 0;
        if (shape._pluginData.shape) {
            const _shape = castJoltShape(shape._pluginData.shape);
            if (_shape instanceof Jolt.ConvexShape) {
                density = _shape.GetDensity();
            }
            shape._pluginData.density = density;
        }
        return shape._pluginData.density || 0;
    }
    addChild(shape, newChild, translation, rotation, scale) {
        if (shape.type != PhysicsShapeType.CONTAINER) {
            throw Error('Unable to add shapes to non-container');
        }
        if (shape._pluginData.shape != null) {
            shape._pluginData.children = shape._pluginData.children || [];
            shape._pluginData.children.push({ child: newChild, translation, rotation, scale });
        }
        else {
            throw Error('Container Shape already initialized. Static Containers only support modification prior to being added to Body .');
        }
    }
    removeChild(shape, childIndex) {
        if (shape.type != PhysicsShapeType.CONTAINER) {
            throw Error('Unable to remove shapes from non-container');
        }
        if (shape._pluginData.shape != null) {
            shape._pluginData.children = shape._pluginData.children || [];
            shape._pluginData.children.splice(childIndex, 1);
        }
        else {
            throw Error('Container Shape already initialized. Static Containers only support modification prior to being added to Body .');
        }
    }
    getNumChildren(shape) {
        if (shape.type != PhysicsShapeType.CONTAINER) {
            throw Error('Unable to add shapes to non-container');
        }
        return shape._pluginData.children.length;
    }
    getBoundingBox(_shape) {
        return {};
    }
    disposeShape(shape) {
        const _shape = shape._pluginData.shape;
        if (_shape) {
            Jolt.destroy(_shape);
        }
    }
    setTrigger(shape, isTrigger) {
        shape._pluginData.isTrigger = isTrigger;
    }
    addConstraint(body, childBody, constraint, instanceIndex, childInstanceIndex) {
        this.initConstraint(constraint, body, childBody, instanceIndex, childInstanceIndex);
    }
    initConstraint(constraint, body, childBody, instanceIndex, childInstanceIndex) {
        constraint._pluginData = constraint._pluginData || {};
        constraint._pluginData.bodyPair = { parentBody: body, parentBodyIndex: instanceIndex || -1, childBody, childBodyIndex: childInstanceIndex || -1 };
        const bodyA = new Promise(resolve => JoltBodyManager.getPluginReference(body, instanceIndex).onAdd.push((body) => resolve(body)));
        const bodyB = new Promise(resolve => JoltBodyManager.getPluginReference(childBody, childInstanceIndex).onAdd.push((body) => resolve(body)));
        Promise.all([bodyA, bodyB]).then(([bodyA, bodyB]) => {
            const jConstraint = constraint._pluginData.constraint = JoltConstraintManager.CreateClassicConstraint(bodyA, bodyB, constraint);
            this.world.AddConstraint(jConstraint);
        });
    }
    setEnabled(constraint, isEnabled) {
        const _constraint = constraint._pluginData.constraint;
        _constraint.SetEnabled(isEnabled);
    }
    getEnabled(constraint) {
        const _constraint = constraint._pluginData.constraint;
        return _constraint.GetEnabled();
    }
    setCollisionsEnabled(_constraint, _isEnabled) {
        throw new Error("Method not implemented.");
    }
    getCollisionsEnabled(_constraint) {
        throw new Error("Method not implemented.");
    }
    setAxisFriction(_constraint, _axis, _friction) {
        throw new Error("Method not implemented.");
    }
    getAxisFriction(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMode(_constraint, _axis, _limitMode) {
        throw new Error("Method not implemented.");
    }
    getAxisMode(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMinLimit(_constraint, _axis, _minLimit) {
        throw new Error("Method not implemented.");
    }
    getAxisMinLimit(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMaxLimit(_constraint, _axis, _limit) {
        throw new Error("Method not implemented.");
    }
    getAxisMaxLimit(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMotorType(_constraint, _axis, _motorType) {
        throw new Error("Method not implemented.");
    }
    getAxisMotorType(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMotorTarget(_constraint, _axis, _target) {
        throw new Error("Method not implemented.");
    }
    getAxisMotorTarget(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    setAxisMotorMaxForce(_constraint, _axis, _maxForce) {
        throw new Error("Method not implemented.");
    }
    getAxisMotorMaxForce(_constraint, _axis) {
        throw new Error("Method not implemented.");
    }
    disposeConstraint(constraint) {
        const _constraint = constraint._pluginData.constraint;
        this.world.RemoveConstraint(_constraint);
    }
    getBodiesUsingConstraint(constraint) {
        return [constraint._pluginData.bodyPair];
    }
    raycast(from, to, result, _query) {
        return this._raycaster.raycastToRef(from, to, result);
    }
    dispose() {
        const outstandingBodies = Object.values(this._physicsBodyHash);
        outstandingBodies.forEach(impostor => {
            impostor.body.dispose();
        });
        this.toDispose.forEach(joltObj => {
            Jolt.destroy(joltObj);
        });
        this._raycaster.dispose();
        this.world = null;
        JoltBodyManager.dispose();
    }
    onContactRemove(_body, _withBody) {
    }
    onContactAdd(_body, _withBody, _contactSettings) {
    }
    onContactPersist(_body, _withBody, _contactSettings) {
    }
    onContactValidate(_body, _withBody) {
        return OnContactValidateResponse.AcceptAllContactsForThisBodyPair;
    }
    async createWheeledVehicleController(impostor, settings, input) {
        const body = await new Promise(resolve => impostor._pluginData.onAdd.push((body) => resolve(body)));
        return new WheeledVehicleController({
            body,
            world: this.world,
            toDispose: impostor._pluginData.toDispose,
            registerPerPhysicsStepCallback: (cb) => this.registerPerPhysicsStepCallback(cb)
        }, settings, input);
    }
    async createMotorcycleVehicleController(impostor, settings, input) {
        const body = await new Promise(resolve => impostor._pluginData.onAdd.push((body) => resolve(body)));
        return new MotorcycleController({
            body,
            world: this.world,
            toDispose: impostor._pluginData.toDispose,
            registerPerPhysicsStepCallback: (cb) => this.registerPerPhysicsStepCallback(cb)
        }, settings, input);
    }
}
