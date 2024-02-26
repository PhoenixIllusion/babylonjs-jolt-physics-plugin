import { DegreesToRadians, createBox, createCylinder, createFloor } from './example';
import { JoltPhysicsImpostor } from '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { JoltContactSetting } from '@phoenixillusion/babylonjs-jolt-plugin/contact';
import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';

export default (): (void | ((time: number, delta: number) => void)) => {

  createFloor();

  // Create conveyor belts
  const cBeltWidth = 10.0;
  const cBeltLength = 50.0;
  const mLinearBelts = [];
  for (let i = 0; i < 4; ++i) {
    const friction = 0.25 * (i + 1);
    const rot1 = Quaternion.FromRotationMatrix(Matrix.RotationAxis(new Vector3(0, 1, 0), 0.5 * Math.PI * i));
    const rot2 = Quaternion.FromRotationMatrix(Matrix.RotationAxis(new Vector3(1, 0, 0), DegreesToRadians(1.0)));
    const rotation = rot1.multiply(rot2);
    const position = new Vector3(cBeltLength, 6.0, cBeltWidth).applyRotationQuaternionInPlace(rotation);
    const belt = createBox(position, rotation, new Vector3(cBeltWidth, 0.1, cBeltLength), { friction, mass: 0, restitution: 0 }, '#333333');
    mLinearBelts.push(belt);
  }

  let linearBoxes: { physics: JoltPhysicsImpostor }[] = [];
  // Bodies with decreasing friction
  for (let i = 0; i <= 10; ++i) {
    const box = createBox(new Vector3(-cBeltLength + i * 10.0, 10.0, -cBeltLength),
      Quaternion.Identity(), new Vector3(2, 2, 2), { mass: 10, restitution: 0, friction: Math.max(0.0, 1.0 - 0.1 * i) }, '#5e5e0f');
    linearBoxes.push(box);
  }


  // Create 2 cylinders
  let cylinder1 = createCylinder(new Vector3(-25.0, 1.0, -20.0), 1.0, 6.0,
    { mass: 10, restitution: 0, friction: 1 }, '#FF0000');
  cylinder1.cylinder.rotationQuaternion = Quaternion.FromRotationMatrix(Matrix.RotationAxis(new Vector3(0, 0, 1), 0.5 * Math.PI));

  let cylinder2 = createCylinder(new Vector3(-25.0, 1.0, 20.0), 1.0, 6.0,
    { mass: 10, restitution: 0, friction: 1 }, '#FF0000');
  cylinder2.cylinder.rotationQuaternion = Quaternion.FromRotationMatrix(Matrix.RotationAxis(new Vector3(0, 0, 1), 0.5 * Math.PI));

  // Let a dynamic belt rest on it
  const dynamic_belt = createBox(new Vector3(-25.0, 3.0, 0), Quaternion.Identity(), new Vector3(5.0, 0.1, 25.0)
    , { mass: 10, restitution: 0, friction: 1 }, '#333399');
  mLinearBelts.push(dynamic_belt);

  // Create cargo on the dynamic belt
  const dynamicBox = createBox(new Vector3(-25.0, 6.0, 15.0),
    Quaternion.Identity(), new Vector3(2, 2, 2), { mass: 10, restitution: 0, friction: 1 }, '#990099');
  linearBoxes.push(cylinder1, cylinder2, dynamicBox);


  // Create an angular belt
  const mAngularBelt = createBox(new Vector3(10.0, 3.0, 0), Quaternion.Identity(),
    new Vector3(20.0, 0.1, 20.0), { mass: 0, restitution: 0, friction: 1 }, '#993333')

  // Bodies with decreasing friction dropping on the angular belt
  const angularBoxes: { physics: PhysicsImpostor }[] = [];
  for (let i = 0; i <= 6; ++i) {
    const cargo = createBox(new Vector3(10.0, 10.0, -15.0 + 5.0 * i),
      Quaternion.Identity(), new Vector3(2, 2, 2), { mass: 10, restitution: 0, friction: Math.max(0.0, 1.0 - 0.1 * i) }, '#339999');
    angularBoxes.push(cargo);
  }

  mLinearBelts.forEach(belt => {
    const onContactAdd = (_body: PhysicsImpostor, _offset: Vector3, contactSettings: JoltContactSetting) => {
      contactSettings.relativeLinearSurfaceVelocity.set(0, 0, -10);
    };
    belt.physics.registerOnJoltPhysicsCollide('on-contact-add', linearBoxes.map(box => box.physics), onContactAdd)
    belt.physics.registerOnJoltPhysicsCollide('on-contact-persist', linearBoxes.map(box => box.physics), onContactAdd)
  });
  {
    const onContactAdd = (_body: PhysicsImpostor, _offset: Vector3, contactSettings: JoltContactSetting) => {
      contactSettings.relativeAngularSurfaceVelocity.set(0, DegreesToRadians(10.0), 10);
    };
    mAngularBelt.physics.registerOnJoltPhysicsCollide('on-contact-add', angularBoxes.map(box => box.physics), onContactAdd)
    mAngularBelt.physics.registerOnJoltPhysicsCollide('on-contact-persist', angularBoxes.map(box => box.physics), onContactAdd)
  }

}

