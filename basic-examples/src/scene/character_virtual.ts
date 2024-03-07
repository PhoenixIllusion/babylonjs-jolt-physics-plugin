import { MeshBuilder, SceneCallback, createBox, createFloor, getMaterial } from '../util/example';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Color3 } from '@babylonjs/core/Maths/math.color';

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
    const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 2, ...capsuleProps })
    capsule.position.set(0, 10, 0);
    capsule.material = getMaterial('#990000');
    if (camera)
      camera.lockedTarget = capsule;
    return {
      mesh: capsule,
      phyics: new JoltCharacterVirtualImpostor(capsule, PhysicsImpostor.CapsuleImpostor, { mass: 10 })
    }
  }

  const char = createCharacter();
  const inputHandler = new StandardCharacterVirtualHandler();
  inputHandler.jumpSpeed = 6;
  char.phyics.controller.inputHandler = inputHandler;

  const sensorBox = createBox(new Vector3(5, 0, -5), Quaternion.Identity(), new Vector3(2, 2, 2), { mass: 10, restitution: 0, friction: 0 }, '#FF6666');

  char.phyics.controller.registerOnJoltPhysicsCollide('on-contact-validate', [sensorBox.physics],
    (_body: PhysicsImpostor): boolean => {
      return false;
    })

  const treadMills: { physics: PhysicsImpostor }[] = [];
  treadMills.push(createBox(new Vector3(-15, 0.5, -15), Quaternion.Identity(), new Vector3(8, 0.25, 2), undefined, '#6666ff'));
  treadMills.push(createBox(new Vector3(-5, 0.5, -10), Quaternion.Identity(), new Vector3(2, 0.25, 8), undefined, '#6666ff'));
  treadMills.push(createBox(new Vector3(-25, 0.5, -10), Quaternion.Identity(), new Vector3(2, 0.25, 8), undefined, '#6666ff'));
  treadMills.push(createBox(new Vector3(-15, 0.5, -5), Quaternion.Identity(), new Vector3(8, 0.25, 2), undefined, '#6666ff'));

  const physObjs = treadMills.map(obj => obj.physics);

  char.phyics.controller.registerOnJoltPhysicsCollide('on-adjust-velocity', physObjs,
    (body, lVelocity, _aVelocity): void => {
      switch (physObjs.indexOf(body)) {
        case 0:
          lVelocity.x += 2; break;
        case 1:
          lVelocity.z += 2; break;
        case 2:
          lVelocity.z -= 2; break;
        case 3:
          lVelocity.x -= 2; break;
      }
    })

  const toggleBox = createBox(new Vector3(15, 0.5, -10), Quaternion.Identity(), new Vector3(2, 2, 2), undefined, '#FF0000');

  let colorIndex = 0;
  let lastColorChange = 0;
  const rotateColors = [
    Color3.FromHexString('#FF0000'),
    Color3.FromHexString('#00FF00'),
    Color3.FromHexString('#0000FF'),
    Color3.FromHexString('#FFFF00'),
    Color3.FromHexString('#00FFFF'),
    Color3.FromHexString('#FF00FF'),
  ]

  const boxMaterial: StandardMaterial = toggleBox.box.material as StandardMaterial;
  char.phyics.controller.registerOnJoltPhysicsCollide('on-contact-add', [toggleBox.physics], (_body: PhysicsImpostor) => {
    if (performance.now() - lastColorChange > 1000) {
      boxMaterial.diffuseColor = rotateColors[colorIndex++ % rotateColors.length];
      lastColorChange = performance.now();
    }
  })


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

  return (_time: number, _delta: number) => {
    inputHandler.updateInput(input.direction, input.jump);
  }
}
