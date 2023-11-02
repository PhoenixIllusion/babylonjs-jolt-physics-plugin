import { Color3,  Mesh, MeshBuilder, PhysicsImpostor, PhysicsImpostorParameters, Quaternion, StandardMaterial, Vector3, VertexData } from '@babylonjs/core';
import QuickHull from 'quickhull3d'
import { JoltPhysicsImpostor } from '../plugin/jolt-impostor';

interface PhysicsOptions {
  mass: number, friction: number, restitution: number
}

export type SceneCallback = (void|((time: number, delta: number) =>void))
export type SceneFunction = () => SceneCallback;

export const DegreesToRadians = (deg: number) => deg * (Math.PI / 180.0);

const NullPhysics: PhysicsOptions = {
  mass: 0,
  friction: 0,
  restitution: 0
}

export const createFloor = (physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100 });
  ground.position.y = -0.5;
  ground.material = getMaterial(color);
  const physics =new JoltPhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, physicsOptions);
  return { ground, physics };
}


const COLOR_HASH: {[key: string]: StandardMaterial} = {};
export const getMaterial = (color: string) => {
  if(!COLOR_HASH[color]){
    const material = COLOR_HASH[color] = new StandardMaterial('Color_'+color);
    material.alpha = 1;
    material.diffuseColor = Color3.FromHexString(color);
  }
  return COLOR_HASH[color];
}


export const createSphere = (position: Vector3, radius: number, physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const sphere = MeshBuilder.CreateSphere('sphere', { diameter: radius, segments: 32 });
  sphere.position.copyFrom(position);
  sphere.material = getMaterial(color);
  const physics =new JoltPhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, physicsOptions);
  return { sphere, physics };
}
export const createCylinder = (position: Vector3, radius: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const cylinder = MeshBuilder.CreateCylinder('cylinder', { diameter: radius, height, tessellation: 16 });
  cylinder.position.copyFrom(position);
  cylinder.material = getMaterial(color);
  const physics =new JoltPhysicsImpostor(cylinder, PhysicsImpostor.CylinderImpostor, physicsOptions);
  return { cylinder, physics };
}

export const createBox = (position: Vector3, rotation: Quaternion, halfExtent: Vector3, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const box = MeshBuilder.CreateBox('box', {width: halfExtent.x *2, height: halfExtent.y * 2, depth: halfExtent.z * 2});
  box.position.copyFrom(position);
  box.rotationQuaternion = rotation;
  box.material = getMaterial(color);
  const physics = new JoltPhysicsImpostor(box, PhysicsImpostor.BoxImpostor, physicsOptions);
  return { box, physics };
}

export const createCapsule = (position: Vector3, radiusTop: number, radiusBottom: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const capsuleProps = { height: height + radiusTop + radiusBottom, tessellation: 16 }
  const box = ( radiusTop !== radiusBottom )
              ? MeshBuilder.CreateCapsule('capsule', { radiusTop, radiusBottom, ... capsuleProps })
              : MeshBuilder.CreateCapsule('capsule', { radius: radiusBottom, ... capsuleProps })
  box.position.copyFrom(position);
  box.material = getMaterial(color);
  const physics =new JoltPhysicsImpostor(box, PhysicsImpostor.CapsuleImpostor, {
    radiusTop: radiusTop !== radiusBottom ? radiusBottom: undefined,
    radiusBottom: radiusTop !== radiusBottom ? radiusBottom: undefined,
    ... physicsOptions
  } as PhysicsImpostorParameters);
  return { box, physics };
}

export const createConvexHull = (position: Vector3, points: Vector3[], physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const rawPoints = points.map(x => [x.x, x.y, x.z]);
  const faces = QuickHull(points.map(x => [x.x, x.y, x.z]));

  const filteredPoints: number[][] = [];
  const indexUsed: {[i: number]: boolean} = {}
  faces.forEach(indices => {
    indices.forEach( i => {
      if(!indexUsed[i]){
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
  const physics =new JoltPhysicsImpostor(mesh, PhysicsImpostor.ConvexHullImpostor, physicsOptions);
  return { mesh, physics };
}

export const getRandomQuat = () => {
  const randomV3 = new Vector3(0.001 + Math.random(), Math.random(), Math.random()).normalize();
  return Quaternion.RotationAxis(randomV3,2 * Math.PI * Math.random());
}

export const createMeshFloor = (n: number, cell_size: number, amp: number, position: Vector3, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const mesh = new Mesh('mesh-floor');
  const height = function (x: number, y: number) { return Math.sin(x / 2) * Math.cos(y / 3)*amp; };
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
          x1, height(x,z), z1,
          x2, height(x + 1, z + 1), z2)
			}
			{
        positions.push(
          x2, height(x + 1, z + 1), z2,
          x1, height(x,z), z1,
          x2, height(x + 1, z), z1)
			}
		}
    for(let i=0;i<positions.length/3;i++){
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
    const physics =new JoltPhysicsImpostor(mesh, PhysicsImpostor.MeshImpostor, physicsOptions);
    return { mesh, physics };
}