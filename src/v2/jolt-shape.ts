import { PhysicsShape } from "@babylonjs/core/Physics/v2/physicsShape";
import Jolt from "../jolt-import";
import { PhysicsShapeParameters, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Quaternion, TmpVectors, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IndicesArray } from "@babylonjs/core/types";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";
import { SetJoltVec3 } from "../jolt-util";

interface IChildShape {
  child: JoltPhysicsShape, translation?: Vector3 | undefined, rotation?: Quaternion | undefined, scale?: Vector3 | undefined
}

interface IJoltShapeData {
  isTrigger: boolean;
  shape: Jolt.Shape | null;
  children: IChildShape[];
  density?: number;
  material?: PhysicsMaterial;
  bodies: Jolt.Body[];
}

export class JoltPhysicsShape extends PhysicsShape {
  _pluginData: IJoltShapeData = {} as any;
}

export function castJoltShape<T extends Jolt.Shape>(shape: Jolt.Shape): Jolt.Shape|T {
  switch (shape.GetSubType()) {
    case Jolt.EShapeSubType_Sphere:
      shape = Jolt.castObject(shape, Jolt.SphereShape);
      break;
    case Jolt.EShapeSubType_Box:
      shape = Jolt.castObject(shape, Jolt.BoxShape);
      break;
    case Jolt.EShapeSubType_Capsule:
      shape = Jolt.castObject(shape, Jolt.CapsuleShape);
      break;
    case Jolt.EShapeSubType_TaperedCapsule:
      shape = Jolt.castObject(shape, Jolt.TaperedCapsuleShape);
      break;
    case Jolt.EShapeSubType_Cylinder:
      shape = Jolt.castObject(shape, Jolt.CylinderShape);
      break;
    case Jolt.EShapeSubType_ConvexHull:
      shape = Jolt.castObject(shape, Jolt.ConvexHullShape);
      break;
    case Jolt.EShapeSubType_StaticCompound:
      shape = Jolt.castObject(shape, Jolt.StaticCompoundShape);
      break;
    case Jolt.EShapeSubType_RotatedTranslated:
      shape = Jolt.castObject(shape, Jolt.RotatedTranslatedShape);
      break;
    case Jolt.EShapeSubType_Scaled:
      shape = Jolt.castObject(shape, Jolt.ScaledShape);
      break;
    case Jolt.EShapeSubType_OffsetCenterOfMass:
      shape = Jolt.castObject(shape, Jolt.OffsetCenterOfMassShape);
      break;
    case Jolt.EShapeSubType_Mesh:
      shape = Jolt.castObject(shape, Jolt.MeshShape);
      break;
    case Jolt.EShapeSubType_HeightField:
      shape = Jolt.castObject(shape, Jolt.HeightFieldShape);
      break;
  }
  return shape;
} 

interface MeshVertexData {
  indices: IndicesArray | number[];
  vertices: Float32Array | number[];
  faceCount: number;
}

function getParentsRotation(object: TransformNode): Quaternion {
  const _tmpQuat = TmpVectors.Quaternion[0];
  const _tmpQuat2 = TmpVectors.Quaternion[1];
  let parent = object.parent as TransformNode;
  _tmpQuat.copyFromFloats(0, 0, 0, 1);
  while (parent) {
      if (parent.rotationQuaternion) {
          _tmpQuat2.copyFrom(parent.rotationQuaternion);
      } else {
          Quaternion.RotationYawPitchRollToRef(parent.rotation.y, parent.rotation.x, parent.rotation.z, _tmpQuat2);
      }
      _tmpQuat.multiplyToRef(_tmpQuat2, _tmpQuat);
      parent = parent.parent as TransformNode;
  }
  return _tmpQuat;
}

function getMeshVertexData(object: Mesh): MeshVertexData {
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
  object.rotationQuaternion && object.rotationQuaternion.copyFrom(getParentsRotation(object));

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

export function createShape(type: PhysicsShapeType, parameters: PhysicsShapeParameters, _tmpVec: Jolt.Vec3): Jolt.Shape|null {
  const ep = (value: number): number => {
    return Math.max(value, 0.055);
  };
  const tmpVec = TmpVectors.Vector3[0];
  let returnValue: Jolt.ShapeSettings | undefined = undefined;
  switch (type) {
    case PhysicsShapeType.SPHERE:
      returnValue = new Jolt.SphereShapeSettings(parameters.radius!);
      break;
    case PhysicsShapeType.CAPSULE: {
      const radius = parameters.radius!;
      parameters.pointA!.subtractToRef(parameters.pointB!, tmpVec);
      const height = tmpVec.length();
      returnValue = new Jolt.CapsuleShapeSettings(height/2, radius);
    }
      break;
    case PhysicsShapeType.CYLINDER: {
        const radius = parameters.radius!;
        parameters.pointA!.subtractToRef(parameters.pointB!, tmpVec);
        const height = tmpVec.length();
        returnValue = new Jolt.CylinderShapeSettings(height/2, radius);
      }
      break;
    case PhysicsShapeType.BOX: {
        const extents = parameters.extents!.scale(0.5);
        _tmpVec.Set(ep(extents.x),ep(extents.y),ep(extents.z));
        returnValue = new Jolt.BoxShapeSettings(_tmpVec);
      }
      break;
    case PhysicsShapeType.MESH: {
      // should transform the vertex data to world coordinates!!
      const vertexData = getMeshVertexData(parameters.mesh!);
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
      returnValue = new Jolt.MeshShapeSettings(triangles);
      Jolt.destroy(triangles);
    }
      break;
    case PhysicsShapeType.CONVEX_HULL:
      const vertexData = getMeshVertexData(parameters.mesh!);
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
          p.Set(x,y,z);
          hull.mPoints.push_back(p);
        }
      }
      Jolt.destroy(p);
      returnValue = hull;
      break;
    case PhysicsShapeType.CONTAINER:
      return null;
  }
  if (returnValue === undefined) {
    throw new Error('Unsupported Shape: Impostor Type' + type);
  }

  if (parameters.center && parameters.center.length() > 0) {
    const offset = SetJoltVec3(parameters.center, new Jolt.Vec3());
    const newVal = new Jolt.OffsetCenterOfMassShapeSettings(offset, returnValue);
    Jolt.destroy(offset);
    returnValue = newVal;
  }

  const shapeResult: Jolt.ShapeResult = returnValue.Create();
  if (shapeResult.HasError()) {
    throw new Error('Creating Jolt Shape : Impostor Type -' + type + ' : Error - ' + shapeResult.GetError().c_str());
  }
  const jShape = shapeResult.Get();
  jShape.AddRef();
  Jolt.destroy(returnValue);
  return jShape;
}