import { MeshBuilder, SceneCallback, createBox, createFloor, getMaterial } from '../util/example';
import { JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { createPath3DWithCatmullRomPath } from '@phoenixillusion/babylonjs-jolt-plugin/path';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { GravityInterface } from '@phoenixillusion/babylonjs-jolt-plugin/gravity';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 30));
    return camera;
  }
}


export default (scene: Scene): SceneCallback => {
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

  const path = createPath3DWithCatmullRomPath(
    [new Vector3(0, 0, -20), new Vector3(0, 0, -10), new Vector3(0, 0, 0), new Vector3(0, 0, 10), new Vector3(0, 0, 20), new Vector3(0, 0, 30), new Vector3(0, 0, 40)],
    [new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, -1, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, -1, 0)], 50, false);

  const ribbonGravity: GravityInterface = {
    getGravity: (_impostor, com: () => Vector3): Vector3 => {
      const point = path.getClosestPositionTo(com());
      return path.getNormalAt(point, true).scale(9.8)
    }
  };

  const points = path.getPoints();
  const binormals = path.getBinormals();
  const normals = path.getNormals();
  const pathArray: [Vector3[], Vector3[]] = [[], []];
  points.forEach((p, i) => {
    pathArray[1].push(p.add(binormals[i].scale(3)))
    pathArray[0].push(p.subtract(binormals[i].scale(3)))
    if (i % 8 == 4) {
      const pos = p.add(new Vector3(0, 10, 0)).add(normals[i].negate());
      const boxes1 = createBox(pos.add(binormals[i].scale(2)), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25), { mass: 1, friction: 1 });
      boxes1.physics.setGravityOverride(ribbonGravity);
      const boxes2 = createBox(pos.subtract(binormals[i].scale(2)), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25), { mass: 1, friction: 1 });
      boxes2.physics.setGravityOverride(ribbonGravity);
    }
  });

  const ribbon = MeshBuilder.CreateRibbon("ribbon", { pathArray, sideOrientation: Mesh.DOUBLESIDE }, scene);
  ribbon.position.y += 10;
  ribbon.physicsImpostor = new PhysicsImpostor(ribbon, PhysicsImpostor.MeshImpostor, { mass: 0 });

  ribbon.material = material;
  material.sideOrientation = 2
  //ribbon.material!.wireframe = true;
  new HemisphericLight('hemi', new Vector3(0, 0, -1));

  const createCharacter = () => {
    const staticShape = new Mesh('static-shape', scene);
    const capsuleProps = { height: 1.4, tessellation: 16 }
    const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 0.3, ...capsuleProps });
    capsule.parent = staticShape;
    capsule.position.set(0, 0.7, 0)
    capsule.physicsImpostor = new PhysicsImpostor(capsule, PhysicsImpostor.CapsuleImpostor)
    capsule.material = getMaterial('#990000');
    staticShape.position.set(0, 10, -18);
    if (camera)
      camera.lockedTarget = capsule;
    return {
      mesh: staticShape,
      phyics: new JoltCharacterVirtualImpostor(staticShape, PhysicsImpostor.NoImpostor, { mass: 10 })
    }
  }

  const char = createCharacter();
  const inputHandler = new StandardCharacterVirtualHandler();
  inputHandler.jumpSpeed = 6;
  char.phyics.controller.inputHandler = inputHandler;

  char.phyics.setGravityOverride(ribbonGravity)

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

  const pictureInPicture = new UniversalCamera('follow-pip', new Vector3(-75, 30, 0));
  scene.activeCameras?.push(camera);
  scene.activeCameras?.push(pictureInPicture);
  pictureInPicture.viewport = new Viewport(0.75, 0.75, 0.25, 0.25);
  pictureInPicture.fov = 0.3;
  pictureInPicture.lockedTarget = char.mesh;

  return (_time: number, _delta: number) => {
    inputHandler.updateInput(input.direction.negate(), input.jump);
    camera.upVector.copyFrom(inputHandler.up);
    camera.position.copyFrom(char.mesh.position.add(inputHandler.up.scale(10)).addInPlaceFromFloats(0, 0, -20));
  }
}
