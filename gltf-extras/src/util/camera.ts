import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CameraCombinedInput } from "./controller";
import { Scene } from "@babylonjs/core/scene";

export class CameraSetup {

  private _camRoot: TransformNode;
  private _yTilt: TransformNode;

  private camera: FreeCamera;
  private _targetDistance: number;

  private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.3934119456780721, 0, 0);

  constructor(scene: Scene) {
    //root camera parent that handles positioning of the camera to follow the player
    this._camRoot = new TransformNode("root", scene);
    this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
    //to face the player from behind (180 degrees)
    this._camRoot.rotation = new Vector3(0, Math.PI, 0);

    //rotations along the x-axis (up/down tilting)
    let yTilt = new TransformNode("ytilt", scene);
    //adjustments to camera view to point down at our player
    yTilt.rotation = CameraSetup.ORIGINAL_TILT;
    this._yTilt = yTilt;
    yTilt.parent = this._camRoot;

    //our actual camera that's pointing at our root's position
    this._targetDistance = -50;
    this.camera = new FreeCamera("cam", new Vector3(0, 0, -50), scene);
    this.camera.fov = 0.47350045992678597;
    this.camera.parent = yTilt;
  }  

  public setDistance(dist: number) {
    this.camera.position.z = this._targetDistance = -dist;
  }

  public adjustDistance(nearestBlocker: number) {
    this.camera.position.z = Math.max(nearestBlocker, this._targetDistance);
  }

  public setTarget(position: Vector3) {
    this._camRoot.position.x = position.x;
    this._camRoot.position.y = position.y + 3;
    this._camRoot.position.z = position.z;
  }

  public getCameraPos(): Vector3 {
    return this.camera.getWorldMatrix().getTranslation();
  }

  public changeTiltY(delta: number) {
    this._yTilt.rotation.x += delta;
  }
  public rotate(delta: number) {
    this._camRoot.rotation.y += delta;
  }

  public getViewMatrix(): Matrix {
    return this.camera.getViewMatrix();
  }

  public setController(input: CameraCombinedInput<FreeCamera>) {
    this.camera.inputs.clear();
    this.camera.attachControl();
    this.camera.inputs.add(input);
    document.querySelector('canvas')!.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }
  getRoot() {
    return this._camRoot;
  }
}