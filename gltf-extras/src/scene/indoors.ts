import { Scene } from "@babylonjs/core/scene";
import { SceneFunction } from "../app";

import LevelImporter from "../level-importer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FlyCamera } from "@babylonjs/core/Cameras/flyCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Nullable } from "@babylonjs/core/types";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { RiggedModel } from "../util/rigged-model";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { createStandardControls } from "../util/debug";
import { Ray } from "@babylonjs/core/Culling/ray";
import { JoltCharacterVirtualImpostor, CharacterState, StandardCharacterVirtualHandler, GroundState } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual'

const run: SceneFunction = async (scene: Scene) => {
  const hemi = new HemisphericLight('hemi-light', new Vector3(0,1,0));
  hemi.intensity = 0.25;
  const c = new FlyCamera('camera1', new Vector3(0, 15, 10), scene);
  await LevelImporter.forFile('indoors');


  scene.cameras.forEach((cam,i) => { if(i > 0) scene.removeCamera(cam) });
  const camNode = scene.getNodeByName("Main Camera") as Nullable<TransformNode>;

  const createCharacter = async () => {
    const model = await RiggedModel.forFile('character');
    const mesh = model.mesh;
    const extents = mesh.getBoundingInfo().boundingBox.extendSize.scale(2);

    const root_transform = new TransformNode('character_offset', scene);
    model.mesh.position.y -= extents.y / 2;
    mesh.parent = root_transform;
    root_transform.position.copyFrom(camNode!.absolutePosition.add(new Vector3(0,5,0)));

    return {
      model,
      root: root_transform,
      mesh: mesh,
      phyics: new JoltCharacterVirtualImpostor(root_transform as any, PhysicsImpostor.CapsuleImpostor, { extents, mass: 10 } as any)
    }
  }

  const char = await createCharacter();
  const inputHandler = new StandardCharacterVirtualHandler();
  inputHandler.characterSpeed = 12;
  inputHandler.jumpSpeed = 12;
  scene.getPhysicsEngine()?.setGravity(new Vector3(0, -18, 0));
  char.phyics.controller.inputHandler = inputHandler;
  scene.removeCamera(c);
  const camera = createStandardControls(inputHandler, char.mesh);
  camera.rotate(1.1);
  camera.changeTiltY(-.1);
  camera.setDistance(12);


  let jumpStarted = false;
  return (_time, _delta) => {
    if (inputHandler.userState == CharacterState.IDLE) {
      char.model.setAnimation('Idle');
    }
    if (inputHandler.userState == CharacterState.MOVING && inputHandler.groundState == GroundState.ON_GROUND) {
      char.model.setAnimation('Run');
    }
    if (inputHandler.userState == CharacterState.JUMPING) {
      if (!jumpStarted) {
        char.model.setAnimation('Jump', false, 0.5, 0, 35);
        jumpStarted = true;
      }
    } else {
      jumpStarted = false;
    }
    camera.setTarget(char.root.position);

    const camPos = camera.getCameraPos();
    const ray = new Ray(char.root.position, camPos.subtract(char.root.position));
    const hit = scene.pickWithRay(ray);
    if (hit != null && hit.pickedMesh) {
        camera.adjustDistance(- hit.distance);
    }
  };
}
export default run;