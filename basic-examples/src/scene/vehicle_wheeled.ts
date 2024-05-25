import { MeshBuilder, SceneCallback, createBox } from '../util/example';
import { DefaultWheeledVehicleInput, WheeledVehicleController, Vehicle, createBasicCar } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { loadTrack, setupTachometer, setupVehicleInput } from '../util/vehicle-utils';

let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 30));
    camera.radius = 15;
    return camera;
  }
}

export default async (scene: Scene): Promise<SceneCallback> => {
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

  const physicSetting: PhysicsImpostorParameters = { mass: 1500, restitution: 0, friction: 0, centerOffMass: new Vector3(0, -.4, 0) };
  const car = createBox(new Vector3(0, 2, 0), Quaternion.FromEulerAngles(0, Math.PI, 0), new Vector3(0.9, .2, 2), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;

  const wheeledConfig: Vehicle.WheeledVehicleSettings = createBasicCar({ height: .4, length: 4, width: 1.8 }, { radius: 0.5, width: 0.4 }, true);
  const vehicleInput = new DefaultWheeledVehicleInput(car.physics.physicsBody);
  const controller = new WheeledVehicleController(car.physics, wheeledConfig, vehicleInput);

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

  let stdInertia = controller.engine.inertia;

  const rotateVector = new Vector3();
  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;

    const newInertia = input.boost ? 0.25 * stdInertia : stdInertia;
    if (controller.engine.inertia != newInertia) {
      controller.engine.inertia = newInertia;
    }

    followPoint.position.copyFrom(car.box.position);
    car.box.rotationQuaternion?.toEulerAnglesToRef(rotateVector)
    camera.getRoot().rotation.y = rotateVector.y;
  }
}
