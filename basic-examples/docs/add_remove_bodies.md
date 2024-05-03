```typescript
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from '../util/example';
import type { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';

export default (_scene: Scene): SceneCallback => {
  const objectTimePeriod = 0.01;
  let timeNextSpawn = 0;

  createFloor();
  const maxBoxes = 200;

  const boxes: { box: Mesh, physics: PhysicsImpostor }[] = []
  function generateObject() {
    // Position and rotate body
    const axis = new Vector3(0.001 + Math.random(), Math.random(), Math.random());
    const rot = Quaternion.RotationAxis(axis.normalize(), 2 * Math.PI * Math.random());
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
```

### Add / Remove Bodies

This demonstration shows the ability to dynamically add and remove physics objects from the Scene.

The callback function is returned from the createScene default-export of the Scene TS file. This method will be run once per frame, and pass in the current time and time since last render.

The return value of `createBox` is a combination object of the physics impostor and the actual mesh, `{ box, physics }`.
Each frame, if more than 200 boxes have been spawned, it will take the index-0 box and dispose of both the graphical 'box' and physics item.

This may be done automatically by having using the `physicsImpostor` field of the AbstractMesh, instead of explicitly running this code.
When an AbstractMesh is disposed, it will automatically dispose of any impostor currently assigned to this property.