import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import '@babylonjs/core/Loading/loadingScreen';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/ExtrasAsMetadata';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_meshopt_compression';
import type { IndicesArray, Nullable, float } from "@babylonjs/core/types";
import { IPhysicsEnabledObject, PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MotorEnabledJoint, PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import Jolt from '@phoenixillusion/babylonjs-jolt-plugin/import';
import { GetJoltVec3 } from '@phoenixillusion/babylonjs-jolt-plugin/util';
import { BoundingBox } from "@babylonjs/core/Culling/boundingBox";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { GLTFLoader } from "@babylonjs/loaders/glTF/2.0/glTFLoader";
import { GLTFFileLoader, IGLTFLoaderData } from "@babylonjs/loaders/glTF/glTFFileLoader";
import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import { CreateGroundFromHeightMapVertexData } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { IGLTF } from "@babylonjs/loaders/glTF/2.0/glTFLoaderInterfaces";
import { TerrainMaterial } from "@babylonjs/materials/terrain/terrainMaterial";
import { Scene } from "@babylonjs/core/scene";

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

  localBounds: { center: Float3, extents: Float3 };
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

function createMeshForShape(shape: Jolt.Shape) {
  // Get triangle data
  let scale = new Jolt.Vec3(1, 1, 1);
  let triContext = new Jolt.ShapeGetTriangles(shape, Jolt.AABox.prototype.sBiggest(), shape.GetCenterOfMass(), Jolt.Quat.prototype.sIdentity(), scale);
  Jolt.destroy(scale);
  // Get a view on the triangle data (does not make a copy)
  let vertices = new Float32Array(Jolt.HEAPF32.buffer, triContext.GetVerticesData(), triContext.GetVerticesSize() / Float32Array.BYTES_PER_ELEMENT);
  Jolt.destroy(triContext);

  const indices: number[] = [];
  for (let i = 0; i < vertices.length / 3; i++) {
    indices.push(i);
  }
  // Create a three mesh
  var vertexData = new VertexData();
  vertexData.positions = vertices;
  vertexData.indices = indices;

  const mesh = new Mesh('debug-mesh');
  vertexData.applyToMesh(mesh);
  return mesh;
}

const DEBUG = false;

class MinimalPhysicsNode extends TransformNode implements IPhysicsEnabledObject {
  private boundingInfo: BoundingInfo;
  private debugBoxBabylon?: Mesh;
  private debugBoxJolt?: Mesh;
  public physicsImpostor?: PhysicsImpostor;

  private lineRef?: LinesMesh;
  private posBab: Vector3 = new Vector3();
  private posJolt: Vector3 = new Vector3();
  private positionLine = [this.posBab, this.posJolt];

  private joltBBox: BoundingBox = new BoundingBox(new Vector3(), new Vector3());
  private joltBoxMin: Vector3 = new Vector3();
  private joltBoxMax: Vector3 = new Vector3();

  constructor(name: string, extents: Float3, private mesh: AbstractMesh) {
    super(name);

    const [x, y, z] = extents;
    this.boundingInfo = new BoundingInfo(new Vector3(-x, -y, -z), new Vector3(x, y, z));

    if (DEBUG)
      this.registerAfterWorldMatrixUpdate(() => {
        if (this.physicsImpostor) {

          const debugBoxBabylonMat = getMaterial('#ff0000');
          debugBoxBabylonMat.wireframe = true;
          const debugBoxJoltMat = getMaterial('#ff00ff');
          debugBoxJoltMat.wireframe = true;

          const jBody: Jolt.Body = this.physicsImpostor.physicsBody;
          const jWorldBounds = jBody.GetWorldSpaceBounds();
          GetJoltVec3(jWorldBounds.mMin, this.joltBoxMin);
          GetJoltVec3(jWorldBounds.mMax, this.joltBoxMax);
          this.joltBBox.reConstruct(this.joltBoxMin, this.joltBoxMax);

          if (!this.debugBoxBabylon) {
            /*const bWorldBounds = this.getBoundingInfo().boundingBox;
            const bSize = bWorldBounds.extendSizeWorld;
            this.debugBoxBabylon = MeshBuilder.CreateBox(`${name}: Debug Box`, { width: bSize.x*2, height: bSize.y*2, depth: bSize.z*2});
            this.debugBoxBabylon.material = debugBoxBabylonMat;*/
          }

          if (!this.debugBoxJolt) {
            this.lineRef = MeshBuilder.CreateLines("lines", { points: this.positionLine, updatable: true });
            const jSize = this.joltBBox.extendSizeWorld;
            this.debugBoxJolt = MeshBuilder.CreateBox(`${name}: Debug Box`, { width: jSize.x * 2, height: jSize.y * 2, depth: jSize.z * 2 });;
            this.debugBoxJolt.material = debugBoxJoltMat;

            const mesh = createMeshForShape(jBody.GetShape());
            mesh.parent = this;
            mesh.material = getMaterial('#00ff00')
            mesh.material.wireframe = true;
          }
          this.posBab.copyFrom(this.absolutePosition);
          this.debugBoxBabylon && this.debugBoxBabylon.position.copyFrom(this.absolutePosition);
          this.posJolt.copyFrom(this.joltBBox.centerWorld);
          this.debugBoxJolt && this.debugBoxJolt.position.copyFrom(this.joltBBox.centerWorld);

          if (this.lineRef) {
            MeshBuilder.CreateLines("lines", { points: this.positionLine, instance: this.lineRef });
          }
        }
      })
  }

  getBoundingInfo(): BoundingInfo {
    return this.boundingInfo;
  }
  getVerticesData(kind: string): Nullable<number[] | Float32Array> {
    return this.mesh.getVerticesData(kind);
  }
  getIndices?(): Nullable<IndicesArray> {
    return this.mesh.getIndices();
  }

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
    const meshSize = collision.localBounds.extents[0] * 2;
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
    const mesh = new Mesh('height-map');
    ground.applyToMesh(mesh);

    const terrainMaterial = new TerrainMaterial('terrain');
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
          const data = extras.jolt.collision;

          const [ex, ey, ez] = data.localBounds.extents;
          const [sx, sy, sz] = data.worldScale;
          node.computeWorldMatrix(true);
          const transformParent = new MinimalPhysicsNode(node.name + ": min", [ex * sx, ey * sy, ez * sz], node);
          transformParent.position.set(...data.worldPosition);
          transformParent.rotationQuaternion = new Quaternion();
          transformParent.rotationQuaternion.set(...data.worldRotation);

          if (data.motionType == 'Dynamic' || data.motionType == 'Kinematic') {
            node.parent = transformParent;
            node.scaling.set(...data.worldScale);
            node.position.set(0, 0, 0);
            node.rotationQuaternion = new Quaternion();
            if (DEBUG) {
              node.material = getMaterial('#999999');
              node.visibility = 0.25
            }
          }
          transformParent.physicsImpostor = node.physicsImpostor = new PhysicsImpostor(transformParent, getImpostorShape(data.collisionShape),
            {
              friction: data.friction,
              restitution: data.restitution,
              mass: data.mass,
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
              const joint = new MotorEnabledJoint(0, { nativeParams: { constraint, 'motor-mode': 'velocity' } });
              body1.physicsImpostor?.addJoint(node.physicsImpostor, joint);
              joint.physicsJoint.SetPositionMotorState(1);
              joint.physicsJoint.SetTargetVelocity(1.5);
            } else {
              const joint = new PhysicsJoint(0, { nativeParams: { constraint } });
              body1.physicsImpostor?.addJoint(node.physicsImpostor, joint);
            }
          });
        }
      }
    });
  }
}