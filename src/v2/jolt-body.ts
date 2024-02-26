import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import Jolt from "../jolt-import";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { Matrix, Quaternion, TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { GetJoltQuat, GetJoltVec3, LAYER_MOVING, LAYER_NON_MOVING, SetJoltQuat, SetJoltVec3 } from "../jolt-util";
import { PhysicsMassProperties, PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";
import { JoltPhysicsShape } from "./jolt-shape";
import { JoltJSPlugin } from "./jolt-physics";

export interface IJoltBodyData {
  body: Jolt.Body|null;
  massProperties: PhysicsMassProperties;
  shape: JoltPhysicsShape|null;
  motionType: PhysicsMotionType;
  position: Vector3;
  orientation: Quaternion;
  toDispose: any[];
  plugin: JoltJSPlugin;
}

export class JoltPhysicsBody extends PhysicsBody {
  _pluginDataInstances: IJoltBodyData[] = [];
  _pluginData: IJoltBodyData = {} as any;
}

export class JoltBodyManager {

  private static position: Jolt.Vec3;
  private static orientation: Jolt.Quat;

  public static init(): void {
    this.position = new Jolt.Vec3();
    this.orientation = new Jolt.Quat();
  }
  public static dispose(): void {
    Jolt.destroy(this.position);
    Jolt.destroy(this.orientation);
  }

  public static getPluginReference(body: JoltPhysicsBody, instanceIndex?: number): IJoltBodyData {
    return body._pluginDataInstances?.length ? body._pluginDataInstances[instanceIndex ?? 0] : body._pluginData;
  }
  public static getAllPluginReference(body: JoltPhysicsBody): IJoltBodyData[] {
    return body._pluginDataInstances?.length ? body._pluginDataInstances : [body._pluginData];
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
          const data = this.getPluginReference(body, i);
          const _body = data.body;
          if(_body) {
            GetJoltVec3(_body.GetPosition(), position);
            GetJoltQuat(_body.GetRotation(), quat);
            Matrix.ComposeToRef(scale, quat, position, mat44);
            mat44.copyToArray(matrixData, index);
          }
        }
        m.thinInstanceBufferUpdated("matrix");
      } else {
        const data = this.getPluginReference(body);
        const _body = data.body;
        if(_body) {
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
  }

  static syncBody( position: Vector3, orientation: Quaternion, body: Jolt.Body, bodyInterface: Jolt.BodyInterface) {
    SetJoltVec3(position, this.position);
    SetJoltQuat(orientation, this.orientation);
    bodyInterface.SetPositionAndRotationWhenChanged(body.GetID(), this.position, this.orientation, Jolt.EActivation_Activate);
  }

  static generatePhysicsBody(
    bodyInterface: Jolt.BodyInterface,
    data: IJoltBodyData): Jolt.Body {
      const joltMotionType = this.GetMotionType(data.motionType);
      const joltShape: Jolt.Shape = data.shape!._pluginData.shape!;
      const material = data.shape!.material;
      SetJoltVec3(data.position, this.position);
      SetJoltQuat(data.orientation, this.orientation);
      return this._generatePhysicsBody(bodyInterface, joltMotionType, joltShape, data.massProperties, material)
  }

  private static _generatePhysicsBody(
      bodyInterface: Jolt.BodyInterface,
      motionType: Jolt.EMotionType, shape: Jolt.Shape,
      massProperties: PhysicsMassProperties, material?: PhysicsMaterial): Jolt.Body {
    const mass = massProperties.mass || 0;
    const layer = (motionType == Jolt.EMotionType_Static) ? LAYER_NON_MOVING : LAYER_MOVING;
    const settings = new Jolt.BodyCreationSettings(shape, this.position, this.orientation, motionType, layer);
    if(material) {
      if(material.restitution != undefined)
        settings.mRestitution = material.restitution;
      if(material.friction != undefined)
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