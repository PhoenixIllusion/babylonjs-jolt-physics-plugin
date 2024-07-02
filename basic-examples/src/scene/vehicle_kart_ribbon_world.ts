import { DegreesToRadians, MeshBuilder, SceneCallback, createBox, createFloor } from '../util/example';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor, PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { createPath3DWithCatmullRomPath } from '@phoenixillusion/babylonjs-jolt-plugin/path';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { GravityInterface } from '@phoenixillusion/babylonjs-jolt-plugin/gravity';
import { setupTachometer, setupVehicleInput } from '../util/vehicle-utils';
import { Vehicle, createBasicCar, DefaultWheeledVehicleInput, WheeledVehicleController } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 30));
    return camera;
  }
}


export default (scene: Scene): SceneCallback => {
  const floor = createFloor();
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
  floor.ground.material = material;

  const path = createPath3DWithCatmullRomPath(
    [new Vector3(0, 0, -20), new Vector3(0, 0, -10), new Vector3(0, 0, 0), new Vector3(0, 0, 10), new Vector3(0, 0, 20), new Vector3(0, 0, 30), new Vector3(0, 0, 40)],
    [new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, -1, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, -1, 0)]
      .map(v => v.negate())
    , 50, false);

  const ribbonGravity: GravityInterface = {
    getGravity: (_impostor, com: () => Vector3): Vector3 => {
      const point = path.getClosestPositionTo(com());
      return path.getNormalAt(point, true).scale(9.8)
    }
  };

  const points = path.getPoints();
  const binormals = path.getBinormals();
  const normals = path.getNormals();
  const pathArray: [Vector3[], Vector3[]] = [[], []];
  points.forEach((p, i) => {
    pathArray[1].push(p.add(binormals[i].scale(3)))
    pathArray[0].push(p.subtract(binormals[i].scale(3)))
    if (i % 8 == 4) {
      const pos = p.add(new Vector3(0, 10, 0)).add(normals[i].negate());
      const boxes1 = createBox(pos.add(binormals[i].scale(2)), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25), { mass: 1, friction: 1 }, '#990000');
      boxes1.physics.setGravityOverride(ribbonGravity);
      const boxes2 = createBox(pos.subtract(binormals[i].scale(2)), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25), { mass: 1, friction: 1 }, '#009900');
      boxes2.physics.setGravityOverride(ribbonGravity);
    }
  });

  const ribbon = MeshBuilder.CreateRibbon("ribbon", { pathArray, sideOrientation: Mesh.DOUBLESIDE }, scene);
  ribbon.position.y += 10;
  ribbon.physicsImpostor = new PhysicsImpostor(ribbon, PhysicsImpostor.MeshImpostor, { mass: 0, friction: 1 });

  ribbon.material = material;
  new HemisphericLight('hemi', new Vector3(0, 0, -1));

  const centerOfMass = new Vector3(0, -.435, 0);
  const physicSetting: PhysicsImpostorParameters = { mass: 125, restitution: 0, friction: 0, centerOfMass: centerOfMass };

  const car = createBox(new Vector3(0.5, 11, -15), Quaternion.RotationAxis(new Vector3(0, 1, 0), 0), new Vector3(0.45, .1, 1), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;


  const wheeledConfig: Vehicle.WheeledVehicleSettings = createBasicCar({ height: .2, length: 2, width: .9 }, { radius: .2, width: .2 }, true);

  const lonScale = 2;
  const latScale = 5;
  wheeledConfig.wheels.forEach(wheel => {
    wheel.longitudinalFriction = [[0, 0], [0.06, 1.2], [0.2, 1]].map(([x, y]) => ([x, y * lonScale]))
    wheel.lateralFriction = [[0, 0], [3, 1.2], [20, 1]].map(([x, y]) => ([x, y * latScale * latScale]))
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
  controller.setGravityOverride(ribbonGravity);

  const followPoint = new Mesh('camera-follow', scene);


  const { camera, input } = setupVehicleInput(scene);
  setupTachometer(controller, scene);
  camera.getRoot().parent = followPoint;
  camera.rotate(Math.PI)


  const pictureInPicture = new UniversalCamera('follow-pip', new Vector3(-75, 30, 0));
  scene.activeCameras?.push(camera.getCamera())
  scene.activeCameras?.push(pictureInPicture);
  pictureInPicture.viewport = new Viewport(0.75, 0.75, 0.25, 0.25);
  pictureInPicture.fov = 0.3;
  pictureInPicture.lockedTarget = followPoint;

  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;

    followPoint.position.copyFrom(car.box.position);
  }
}
