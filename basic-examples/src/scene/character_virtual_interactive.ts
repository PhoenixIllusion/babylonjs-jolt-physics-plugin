import { MeshBuilder, SceneCallback, createBox, createCylinder, createFloor, getMaterial, getTiledTexture } from '../util/example';
import { SceneConfig } from '../app';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { JoltCharacterVirtual, JoltCharacterVirtualImpostor, StandardCharacterVirtualHandler } from '@phoenixillusion/babylonjs-jolt-plugin/character-virtual';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { loadSVGData } from '../util/svg-util';
import { AbstractMesh, HemisphericLight } from '@babylonjs/core';
import { setupCharacterInput } from '../util/char-util';
import { Jolt, JoltHingeJoint, MotorMode } from '@phoenixillusion/babylonjs-jolt-plugin';

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    return undefined;
  }
}

class Trigger {
  private hasRun = false;
  constructor(private onTrigger: ()=>void) {

  }

  trigger(): void {
    if(!this.hasRun) {
      this.onTrigger();
      this.hasRun = true;
    }
  }
}

class ButtonActiveRegion {
  public sensor: PhysicsImpostor;
  constructor(mesh: AbstractMesh, radius: number, public text: string) {
    const sensor = createCylinder(mesh.position, radius, 2, { sensor: true, mass: 0}, '#00ff00');
    sensor.cylinder.material!.wireframe = true;
    this.sensor = sensor.physics;
  }
  click() {
    this.trigger && this.trigger.trigger();
  }
  trigger?: Trigger;
  setTrigger(trigger: Trigger) {
    this.trigger = trigger;
  }
  setCharacter(char: JoltCharacterVirtual, activeRegion: { active?: ButtonActiveRegion }) {
    char.registerOnJoltPhysicsCollide('on-contact-add',this.sensor, () => {
      activeRegion.active = this;
    });
  }
}

