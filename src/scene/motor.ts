import { DistanceJoint, HingeJoint, MotorEnabledJoint, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { JoltNS, createBox, createFloor, createSphere } from "./example";
import { Slider } from "@babylonjs/gui";

const createWindmill = () => {
  const box1 = createBox(new Vector3(0,10,0), Quaternion.Identity(), new Vector3(0.25,0.25,0.25));
  const wings = [
    createBox(new Vector3(5,10,0), Quaternion.Identity(), new Vector3(4,0.5,0.5), {mass: 10, friction: 0, restitution: 0}),
    createBox(new Vector3(-5,10,0), Quaternion.Identity(), new Vector3(4,0.5,0.5), {mass: 10, friction: 0, restitution: 0}),
    createBox(new Vector3(0,15,0), Quaternion.Identity(), new Vector3(0.5,4,0.5), {mass: 10, friction: 0, restitution: 0}),
    createBox(new Vector3(0,5,0), Quaternion.Identity(), new Vector3(0.5,4,0.5), {mass: 10, friction: 0, restitution: 0})
  ]
    

  const jointConfig = { 
    mainPivot: new Vector3(0, 10, 0),
    connectedPivot: new Vector3(0, 10, 0),
    mainAxis: new Vector3(0, 0, 1),
    connectedAxis: new Vector3(0, 0, 1),
    nativeParams: {
      'normal-axis-1': new Vector3(0, 0, 1),
      'normal-axis-2': new Vector3(0, 0, 1),
      'motor-mode': 'velocity'
    }
  };
  wings.forEach( box => {
    const joint = new HingeJoint(jointConfig);
    box1.physics.addJoint(box.physics, joint);
    joint.setMotor(5);
  });


  const ball = createSphere(new Vector3(20, 0, 0), 2, {mass: 5, friction: 0, restitution: 0}, '#118811');
  ball.physics.applyImpulse(new Vector3(-25,0,0), new Vector3(20,0,0));
}

const createSlider = () => {
    const base = createBox(new Vector3(-15, -.25, 0), Quaternion.Identity(), new Vector3(8, 0.25, 2), undefined, "#993333");
    const box = createBox(new Vector3(-15, 0.75, 0), Quaternion.Identity(), new Vector3(.75, 0.75, .75), {mass: 10, friction: 0, restitution: 0}, "#003366");
    const target = createBox(new Vector3(-23, 0.5, 0), Quaternion.Identity(), new Vector3(.5, 2, 2), undefined, "#666633");

    const jointConfig = { 
      mainPivot: new Vector3(-21, 0.5, 0),
      connectedPivot: new Vector3(-16, 0.75, 0),
      mainAxis: new Vector3(-1, 0, 0),
      connectedAxis: new Vector3(-1, 0, 0),
      nativeParams: {
        'normal-axis-1': new Vector3(0, 0, 1),
        'normal-axis-2': new Vector3(0, 0, 1),
        'motor-mode': 'velocity'
      }
    };
    const joint = new MotorEnabledJoint(MotorEnabledJoint.SliderJoint, jointConfig);
    target.physics.addJoint(box.physics, joint);

    const initialPos = new Vector3(-15,0.75, 0);
    const motorStart = new Vector3(-5, 0.75, 0);
    const motorEnd = new Vector3(-13, 0.75, 0);
    const sliderAxis = new Vector3(-1, 0, 0);

    const setStart = () => joint.setMotor(Vector3.Dot(motorStart.subtract(jointConfig.mainPivot), sliderAxis));
    const setEnd = () => joint.setMotor(Vector3.Dot(motorEnd.subtract(jointConfig.mainPivot), sliderAxis));
    joint.setMotor(4);

    return { joint, box };

}

export default (Jolt: JoltNS, scene: Scene): (void|((time: number, delta: number) =>void)) => {

    createFloor();

    createWindmill();

    const slideMotor = createSlider();

    return (time, delta) => {
      time = time / 1000.0;
      if(slideMotor.box.box.position.x < -18) {
        slideMotor.joint.setMotor(-4);
      }
      if(slideMotor.box.box.position.x > -8) {
        slideMotor.joint.setMotor(4);
      }
    }
}