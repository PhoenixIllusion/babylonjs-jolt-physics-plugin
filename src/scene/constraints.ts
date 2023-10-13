import { Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { createBox, createFloor, createSphere } from "./example";

export default (scene: Scene): (void|((time: number, delta: number) =>void)) => {

    createFloor();

}