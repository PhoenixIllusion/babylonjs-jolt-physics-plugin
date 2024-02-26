import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor, createSphere } from './example';
import { Quaternion } from '@babylonjs/core';

export default (): SceneCallback => {
  //createSphere(Vector3.FromArray([0, 4, 0]), 2, { mass: 1, friction: 0, restitution: 0.75 });
  createBox(Vector3.FromArray([0, 4, 0]), Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 1, friction: 0, restitution: 0.75 });
  createBox(Vector3.FromArray([0, 5, 0]), Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 1, friction: 0, restitution: 0.75 });
  createFloor();
}