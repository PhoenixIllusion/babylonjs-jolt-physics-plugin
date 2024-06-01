import { DegreesToRadians, MeshBuilder, SceneCallback, createBox, createFloor, createSphere } from '../util/example';
import { DefaultWheeledVehicleInput, WheeledVehicleController, Vehicle, createBasicCar } from '@phoenixillusion/babylonjs-jolt-plugin/vehicle';
import { SceneConfig } from '../app';
import { FollowCamera } from '@babylonjs/core/Cameras/followCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { loadTrack, setupTachometer, setupVehicleInput } from '../util/vehicle-utils';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { ParticleSystem } from '@babylonjs/core';

let camera: FollowCamera;

export const config: SceneConfig = {
  getCamera: function (): Camera | undefined {
    camera = new FollowCamera('follow-camera', new Vector3(0, 15, 30));
    camera.radius = 15;
    return camera;
  }
}

function getPointFromEllipse(ellipse: SVGEllipseElement) {
  return new Vector3(ellipse.cx.baseVal.value, 0, ellipse.cy.baseVal.value);
}

function getAreaFromRect(rect: SVGRectElement) {
  const x = rect.x.baseVal.value;
  const y = rect.y.baseVal.value;
  const width = rect.width.baseVal.value;
  const height = rect.height.baseVal.value;

  return {
    center: new Vector3(x + width/2, -0.25, y + height/2),
    extents: new Vector3(width, 1, height)
  } 
}

async function loadKartTrack() {
  const xml = await fetch('kart-track.svg').then(res => res.text());
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'image/svg+xml');
  const svg = doc.querySelector('svg') as SVGSVGElement;
  const paths = Array.from(svg.querySelectorAll('path'));
  const svgWidth = svg.viewBox!.baseVal.width;
  const svgHeight = svg.viewBox!.baseVal.height;
  const scale = 1.5;
  const offset = new Vector3(-(svgWidth*scale)/2 , 0, -(svgHeight*scale)/2 )
  const floor = createFloor({friction: 1, mass: 0}, '#222222', (svgWidth*scale));
  const floorMat = floor.ground.material as StandardMaterial;
  floorMat.emissiveTexture = new Texture('kart-track-ground.svg');
  paths.forEach(path => {
    const len = path.getTotalLength();
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(len);
    const dx = Math.abs(start.x - end.x)*scale;
    const dy = Math.abs(start.y - end.y)*scale;
    const midX = ((start.x + end.x)/2)*scale;
    const midY = ((start.y + end.y)/2)*scale;
    const height = path.getAttribute('stroke') == 'blue' ? 1.25 : .8;
    const color =  path.getAttribute('stroke') == 'blue' ? '#990000': '#000099';
    const extents = new Vector3(dx/2 + 0.75, height, dy/2 + 0.75);
    const physicsExtents = extents.scale(2);
    physicsExtents.y *= 10;
    createBox(new Vector3(midX, -0.75, midY).add(offset), Quaternion.Identity(), extents, { mass: 0, extents: physicsExtents}, color);
  })
  const start = getPointFromEllipse(svg.getElementById('start') as SVGEllipseElement).scale(scale).add(offset);
  const collectables = Array.from(svg.querySelectorAll('ellipse')).filter(ele => ele.id != 'start').map(ele => getPointFromEllipse(ele).scale(scale).add(offset))
  const speedRegions = Array.from(svg.querySelectorAll('rect')).map(ele => getAreaFromRect(ele)).map(area => ({ center: area.center.scale(scale).add(offset), extents: area.extents.scale(scale) }))
  return {
    start,
    collectables,
    speedRegions
  }
}

class Pickup {
  pickedUp = false;
  
  constructor(private mesh: AbstractMesh) {

  }

  trigger() {
    this.pickedUp = true;
    this.mesh.isVisible = false;
  }


}




