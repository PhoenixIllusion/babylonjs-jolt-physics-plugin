import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import Jolt from "../jolt-import";
import { JoltPhysicsBody } from "./jolt-physics";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { Matrix, Quaternion, TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, LAYER_NON_MOVING, SetJoltQuat, SetJoltVec3 } from "../jolt-util";
import { PhysicsMassProperties, PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsShape } from "@babylonjs/core/Physics/v2/physicsShape";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";

export class JoltBodyManager {

  private static _getPluginReference(body: JoltPhysicsBody, instanceIndex?: number): Jolt.Body {
    return body._pluginDataInstances?.length ? body._pluginDataInstances[instanceIndex ?? 0].body : body._pluginData.body;
  }

  static syncTransform(body: PhysicsBody, transformNode: TransformNode): void {
    const position = TmpVectors.Vector3[1];
    const quat = TmpVectors.Quaternion[0];
      if (body._pluginDataInstances.length) {
        // instances
        const m = transformNode as Mesh;
        const matrixData = m._thinInstanceDataStorage.matrixData;
        if (!matrixData) {
            return; // TODO: error handling
        }
        const instancesCount = body._pluginDataInstances.length;
        const mat44 = TmpVectors.Matrix[0];
        const scale = TmpVectors.Vector3[0];
        scale.set(1,1,1);
        for (let i = 0; i < instancesCount; i++) {
          const index = i * 16;
          const _body = this._getPluginReference(body, i);
          GetJoltVec3(_body.GetPosition(), position);
          GetJoltQuat(_body.GetRotation(), quat);
          Matrix.ComposeToRef(scale, quat, position, mat44);
          mat44.copyToArray(matrixData, index);
        }
        m.thinInstanceBufferUpdated("matrix");
      } else {
        const _body = this._getPluginReference(body);
        GetJoltVec3(_body.GetPosition(), position);
        GetJoltQuat(_body.GetRotation(), quat);

        const parent = transformNode.parent as TransformNode;
        // transform position/orientation in parent space
        if (parent && !parent.getWorldMatrix().isIdentity()) {
            parent.computeWorldMatrix(true);

            quat.normalize();
            const finalTransform = TmpVectors.Matrix[0];
            const finalTranslation = TmpVectors.Vector3[0];
            finalTranslation.copyFrom(position);
            Matrix.ComposeToRef(transformNode.absoluteScaling, quat, finalTranslation, finalTransform);

            const parentInverseTransform = TmpVectors.Matrix[1];
            parent.getWorldMatrix().invertToRef(parentInverseTransform);

            const localTransform = TmpVectors.Matrix[2];
            finalTransform.multiplyToRef(parentInverseTransform, localTransform);
            localTransform.decomposeToTransformNode(transformNode);
            transformNode.rotationQuaternion?.normalize();
        } else {
            transformNode.position.copyFrom(position);
            if (transformNode.rotationQuaternion) {
                transformNode.rotationQuaternion.copyFrom(quat);
            } else {
                quat.toEulerAnglesToRef(transformNode.rotation);
            }
        }
      }
  }

  static generatePhysicsBody(
    bodyInterface: Jolt.BodyInterface,
    massProperties: PhysicsMassProperties,
    motionType: PhysicsMotionType,
    shape: PhysicsShape,
    position: Vector3,
    rotation: Quaternion,
    _tmpVec3: Jolt.Vec3, _tmpQuat: Jolt.Quat): Jolt.Body {
      const joltMotionType = this.GetMotionType(motionType);
      const joltShape: Jolt.Shape = shape._pluginData.shape;
      const material = shape.material;
      SetJoltVec3(position, _tmpVec3);
      SetJoltQuat(rotation, _tmpQuat);
      return this._generatePhysicsBody(bodyInterface, joltMotionType, joltShape, _tmpVec3, _tmpQuat, massProperties, material)
  }

  private static _generatePhysicsBody(
      bodyInterface: Jolt.BodyInterface,
      motionType: Jolt.EMotionType, shape: Jolt.Shape,
      position: Jolt.Vec3, rotation: Jolt.Quat,
      massProperties: PhysicsMassProperties, material?: PhysicsMaterial): Jolt.Body {
    const mass = massProperties.mass || 0;
    const layer = (mass == 0) ? LAYER_NON_MOVING : LAYER_MOVING;
    const settings = new Jolt.BodyCreationSettings(shape, position, rotation, motionType, layer);
    if(material) {
      if(material.restitution)
        settings.mRestitution = material.restitution;
      if(material.friction)
        settings.mFriction = material.friction;
    }
    if (mass !== 0) {
      settings.mOverrideMassProperties = Jolt.EOverrideMassProperties_CalculateInertia;
      settings.mMassPropertiesOverride.mMass = mass;
    }
    const body = bodyInterface.CreateBody(settings);
    Jolt.destroy(settings);
    return body;
  }

  static GetMotionType(motionType: PhysicsMotionType): Jolt.EMotionType {
    switch(motionType) {
      case PhysicsMotionType.STATIC:
        return Jolt.EMotionType_Static
      case PhysicsMotionType.DYNAMIC:
        return Jolt.EMotionType_Dynamic
      case PhysicsMotionType.ANIMATED:
        return  Jolt.EMotionType_Kinematic
    }
  }
}