import QuickHull from 'quickhull3d'
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateGroundFromHeightMapVertexData } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import '@babylonjs/core/Physics/v1/physicsEngineComponent';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Engine } from '@babylonjs/core/Engines/engine';
import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { Scene } from '@babylonjs/core/scene';
import { CreateRibbon } from '@babylonjs/core/Meshes/Builders/ribbonBuilder';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';

export const MeshBuilder = {
  CreatePlane,
  CreateSphere,
  CreateCylinder,
  CreateBox,
  CreateCapsule,
  CreateGround,
  CreateGroundFromHeightMapVertexData,
  CreateLines,
  CreateRibbon
}

export type SceneCallback = (void | ((time: number, delta: number) => void))
export type SceneFunction = (scene: Scene) => SceneCallback | Promise<SceneCallback>;

export const DegreesToRadians = (deg: number) => deg * (Math.PI / 180.0);

const NullPhysics: PhysicsImpostorParameters = {
  mass: 0,
  friction: 0,
  restitution: 0
}
type PhysicsOptions = PhysicsImpostorParameters;

export const createFloor = (physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF', size = 100) => {
  const ground = MeshBuilder.CreateGround('ground', { width: size, height: size });
  ground.position.y = -0.5;
  ground.material = getMaterial(color);
  const physics = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, physicsOptions);
  return { ground, physics };
}


const COLOR_HASH: { [key: string]: StandardMaterial } = {};
export const clearMaterials = () => { Object.keys(COLOR_HASH).forEach(key => delete COLOR_HASH[key]) }
export const getMaterial = (color: string): StandardMaterial => {
  if (!COLOR_HASH[color]) {
    const material = COLOR_HASH[color] = new StandardMaterial('Color_' + color);
    material.alpha = 1;
    material.diffuseColor = Color3.FromHexString(color);
  }
  return COLOR_HASH[color];
}


export const createSphere = (position: Vector3, radius: number, physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const sphere = MeshBuilder.CreateSphere('sphere', { diameter: radius, segments: 32 });
  sphere.position.copyFrom(position);
  sphere.material = getMaterial(color);
  const physics = new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, physicsOptions);
  return { sphere, physics };
}
export const createCylinder = (position: Vector3, radiusTop: number, radiusBottom: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const cylinderProps = { height, tessellation: 16 };
  const isTapered = radiusTop !== radiusBottom; 
  const cylinder = (isTapered)
    ? MeshBuilder.CreateCylinder('cylinder', { diameterTop: radiusTop * 2, diameterBottom: radiusBottom * 2, ...cylinderProps })
    : MeshBuilder.CreateCylinder('cylinder', { diameter: radiusTop * 2, ...cylinderProps })
    cylinder.position.copyFrom(position);
    cylinder.material = getMaterial(color);
  const physics = new PhysicsImpostor(cylinder, PhysicsImpostor.CylinderImpostor, {
    radiusTop: isTapered ? radiusTop : undefined,
    radiusBottom: isTapered ? radiusBottom : undefined,
    ...physicsOptions
  });
  return { cylinder, physics };
}

export const createBox = (position: Vector3, rotation: Quaternion, halfExtent: Vector3, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const box = MeshBuilder.CreateBox('box', { width: halfExtent.x * 2, height: halfExtent.y * 2, depth: halfExtent.z * 2 });
  box.position.copyFrom(position);
  box.rotationQuaternion = rotation.clone();
  box.material = getMaterial(color);
  const physics = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, physicsOptions);
  return { box, physics };
}

export const createCapsule = (position: Vector3, radiusTop: number, radiusBottom: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const capsuleProps = { height: height + radiusTop + radiusBottom, tessellation: 16 };
  const isTapered = radiusTop !== radiusBottom; 
  const box = (isTapered)
    ? MeshBuilder.CreateCapsule('capsule', { radiusTop, radiusBottom, ...capsuleProps })
    : MeshBuilder.CreateCapsule('capsule', { radius: radiusBottom, ...capsuleProps })
  box.position.copyFrom(position);
  box.material = getMaterial(color);
  const physics = new PhysicsImpostor(box, PhysicsImpostor.CapsuleImpostor, {
    radiusTop: isTapered ? radiusTop : undefined,
    radiusBottom: isTapered ? radiusBottom : undefined,
    ...physicsOptions
  });
  return { box, physics };
}

export const createConvexHull = (position: Vector3, points: Vector3[], physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const rawPoints = points.map(x => [x.x, x.y, x.z]);
  const faces = QuickHull(points.map(x => [x.x, x.y, x.z]));

  const vertex: number[] = [];
  const indices: number[] = [];
  let index = 0;
  faces.forEach(vIndex => {
    [0,2,1].forEach(i => {
      vertex.push(... rawPoints[vIndex[i]]);
      indices.push(index++);
    })
  })

  const normals: number[] = [];
  var vertexData = new VertexData();
  VertexData.ComputeNormals(vertex, indices, normals);
  vertexData.positions = vertex;
  vertexData.indices = indices;
  vertexData.normals = normals;

  const mesh = new Mesh('convex-hull', Engine.LastCreatedScene!);
  vertexData.applyToMesh(mesh);
  mesh.position.copyFrom(position);
  mesh.material = getMaterial(color);
  const physics = new PhysicsImpostor(mesh, PhysicsImpostor.ConvexHullImpostor, physicsOptions);
  return { mesh, physics };
}

