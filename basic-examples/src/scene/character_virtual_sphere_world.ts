import { DegreesToRadians, MeshBuilder, SceneCallback, createBox, createSphere, getMaterial } from '../util/example';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { GravityPoint } from '@phoenixillusion/babylonjs-jolt-plugin/gravity';
import { SceneConfig } from '../app';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
let camera: FlyCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FlyCamera('follow-camera', new Vector3(0, 15, 30));
    return camera;
  }
}

export default (scene: Scene): SceneCallback => {
  const floor = createSphere(new Vector3(0,-4,0), 14, { mass: 0, friction: 1});
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
  floor.sphere.material = material;


  const upIndicator = MeshBuilder.CreateSphere('sphere', { diameter: 0.25});
  upIndicator.material = getMaterial('#00ff00');
  upIndicator.position.y += 0.7;
  const createCharacter = () => {
    const staticShape = new Mesh('static-shape', scene);
    const capsuleProps = { height: 1.4, tessellation: 16 }
    const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 0.3, ...capsuleProps });
    capsule.parent = staticShape;
    capsule.position.y += 0.7;
    capsule.physicsImpostor = new PhysicsImpostor(capsule, PhysicsImpostor.CapsuleImpostor)
    capsule.material = getMaterial('#990000');
    staticShape.position.set(0, 10, 0);
    if (camera)
      camera.lockedTarget = capsule;
    return {
      mesh: staticShape,
      phyics: new JoltCharacterVirtualImpostor(staticShape, PhysicsImpostor.NoImpostor, { mass: 10 })
    }
  }
  camera.detachControl();

  const char = createCharacter();
  const inputHandler = new StandardCharacterVirtualHandler();
  inputHandler.jumpSpeed = 6;
  char.phyics.controller.inputHandler = inputHandler;

  const sphereGravity = new GravityPoint(new Vector3(0,-4,0), 9.81);

  char.phyics.setGravityOverride(sphereGravity)

  for(let j=0;j<4;j++)
  for(let i=0; i< 360; i+= 15) {
    const rad = DegreesToRadians(i);
    const [x,z] = [Math.cos(rad), Math.sin(rad)]
    const item = createBox(new Vector3(x*15, j*3-6, z*15), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25), { mass: 1, friction: 1}, '#ff44ff');
    item.physics.setGravityOverride(sphereGravity)
  }


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
    upIndicator.position.copyFrom( char.mesh.position.add(inputHandler.up.scale(2)));

  }
}
