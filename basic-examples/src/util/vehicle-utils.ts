import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { IBaseVehicleController } from "@phoenixillusion/babylonjs-jolt-plugin/vehicle";
import { TachometerElement } from "./tachometer";

export interface VehicleInput {
    direction: Vector3,
    handbrake: boolean
}

export function setupVehicleInput(scene: Scene): VehicleInput {
  const input = {
    direction: new Vector3(),
    handbrake: false
  }
  document.addEventListener("keydown", onDocumentKeyDown, false);
  document.addEventListener("keyup", onDocumentKeyUp, false);


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

  scene.onDisposeObservable.add(() => {
    document.removeEventListener('keydown', onDocumentKeyDown);
    document.removeEventListener('keyup', onDocumentKeyUp);
  });

  return input;
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