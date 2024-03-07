import { Scene } from "@babylonjs/core/scene";
import { SceneFunction } from "../app";

import LevelImporter from "../level-importer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FlyCamera } from "@babylonjs/core/Cameras/flyCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Nullable } from "@babylonjs/core/types";

const run: SceneFunction = async (scene: Scene) => {
  const camera = new FlyCamera('camera1', new Vector3(0, 15, 10), scene);
  camera.attachControl(true);
  await LevelImporter.forFile('terrain');
  scene.cameras.forEach((cam,i) => { if(i > 0) scene.removeCamera(cam) });
  const camNode = scene.getNodeByName("Main Camera") as Nullable<TransformNode>;
  if (camNode) {
    camera.position.copyFrom(camNode.absolutePosition);
    const child = camNode.getChildren()[0] as TransformNode;
    if(child && child.rotationQuaternion) {
      camera.setTarget(camera.position.add(new Vector3(0,0,1).applyRotationQuaternion(child.rotationQuaternion)));
    }
  }
}
export default run;