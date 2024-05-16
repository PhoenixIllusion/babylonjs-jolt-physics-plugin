import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { IPhysicsEnabledObject, PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import Jolt from "./jolt-import";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Epsilon } from "@babylonjs/core/Maths/math.constants";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { IndicesArray, Nullable } from "@babylonjs/core/types";
import { SetJoltQuat, SetJoltVec3 } from "./jolt-util";


interface MeshVertexData {
  indices: IndicesArray | number[];
  vertices: Float32Array | number[];
  faceCount: number;
}

function getMeshVertexData(impostor: PhysicsImpostor): MeshVertexData {
  const object = (impostor.getParam('mesh') as IPhysicsEnabledObject) || impostor.object;
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

export function createJoltShape(impostor: PhysicsImpostor, tempVectorA: Jolt.Vec3, tempVectorB: Jolt.Vec3, tempQuat: Jolt.Quat): Jolt.Shape {
  const copyShape = impostor.getParam('copyShape');
  if(copyShape) {
    return (copyShape.physicsBody as Jolt.Body).GetShape();
  }
  const settings = createShapeSettings(impostor, tempVectorA, tempVectorB, tempQuat);
  const shapeResult: Jolt.ShapeResult = settings.Create();
  if (shapeResult.HasError()) {
    throw new Error('Creating Jolt Shape : Impostor Type -' + impostor.type + ' : Error - ' + shapeResult.GetError().c_str());
  }
  const shape = shapeResult.Get();
  shape.AddRef();
  Jolt.destroy(settings);
  return shape;
}

function createShapeSettings(impostor: PhysicsImpostor, tempVec3A: Jolt.Vec3, tempVec3B: Jolt.Vec3, tempQuaternion: Jolt.Quat): Jolt.ShapeSettings {
  const impostorExtents = impostor.getParam('extents') as Vector3 || impostor.getObjectExtents();
  const checkWithEpsilon = (value: number): number => {
    return Math.max(value, Epsilon);
  };
  let returnValue: Jolt.ShapeSettings | undefined = undefined;
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
      } else {
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
    case PhysicsImpostor.MeshImpostor: {
      // should transform the vertex data to world coordinates!!
      const vertexData = getMeshVertexData(impostor);
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
    case PhysicsImpostor.NoImpostor: {
      const staticSetting = returnValue = new Jolt.StaticCompoundShapeSettings();
      const meshes: PhysicsImpostor[] | undefined = impostor.object.getChildMeshes && impostor.object.getChildMeshes()
        .map((mesh: AbstractMesh) => { return mesh.physicsImpostor }).filter((impostor: Nullable<PhysicsImpostor>) => impostor != null) as PhysicsImpostor[];
        meshes && meshes.forEach(impostor => {
          const shape = createShapeSettings(impostor as PhysicsImpostor, tempVec3A, tempVec3B, tempQuaternion);
          impostor.object.computeWorldMatrix(true);
          SetJoltVec3(impostor.object.position, tempVec3A);
          SetJoltQuat(impostor.object.rotationQuaternion!, tempQuaternion);
          staticSetting.AddShape(tempVec3A, tempQuaternion, shape, 0);
        })
      }
      break;
    case PhysicsImpostor.HeightmapImpostor: {
      const heightMap = impostor.getParam('heightMap');
      if(!heightMap) {
        throw new Error('Error: HeightMap missing heightMap parameter');
      }
      const shapeSettings = new Jolt.HeightFieldShapeSettings();
      const scale = impostorExtents.x / (heightMap.size-1)
      shapeSettings.mScale.Set(scale, 1, scale);
      const squareSide = Math.sqrt(heightMap.data.length);
      if(squareSide != heightMap.size) {
        throw new Error('Error: HeightMap must be square. Ensure data-length is square-power');
      }
      const blockSize = heightMap.blockSize || 2;
      if(blockSize < 2 || blockSize > 8) {
        throw new Error('Error: HeightMap blockSize must be in the range [2,8]');
      }
      shapeSettings.mSampleCount = heightMap.size;
      shapeSettings.mBlockSize = blockSize;
      shapeSettings.mHeightSamples.resize(heightMap.data.length);
      let heightSamples = new Float32Array(Jolt.HEAPF32.buffer, Jolt.getPointer(shapeSettings.mHeightSamples.data()), heightMap.data.length);
      const { size, alphaFilter } = heightMap;
      for(let y = 0; y < size; y++) {
        for(let x = 0; x < size; x++) {
          const height = heightMap.data[x + y * size];
          heightSamples[(size -1) - y + ((size-1) - x) * size] = height === alphaFilter ? Jolt.HeightFieldShapeConstantValues.prototype.cNoCollisionValue : height; 
        }
      }
      tempVec3A.Set(impostorExtents.x / 2, 0, -impostorExtents.z/2);
      tempVec3B.Set(0,1,0);
      returnValue = new Jolt.RotatedTranslatedShapeSettings(tempVec3A, Jolt.Quat.prototype.sRotation(tempVec3B, -Math.PI/2), shapeSettings);
    }
    break;
    case PhysicsImpostor.ConvexHullImpostor:
      const vertexData = getMeshVertexData(impostor);
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
    const CoM = impostor.getParam('centerOffMass')!;
    const offset = SetJoltVec3(CoM, new Jolt.Vec3());
    const newVal = new Jolt.OffsetCenterOfMassShapeSettings(offset, returnValue);
    Jolt.destroy(offset);
    returnValue = newVal;
  }
  return returnValue;
}