import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor, createSphere, getMaterial } from '../util/example';
import { Scene } from '@babylonjs/core/scene';
import { LAYER_MOVING, LAYER_NON_MOVING, LayerCollisionConfiguration, PhysicsSettings } from '@phoenixillusion/babylonjs-jolt-plugin';

const LAYER_OTHER = 2;

export const settings: PhysicsSettings = {
  collision: {
    type: 'layer',
    objectLayers: [{
      id: LAYER_NON_MOVING, collides: [ LAYER_MOVING ]
    }, {
      id: LAYER_MOVING, collides: [LAYER_NON_MOVING, LAYER_MOVING]
    }, {
      id: LAYER_OTHER, collides: []
    }],
    broadphase: [
      { id: LAYER_NON_MOVING, includesObjectLayers: [LAYER_NON_MOVING, LAYER_OTHER] },
      { id: LAYER_MOVING, includesObjectLayers: [LAYER_MOVING] }
    ]
  } as LayerCollisionConfiguration
}

export default (_scene: Scene): SceneCallback => {

    createFloor({ mass: 0, restitution: 0, friction: 0, frozen: true, friction: 1 });

    const ball = createSphere(new Vector3(0,6,0), 0.5, { mass: 5}, '#ff00ff');

    const topBox = createBox(new Vector3(0,5,0), Quaternion.Identity(), new Vector3(2,0.2,1), { mass: 0, friction: 1, frozen: true }, '#cccccc');
    const middleBox = createBox(new Vector3(0,3,0), Quaternion.Identity(), new Vector3(2,0.2,1), { mass: 0, friction: 1, frozen: true }, '#cccccc');
    const bottomBox = createBox(new Vector3(0,1,0), Quaternion.Identity(), new Vector3(2,0.2,1), { mass: 0, friction: 1, frozen: true }, '#cccccc');

    const startTime = performance.now();

    let stage = 0;

    return (_time, _delta) => {
      const ellapsed = performance.now() - startTime;

      if(ellapsed > 1000 && stage === 0) {
        topBox.physics.setLayer(LAYER_OTHER);
        topBox.box.material = getMaterial('#999999');
        ball.physics.wakeUp();
        stage++;
      }
      if(ellapsed > 2000 && stage == 1) {
        middleBox.physics.setLayer(LAYER_OTHER);
        middleBox.box.material = getMaterial('#999999');
        ball.physics.wakeUp();
        stage++;
      }
      if(ellapsed > 3000 && stage == 2) {
        bottomBox.physics.setLayer(LAYER_OTHER);
        bottomBox.box.material = getMaterial('#999999');
        ball.physics.wakeUp();
        stage++;
      }
    }
}