export default async (scene: Scene): Promise<SceneCallback> => {
  const floor = createFloor();
  scene.useRightHandedSystem = !scene.useRightHandedSystem;
  
  const material = new StandardMaterial('tile');
  material.diffuseTexture = getTiledTexture();
  material.diffuseColor.set(0.9, 0.3, 0.3);
  floor.ground.material = material;
  const createCharacter = () => {
    const staticShape = new Mesh('static-shape', scene);
    const capsuleProps = { height: 1.4, tessellation: 16 }
    const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 0.3, ...capsuleProps });
    capsule.parent = staticShape;
    capsule.position.set(0, 0.7, 0)
    capsule.physicsImpostor = new PhysicsImpostor(capsule, PhysicsImpostor.CapsuleImpostor)
    capsule.material = getMaterial('#990000');
    return {
      mesh: staticShape,
      phyics: new JoltCharacterVirtualImpostor(staticShape, PhysicsImpostor.NoImpostor, { mass: 10, disableBidirectionalTransformation: true} )
    }
  }

  const char = createCharacter();
  const inputHandler = new StandardCharacterVirtualHandler();
  inputHandler.jumpSpeed = 6;
  inputHandler.characterSpeed = 5;
  char.phyics.controller.inputHandler = inputHandler;

  const { input, camera, actionButton } = setupCharacterInput(scene);
  camera.getRoot().parent = char.mesh;
  camera.changeTiltY(0.5);


  const map = await loadSVGData('character-virtual-interactive-level.svg', 2);
  const hemi = new HemisphericLight('hemi', new Vector3(0,0,1));
  hemi.intensity = 0.2;
  const yOffset = 15;

  const islands: Record<string, PhysicsImpostor> = {};
  const bridges: Record<string, PhysicsImpostor> = {};
  const doors: Record<string, PhysicsImpostor> = {};
  const activeTriggers: { active?: ButtonActiveRegion } = {};
  const filter = new Jolt.GroupFilterTable(2);
  filter.DisableCollision(0, 1);
  const collision = { group: 1, subGroup: 1, filter};

  map.rect.forEach(rect => {
    if(rect.id.startsWith('island')) {
      const box = createBox(rect.center.add(new Vector3(0, yOffset, 0)), Quaternion.Identity(), new Vector3(rect.width/2, 0.25, rect.height/2), 
      { mass: 0, friction: 1, collision}, '#009900')
      islands[rect.id] = box.physics;
    }
    if(rect.id.startsWith('bridge')) {
      const bridge = createBox(rect.center.add(new Vector3(0, yOffset, 0)), Quaternion.Identity(), new Vector3(rect.width/2, 0.125, rect.height/2),
      { mass: 0, friction: 1, collision}, '#009999');
      bridges[rect.id] = bridge.physics;
    }
  })
  map.paths.forEach(path => {
    if(path.id == '') {
      createBox(path.center.add(new Vector3(0, yOffset + 1.25, 0)), Quaternion.Identity(), new Vector3((path.width ? path.width : 0.1)/2, 1.5, (path.height ? path.height : 0.1)/2),
        { mass: 0, friction: 1, collision}, '#990000')
    }
    if(path.id.startsWith('door')) {
      const pos = path.center.add(new Vector3(0, yOffset+ 1.25, 0));
      const door = createBox(pos, Quaternion.Identity(), new Vector3((path.width ? path.width*0.8 : 0.1)/2, 0.8, (path.height ? path.height*0.8 : 0.1)/2),
      { mass: 5, friction: 1, collision }, '#999900')
      doors[path.id] = door.physics;

      switch(path.id) {
        case 'door-first': {
            const hinge = new JoltHingeJoint(pos.add(new Vector3(-path.width/2, 0, 0)), new Vector3(0,1,0),new Vector3(1,0,0));
            islands['island-1'].addJoint(door.physics, hinge);
            const button = new ButtonActiveRegion(door.box, 2, 'Open Door')
            hinge.motor.mode = MotorMode.Position;
            hinge.motor.spring.frequency = 10;
            button.setTrigger(new Trigger(() => hinge.motor.target = Math.PI/2));
            button.setCharacter(char.phyics.controller, activeTriggers);
          } 
          break;
        case 'door-last': {
          const hinge = new JoltHingeJoint(pos.add(new Vector3(0, 0, path.height/2)), new Vector3(0,1,0),new Vector3(0,0,1));
          islands['island-3'].addJoint(door.physics, hinge)
          const button = new ButtonActiveRegion(door.box, 2, 'Open Door')
          hinge.motor.mode = MotorMode.Position;
          hinge.motor.spring.damping = 1;
          button.setTrigger(new Trigger(() => hinge.motor.target = Math.PI/2));
          button.setCharacter(char.phyics.controller, activeTriggers);
        }
      }
    }
  });

  map.ellipse.forEach(ellipse => {
    if(ellipse.id.startsWith('console')) {
      const console = createBox(ellipse.center.add(new Vector3(0, yOffset + .75, 0)), Quaternion.Identity(), new Vector3(.25, 0.55, .25), { mass: 0, friction: 1 }, '#000066')
      const button = new ButtonActiveRegion(console.box, 2, 'Activate Bridge')

      button.setCharacter(char.phyics.controller, activeTriggers);
    }
    if(ellipse.id.startsWith('start')) {
      char.phyics.controller.setPosition(ellipse.center.add(new Vector3(0, yOffset + 10, 0)))
    }
  });


  return (_time: number, _delta: number) => {
    inputHandler.updateInput(input.direction.negate(), input.jump);

    if(activeTriggers.active) {
      actionButton.isVisible = true;
      actionButton.textBlock && (actionButton.textBlock.text = activeTriggers.active.text);
      if(input.action) {
        activeTriggers.active.click();
      }
    } else {
      actionButton.isVisible = false;
    }
    activeTriggers.active = undefined;
  }
}
