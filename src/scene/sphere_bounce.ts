import { Vector3 } from '@babylonjs/core';
import { SceneCallback, createFloor, createSphere } from './example';

export default (): SceneCallback => {
  createSphere(Vector3.FromArray([0,4,0]), 2, {mass: 1, friction: 0, restitution: 0.75 });
  createFloor();
}