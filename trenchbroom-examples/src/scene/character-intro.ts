import { AbstractMesh, FlyCamera, FollowCamera, Mesh, MeshBuilder, PhysicsImpostor, Quaternion, Scene, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core';
import { MapLoader, MapSceneBuilder } from '@phoenixillusion/babylonjs-trenchbroom-loader';
import { Entity, EntityGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneFunction } from '../app';
import { TestMaterialResolver, TestMeshResolver } from './test-resolvers';
import { createConvexHull, getMaterial, keyboardController } from './example';
import { GeometryUtil } from '../util/geometry';

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

    const camera =  new FollowCamera('follow-cam', new Vector3(0,0,-10));
    camera.radius = 20;

    const createCharacter = () => {
        const capsuleProps = { height: 8, tessellation: 16 }
        const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 2, ... capsuleProps });
        const model = MeshBuilder.CreateBox('box',{width: 4, height: 8, depth: 4});
        model.position.set(spawn.x, spawn.y, spawn.z);
        model.rotationQuaternion = Quaternion.Identity();
        model.material = getMaterial('#990000');
        capsule.position.set(spawn.x, spawn.y, spawn.z);
        capsule.isVisible = false;
        camera.lockedTarget = model;
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

      (window as any).char = char;
    const input = keyboardController();

    return (time: number, delta: number) => {
      const rotation = camera.getWorldMatrix().getRotationMatrix();
      const cameraDirectioNV = Vector3.TransformCoordinates(input.direction, rotation);
      cameraDirectioNV.y = 0;
      cameraDirectioNV.normalize();
      inputHandler.updateInput(cameraDirectioNV, input.jump);

      char.model.position = char.mesh.position;
    
      if (cameraDirectioNV.length() == 0) {//if there's no input detected, prevent rotation and keep player in same rotation
        return;
      }
      
      char.model.lookAt(char.model.position.subtract(cameraDirectioNV));
  
    };
}
export default run;