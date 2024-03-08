import '@babylonjs/core/Loading/loadingScreen';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_meshopt_compression';
import type { float } from "@babylonjs/core/types";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { GLTFLoader } from "@babylonjs/loaders/glTF/2.0/glTFLoader";
import { GLTFFileLoader, IGLTFLoaderData } from "@babylonjs/loaders/glTF/glTFFileLoader";
import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import { CreateGroundFromHeightMapVertexData } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { IGLTF } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import { TerrainMaterial } from "@babylonjs/materials/terrain/terrainMaterial";
import { Scene } from "@babylonjs/core/scene";
import { MinimalPhysicsNode } from "../../../dist/jolt-impostor";
import { PathConstraintParams } from '../../../dist/jolt-constraints';
import { showPath3D } from '../util/debug';
import { Path3D } from '@babylonjs/core/Maths/math.path';
import { createPath3DWithTan2CubicBenzier } from '../../../dist/jolt-constraint-path';
import { JoltPathConstraint, MotorMode } from '../../../dist';

type JoltShapes = 'Sphere' | 'Box' | 'Capsule' | 'TaperedCapsule' | 'Cylinder' | 'ConvexHull' | 'Mesh' | 'HeightField';
type JoltMotionType = 'Dynamic' | 'Static' | 'Kinematic';
type Float3 = [float, float, float];
type Float4 = [float, float, float, float];

interface HeightFieldLayer {
  diffuse: number;
  tileOffset: [float, float];
  tileSize: [float, float];
}
interface HeightFieldData {
  splatIndex: [number]|[number,number];
  depthBuffer: number;
  minHeight: float;
  maxHeight: float;
  colorFilter: [float, float, float];
  layers: HeightFieldLayer[];
}
interface JoltCollisionExtras {
  collisionShape: JoltShapes;
  motionType: JoltMotionType;

  friction: float;
  mass: float;
  restitution: float;

  worldPosition: Float3;
  worldRotation: Float4;
  worldScale: Float3;
  extents: Float3;

  heightfield?: HeightFieldData;
}

const COLOR_HASH: { [key: string]: StandardMaterial } = {};
export const clearMaterials = () => { Object.keys(COLOR_HASH).forEach(key => delete COLOR_HASH[key]) }
export const getMaterial = (color: string) => {
  if (!COLOR_HASH[color]) {
    const material = COLOR_HASH[color] = new StandardMaterial('Color_' + color);
    material.alpha = 1;
    material.diffuseColor = Color3.FromHexString(color);
  }
  return COLOR_HASH[color];
}


interface GltfJoltExtras {
  jolt?: {
    id: number,
    collision?: JoltCollisionExtras
    constraints?: { type: string, body1: number }[]
  }
}

function getImpostorShape(shape: JoltShapes): number {
  switch (shape) {
    case 'Sphere': return PhysicsImpostor.SphereImpostor;
    case 'Box': return PhysicsImpostor.BoxImpostor;
    case 'Capsule': return PhysicsImpostor.CapsuleImpostor;
    case 'Cylinder': return PhysicsImpostor.CylinderImpostor;
    case 'ConvexHull': return PhysicsImpostor.ConvexHullImpostor;
    case 'Mesh': return PhysicsImpostor.MeshImpostor;
    case 'HeightField': return PhysicsImpostor.HeightmapImpostor;
  }
  return -1;
}

const canvas = document.createElement('canvas');


async function createTexture(name: string, buffer: Promise<ArrayBufferView>, scene: Scene): Promise<Texture> {
  const blob = new Blob([await buffer]);
  /*const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.innerText = name;
  document.body.append(a);*/
  const texture = await createImageBitmap(blob, {imageOrientation: 'flipY'});
  return  new Texture(name, scene, true,
  true, Texture.BILINEAR_SAMPLINGMODE,
  null, null, texture, true);
}

async function createHeightField(collision: JoltCollisionExtras, heightfield: HeightFieldData, loadImage: (index: number)=>Promise<ArrayBufferView>): Promise<Mesh> {
  const img = await createImageBitmap(new Blob([await loadImage(heightfield.depthBuffer)]));
  const size = img.width;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, size, size);
    const heightBuffer = new Float32Array(size * size);
    const meshSize = collision.extents[0] * 2;
    const ground = CreateGroundFromHeightMapVertexData( {
        width: meshSize,
        height: meshSize,
        subdivisions: size-1,
        bufferHeight: size,
        bufferWidth: size, 
        buffer: new Uint8Array(imgData.data.buffer),
        minHeight: heightfield.minHeight,
        maxHeight: heightfield.maxHeight,
        colorFilter: new Color3(0xFF00/0xFFFF,0x00FF/0xFFFF,0),
        alphaFilter: 0,
        heightBuffer: heightBuffer
    });
    const scene = EngineStore.LastCreatedScene!;
    const mesh = new Mesh('height-map', scene);
    ground.applyToMesh(mesh);

    const terrainMaterial = new TerrainMaterial('terrain', scene);
    terrainMaterial.mixTexture = await createTexture('mix', loadImage(heightfield.splatIndex[0]), mesh.getScene())
    for(let i=0;i<3;i++) {
      if(heightfield.layers[i]) {
        const l = heightfield.layers[i];
        let layer: keyof TerrainMaterial = 'diffuseTexture1';
        switch(i) {
          case 1:
            layer = 'diffuseTexture2';
            break;
          case 2:
            layer = 'diffuseTexture3';
            break;
        }
        const tex = terrainMaterial[layer] = await createTexture('layer'+i,loadImage(l.diffuse), mesh.getScene());
        tex.uScale = meshSize / l.tileSize[0];
        tex.vScale = meshSize / l.tileSize[1];
      }
    }
    terrainMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    terrainMaterial.specularPower = 64;
    mesh.material = terrainMaterial;
    mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.HeightmapImpostor, {
        mass: 0,
        heightMap: {
            size: size,
            data: heightBuffer,
            alphaFilter: 0
        }
    });
    return mesh;
}

