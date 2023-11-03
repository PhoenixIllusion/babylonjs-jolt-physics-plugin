import { AbstractMesh, ArcRotateCamera, FlyCamera, FollowCamera, FreeCamera, Mesh, MeshBuilder, PhysicsImpostor, Quaternion, Scene, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core';
import { MapLoader, MapSceneBuilder } from '@phoenixillusion/babylonjs-trenchbroom-loader';
import { Entity, EntityGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneFunction } from '../app';
import { TestMaterialResolver, TestMeshResolver } from './test-resolvers';
import { createConvexHull, getMaterial } from './example';
import { GeometryUtil } from '../util/geometry';
import { CameraCombinedInput } from '../util/controller';
import { CameraSetup } from '../util/camera';

let ball: {sphere: Mesh, physics: PhysicsImpostor};
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
    async forClassName(modelName: string): Promise<AbstractMesh | undefined> {
        return undefined;
    }
} 


const run: SceneFunction = async (scene: Scene) => {

    const mapLoader = new MapLoader();
    const map = await mapLoader.parseMap('levels/character-intro.map', {forTexture: (s) => ({ width: 512, height: 512} )});
    const spawn = map.player.position;

    const mapBuilder = new MapSceneBuilder(scene, new TestMaterialResolver(), new HelloWorldMeshResolver());
    mapBuilder.build(map);


    const createCharacter = () => {
        const capsuleProps = { height: 8, tessellation: 16 }
        const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 2, ... capsuleProps });
        const model = MeshBuilder.CreateBox('box',{width: 4, height: 8, depth: 4});
        model.rotationQuaternion = Quaternion.Identity();
        model.material = getMaterial('#990000');
        capsule.position.set(spawn.x, spawn.y, spawn.z);
        capsule.isVisible = false;

        return {
          model: model,
          mesh: capsule,
          phyics: new JoltCharacterVirtualImpostor(capsule, PhysicsImpostor.CapsuleImpostor, { mass: 10})
        } 
      }
  
      const char = createCharacter();
      const inputHandler = new StandardCharacterVirtualHandler();
      inputHandler.jumpSpeed = 6;
      char.phyics.controller.inputHandler = inputHandler;

    const input = {
        direction: new Vector3(),
        jump: false,
        crouched: false
    }

    const camera =  new CameraSetup();
    camera.setTarget(char.model.position);
    const listener = new CameraCombinedInput<FreeCamera>((camera, joystick, keyboard) => {
        input.direction.set(0,0,0);
        if(keyboard.KEY_PRESSED) {
            if(keyboard.LEFT) input.direction.x -= 1;
            if(keyboard.RIGHT) input.direction.x += 1;
            if(keyboard.FORWARD) input.direction.z += 1;
            if(keyboard.BACKWARD) input.direction.z -= 1;
        }
        input.jump = keyboard.JUMP;
        if(joystick.length() > 0) {
            input.direction.x = joystick.x;
            input.direction.z = -joystick.y;
        }
        const rotation = camera.getWorldMatrix().getRotationMatrix();
        const cameraDirectioNV = Vector3.TransformCoordinates(input.direction, rotation);
        cameraDirectioNV.y = 0;
        cameraDirectioNV.normalize();
        if(input.direction.length()) {
            char.model.lookAt(char.model.position.add(cameraDirectioNV));
        }
        inputHandler.updateInput(cameraDirectioNV, input.jump);
    }, camera);
    camera.setController(listener);
    camera.rotate(1.1);
    camera.changeTiltY(-.1);

    return (time, delta) => {
        char.model.position.copyFrom(char.mesh.position);
        camera.setTarget(char.mesh.position);
    };
}
export default run;