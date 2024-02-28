import { Scene } from "@babylonjs/core/scene";
import { SceneFunction } from "../app";

import LevelImporter from "../level-importer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FlyCamera } from "@babylonjs/core/Cameras/flyCamera";

const run: SceneFunction = async (scene: Scene) => {
  LevelImporter.forFile('compound_scene');


  scene.getPhysicsEngine()?.setGravity(new Vector3(0, -1.5, 0));
  const camera = new FlyCamera('camera1', new Vector3(-3, 12, 10), scene);
  camera.setTarget(new Vector3(0, 0, 0));
  camera.attachControl(true);
}
export default run;