import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { IBaseVehicleController } from "@phoenixillusion/babylonjs-jolt-plugin/vehicle";
import { TachometerElement } from "./tachometer";
import { CameraSetup } from "./camera";
import { CameraCombinedInput } from "./controller";
import { BaseKeyCodes } from "./controller/keyboard";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Button } from "@babylonjs/gui/2D/controls/button";
import { App } from "../app";
import { TerrainMaterial } from "@babylonjs/materials";
import { loadImage, getImagePixels, createTexture, createHeightField } from "./example";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

export interface VehicleInput {
  direction: Vector3,
  handbrake: boolean,
  boost: boolean;
}

class VehicleKeyCodes extends BaseKeyCodes {
  BRAKE: KeyboardEventTypes[] = ['ShiftLeft'];
  BOOST: KeyboardEventTypes[] = ['Space'];
}

function clamp(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export async function loadTrack(scene: Scene) {
  const svg = await loadImage('race_track_height.svg', 824, 824);
  const buffer = getImagePixels(svg);

  const terrainMaterial = new TerrainMaterial('terrain', scene);
  terrainMaterial.mixTexture = await createTexture(await loadImage('race_track_mix.svg', 824, 824), Texture.NEAREST_NEAREST);
  const t1 = terrainMaterial.diffuseTexture1 = new Texture('textures/dirt.jpg');
  const t2 = terrainMaterial.diffuseTexture2 = new Texture('textures/grass.jpg');
  const t3 = terrainMaterial.diffuseTexture3 = new Texture('textures/bush.jpg');
  t1.uScale = t1.vScale = t2.uScale = t2.vScale = t3.uScale = t3.vScale = 50;
  const heightField = createHeightField(buffer, terrainMaterial, 824, 0.5, 0, 30);
  heightField.physicsImpostor!.friction = 1;
}

function createCommandButton(text: string, index: number) {
  const state = { pressed: false };
  const button = Button.CreateSimpleButton('button-' + text, text);
  button.color = "white";
  button.background = "green";
  const screenSize = CameraCombinedInput.getScreenSize();
  button.leftInPixels = -screenSize.x / 2 + screenSize.x / 8 + 10;
  button.widthInPixels = screenSize.x / 4;
  button.heightInPixels = 80;
  button.topInPixels = screenSize.y / 2 - 50 - index * 90;
  button.onPointerDownObservable.add(() => {
    state.pressed = true;
  });
  button.onPointerUpObservable.add(() => {
    state.pressed = false;
  });
  App.instance.ui!.addControl(button);
  return state;
}

export function setupVehicleInput(scene: Scene): { input: VehicleInput, camera: CameraSetup } {
  const input: VehicleInput = {
    direction: new Vector3(),
    handbrake: false,
    boost: false
  }
  const keycodes = new VehicleKeyCodes();
  const camera = new CameraSetup(scene);

  const breakButtonDown = createCommandButton('BRAKE', 0);
  const boostButtonDown = createCommandButton('BOOST', 1);

  const listener = new CameraCombinedInput<FreeCamera, VehicleKeyCodes>((_camera, joystick, keyboard) => {
    input.direction.x = 0;
    input.direction.z = 0;
    input.handbrake = false;
    input.boost = false;
    if (keyboard.LEFT) input.direction.x = 1;
    if (keyboard.RIGHT) input.direction.x -= 1;
    if (keyboard.FORWARD) input.direction.z = 1;
    if (keyboard.BACKWARD) input.direction.z -= 1;
    if (keyboard.BRAKE) input.handbrake = true;
    if (keyboard.BOOST) input.boost = true;
    if (breakButtonDown.pressed) {
      input.handbrake = true;
    }
    if (boostButtonDown.pressed) {
      input.boost = true;
    }

    if (joystick.length() > 0) {
      input.direction.x = clamp(-1, -joystick.x, 1);
      input.direction.z = clamp(-1, -joystick.y, 1);
    }
  }, camera, keycodes);





  camera.setController(listener);
  camera.changeTiltY(-.3);
  camera.setDistance(12);
  return { input, camera };
}

export function setupTachometer(controller: IBaseVehicleController, scene: Scene): void {
  const tachometer: TachometerElement = new TachometerElement();
  document.body.append(tachometer);

  tachometer.controller = controller;
  tachometer.setup();
  scene.onAfterRenderObservable.add(() => {
    tachometer.update();
  })
  scene.onDisposeObservable.add(() => {
    document.body.removeChild(tachometer);
  });
}
