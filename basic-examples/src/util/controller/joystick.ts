import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import type { IPointerEvent } from "@babylonjs/core/Events";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";
import { Container } from "@babylonjs/gui/2D/controls/container";
import { Control } from "@babylonjs/gui/2D/controls/control";
import { Ellipse } from "@babylonjs/gui/2D/controls/ellipse";


export class JoystickControl {
  private JOYSTICK_COLOR = "LightGray";
  public JOYSTICK_TOUCH_AREA_SCREEN_SHARE = 0.75;
  public JOYSTICK_CIRCLE_SIZE_VERTICAL_SCREEN_SHARE = 0.1;
  public JOYSTICK_PUCK_SIZE_VERTICAL_SCREEN_SHARE = 0.05;
  public JOYSTICK_OUTER_CIRCLE_THICKNESS_RATIO = 0.01;
  public JOYSTICK_INNER_CIRCLE_THICKNESS_RATIO = 0.04;
  public JOYSTICK_PUCK_THICKNESS_RATIO = 0.01;

  public joystickDelta: Vector2 = new Vector2();
  public speed = 10;

  private joystickButtonDownPosOffset!: Vector2;
  private joystickButtonDownPos!: Vector2;

  private joystickCircleRadius!: number;
  private joystickPuckRadius!: number;
  private joystickContainer!: Container;

  private joystickOuterCirce!: Ellipse;
  private joystickInnerCircle!: Ellipse;
  private joystickPuck!: Ellipse;

  constructor(private ui: AdvancedDynamicTexture) {

  }

  isTouch(evt: IPointerEvent): boolean {
    return evt.offsetY > this.joystickContainer.topInPixels;
  }

  attachControl() {
    this.prepareImages();
  }

  prepareImages() {
    const engine = EngineStore.LastCreatedEngine!;
    const screenSize = new Vector2(engine.getRenderWidth(), engine.getRenderHeight());

    this.joystickCircleRadius = screenSize.y * this.JOYSTICK_CIRCLE_SIZE_VERTICAL_SCREEN_SHARE;
    this.joystickPuckRadius = screenSize.y * this.JOYSTICK_PUCK_SIZE_VERTICAL_SCREEN_SHARE;

    this.joystickContainer = new Container("virtual_joystick");
    let containerSize = this.joystickCircleRadius * 2 + this.joystickPuckRadius * 2 + 1;
    this.joystickContainer.widthInPixels = containerSize;
    this.joystickContainer.heightInPixels = containerSize;
    this.joystickContainer.background = 'rgba(255,255,255,.1)'
    this.joystickContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.joystickContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    this.joystickOuterCirce = this.prepareJoystickCircle(
      this.joystickCircleRadius,
      containerSize * this.JOYSTICK_OUTER_CIRCLE_THICKNESS_RATIO,
    );
    this.joystickInnerCircle = this.prepareJoystickCircle(
      this.joystickPuckRadius,
      containerSize * this.JOYSTICK_INNER_CIRCLE_THICKNESS_RATIO,
    );
    this.joystickPuck = this.prepareJoystickCircle(
      this.joystickPuckRadius,
      containerSize * this.JOYSTICK_PUCK_THICKNESS_RATIO,
    );

    this.joystickContainer.addControl(this.joystickOuterCirce);
    this.joystickContainer.addControl(this.joystickInnerCircle);
    this.joystickContainer.addControl(this.joystickPuck);
    this.joystickContainer.left = screenSize.x - this.joystickContainer.widthInPixels;
    this.joystickContainer.top = screenSize.y - this.joystickContainer.heightInPixels;
    this.ui.addControl(this.joystickContainer);
  }

  prepareJoystickCircle(radius: number, thickness: number) {
    let circle = new Ellipse();
    circle.widthInPixels = radius * 2;
    circle.heightInPixels = radius * 2;
    circle.thickness = thickness;
    circle.color = this.JOYSTICK_COLOR;
    circle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    circle.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    return circle;
  }


  onButtonDownJoystick(evt: IPointerEvent) {
    let point = new Vector2(evt.offsetX, evt.offsetY);
    this.joystickButtonDownPos = point;
    this.joystickButtonDownPosOffset = new Vector2(evt.clientX - point.x, evt.clientY - point.y);
  }

  onButtonUpJoystick() {
    this.joystickDelta.scaleInPlace(0);
    this.joystickPuck.left = 0;
    this.joystickPuck.top = 0;
  }

  onTouchJoystick(touchPoint: Vector2) {
    touchPoint.subtractInPlace(this.joystickButtonDownPosOffset)
    const joystickVector = touchPoint.subtract(this.joystickButtonDownPos);
    if (joystickVector.length() > this.joystickCircleRadius)
      joystickVector.scaleInPlace(this.joystickCircleRadius / joystickVector.length());
    this.joystickPuck.left = joystickVector.x;
    this.joystickPuck.top = joystickVector.y;

    this.joystickDelta = joystickVector.scaleInPlace(this.speed / this.joystickCircleRadius);
  }


  disposeImages() {
    this.joystickContainer.dispose()
    this.joystickInnerCircle.dispose();
    this.joystickOuterCirce.dispose();
    this.joystickPuck.dispose();
  }

  resize() {
    this.disposeImages();
    this.prepareImages();
  }

  detachControl() {
    this.disposeImages();
  }
}