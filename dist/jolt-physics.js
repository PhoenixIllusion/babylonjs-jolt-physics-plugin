import { JoltCharacterVirtualImpostor, JoltCharacterVirtual } from './jolt-physics-character-virtual';
import Jolt, { loadJolt } from './jolt-import';
import { ContactCollector } from './jolt-contact';
import { RayCastUtility } from './jolt-raycast';
import { LAYER_MOVING, LAYER_NON_MOVING, SetJoltQuat, SetJoltVec3 } from './jolt-util';
import { Epsilon, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Logger } from '@babylonjs/core/Misc/logger';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { MotorEnabledJoint, PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import '@babylonjs/core/Physics/physicsEngineComponent';
import * as JoltConstraintManager from './constraints';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import './jolt-impostor';
export { setJoltModule } from './jolt-import';
export var Jolt_Type;
(function (Jolt_Type) {
    Jolt_Type[Jolt_Type["CHARACTER"] = 200] = "CHARACTER";
    Jolt_Type[Jolt_Type["VIRTUAL_CHARACTER"] = 201] = "VIRTUAL_CHARACTER";
})(Jolt_Type || (Jolt_Type = {}));
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
        this.name = 'JoltJSPlugin';
        this._timeStep = 1 / 60;
        this._fixedTimeStep = 1 / 60;
        this._maxSteps = 10;
        this._tempQuaternionBJS = new Quaternion();
        this._impostorLookup = {};
        this.toDispose = [];
        this._perPhysicsStepCallbacks = [];
        this.world = jolt.GetPhysicsSystem();
        this._bodyInterface = this.world.GetBodyInterface();
        this._tempVec3A = new Jolt.Vec3();
        this._tempVec3B = new Jolt.Vec3();
        this._tempQuaternion = new Jolt.Quat();
        this._raycaster = new RayCastUtility(jolt, this);
        this._contactListener = new Jolt.ContactListenerJS();
        this._contactCollector = new ContactCollector(this._contactListener);
        this.world.SetContactListener(this._contactListener);
        this.toDispose.push(this.jolt, this._tempVec3A, this._tempVec3B, this._tempQuaternion, this._contactListener);
    }
    setGravity(gravity) {
        this._tempVec3A.Set(gravity.x, gravity.y, gravity.z);
        this.world.SetGravity(this._tempVec3A);
    }
    setTimeStep(timeStep) {
        this._timeStep = timeStep;
    }
    /**
     * Increment to step forward in the physics engine (If timeStep is set to 1/60 and fixedTimeStep is set to 1/120 the physics engine should run 2 steps per frame) (Default: 1/60)
     * @param fixedTimeStep fixedTimeStep to use in seconds
     */
    setFixedTimeStep(fixedTimeStep) {
        this._fixedTimeStep = fixedTimeStep;
    }
    /**
     * Sets the maximum number of steps by the physics engine per frame (Default: 5)
     * @param maxSteps the maximum number of steps by the physics engine per frame
     */
    setMaxSteps(maxSteps) {
        this._maxSteps = maxSteps;
    }
    /**
     * Gets the current timestep (only used if useDeltaForWorldStep is false in the constructor)
     * @returns the current timestep in seconds
     */
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
    executeStep(delta, impostors) {
        this._contactCollector.clear();
        const characterVirtuals = [];
        for (const impostor of impostors) {
            // Update physics world objects to match babylon world
            if (!impostor.soft && !impostor.joltPluginData.frozen) {
                impostor.beforeStep();
            }
            if (impostor.physicsBody instanceof Jolt.Body) {
                const body = impostor.physicsBody;
                const bodyID = body.GetID().GetIndexAndSequenceNumber();
                this._contactCollector.registerImpostor(bodyID, impostor);
            }
            if (impostor instanceof JoltCharacterVirtualImpostor) {
                characterVirtuals.push(impostor);
            }
        }
        this._stepSimulation(this._useDeltaForWorldStep ? delta : this._timeStep, this._maxSteps, this._fixedTimeStep, (timeStep) => {
            characterVirtuals.forEach(vChar => vChar.controller?.prePhysicsUpdate(timeStep));
            this._perPhysicsStepCallbacks.forEach(listener => listener(timeStep));
        });
        for (const impostor of impostors) {
            // Update physics world objects to match babylon world
            if (!impostor.soft && !impostor.joltPluginData.frozen) {
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
    getPluginVersion() {
        return 1;
    }
    applyImpulse(impostor, force, contactPoint) {
        if (!impostor.soft) {
            const physicsBody = impostor.physicsBody;
            const worldPoint = this._tempVec3A;
            const impulse = this._tempVec3B;
            SetJoltVec3(force, impulse);
            SetJoltVec3(contactPoint, worldPoint);
            physicsBody.AddImpulse(impulse, worldPoint);
        }
        else {
            Logger.Warn('Cannot be applied to a soft body');
        }
    }
    applyForce(impostor, force, contactPoint) {
        if (!impostor.soft) {
            const physicsBody = impostor.physicsBody;
            const worldPoint = this._tempVec3A;
            const impulse = this._tempVec3B;
            SetJoltVec3(force, impulse);
            SetJoltVec3(contactPoint, worldPoint);
            physicsBody.AddForce(impulse, worldPoint);
        }
        else {
            Logger.Warn('Cannot be applied to a soft body');
        }
    }
    generatePhysicsBody(impostor) {
        impostor._pluginData = impostor._pluginData || {};
        impostor.joltPluginData.toDispose = [];
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
                const imp = impostor;
                const shape = this._createShape(impostor);
                const char = new JoltCharacterVirtual(imp, shape, { physicsSystem: this.world, jolt: this.jolt }, this);
                char.init();
                shape.Release();
                imp.physicsBody = char.getCharacter();
                imp._pluginData.controller = char;
                this._impostorLookup[-performance.now()] = impostor;
                return;
            }
            const shape = this._createShape(impostor);
            const mass = impostor.getParam('mass');
            const friction = impostor.getParam('friction');
            const restitution = impostor.getParam('restitution');
            const collision = impostor.getParam('collision');
            impostor.object.computeWorldMatrix(true);
            SetJoltVec3(impostor.object.position, this._tempVec3A);
            SetJoltQuat(impostor.object.rotationQuaternion, this._tempQuaternion);
            const isStatic = (mass === 0) ? Jolt.EMotionType_Static : Jolt.EMotionType_Dynamic;
            const layer = (mass === 0) ? LAYER_NON_MOVING : LAYER_MOVING;
            const settings = new Jolt.BodyCreationSettings(shape, this._tempVec3A, this._tempQuaternion, isStatic, layer);
            if (collision) {
                if (collision.group !== undefined) {
                    settings.mCollisionGroup.SetGroupID(collision.group);
                }
                if (collision.subGroup !== undefined) {
                    settings.mCollisionGroup.SetSubGroupID(collision.subGroup);
                }
                if (collision.filter !== undefined) {
                    settings.mCollisionGroup.SetGroupFilter(collision.filter);
                }
            }
            impostor.joltPluginData.mass = mass;
            impostor.joltPluginData.friction = friction;
            impostor.joltPluginData.restitution = restitution;
            impostor.joltPluginData.frozen = !!impostor.getParam('frozen');
            impostor.joltPluginData.plugin = this;
            settings.mRestitution = restitution || 0;
            settings.mFriction = friction || 0;
            if (mass !== 0) {
                settings.mOverrideMassProperties = Jolt.EOverrideMassProperties_CalculateInertia;
                settings.mMassPropertiesOverride.mMass = mass;
            }
            const body = impostor.physicsBody = this._bodyInterface.CreateBody(settings);
            shape.Release();
            Jolt.destroy(settings);
            this._bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
            this._impostorLookup[body.GetID().GetIndexAndSequenceNumber()] = impostor;
        }
    }
    GetImpostorForBodyId(id) {
        return this._impostorLookup[id];
    }
    /**
    * Removes the physics body from the imposter and disposes of the body's memory
    * @param impostor imposter to remove the physics body from
    */
    removePhysicsBody(impostor) {
        if (impostor instanceof JoltCharacterVirtualImpostor) {
            if (impostor.joltPluginData) {
                impostor.joltPluginData.toDispose.forEach((d) => {
                    Jolt.destroy(d);
                });
                impostor.joltPluginData.toDispose = [];
            }
            return;
        }
        if (this.world) {
            delete this._impostorLookup[impostor.physicsBody.GetID().GetIndexAndSequenceNumber()];
            this._bodyInterface.RemoveBody(impostor.physicsBody.GetID());
            this._bodyInterface.DestroyBody(impostor.physicsBody.GetID());
            if (impostor.joltPluginData) {
                impostor.joltPluginData.toDispose.forEach((d) => {
                    Jolt.destroy(d);
                });
                impostor.joltPluginData.toDispose = [];
            }
        }
    }
    _getMeshVertexData(impostor) {
        const object = impostor.getParam('mesh') || impostor.object;
        const rawVerts = object.getVerticesData ? object.getVerticesData(VertexBuffer.PositionKind) : [];
        const indices = (object.getIndices && object.getIndices()) ? object.getIndices() : [];
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
        const transformedVertices = new Array();
        let index;
        for (index = 0; index < rawVerts.length; index += 3) {
            Vector3.TransformCoordinates(Vector3.FromArray(rawVerts, index), transform).toArray(transformedVertices, index);
        }
        //now set back the transformation!
        object.position.copyFrom(oldPosition);
        oldRotation && object.rotation && object.rotation.copyFrom(oldRotation);
        oldQuaternion && object.rotationQuaternion && object.rotationQuaternion.copyFrom(oldQuaternion);
        const hasIndex = (indices.length > 0);
        const faceCount = hasIndex ? indices.length / 3 : transformedVertices.length / 9;
        return {
            indices,
            vertices: transformedVertices,
            faceCount
        };
    }
    _createShape(impostor) {
        const settings = this._createShapeSettings(impostor);
        const shapeResult = settings.Create();
        if (shapeResult.HasError()) {
            throw new Error('Creating Jolt Shape : Impostor Type -' + impostor.type + ' : Error - ' + shapeResult.GetError().c_str());
        }
        const shape = shapeResult.Get();
        shape.AddRef();
        Jolt.destroy(settings);
        return shape;
    }
    _createShapeSettings(impostor) {
        const impostorExtents = impostor.getParam('extents') || impostor.getObjectExtents();
        const checkWithEpsilon = (value) => {
            return Math.max(value, Epsilon);
        };
        let returnValue = undefined;
        switch (impostor.type) {
            case PhysicsImpostor.SphereImpostor:
                const radiusX = impostorExtents.x;
                const radiusY = impostorExtents.y;
                const radiusZ = impostorExtents.z;
                const size = Math.max(checkWithEpsilon(radiusX), checkWithEpsilon(radiusY), checkWithEpsilon(radiusZ)) / 2;
                returnValue = new Jolt.SphereShapeSettings(size);
                break;
            case PhysicsImpostor.CapsuleImpostor: {
                const radiusTop = impostor.getParam('radiusTop');
                const radiusBottom = impostor.getParam('radiusBottom');
                if (radiusTop && radiusBottom) {
                    const capRadius = impostorExtents.x / 2;
                    returnValue = new Jolt.TaperedCapsuleShapeSettings(impostorExtents.y / 2 - capRadius, radiusTop, radiusBottom);
                }
                else {
                    const capRadius = impostorExtents.x / 2;
                    returnValue = new Jolt.CapsuleShapeSettings(impostorExtents.y / 2 - capRadius, capRadius);
                }
                break;
            }
            case PhysicsImpostor.CylinderImpostor:
                returnValue = new Jolt.CylinderShapeSettings(0.5 * impostorExtents.y, 0.5 * impostorExtents.x);
                break;
            case PhysicsImpostor.PlaneImpostor:
            case PhysicsImpostor.BoxImpostor:
                const extent = new Jolt.Vec3(Math.max(impostorExtents.x / 2, 0.055), Math.max(impostorExtents.y / 2, 0.055), Math.max(impostorExtents.z / 2, 0.055));
                returnValue = new Jolt.BoxShapeSettings(extent);
                Jolt.destroy(extent);
                break;
            case PhysicsImpostor.MeshImpostor:
                {
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
                            const v = t.get_mV(k);
                            v.x = vertexData.vertices[index + 0];
                            v.y = vertexData.vertices[index + 1];
                            v.z = vertexData.vertices[index + 2];
                        });
                    }
                    returnValue = new Jolt.MeshShapeSettings(triangles);
                    Jolt.destroy(triangles);
                }
                break;
            case PhysicsImpostor.NoImpostor:
                {
                    const staticSetting = returnValue = new Jolt.StaticCompoundShapeSettings();
                    const meshes = impostor.object.getChildMeshes && impostor.object.getChildMeshes()
                        .map((mesh) => { return (mesh instanceof Mesh) ? mesh.physicsImpostor : null; }).filter((impostor) => impostor != null);
                    meshes && meshes.forEach(impostor => {
                        const shape = this._createShapeSettings(impostor);
                        impostor.object.computeWorldMatrix(true);
                        SetJoltVec3(impostor.object.position, this._tempVec3A);
                        SetJoltQuat(impostor.object.rotationQuaternion, this._tempQuaternion);
                        staticSetting.AddShape(this._tempVec3A, this._tempQuaternion, shape, 0);
                    });
                }
                break;
            case PhysicsImpostor.HeightmapImpostor:
                {
                    const heightMap = impostor.getParam('heightMap');
                    if (!heightMap) {
                        throw new Error('Error: HeightMap missing heightMap parameter');
                    }
                    const shapeSettings = new Jolt.HeightFieldShapeSettings();
                    const scale = impostorExtents.x / (heightMap.size - 1);
                    shapeSettings.mScale.Set(scale, 1, scale);
                    const squareSide = Math.sqrt(heightMap.data.length);
                    if (squareSide != heightMap.size) {
                        throw new Error('Error: HeightMap must be square. Ensure data-length is square-power');
                    }
                    const blockSize = heightMap.blockSize || 2;
                    if (blockSize < 2 || blockSize > 8) {
                        throw new Error('Error: HeightMap blockSize must be in the range [2,8]');
                    }
                    shapeSettings.mSampleCount = heightMap.size;
                    shapeSettings.mBlockSize = blockSize;
                    shapeSettings.mHeightSamples.resize(heightMap.data.length);
                    let heightSamples = new Float32Array(Jolt.HEAPF32.buffer, Jolt.getPointer(shapeSettings.mHeightSamples.data()), heightMap.data.length);
                    const { size } = heightMap;
                    for (let y = 0; y < size; y++) {
                        for (let x = 0; x < size; x++) {
                            heightSamples[(size - 1) - y + ((size - 1) - x) * size] = heightMap.data[x + y * size];
                        }
                    }
                    this._tempVec3A.Set(impostorExtents.x / 2, 0, -impostorExtents.z / 2);
                    this._tempVec3B.Set(0, 1, 0);
                    returnValue = new Jolt.RotatedTranslatedShapeSettings(this._tempVec3A, Jolt.Quat.prototype.sRotation(this._tempVec3B, -Math.PI / 2), shapeSettings);
                }
                break;
            case PhysicsImpostor.ConvexHullImpostor:
                const vertexData = this._getMeshVertexData(impostor);
                const hasIndex = vertexData.indices.length > 0;
                const hull = new Jolt.ConvexHullShapeSettings;
                hull.mPoints.resize(0);
                const p = new Jolt.Vec3();
                for (let i = 0; i < vertexData.faceCount; i++) {
                    for (let j = 0; j < 3; j++) {
                        const offset = i * 3 + j;
                        const index = (hasIndex ? vertexData.indices[offset] : offset * 3) * 3;
                        const x = vertexData.vertices[index + 0];
                        const y = vertexData.vertices[index + 1];
                        const z = vertexData.vertices[index + 2];
                        p.Set(x, y, z);
                        hull.mPoints.push_back(p);
                    }
                }
                Jolt.destroy(p);
                returnValue = hull;
                break;
        }
        if (returnValue === undefined) {
            throw new Error('Unsupported Shape: Impostor Type' + impostor.type);
        }
        if (impostor.getParam('centerOffMass')) {
            const CoM = impostor.getParam('centerOffMass');
            const offset = SetJoltVec3(CoM, new Jolt.Vec3());
            const newVal = new Jolt.OffsetCenterOfMassShapeSettings(offset, returnValue);
            Jolt.destroy(offset);
            returnValue = newVal;
        }
        return returnValue;
    }
    generateJoint(impostorJoint) {
        const mainBody = impostorJoint.mainImpostor.physicsBody;
        const connectedBody = impostorJoint.connectedImpostor.physicsBody;
        if (!mainBody || !connectedBody) {
            return;
        }
        const joint = impostorJoint.joint;
        const nativeParams = joint.jointData.nativeParams;
        let constraint;
        if (nativeParams && nativeParams.constraint) {
            constraint = JoltConstraintManager.createJoltConstraint(mainBody, connectedBody, nativeParams.constraint);
        }
        else {
            constraint = JoltConstraintManager.createClassicConstraint(mainBody, connectedBody, joint);
        }
        if (constraint) {
            this.world.AddConstraint(constraint);
            impostorJoint.joint.physicsJoint = constraint;
            impostorJoint.joint.jointData.nativeParams.body1 = mainBody;
            impostorJoint.joint.jointData.nativeParams.body2 = connectedBody;
        }
    }
    removeJoint(impostorJoint) {
        if (this.world) {
            this.world.RemoveConstraint(impostorJoint.joint.physicsJoint);
        }
    }
    /**
     * If this plugin is supported
     * @returns true if its supported
     */
    isSupported() {
        return Jolt !== undefined;
    }
    setTransformationFromPhysicsBody(impostor) {
        const physicsBody = impostor.physicsBody;
        const position = physicsBody.GetPosition();
        impostor.object.position.set(position.GetX(), position.GetY(), position.GetZ());
        const quat = physicsBody.GetRotation();
        this._tempQuaternionBJS.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());
        if (!impostor.object.rotationQuaternion) {
            if (impostor.object.rotation) {
                this._tempQuaternionBJS.toEulerAnglesToRef(impostor.object.rotation);
            }
        }
        else {
            impostor.object.rotationQuaternion.copyFrom(this._tempQuaternionBJS);
        }
    }
    setPhysicsBodyTransformation(impostor, newPosition, newRotation) {
        const position = this._tempVec3A;
        const rotation = this._tempQuaternion;
        position.Set(newPosition.x, newPosition.y, newPosition.z);
        rotation.Set(newRotation.x, newRotation.y, newRotation.z, newRotation.w);
        if (impostor instanceof JoltCharacterVirtualImpostor) {
            const character = impostor.physicsBody;
            character.SetPosition(position);
            character.SetRotation(rotation);
        }
        else {
            const physicsBody = impostor.physicsBody;
            this._bodyInterface.SetPositionAndRotationWhenChanged(physicsBody.GetID(), position, rotation, Jolt.EActivation_Activate);
        }
    }
    /**
     * Sets the linear velocity of the physics body
     * @param impostor imposter to set the velocity on
     * @param velocity velocity to set
     */
    setLinearVelocity(impostor, velocity) {
        const physicsBody = impostor.physicsBody;
        this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
        physicsBody.SetLinearVelocity(this._tempVec3A);
    }
    setAngularVelocity(impostor, velocity) {
        const physicsBody = impostor.physicsBody;
        if (velocity) {
            this._tempVec3A.Set(velocity.x, velocity.y, velocity.z);
        }
        else {
            this._tempVec3A.Set(0, 0, 0);
        }
        physicsBody.SetAngularVelocity(this._tempVec3A);
    }
    getLinearVelocity(impostor) {
        const physicsBody = impostor.physicsBody;
        const velocity = physicsBody.GetLinearVelocity();
        return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
    }
    getAngularVelocity(impostor) {
        const physicsBody = impostor.physicsBody;
        const velocity = physicsBody.GetAngularVelocity();
        return new Vector3(velocity.GetX(), velocity.GetY(), velocity.GetZ());
    }
    setBodyMass(impostor, mass) {
        const physicsBody = impostor.physicsBody;
        physicsBody.GetMotionProperties().SetInverseMass(1.0 / mass);
        impostor.joltPluginData.mass = mass;
    }
    getBodyMass(impostor) {
        return impostor.joltPluginData.mass || 0;
    }
    getBodyFriction(impostor) {
        return impostor.joltPluginData.friction || 0;
    }
    setBodyFriction(impostor, friction) {
        const physicsBody = impostor.physicsBody;
        physicsBody.SetFriction(friction);
        impostor.joltPluginData.friction = friction;
    }
    getBodyRestitution(impostor) {
        return impostor.joltPluginData.restitution || 0;
    }
    setBodyRestitution(impostor, restitution) {
        const physicsBody = impostor.physicsBody;
        physicsBody.SetRestitution(restitution);
        impostor.joltPluginData.restitution = restitution;
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
    sleepBody(impostor) {
        const physicsBody = impostor.physicsBody;
        this._bodyInterface.DeactivateBody(physicsBody.GetID());
    }
    wakeUpBody(impostor) {
        const physicsBody = impostor.physicsBody;
        this._bodyInterface.ActivateBody(physicsBody.GetID());
    }
    raycast(from, to) {
        return this._raycaster.raycast(from, to);
    }
    raycastToRef(from, to, result) {
        return this._raycaster.raycastToRef(from, to, result);
    }
    updateDistanceJoint(joint, maxDistance, minDistance) {
        if (joint.type !== PhysicsJoint.DistanceJoint) {
            const constraint = joint.physicsJoint;
            constraint.SetDistance(minDistance || 0, maxDistance);
        }
        else {
            throw new Error('updateDistanceJoint on non-distance constraint');
        }
    }
    setMotor(joint, speed, maxForce) {
        let motorMode = 'position';
        if (joint.jointData) {
            const jointData = joint.jointData;
            motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
        }
        if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
            const constraint = joint.physicsJoint;
            if (motorMode == 'position') {
                constraint.SetMotorState(Jolt.EMotorState_Position);
                constraint.SetTargetAngle && constraint.SetTargetAngle(speed);
                constraint.SetTargetPosition && constraint.SetTargetPosition(speed);
            }
            else if (motorMode == 'velocity') {
                constraint.SetMotorState(Jolt.EMotorState_Velocity);
                constraint.SetTargetAngularVelocity && constraint.SetTargetAngularVelocity(speed);
                constraint.SetTargetVelocity && constraint.SetTargetVelocity(speed);
            }
            if (joint instanceof MotorEnabledJoint) {
                const motorJoint = joint;
                const body1 = motorJoint.jointData.nativeParams?.body1;
                const body2 = motorJoint.jointData.nativeParams?.body2;
                body1 && this._bodyInterface.ActivateBody(body1.GetID());
                body2 && this._bodyInterface.ActivateBody(body2.GetID());
            }
            if (maxForce) {
                this.setLimit(joint, maxForce);
            }
        }
        else {
            throw new Error('setMotor on non-motorized constraint');
        }
    }
    setLimit(joint, upperLimit, lowerLimit) {
        let motorMode = 'position';
        if (joint.jointData) {
            const jointData = joint.jointData;
            motorMode = (jointData.nativeParams || {})['motor-mode'] || 'position';
        }
        if (joint.physicsJoint.GetMotorSettings && joint.physicsJoint.SetMotorState) {
            const motorSettings = joint.physicsJoint.GetMotorSettings();
            if (upperLimit == 0 && lowerLimit == 0) {
                joint.physicsJoint.SetMotorState(Jolt.EMotorState_Off);
            }
            if (motorMode == 'position') {
                motorSettings.mMaxForceLimit = upperLimit;
                motorSettings.mMinForceLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
            }
            else if (motorMode == 'velocity') {
                motorSettings.mMaxTorqueLimit = upperLimit;
                motorSettings.mMinTorqueLimit = (lowerLimit == undefined) ? -upperLimit : lowerLimit;
            }
        }
        else {
            throw new Error('setLimit on non-motorized constraint');
        }
    }
    getRadius(impostor) {
        const extents = impostor.getParam('extents') || impostor.getObjectExtents();
        return Math.max(extents.x, extents.y, extents.z) / 2;
    }
    getBoxSizeToRef(impostor, result) {
        const extents = impostor.getParam('extents') || impostor.getObjectExtents();
        result.x = extents.x;
        result.y = extents.y;
        result.z = extents.z;
    }
    syncMeshWithImpostor(mesh, impostor) {
        const physicsBody = impostor.physicsBody;
        const position = physicsBody.GetPosition();
        mesh.position.set(position.GetX(), position.GetY(), position.GetZ());
        if (mesh.rotationQuaternion) {
            const quat = physicsBody.GetRotation();
            mesh.rotationQuaternion.set(quat.GetX(), quat.GetY(), quat.GetZ(), quat.GetW());
        }
    }
    dispose() {
        const outstandingBodies = Object.values(this._impostorLookup);
        outstandingBodies.forEach(impostor => {
            impostor.dispose();
        });
        this.toDispose.forEach(joltObj => {
            Jolt.destroy(joltObj);
        });
        this._raycaster.dispose();
        this.world = null;
    }
}
