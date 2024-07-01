import { Button } from "@babylonjs/gui/2D/controls/button";
import { CameraCombinedInput } from "./controller";
import { App } from "../app";

export function createCommandButton(text: string, index: number) {
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
  return { button, state };
}