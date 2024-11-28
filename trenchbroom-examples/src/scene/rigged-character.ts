
import { MapLoader, MapSceneBuilder } from '@phoenixillusion/babylonjs-trenchbroom-loader';
import { Entity, EntityGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler, CharacterState, GroundState } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneFunction } from '../app';
import { TestMaterialResolver, TestMeshResolver } from './test-resolvers';
import { createBox, createConvexHull, createStandardControls } from './example';
import { GeometryUtil } from '../util/geometry';
import { RiggedModel } from '../util/rigged-model';
import type { Scene } from '@babylonjs/core/scene'
import '@babylonjs/core/Physics/physicsEngineComponent';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';

class HelloWorldMeshResolver extends TestMeshResolver {
  shouldRenderEntity(_entity: Entity, _geometry: EntityGeometry): boolean {
    const hulls = GeometryUtil.HullsFromGeometry(_geometry);
    hulls.forEach(hull => {
      const cHull = createConvexHull(new Vector3(), hull, undefined, '#FF00FF');
      cHull.mesh.freezeWorldMatrix();
      cHull.mesh.isVisible = false;
    })
    return true;
  }
}


const run: SceneFunction = async (scene: Scene) => {

  const mapLoader = new MapLoader();
  const map = await mapLoader.parseMap('levels/rigged-character.map', { forTexture: (_s) => ({ width: 512, height: 512 }) });
  const spawn = map.player.position;

  const meshResolver = new HelloWorldMeshResolver();
  const mapBuilder = new MapSceneBuilder(scene, new TestMaterialResolver(), meshResolver);
  mapBuilder.build(map);


  const createCharacter = async () => {
    const model = await RiggedModel.forFile('character');
    const mesh = model.mesh;
    const extents = mesh.getBoundingInfo().boundingBox.extendSize.scale(2);

    const root_transform = new TransformNode('character_offset');
    model.mesh.position.y -= extents.y / 9;
    mesh.parent = root_transform;
    root_transform.position.set(spawn.x, spawn.y, spawn.z);

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

  const camera = createStandardControls(inputHandler, char.mesh);
  camera.rotate(1.1);
  camera.changeTiltY(-.1);


  const ResetGround = createBox(new Vector3(0, -100, 0), Quaternion.Identity(), new Vector3(1e3, 10, 1e3));
  ResetGround.box.isVisible = false;
  char.phyics.controller.registerOnJoltPhysicsCollide('on-contact-add', [ResetGround.physics], () => {
    char.phyics.controller.setPosition(new Vector3(spawn.x, spawn.y, spawn.z));
  })

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
  };
}
export default run;