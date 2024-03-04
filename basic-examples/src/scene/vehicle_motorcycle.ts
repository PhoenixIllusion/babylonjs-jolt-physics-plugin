import { MeshBuilder, SceneCallback, createBox, createFloor } from '../util/example';
import { Vehicle, DefaultMotorcycleInput, MotorcycleController, createBasicMotorcycle } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';

let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 15));
    camera.radius = 20;
    return camera;
  }
}

export default (): SceneCallback => {
  const floor = createFloor({ friction: 1, mass: 0, restitution: 0 });
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

  const input = {
    direction: new Vector3(),
    handbrake: false
  }
  document.addEventListener("keydown", onDocumentKeyDown, false);
  document.addEventListener("keyup", onDocumentKeyUp, false);

  const physicSetting = { mass: 800, restitution: 0, friction: 0, 'offset-center-of-mass': new Vector3(0, -.2, 0) };
  const car = createBox(new Vector3(0, 2, 0), Quaternion.FromEulerAngles(0, Math.PI, 0), new Vector3(0.05, .2, 2), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;

  const wheeledConfig: Vehicle.MotorcycleVehicleSettings = createBasicMotorcycle({ height: .4, length: 4 }, { radius: 0.3, width: 0.1 });
  const vehicleInput = new DefaultMotorcycleInput(car.physics.physicsBody);
  const controller = new MotorcycleController(car.physics, wheeledConfig, vehicleInput);

  const carWheels: Mesh[] = []
  wheeledConfig.wheels.forEach((o, i) => {
    const mesh = MeshBuilder.CreateCylinder('cylinder', { diameter: o.radius * 2, height: o.width, tessellation: 16 });
    mesh.position = controller.wheelTransforms[i].position;
    mesh.rotationQuaternion = controller.wheelTransforms[i].rotation;
    mesh.material = material;
    mesh.parent = car.box;
    carWheels.push(mesh);
  })
  const followPoint = new Mesh('camera-follow');
  followPoint.rotate(new Vector3(0, 1, 0), Math.PI);
  followPoint.parent = car.box;

  if (camera)
    camera.lockedTarget = followPoint;

  const KEYCODE = {
    W: 87,
    S: 83,
    A: 65,
    D: 68,
    SPACE: 32
  }

  function onDocumentKeyDown(event: KeyboardEvent) {
    var keyCode = event.which;
    if (keyCode == KEYCODE.W) {
      input.direction.z = 1;
    } else if (keyCode == KEYCODE.S) {
      input.direction.z = -1;
    } else if (keyCode == KEYCODE.A) {
      input.direction.x = 1;
    } else if (keyCode == KEYCODE.D) {
      input.direction.x = -1;
    } else if (keyCode == KEYCODE.SPACE) {
      input.handbrake = true;
    }
  };
  function onDocumentKeyUp(event: KeyboardEvent) {
    var keyCode = event.which;
    if (keyCode == KEYCODE.W) {
      input.direction.z = 0;
    } else if (keyCode == KEYCODE.S) {
      input.direction.z = 0;
    } else if (keyCode == KEYCODE.A) {
      input.direction.x = 0;
    } else if (keyCode == KEYCODE.D) {
      input.direction.x = 0;
    } else if (keyCode == KEYCODE.SPACE) {
      input.handbrake = false;
    }
  };

  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;
  }
}