import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from '../util/example';

export default (): SceneCallback => {
  createFloor({ friction: 0.8, mass: 0, restitution: 0 });

  for (let i = 0; i < 10; i++) {
    // Create physics body
    const position = new Vector3(-10.0 + 2.0 * i, 0.5, 0);
    const box = createBox(position, Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 10, friction: 0.1 * i, restitution: 0.2 }, '#990099');
    box.physics.applyImpulse(new Vector3(0, 0, 100), position);
  }

}