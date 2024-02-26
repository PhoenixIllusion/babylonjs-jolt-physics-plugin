import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor, createSphere } from './example';
import { HingeJoint, MotorEnabledJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import { PhysicsConstraintParameters, PhysicsConstraintType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint';

const createWindmill = (scene: Scene) => {
  const box1 = createBox(new Vector3(0, 10, 0), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25));
  const wings = [
    createBox(new Vector3(5, 10, 0), Quaternion.Identity(), new Vector3(4, 0.5, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(-5, 10, 0), Quaternion.Identity(), new Vector3(4, 0.5, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(0, 15, 0), Quaternion.Identity(), new Vector3(0.5, 4, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(0, 5, 0), Quaternion.Identity(), new Vector3(0.5, 4, 0.5), { mass: 10, friction: 0, restitution: 0 })
  ]


  const jointConfig: PhysicsConstraintParameters = {
    pivotA: new Vector3(0, 10, 0),
    pivotB: new Vector3(0, 10, 0),
    axisA: new Vector3(0, 0, 1),
    axisB: new Vector3(0, 0, 1),
    perpAxisA: new Vector3(0, 1, 0),
    perpAxisB: new Vector3(0, 1, 0)
  };
  wings.forEach(box => {
    const joint = new PhysicsConstraint(PhysicsConstraintType.HINGE, jointConfig, scene );
    box1.physics.body.addConstraint(box.physics.body, joint);
    //joint.
  });


  const ball = createSphere(new Vector3(20, 0, 0), 2, { mass: 5, friction: 0, restitution: 0 }, '#118811');
  ball.physics.body.applyImpulse(new Vector3(-25, 0, 0), new Vector3(20, 0, 0));
}

const createSlider = (scene: Scene) => {
  createBox(new Vector3(-15, -.25, 0), Quaternion.Identity(), new Vector3(8, 0.25, 2), undefined, '#993333');
  const box = createBox(new Vector3(-15, 0.75, 0), Quaternion.Identity(), new Vector3(.75, 0.75, .75), { mass: 10, friction: 0, restitution: 0 }, '#003366');
  const target = createBox(new Vector3(-23, 0.5, 0), Quaternion.Identity(), new Vector3(.5, 2, 2), undefined, '#666633');

  const slideAxis = new Vector3(1, 0, 0);
  const normalAxis = new Vector3(0,0,1);

  const jointConfig : PhysicsConstraintParameters = {
    pivotA: new Vector3(-21, 0.5, 0),
    pivotB: new Vector3(-16, 0.75, 0),
    axisA: slideAxis,
    axisB: slideAxis,
    perpAxisA: normalAxis,
    perpAxisB: normalAxis
  };
  const joint = new PhysicsConstraint(PhysicsConstraintType.PRISMATIC, jointConfig, scene );
  target.physics.body.addConstraint(box.physics.body, joint);

  const setStart = () => {};//joint.setMotor(0);
  const setEnd = () => {};//joint.setMotor(10);

  let i = 0;
  const interval = setInterval(() => {
    if(box.box.isDisposed()) {
      clearInterval(interval);
      return;
    }
    if (i++ % 2 == 0) {
      setEnd();
    } else {
      setStart();
    }
  }, 1000)

  return { joint, box };

}

export default (scene: Scene): SceneCallback => {

  createFloor();

  createWindmill(scene);

  createSlider(scene);
}