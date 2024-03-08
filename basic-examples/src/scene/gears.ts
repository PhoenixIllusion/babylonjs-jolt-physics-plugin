import { Quaternion, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, SceneCallback, createBox, createCylinder, createFloor, createMeshForShape, getMaterial } from '../util/example';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { JoltGearConstraint, JoltHingeJoint, JoltRackAndPinionConstraint, JoltSliderJoint, MotorMode } from '../../../dist';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor'
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core';




export default (): SceneCallback => {

  const tiledTexture = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAAAAABX3VL4AAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH5wsCAyocY2BWPgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAOSURBVAjXY2D4z/CfAQAGAAH/P9ph1wAAAABJRU5ErkJggg==');
  tiledTexture.onLoadObservable.add(() => {
    tiledTexture.wrapU = 1;
    tiledTexture.wrapV = 1;
    tiledTexture.vScale = 2;
    tiledTexture.uScale = 2;
    tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
  })
  const material = new StandardMaterial('tile');
  material.ambientColor = Color3.White();
  material.diffuseTexture = tiledTexture;
  const texUV: Vector4[] = [];
  for (var i = 0; i < 15; i++) {
    texUV[i] = new Vector4(0, 0, 1, 1);
  }
  
  function createGearWheel(x: number, y: number, radius: number, color: Color4) {
    const cylinder = MeshBuilder.CreateCylinder('cylinder', { diameter: radius, height: 0.1, tessellation: 24,
      faceUV: texUV, faceColors: [color, color, color], 
      subdivisions: 1, hasRings: false, });
    cylinder.position.set(x, y, 0);
    cylinder.rotationQuaternion = Quaternion.RotationAxis(new Vector3(1,0,0), Math.PI/2);
    cylinder.material = material;
    cylinder.visibility = 0.75;
    const physics = new PhysicsImpostor(cylinder, PhysicsImpostor.CylinderImpostor, {mass: 1});
    const debug = createMeshForShape(physics, Color3.FromInts(0,255,0));
    debug.position.y += 0.1;
    debug.scaling.set(0.6, 0.9, 0.6);
    debug.parent = cylinder;
    return {physics, cylinder}

  }

  createFloor({ friction: 0.8, mass: 0, restitution: 0 });

  const gearAxis = new Vector3(0,0,1);
  const gearNormal = new Vector3(1,0,0);

  new HemisphericLight('hemi-light', new Vector3(0,1,0));
  
  const bigAxis = createBox(new Vector3(0, 4, 1), Quaternion.Identity(), new Vector3(0.2, 0.2, 0.2), { mass: 0}, '#FF00FF');
  const bigGear = createGearWheel(0, 4, 3, Color4.FromInts(255,0,0,255));

  const gear1 = new JoltHingeJoint(new Vector3(0, 4, 0.5), gearAxis, gearNormal);
  bigAxis.physics.addJoint(bigGear.physics, gear1);
  gear1.motor.mode = MotorMode.Velocity;
  gear1.motor.target = 1;

  const smallAxis = createBox(new Vector3(2.1, 4, 1), Quaternion.Identity(), new Vector3(0.2, 0.2, 0.2), { mass: 0}, '#0000FF');
  const smallGear = createGearWheel(2.1, 4, 1, Color4.FromInts(0,255,0,255));

  const gear2 = new JoltHingeJoint(new Vector3(2.1, 4, 0.5), gearAxis, gearNormal);
  smallAxis.physics.addJoint(smallGear.physics, gear2);

  const gearConstraint = new JoltGearConstraint(gearAxis, gearAxis, 3);
  smallGear.physics.addJoint(bigGear.physics, gearConstraint);

  gearConstraint.setJointHint(gear2, gear1);
  
  
  const bigAxis2 = createBox(new Vector3(4.2, 4, 1), Quaternion.Identity(), new Vector3(0.2, 0.2, 0.2), { mass: 0}, '#00FFFF');
  const bigGear2 = createGearWheel(4.2, 4, 3, Color4.FromInts(255,255,0,255));
  const gear3 = new JoltHingeJoint(new Vector3(4.2, 4, 0.5), gearAxis, gearNormal);
  bigAxis2.physics.addJoint(bigGear2.physics, gear3);

  const gearConstraint2 = new JoltGearConstraint(gearAxis, gearAxis, 3 );
  smallGear.physics.addJoint(bigGear2.physics, gearConstraint2);
  gearConstraint2.setJointHint(gear2, gear3);


  const pinionAxis = createBox(new Vector3(7, 8, 1), Quaternion.Identity(), new Vector3(0.2, 0.2, 0.2), { mass: 0}, '#FFFF00');
  const pinion = createBox(new Vector3(7,5,0), Quaternion.Identity(), new Vector3(0.2, 4, 0.2), { mass: 1}, '#FFFFFF');

  const slider = new JoltSliderJoint(new Vector3(7, 8, 5), new Vector3(0,1,0));
  pinionAxis.physics.addJoint(pinion.physics, slider);
  
  const rackAndPinion = new JoltRackAndPinionConstraint( gearAxis, new Vector3(0,1,0), 1.5);
  bigGear2.physics.addJoint(pinion.physics, rackAndPinion);
}

