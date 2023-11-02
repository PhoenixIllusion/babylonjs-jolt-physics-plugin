import { Camera, FollowCamera, MeshBuilder, PhysicsImpostor, StandardMaterial, Texture, Vector3 } from '@babylonjs/core';
import { SceneCallback, createFloor, getMaterial } from './example';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneConfig } from '../app';


let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 30));
    camera.radius = 20;
    return camera;
  }
} 


export default (): SceneCallback => {
    const floor = createFloor();
    const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
    tiledTexture.onLoadObservable.add(() => {
      tiledTexture.wrapU = 1;
      tiledTexture.wrapV = 1;
      tiledTexture.vScale = 3;
      tiledTexture.uScale = 3;
      tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
    })
    const material = new StandardMaterial('tile');
    material.diffuseTexture = tiledTexture;
    floor.ground.material = material;

    const createCharacter = () => {
      const capsuleProps = { height: 8, tessellation: 16 }
      const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 2, ... capsuleProps })
      capsule.position.set(0, 10, 0);
      capsule.material = getMaterial('#990000');
      camera.lockedTarget = capsule;
      return {
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
    document.addEventListener("keydown", onDocumentKeyDown, false);
    document.addEventListener("keyup", onDocumentKeyUp, false);

    const KEYCODE = {
      W: 87,
      S: 83,
      A: 65,
      D: 68,
      SPACE: 32
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      var keyCode = event.which;
      if (keyCode == KEYCODE.W) {
        input.direction.z = -1;
      } else if (keyCode == KEYCODE.S) {
        input.direction.z = +1;
      } else if (keyCode == KEYCODE.A) {
        input.direction.x = +1;
      } else if (keyCode == KEYCODE.D) {
        input.direction.x = -1;
      } else if (keyCode == KEYCODE.SPACE) {
        input.jump = true;
      } else if (keyCode == 16) {
        input.crouched = true;
      }
    };
    function onDocumentKeyUp(event: KeyboardEvent) {
      var keyCode = event.which;
      if (keyCode == KEYCODE.W) {
        input.direction.z = 0;
      } else if (keyCode == KEYCODE.S) {
        input.direction.z = 0;
      } else if (keyCode == KEYCODE.A) {
        input.direction.x = 0;
      } else if (keyCode == KEYCODE.D) {
        input.direction.x = 0;
      } else if (keyCode == KEYCODE.SPACE) {
        input.jump = false;
      } else if (keyCode == 16) {
        input.crouched = false;
      }
    };

    return (time: number, delta: number) => {
      inputHandler.updateInput(input.direction, input.jump);
    }
}