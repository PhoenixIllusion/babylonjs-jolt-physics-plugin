import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from './example';
import type { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';

export default (): SceneCallback => {
  const objectTimePeriod = 0.01;
  let timeNextSpawn = 0;

  createFloor();
  const maxBoxes = 200;

  const boxes: {box: Mesh, physics: PhysicsImpostor }[] = []
  function generateObject() {
    // Position and rotate body
    const axis = new Vector3(0.001 + Math.random(), Math.random(), Math.random());
    const rot = Quaternion.RotationAxis(axis.normalize(),2 * Math.PI * Math.random());
    const box = createBox(new Vector3(-(Math.random() - 0.5) * 25, 15, (Math.random() - 0.5) * 25),
    rot, new Vector3(0.5, 0.5, 0.5), { mass: 10, restitution: 0.5, friction: 1 }, '#ff0000');

    boxes.push(box);
    while (boxes.length > maxBoxes) {
      const last = boxes.shift();
      last?.box.dispose();
      last?.physics.dispose();
    }
  }


  return (time: number, _delta: number) => {
    // Check if its time to spawn a new object
    if (time > timeNextSpawn) {
      generateObject();
      timeNextSpawn = time + objectTimePeriod;
    }
  }
}