import { MaskCollisionConfiguration, PhysicsSettings } from '@phoenixillusion/babylonjs-jolt-plugin';
import { SceneCallback, createBox, createCapsule, createFloor, createSphere } from '../util/example';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core';

const GROUP_STATIC = 1;
const GROUP_FLOOR1 = 2;
const GROUP_FLOOR2 = 4;
const GROUP_FLOOR3 = 8;
const GROUP_ALL = GROUP_STATIC | GROUP_FLOOR1 | GROUP_FLOOR2 | GROUP_FLOOR3;

export const settings: PhysicsSettings = {
  collision: {
    type: 'mask',
    broadphase: [
      { id: 0, includes: GROUP_STATIC },
      { id: 1, includes: GROUP_FLOOR1 | GROUP_FLOOR2 | GROUP_FLOOR3 }
    ]
  } as MaskCollisionConfiguration
}

export default (_scene: Scene): SceneCallback => {

    createFloor({ mass: 0, restitution: 0, friction: 0, frozen: true, layer: GROUP_STATIC, mask: GROUP_ALL });

    // 1st floor: Part of group static but colliding only with GROUP_FLOOR1
    createBox(new Vector3(0, 3, 0), Quaternion.Identity(), new Vector3(5, 0.5, 5), { mass: 0, layer: GROUP_STATIC, mask: GROUP_FLOOR1 }, '#9f0000');

    // 2nd floor: Part of group static but colliding only with GROUP_FLOOR2
    createBox(new Vector3(0, 6, 0), Quaternion.Identity(), new Vector3(5, 0.5, 5), { mass: 0, layer: GROUP_STATIC, mask: GROUP_FLOOR2 }, '#009f00');

    // 3rd floor: Part of group static but colliding only with GROUP_FLOOR3
    createBox(new Vector3(0, 9, 0), Quaternion.Identity(), new Vector3(5, 0.5, 5), { mass: 0, layer: GROUP_STATIC, mask: GROUP_FLOOR3 }, '#00009f');

    // Create dynamic objects that collide only with a specific floor or the ground floor
    for (let x = 0; x < 10; x++)
      for (let z = 0; z < 10; z++)
        for (let l = 0; l < 3; l++)
        {
          // Create physics body
          let pos = new Vector3(1.2 * x - 5.4, 12 + 2 * l, 1.2 * z - 5.4);
          let layer = 0;
          const mask = GROUP_ALL;
          let color = '';
          switch (l) {
            case 0:
              layer = GROUP_FLOOR1;
              color = '#ff0000';
              createBox(pos, Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 1, layer, mask}, color);
              break;
            case 1:
              layer = GROUP_FLOOR2;
              color = '#00ff00';
              createSphere(pos, 0.5, { mass: 1, layer, mask}, color);
              break;
            case 2:
              layer = GROUP_FLOOR3;
              color = '#0000ff';
              createCapsule(pos, 0.5, 0.5, 0.5, { mass: 1, layer, mask}, color)
              break;
          }
        }
}
