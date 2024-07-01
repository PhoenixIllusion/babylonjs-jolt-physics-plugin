import { CameraSetup } from "./camera";
import { CameraCombinedInput } from "./controller";
import { createCommandButton } from "./ui-util";
import { BaseKeyCodes } from "./controller/keyboard";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Scene } from "@babylonjs/core/scene";
import { Button } from "@babylonjs/gui/2D/controls/button";

interface CharacterInput {
  direction: Vector3,
  jump: boolean,
  action: boolean
}

class CharKeyCodes extends BaseKeyCodes {
  JUMP: KeyboardEventTypes[] = ['Space'];
  ACTION: KeyboardEventTypes[] = ['ShiftLeft'];
}

function clamp(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function setupCharacterInput(scene: Scene): { input: CharacterInput, camera: CameraSetup, actionButton: Button  } {
  const input: CharacterInput = {
    direction: new Vector3(),
    jump: false,
    action: false
  }
  const keycodes = new CharKeyCodes();
  const camera = new CameraSetup(scene);

  const jumpButton = createCommandButton('JUMP', 0);
  const actionButton = createCommandButton('ACTION', 1);

  const listener = new CameraCombinedInput<FreeCamera, CharKeyCodes>((_camera, joystick, keyboard) => {
    input.direction.x = 0;
    input.direction.z = 0;
    input.jump = false;
    input.action = false;
    if (keyboard.LEFT) input.direction.x = 1;
    if (keyboard.RIGHT) input.direction.x -= 1;
    if (keyboard.FORWARD) input.direction.z = 1;
    if (keyboard.BACKWARD) input.direction.z -= 1;
    if (keyboard.JUMP) input.jump = true;
    if (keyboard.ACTION) input.action = true;
    if (jumpButton.state.pressed) {
      input.jump = true;
    }
    if (actionButton.state.pressed) {
      input.action = true;
    }

    if (joystick.length() > 0) {
      input.direction.x = clamp(-1, -joystick.x, 1);
      input.direction.z = clamp(-1, -joystick.y, 1);
    }
  }, camera, keycodes);

  camera.setController(listener);
  camera.changeTiltY(-.3);
  camera.setDistance(25);
  return { input, camera, actionButton: actionButton.button };
}