const fileLoader = new GLTFFileLoader();
const filterJoltNodes = (node: TransformNode) => node.metadata?.gltf?.extras?.jolt;
export default class {
  static async forFile(file: string): Promise<void> {
    const loader = new GLTFLoader(fileLoader);
    const scene = EngineStore.LastCreatedScene!;
    const data: IGLTFLoaderData = await new Promise((resolve, reject) => fileLoader.loadFile(scene, "levels/"+ file + ".glb", "", resolve, () => {}, true, reject));
    await loader.loadAsync(scene, data, '');
    const pendingPromises: Promise<any>[] = [];
    scene.transformNodes.filter(filterJoltNodes).forEach(node => {
      const collision = (node.metadata.gltf.extras as GltfJoltExtras)?.jolt?.collision;
      if(collision && collision.collisionShape == "HeightField") {
        const { heightfield } = collision;
        if(heightfield) {
          const json = data.json as IGLTF;
          const getImage = (imageIndex: number) => {
            const img = json.images![imageIndex];
            const buf = json.bufferViews![img.bufferView!];
            return data.bin!.readAsync(buf.byteOffset!, buf.byteLength)
          };
          pendingPromises.push(createHeightField(collision, heightfield, getImage));
        }
      }
    });
    await Promise.all(pendingPromises);
    const nodeLookup: Record<number, AbstractMesh> = {};
    scene.meshes.forEach(node => {
      if (node.metadata && node.metadata.gltf && node.metadata.gltf.extras) {
        const extras = node.metadata.gltf.extras as GltfJoltExtras;
        if (extras.jolt && extras.jolt.collision) {
          nodeLookup[extras.jolt.id] = node;
          const collisionData = extras.jolt.collision;

          const [ex, ey, ez] = collisionData.extents;
          const [sx, sy, sz] = collisionData.worldScale;
          node.computeWorldMatrix(true);
          const transformParent = new MinimalPhysicsNode(node.name + ": min", new Vector3(ex * sx, ey * sy, ez * sz), node);
          transformParent.position.set(...collisionData.worldPosition);
          transformParent.rotationQuaternion = new Quaternion();
          transformParent.rotationQuaternion.set(...collisionData.worldRotation);

          if (collisionData.motionType == 'Dynamic' || collisionData.motionType == 'Kinematic') {
            node.parent = transformParent;
            node.scaling.set(...collisionData.worldScale);
            node.position.set(0, 0, 0);
            node.rotationQuaternion = new Quaternion();
          }
          node.physicsImpostor = new PhysicsImpostor(transformParent, getImpostorShape(collisionData.collisionShape),
            {
              friction: collisionData.friction,
              restitution: collisionData.restitution,
              mass: collisionData.mass,
              ignoreParent: true,
              disableBidirectionalTransformation: true
            })
        }
      }
    });
    scene.meshes.forEach(node => {
      if (node.metadata && node.metadata.gltf && node.metadata.gltf.extras) {
        const extras = node.metadata.gltf.extras as GltfJoltExtras;
        if (extras.jolt && extras.jolt.constraints) {
          extras.jolt.constraints.forEach(constraint => {
            if (!constraint.body1 || !node.physicsImpostor) {
              console.error("Invalid Constraint. Missing impostor.")
              return;
            }
            const body1 = nodeLookup[constraint.body1];
            if (!body1 || !body1.physicsImpostor) {
              console.error("Invalid Constraint. Missing body1 impostor.")
              return;
            }
            if (constraint.type === 'Path') {
              const pathData = constraint as any as PathConstraintParams;

              const pos: Vector3[] = [];
              const inTan: Vector3[] = [];
              const norm: Vector3[] = [];
              if(!(pathData.path instanceof Path3D)) {
                pathData.path.forEach(([p, iT, oT, n]) => {
                  pos.push(new Vector3(... p))
                  inTan.push(new Vector3(... iT),new Vector3(... oT))
                  norm.push(new Vector3(... n))
                });
                if(pathData.closed) {
                  pos.push(pos[0]);
                  inTan.push(inTan[0],inTan[1]);
                  norm.push(norm[0]);
                }
                const hermite = createPath3DWithTan2CubicBenzier(pos, inTan, norm);
                const path = showPath3D(hermite, 0.5, true);
                path.position.copyFrom(body1.getAbsolutePosition());
              }
            }
            const joint = new PhysicsJoint(0, { nativeParams: { constraint } });
            body1.physicsImpostor?.addJoint(node.physicsImpostor, joint);
          });
        }
      }
    });
  }
}
