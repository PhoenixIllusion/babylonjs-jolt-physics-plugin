import { DegreesToRadians, MeshBuilder, SceneCallback, createBox, createSphere } from '../util/example';
import { GravityPoint } from '@phoenixillusion/babylonjs-jolt-plugin/gravity';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { DefaultWheeledVehicleInput, Vehicle, WheeledVehicleController, createBasicCar } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { setupTachometer, setupVehicleInput } from '../util/vehicle-utils';

import { SceneConfig } from '../app';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    return undefined;
  }
}

export default (scene: Scene): SceneCallback => {
  const floor = createSphere(new Vector3(0,-4,0), 14, { mass: 0, friction: 1});
  const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
  tiledTexture.onLoadObservable.add(() => {
    tiledTexture.wrapU = 1;
    tiledTexture.wrapV = 1;
    tiledTexture.vScale = 3;
    tiledTexture.uScale = 3;
    tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
  })
  const material = new StandardMaterial('tile');
  material.diffuseTexture = tiledTexture;
  floor.sphere.material = material;

  new HemisphericLight('hemi', new Vector3(0,0,-1));
  const sphereGravity = new GravityPoint(new Vector3(0,-4,0), 9.81);

  for(let j=0;j<4;j++)
  for(let i=0; i< 360; i+= 15) {
    const rad = DegreesToRadians(i);
    const [x,z] = [Math.cos(rad), Math.sin(rad)]
    const item = createBox(new Vector3(x*15, j*3-6, z*15), Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 1, friction: 1}, '#ff44ff');
    item.physics.setGravityOverride(sphereGravity)
  }

  const centerOfMass = new Vector3(0, -.435, 0);
  const physicSetting: PhysicsImpostorParameters = { mass: 125, restitution: 0, friction: 0, centerOfMass: centerOfMass };
  
  const car = createBox(new Vector3(0,10,0), Quaternion.RotationAxis(new Vector3(0,1,0), Math.PI/2), new Vector3(0.45, .1, 1), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;
  

  const wheeledConfig: Vehicle.WheeledVehicleSettings = createBasicCar({ height: .2, length: 2, width: .9 }, { radius: .2, width: .2 }, true);

  const lonScale = 2;
  const latScale = 5;
  wheeledConfig.wheels.forEach(wheel => {
    wheel.longitudinalFriction = [[0,0], [0.06, 1.2], [0.2, 1]].map(([x,y]) => ([x,y*lonScale]))
    wheel.lateralFriction = [[0,0],[3, 1.2],[20, 1]].map(([x,y]) => ([x,y*latScale*latScale]))
    wheel.position.y += 0.35;
  });
  wheeledConfig.engine = { maxTorque: 900, maxRPM: 2000 };
  wheeledConfig.transmission = { mode: 'auto', shiftUpRPM: 1500 }
  wheeledConfig.maxPitchRollAngle = DegreesToRadians(45);
  const vehicleInput = new DefaultWheeledVehicleInput(car.physics.physicsBody);
  const controller = new WheeledVehicleController(car.physics, wheeledConfig, vehicleInput);

  const carWheels: Mesh[] = []
  wheeledConfig.wheels.forEach((o, i) => {
    const mesh = MeshBuilder.CreateCylinder('cylinder', { diameter: o.radius * 2, height: o.width, tessellation: 16 });
    mesh.position = controller.wheels[i].worldPosition;
    mesh.rotationQuaternion = controller.wheels[i].worldRotation;
    mesh.material = material;
    mesh.parent = car.box;
    carWheels.push(mesh);
  })
  controller.setGravityOverride(sphereGravity);

  const followPoint = new Mesh('camera-follow', scene);


  const { camera, input } = setupVehicleInput(scene);
  setupTachometer(controller, scene);
  camera.getRoot().parent = followPoint;

  const rotateVector = new Vector3();
  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;

    followPoint.position.copyFrom(car.box.position);
    car.box.rotationQuaternion?.toEulerAnglesToRef(rotateVector)
  }
}
