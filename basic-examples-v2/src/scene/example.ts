import QuickHull from 'quickhull3d'
import { JoltPhysicsImpostor } from '@phoenixillusion/babylonjs-jolt-plugin/v1/impostor';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@babylonjs/core/Physics/v1/physicsEngineComponent';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsMotionType, PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { Engine } from '@babylonjs/core/Engines/engine';
import Jolt from '../../../dist/jolt-import';
import { PhysicsShape, PhysicsShapeCapsule, PhysicsShapeConvexHull, PhysicsShapeCylinder, PhysicsShapeMesh, PhysicsShapeSphere } from '@babylonjs/core/Physics/v2/physicsShape';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShapeBox } from '@babylonjs/core';

export const MeshBuilder = {
  CreateSphere,
  CreateCylinder,
  CreateBox,
  CreateCapsule,
  CreateGround
}

interface PhysicsOptions {
  mass: number, friction: number, restitution: number
}

export type SceneCallback = (void | ((time: number, delta: number) => void))
export type SceneFunction = (scene: Scene) => SceneCallback;

export const DegreesToRadians = (deg: number) => deg * (Math.PI / 180.0);

const NullPhysics: ()=>PhysicsOptions = () => ({
  mass: 0,
  friction: 0,
  restitution: 0
})

function makePhysics(mesh: Mesh, shapeClass: { FromMesh: (mesh: Mesh, scene?: Scene) => PhysicsShape}, physicsOptions: PhysicsOptions) {
  const scene = Engine.LastCreatedScene!;
  const shape = shapeClass.FromMesh(mesh, scene);
  shape.material = physicsOptions;
  const physics = new PhysicsBody(mesh, physicsOptions.mass == 0 ? PhysicsMotionType.STATIC : PhysicsMotionType.DYNAMIC, false, scene);
  physics.setMassProperties(physicsOptions);
  physics.shape = shape;
  return physics;
}


export const createFloor = (physicsOptions: PhysicsOptions = NullPhysics(), color: string = '#FFFFFF') => {
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100 });
  ground.position.y = -0.5;
  ground.material = getMaterial(color);
  const physics = makePhysics(ground, PhysicsShapeBox, physicsOptions);
  return { ground, physics };
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
export const createSphere = (position: Vector3, radius: number, physicsOptions: PhysicsOptions = NullPhysics(), color: string = '#FFFFFF') => {
  const sphere = MeshBuilder.CreateSphere('sphere', { diameter: radius, segments: 32 });
  sphere.position.copyFrom(position);
  sphere.material = getMaterial(color);
  const physics = makePhysics(sphere, PhysicsShapeSphere, physicsOptions);
  return { sphere, physics };
}
export const createCylinder = (position: Vector3, radius: number, height: number, physicsOptions: PhysicsOptions = NullPhysics(), color: string = '#FFFFFF') => {
  const cylinder = MeshBuilder.CreateCylinder('cylinder', { diameter: radius, height, tessellation: 16 });
  cylinder.position.copyFrom(position);
  cylinder.material = getMaterial(color);
  const physics = makePhysics(cylinder, PhysicsShapeCylinder, physicsOptions);
  return { cylinder, physics };
}

export const createBox = (position: Vector3, rotation: Quaternion, halfExtent: Vector3, physicsOptions: PhysicsOptions = NullPhysics(), color = '#FFFFFF') => {
  const box = MeshBuilder.CreateBox('box', { width: halfExtent.x * 2, height: halfExtent.y * 2, depth: halfExtent.z * 2 });
  box.position.copyFrom(position);
  box.rotationQuaternion = rotation.clone();
  box.material = getMaterial(color);
  const physics = makePhysics(box, PhysicsShapeBox, physicsOptions);
  return { box, physics };
}

export const createCapsule = (position: Vector3, radiusTop: number, radiusBottom: number, height: number, physicsOptions: PhysicsOptions = NullPhysics(), color = '#FFFFFF') => {
  const capsuleProps = { height: height + radiusTop + radiusBottom, tessellation: 16 }
  const capsule = (radiusTop !== radiusBottom)
    ? MeshBuilder.CreateCapsule('capsule', { radiusTop, radiusBottom, ...capsuleProps })
    : MeshBuilder.CreateCapsule('capsule', { radius: radiusBottom, ...capsuleProps })
  capsule.position.copyFrom(position);
  capsule.material = getMaterial(color);
  const physics = makePhysics(capsule, PhysicsShapeCapsule, physicsOptions);
  return { capsule, physics };
}

export const createConvexHull = (position: Vector3, points: Vector3[], physicsOptions: PhysicsOptions = NullPhysics(), color = '#FFFFFF') => {
  const rawPoints = points.map(x => [x.x, x.y, x.z]);
  const faces = QuickHull(points.map(x => [x.x, x.y, x.z]));

  const filteredPoints: number[][] = [];
  const indexUsed: { [i: number]: boolean } = {}
  faces.forEach(indices => {
    indices.forEach(i => {
      if (!indexUsed[i]) {
        indexUsed[i] = true;
        filteredPoints.push(rawPoints[i]);
      }
    })
  })
  const positions = filteredPoints.flat();
  const indices = QuickHull(filteredPoints).flat();
  const normals: number[] = [];
  var vertexData = new VertexData();
  VertexData.ComputeNormals(positions, indices, normals);
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;

  const mesh = new Mesh('convex-hull');
  vertexData.applyToMesh(mesh);
  mesh.position.copyFrom(position);
  mesh.material = getMaterial(color);
  mesh.material.wireframe = true;
  const physics = makePhysics(mesh, { FromMesh: (mesh, scene) => new PhysicsShapeConvexHull(mesh, scene!)}, physicsOptions);
  return { mesh, physics };
}

export const getRandomQuat = () => {
  const randomV3 = new Vector3(0.001 + Math.random(), Math.random(), Math.random()).normalize();
  return Quaternion.RotationAxis(randomV3, 2 * Math.PI * Math.random());
}

export const createMeshFloor = (n: number, cell_size: number, amp: number, position: Vector3, physicsOptions: PhysicsOptions = NullPhysics(), color = '#FFFFFF') => {
  const mesh = new Mesh('mesh-floor');
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
  const physics = makePhysics(mesh, { FromMesh: (mesh, scene) => new PhysicsShapeMesh(mesh, scene!)}, physicsOptions);
  return { mesh, physics };
}

export function enableDebugMesh(mesh: Mesh, physics: PhysicsAggregate) {
  if(mesh.getChildren().length == 0) {
    let joltBody: Jolt.Body = physics.body._pluginData.body;
    if(joltBody) {
        const mesh = createMeshForShape(joltBody.GetShape());
        mesh.parent = mesh;
        mesh.material = getMaterial('#00ff00')
        mesh.material.wireframe = true;
    }
  }
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