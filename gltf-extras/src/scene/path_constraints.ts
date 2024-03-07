import { Scene } from "@babylonjs/core/scene";
import { SceneFunction } from "../app";

import LevelImporter from "../level-importer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FlyCamera } from "@babylonjs/core/Cameras/flyCamera";

const run: SceneFunction = async (scene: Scene) => {
  await LevelImporter.forFile('path_constraints');

  const camera = new FlyCamera('camera1', new Vector3(0, 15, 10), scene);
  camera.setTarget(new Vector3(0, 0, 0));
  camera.speed = 0.1;
  camera.attachControl(true);

  return (_time: number, _delta: number): void => {

  }
}
export default run;