export const getRandomQuat = () => {
  const randomV3 = new Vector3(0.001 + Math.random(), Math.random(), Math.random()).normalize();
  return Quaternion.RotationAxis(randomV3, 2 * Math.PI * Math.random());
}

export const createMeshFloor = (n: number, cell_size: number, amp: number, position: Vector3, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const mesh = new Mesh('mesh-floor', Engine.LastCreatedScene!);
  const height = function (x: number, y: number) { return Math.sin(x / 2) * Math.cos(y / 3) * amp; };
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  for (let x = 0; x < n; ++x)
    for (let z = 0; z < n; ++z) {
      let center = n * cell_size / 2;

      let x1 = cell_size * x - center;
      let z1 = cell_size * z - center;
      let x2 = x1 + cell_size;
      let z2 = z1 + cell_size;

      {
        positions.push(
          x1, height(x, z + 1), z2,
          x1, height(x, z), z1,
          x2, height(x + 1, z + 1), z2)
      }
      {
        positions.push(
          x2, height(x + 1, z + 1), z2,
          x1, height(x, z), z1,
          x2, height(x + 1, z), z1)
      }
    }
  for (let i = 0; i < positions.length / 3; i++) {
    indices.push(i);
  }
  var vertexData = new VertexData();
  VertexData.ComputeNormals(positions, indices, normals);
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;

  vertexData.applyToMesh(mesh);
  mesh.position.copyFrom(position);
  mesh.material = getMaterial(color);
  const physics = new PhysicsImpostor(mesh, PhysicsImpostor.MeshImpostor, physicsOptions);
  return { mesh, physics };
}

export function createMeshForShape(impostor: PhysicsImpostor, color: Color3) {
  // Create a three mesh
  var vertexData = impostor.getShapeVertexData();
  let colors: number[] = [];
  for (let i = 0; i < vertexData.positions!.length / 3; i++) {
    colors.push(color.r, color.g, color.b, 1);
  }
  vertexData.colors = new Float32Array(colors);

  const mesh = new Mesh('debug-mesh', Engine.LastCreatedScene!);
  vertexData.applyToMesh(mesh);
  mesh.sideOrientation = Material.ClockWiseSideOrientation;
  return mesh;
}

export function loadImage(url: string, width?: number, height?: number): Promise<HTMLImageElement> {
  const img = new Image();
  if (width)
    img.width = width;
  if (height)
    img.height = height;
  img.src = url;
  return new Promise(resolve => img.onload = () => resolve(img));
}

export function loadSVGImage(svgString: string, width: number, height: number) {
  const svgSrc = 'data:image/svg+xml;base64,' + btoa(svgString);
  return loadImage(svgSrc, width, height);
}

export function getImagePixels(img: HTMLImageElement): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, img.width, img.height);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  return new Uint8Array(imgData.data.buffer);
}

export function createHeightField(buffer: Uint8Array, material: Material, IMAGE_SIZE: number, scale: number, minHeight: number, maxHeight: number) {
  const heightBuffer = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  const ground = MeshBuilder.CreateGroundFromHeightMapVertexData({
    width: IMAGE_SIZE * scale,
    height: IMAGE_SIZE * scale,
    subdivisions: IMAGE_SIZE - 1,
    bufferHeight: IMAGE_SIZE,
    bufferWidth: IMAGE_SIZE,
    buffer,
    minHeight,
    maxHeight,
    colorFilter: new Color3(1, 0, 0),
    alphaFilter: 0,
    heightBuffer: heightBuffer
  });
  const mesh = new Mesh('height-map', Engine.LastCreatedScene!);
  ground.applyToMesh(mesh);
  mesh.material = material;
  mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.HeightmapImpostor, {
    mass: 0,
    friction: 1,
    heightMap: {
      size: IMAGE_SIZE,
      data: heightBuffer,
      alphaFilter: 0
    }
  });
  return mesh;
}

export function createTexture(image: HTMLImageElement, sampling: number = Texture.BILINEAR_SAMPLINGMODE): Texture {
  return new Texture(`texture`, Engine.LastCreatedScene, true,
    true, sampling,
    null, null, image, true);
}

const IMAGE_HASH: { [key: string]: StandardMaterial } = {};
export function createImageMaterial(name: string, image: HTMLImageElement): Material {
  if (IMAGE_HASH[name]) {
    return IMAGE_HASH[name];
  }
  const mat = IMAGE_HASH[name] = new StandardMaterial('Image_' + name);
  mat.diffuseTexture = createTexture(image);
  return mat;
}

export function getTiledTexture() {
  const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
  tiledTexture.onLoadObservable.add(() => {
    tiledTexture.wrapU = 1;
    tiledTexture.wrapV = 1;
    tiledTexture.vScale = 3;
    tiledTexture.uScale = 3;
    tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
  })
  return tiledTexture;
}