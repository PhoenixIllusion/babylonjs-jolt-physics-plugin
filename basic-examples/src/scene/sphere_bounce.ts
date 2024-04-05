import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createFloor, createSphere } from '../util/example';
import { Scene } from '@babylonjs/core/scene';

export default (_scene: Scene): SceneCallback => {
  createSphere(Vector3.FromArray([0, 4, 0]), 2, { mass: 1, friction: 0, restitution: 0.75 });
  createFloor();
}
