import { Quaternion, Vector3 } from '@babylonjs/core';
import { SceneCallback, createBox, createFloor, createSphere, getMaterial } from '../util/example';
import { Scene } from '@babylonjs/core/scene';
export default (_scene: Scene): SceneCallback => {

    createFloor({ mass: 0, restitution: 0, friction: 0, frozen: true, friction: 1 });
    createBox(new Vector3(1,3,0), Quaternion.Identity(), new Vector3(0.1,3,1), { mass: 1, friction: 1 }, '#cccccc');
    createSphere(new Vector3(2,6,0), 0.5, { mass: 5}, '#ff00ff');

    const motionObject = createSphere(new Vector3(2,3,0), 0.5, { mass: 5, allowDynamicOrKinematic: true, motionType: 'static'}, '#ffff00');


    const startTime = performance.now();

    let stage = 0;

    return (_time, _delta) => {
      const ellapsed = performance.now() - startTime;

      if(ellapsed > 1000 && stage === 0) {
        motionObject.physics.setMotionType('kinematic');
        motionObject.physics.moveKinematicPosition(new Vector3(1,3,0), 0.25);
        motionObject.sphere.material = getMaterial('#ff0000');
        stage++;
      }
      if(ellapsed > 3000 && stage == 1) {
        motionObject.physics.setMotionType('dynamic');
        motionObject.physics.applyForce(new Vector3(1000, 0, 0));
        motionObject.sphere.material = getMaterial('#0000ff');
        stage++;
      }
    }
}
