
import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import type { IPointerEvent, PointerTouch } from "@babylonjs/core/Events";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import { Nullable } from "@babylonjs/core/types";

import { JoystickControl } from "./controller/joystick";
import { KeyState, KeyboardControl } from "./controller/keyboard";
import { CameraSetup } from "./camera";
import { BaseCameraPointersInput } from "@babylonjs/core/Cameras/Inputs/BaseCameraPointersInput";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { App } from "../app";

type OnInputCheck<T> = (camera: T, joystickState: Vector2, keyboardState: KeyState) => void;

export class CameraCombinedInput<T extends Camera> extends BaseCameraPointersInput {
  SWIPE_SENSIBILITY = 1.5;


  public camera!: T;

  private screenSize!: Vector2;
  private joystickPointerId: number | null = null;
  private joystick: JoystickControl;
  private keyboard: KeyboardControl = new KeyboardControl();

  getClassName = () => this.constructor.name;

  getSimpleName = () => "joystick"

  constructor(private _onInputCheck: OnInputCheck<T>, private cameraSetup: CameraSetup) {
    super();
    this.joystick = new JoystickControl(App.ui);
  }

  attachControl(noPreventDefault?: boolean) {
    super.attachControl(noPreventDefault);
    this.joystick.attachControl();
    this.keyboard.attachControl(this.camera.getScene());
    EngineStore.LastCreatedEngine!.onResizeObservable.add(this.resize);
    this.screenSize = CameraCombinedInput.getScreenSize();
  }

  detachControl() {
    this.joystick.detachControl();
    this.keyboard.detachControl(this.camera.getScene());
    EngineStore.LastCreatedEngine!.onResizeObservable.removeCallback(this.resize);
    super.detachControl();
  }


  resize = () => {
    this.screenSize = CameraCombinedInput.getScreenSize();
    this.joystick.resize();
  };

  static getScreenSize() {
    let engine = EngineStore.LastCreatedEngine!;
    return new Vector2(engine.getRenderWidth(), engine.getRenderHeight());
  }

  checkInputs() {
    if (this.keyboard.state.KEY_PRESSED) {
      let engine = EngineStore.LastCreatedEngine!;
      if (this.keyboard.state.ROTATE_LEFT) this.cameraSetup.rotate(-this.SWIPE_SENSIBILITY * engine.getDeltaTime() / 500);
      if (this.keyboard.state.ROTATE_RIGHT) this.cameraSetup.rotate(this.SWIPE_SENSIBILITY * engine.getDeltaTime() / 500);
      if (this.keyboard.state.ROTATE_UP) this.cameraSetup.changeTiltY(-this.SWIPE_SENSIBILITY * engine.getDeltaTime() / 500);
      if (this.keyboard.state.ROTATE_DOWN) this.cameraSetup.changeTiltY(this.SWIPE_SENSIBILITY * engine.getDeltaTime() / 500);
    }
    if(this.joystick.useJumpButton) {
      this.keyboard.state.JUMP = this.joystick.jumpState;
    }
    this._onInputCheck(this.camera, this.joystick.joystickDelta, this.keyboard.state)
  }

  onTouch(point: Nullable<PointerTouch>, offsetX: number, offsetY: number): void {
    if (point && point.pointerId === this.joystickPointerId) {
      // point refer to global inner window canvas, we need to convert it to local render canvas
      this.joystick.onTouchJoystick(new Vector2(point.x, point.y));
    } else {
      this.onTouchSwipe(new Vector2(offsetX, offsetY));
    }
  }
  
  onTouchSwipe(touchOffset: Vector2) {
    let directionAdjust = 1;
    if (this.camera.getScene().useRightHandedSystem) directionAdjust *= -1;
    if (this.camera.parent && this.camera.parent._getWorldMatrixDeterminant() < 0)
      directionAdjust *= -1;
    this.cameraSetup.rotate(((directionAdjust * touchOffset.x) / this.screenSize.x) * this.SWIPE_SENSIBILITY);
    this.cameraSetup.changeTiltY((touchOffset.y / this.screenSize.x) * this.SWIPE_SENSIBILITY);
  }

  onButtonDown(evt: IPointerEvent) {
    if (this.joystick.isTouch(evt)) {
      this.joystickPointerId = evt.pointerId;
      this.joystick.onButtonDownJoystick(evt);
    }
  }


  onButtonUp(evt: IPointerEvent) {
    if (evt.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.joystick.onButtonUpJoystick();
    }
  }

}