import { MeshBuilder, SceneCallback, createBox } from '../util/example';
import { DefaultTrackedInput, TrackedVehicleController, Vehicle, createBasicTracked } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { SceneConfig } from '../app';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { loadTrack, setupTachometer, setupVehicleInput } from '../util/vehicle-utils';

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    return undefined;
  }
}

export default async (scene: Scene): Promise<SceneCallback> => {
  const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
  tiledTexture.onLoadObservable.add(() => {
    tiledTexture.wrapU = 1;
    tiledTexture.wrapV = 1;
    tiledTexture.vScale = 1;
    tiledTexture.uScale = 1;
    tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
  })
  const material = new StandardMaterial('tile');
  material.diffuseTexture = tiledTexture;

  const physicSetting: PhysicsImpostorParameters = { mass: 6200, restitution: 0, friction: 0 };
  const car = createBox(new Vector3(0, 2, 0), Quaternion.FromEulerAngles(0, Math.PI, 0), new Vector3(0.9, .2, 2), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;
  const topTank = MeshBuilder.CreateCylinder('top-tank', { diameter: 1, height: 0.35, tessellation: 12 })
  topTank.position.set(0, 0.35, -0.75);
  const topBarrel = MeshBuilder.CreateCylinder('top-barrel', { height: 1.5, diameter: 0.2, tessellation: 6 });
  topBarrel.rotation.set(Math.PI / 2, 0, 0);
  topBarrel.position.set(0, 0.45, 0.45);
  topBarrel.parent = topTank.parent = car.box;
  topBarrel.material = topTank.material = car.box.material;

  const wheeledConfig: Vehicle.TrackVehicleSettings = createBasicTracked({ height: .8, length: 4, width: 1.8 }, { radius: 0.20, width: 0.1 });
  const vehicleInput = new DefaultTrackedInput(car.physics.physicsBody);
  const controller = new TrackedVehicleController(car.physics, wheeledConfig, vehicleInput);

  await loadTrack(scene);
  const carWheels: Mesh[] = []
  wheeledConfig.wheels.forEach((o, i) => {
    const mesh = MeshBuilder.CreateCylinder('cylinder', { diameter: o.radius * 2, height: o.width, tessellation: 16 });
    mesh.position = controller.wheels[i].worldPosition;
    mesh.rotationQuaternion = controller.wheels[i].worldRotation;
    mesh.material = material;
    mesh.parent = car.box;
    carWheels.push(mesh);
  })
  const followPoint = new Mesh('camera-follow', scene);

  const { camera, input } = setupVehicleInput(scene);
  setupTachometer(controller, scene);
  camera.getRoot().parent = followPoint;

  const stdTorque = controller.engine.maxTorque;

  const rotateVector = new Vector3();
  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;

    const newTorque = input.boost ? 2 * stdTorque : stdTorque;
    if (controller.engine.maxTorque != newTorque) {
      controller.engine.maxTorque = newTorque;
    }

    followPoint.position.copyFrom(car.box.position);
    car.box.rotationQuaternion?.toEulerAnglesToRef(rotateVector)
    camera.getRoot().rotation.y = rotateVector.y;
  }
}