export default async (scene: Scene): Promise<SceneCallback> => {
  const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
  tiledTexture.onLoadObservable.add(() => {
    tiledTexture.wrapU = 1;
    tiledTexture.wrapV = 1;
    tiledTexture.vScale = 1;
    tiledTexture.uScale = 1;
    tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
  })
  const material = new StandardMaterial('tile');
  material.diffuseTexture = tiledTexture;

  const centerOfMass = new Vector3(0, -.435, 0);
  const physicSetting: PhysicsImpostorParameters = { mass: 125, restitution: 0, friction: 0, centerOffMass: centerOfMass };
  
  const elements = await loadKartTrack();

  const car = createBox(elements.start, Quaternion.RotationAxis(new Vector3(0,1,0), Math.PI/2), new Vector3(0.45, .1, 1), physicSetting, '#FF0000');
  car.box.material!.wireframe = true;


  elements.collectables.forEach(v => {
    const sphere = createSphere(v, 0.5, { sensor: true, mass: 0}, '#ffff00');
    sphere.sphere.scaling.scaleInPlace(0.5);
    const material = sphere.sphere.material as StandardMaterial;
    //material.disableLighting = true; 
    material.emissiveColor = Color3.FromHexString('#aaaa00');
    const pickup = new Pickup(sphere.sphere);
    car.physics.registerOnJoltPhysicsCollide('on-contact-add',sphere.physics, () => pickup.trigger())
  })

  let speedBoostActive = false;
  elements.speedRegions.forEach(region => {
    const speedArea = createBox(region.center, Quaternion.Identity(), region.extents.scale(0.5), { sensor: true, mass: 0}, "#ffff00");
    speedArea.box.visibility = 0.2;
    speedArea.box.scaling.y /= 100;
    const onSpeedBoost = () => {
      speedBoostActive = true;
    }
    car.physics.registerOnJoltPhysicsCollide('on-contact-add',speedArea.physics, onSpeedBoost)
    car.physics.registerOnJoltPhysicsCollide('on-contact-persist',speedArea.physics, onSpeedBoost)
  })

  const CoM = MeshBuilder.CreateSphere('center-of-mass', { segments: 34, diameter: 0.2});
  CoM.parent = car.box;
  CoM.position.copyFrom(centerOfMass);
  const wheeledConfig: Vehicle.WheeledVehicleSettings = createBasicCar({ height: .2, length: 2, width: .9 }, { radius: .2, width: .2 }, true);

  const lonScale = 2;
  const latScale = 5;
  wheeledConfig.wheels.forEach(wheel => {
    wheel.longitudinalFriction = [[0,0], [0.06, 1.2], [0.2, 1]].map(([x,y]) => ([x,y*lonScale]))
    wheel.lateralFriction = [[0,0],[3, 1.2],[20, 1]].map(([x,y]) => ([x,y*latScale*latScale]))
    wheel.position.y += 0.35;
  });
  wheeledConfig.engine = { maxTorque: 900, maxRPM: 2000 };
  wheeledConfig.transmission = { mode: 'auto', shiftUpRPM: 1500 }
  wheeledConfig.maxPitchRollAngle = DegreesToRadians(45);
  const vehicleInput = new DefaultWheeledVehicleInput(car.physics.physicsBody);
  const controller = new WheeledVehicleController(car.physics, wheeledConfig, vehicleInput);

  const carWheels: Mesh[] = []
  wheeledConfig.wheels.forEach((o, i) => {
    const mesh = MeshBuilder.CreateCylinder('cylinder', { diameter: o.radius * 2, height: o.width, tessellation: 16 });
    mesh.position = controller.wheels[i].worldPosition;
    mesh.rotationQuaternion = controller.wheels[i].worldRotation;
    mesh.material = material;
    mesh.parent = car.box;
    carWheels.push(mesh);
  })


  const followPoint = new Mesh('camera-follow', scene);

  const { camera, input } = setupVehicleInput(scene);
  setupTachometer(controller, scene);
  camera.getRoot().parent = followPoint;
  camera.setDistance(10);

  let stdTorque = controller.engine.maxTorque;

  const rotateVector = new Vector3();
  const boostParticles = new ParticleSystem('particles', 1000, scene);
  boostParticles.particleTexture = new Texture('textures/particle.png');
  boostParticles.emitter = car.box;
  boostParticles.minSize = 0.02;
  boostParticles.maxSize = 0.05;
  boostParticles.emitRate = 100;
  boostParticles.worldOffset.y = -0.5;

  return (_time: number, _delta: number) => {
    vehicleInput.input.forward = input.direction.z;
    vehicleInput.input.right = input.direction.x;
    vehicleInput.input.handBrake = input.handbrake;

    const newInertia = input.boost ? 2.5 * stdTorque : stdTorque;
    if(speedBoostActive) {
      boostParticles.start()
    } else {
      boostParticles.stop();
    }
    if (controller.engine.maxTorque != newInertia || speedBoostActive) {
      controller.engine.maxTorque = newInertia;
    }
    speedBoostActive = false;

    followPoint.position.copyFrom(car.box.position);
    car.box.rotationQuaternion?.toEulerAnglesToRef(rotateVector)
    camera.getRoot().rotation.y = rotateVector.y;
  }
}
