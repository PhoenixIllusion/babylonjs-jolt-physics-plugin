
import QuickHull from 'quickhull3d'
import { JoltPhysicsImpostor } from '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { CameraSetup } from '../util/camera';
import { CameraCombinedInput } from '../util/controller';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';

export interface PhysicsOptions {
  mass: number, friction: number, restitution: number
}

const NullPhysics: PhysicsOptions = {
  mass: 0,
  friction: 0,
  restitution: 0
}

//help tree-shake
export const MeshBuilder = {
  CreateSphere,
  CreateCylinder,
  CreateBox,
  CreateCapsule
}

const COLOR_HASH: { [key: string]: StandardMaterial } = {};
export const getMaterial = (color: string) => {
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
  const physics = new JoltPhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, physicsOptions);
  return { sphere, physics };
}
export const createCylinder = (position: Vector3, radius: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color: string = '#FFFFFF') => {
  const cylinder = MeshBuilder.CreateCylinder('cylinder', { diameter: radius, height, tessellation: 16 });
  cylinder.position.copyFrom(position);
  cylinder.material = getMaterial(color);
  const physics = new JoltPhysicsImpostor(cylinder, PhysicsImpostor.CylinderImpostor, physicsOptions);
  return { cylinder, physics };
}

export const createBox = (position: Vector3, rotation: Quaternion, halfExtent: Vector3, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const box = MeshBuilder.CreateBox('box', { width: halfExtent.x * 2, height: halfExtent.y * 2, depth: halfExtent.z * 2 });
  box.position.copyFrom(position);
  box.rotationQuaternion = rotation;
  box.material = getMaterial(color);
  const physics = new JoltPhysicsImpostor(box, PhysicsImpostor.BoxImpostor, physicsOptions);
  return { box, physics };
}

export const createCapsule = (position: Vector3, radiusTop: number, radiusBottom: number, height: number, physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
  const capsuleProps = { height: height + radiusTop + radiusBottom, tessellation: 16 }
  const box = (radiusTop !== radiusBottom)
    ? MeshBuilder.CreateCapsule('capsule', { radiusTop, radiusBottom, ...capsuleProps })
    : MeshBuilder.CreateCapsule('capsule', { radius: radiusBottom, ...capsuleProps })
  box.position.copyFrom(position);
  box.material = getMaterial(color);
  const physics = new JoltPhysicsImpostor(box, PhysicsImpostor.CapsuleImpostor, {
    radiusTop: radiusTop !== radiusBottom ? radiusBottom : undefined,
    radiusBottom: radiusTop !== radiusBottom ? radiusBottom : undefined,
    ...physicsOptions
  } as PhysicsImpostorParameters);
  return { box, physics };
}

export const createConvexHull = (position: Vector3, points: Vector3[], physicsOptions: PhysicsOptions = NullPhysics, color = '#FFFFFF') => {
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
  const physics = new JoltPhysicsImpostor(mesh, PhysicsImpostor.ConvexHullImpostor, physicsOptions);
  return { mesh, physics };
}


export const createStandardControls = (inputHandler: StandardCharacterVirtualHandler, mesh: TransformNode) => {
  const input = {
    direction: new Vector3(),
    jump: false,
    crouched: false
  }

  const camera = new CameraSetup();
  const listener = new CameraCombinedInput<FreeCamera>((camera, joystick, keyboard) => {
    input.direction.set(0, 0, 0);
    if (keyboard.KEY_PRESSED) {
      if (keyboard.LEFT) input.direction.x -= 1;
      if (keyboard.RIGHT) input.direction.x += 1;
      if (keyboard.FORWARD) input.direction.z += 1;
      if (keyboard.BACKWARD) input.direction.z -= 1;
    }
    input.jump = keyboard.JUMP;
    if (joystick.length() > 0) {
      input.direction.x = joystick.x;
      input.direction.z = -joystick.y;
    }
    const rotation = camera.getWorldMatrix().getRotationMatrix();
    const cameraDirectioNV = Vector3.TransformCoordinates(input.direction, rotation);
    cameraDirectioNV.y = 0;
    cameraDirectioNV.normalize();
    if (input.direction.length()) {
      mesh.lookAt(mesh.position.add(cameraDirectioNV));
    }
    inputHandler.updateInput(cameraDirectioNV, input.jump);
  }, camera);
  camera.setController(listener);
  return camera;
}