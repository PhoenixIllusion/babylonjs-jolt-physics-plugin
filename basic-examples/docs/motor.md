import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor, createSphere } from '../util/example';
import { JoltSliderJoint, JoltHingeJoint, MotorMode } from '@phoenixillusion/babylonjs-jolt-plugin';
import { Scene } from '@babylonjs/core/scene';

const createWindmill = () => {
  const box1 = createBox(new Vector3(0, 10, 0), Quaternion.Identity(), new Vector3(0.25, 0.25, 0.25));
  const wings = [
    createBox(new Vector3(5, 10, 0), Quaternion.Identity(), new Vector3(4, 0.5, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(-5, 10, 0), Quaternion.Identity(), new Vector3(4, 0.5, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(0, 15, 0), Quaternion.Identity(), new Vector3(0.5, 4, 0.5), { mass: 10, friction: 0, restitution: 0 }),
    createBox(new Vector3(0, 5, 0), Quaternion.Identity(), new Vector3(0.5, 4, 0.5), { mass: 10, friction: 0, restitution: 0 })
  ]

  wings.forEach(box => {
    const joint = new JoltHingeJoint(new Vector3(0, 10, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0));
    box1.physics.addJoint(box.physics, joint);
    joint.motor.mode = MotorMode.Velocity;
    joint.motor.target = 3;
  });


  const ball = createSphere(new Vector3(20, 0, 0), 2, { mass: 5, friction: 0, restitution: 0 }, '#118811');
  ball.physics.applyImpulse(new Vector3(-25, 0, 0), new Vector3(20, 0, 0));
}

const createSlider = () => {
  createBox(new Vector3(-15, -.25, 0), Quaternion.Identity(), new Vector3(8, 0.25, 2), undefined, '#993333');
  const box = createBox(new Vector3(-15, 0.75, 0), Quaternion.Identity(), new Vector3(.75, 0.75, .75), { mass: 10, friction: 0, restitution: 0 }, '#003366');
  const target = createBox(new Vector3(-23, 0.5, 0), Quaternion.Identity(), new Vector3(.5, 2, 2), undefined, '#666633');


  const point1 = new Vector3(-21, 0.5, 0);
  const point2 = new Vector3(-16, 0.75, 0);
  const slideAxis = new Vector3(1, 0, 0);
  const joint = new JoltSliderJoint(point1, slideAxis, 'World', point2);
  target.physics.addJoint(box.physics, joint);
  joint.motor.mode = MotorMode.Position;

  const setStart = () => joint.motor.target = 0;
  const setEnd = () => joint.motor.target = 10;

  let i = 0;
  const interval = setInterval(() => {
    if (box.box.isDisposed()) {
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

export default (_scene: Scene): SceneCallback => {
  createFloor();
  createWindmill();
  createSlider();
}
