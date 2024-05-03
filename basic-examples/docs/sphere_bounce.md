
```typescript
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createFloor, createSphere } from '../util/example';
import { Scene } from '@babylonjs/core/scene';

export default (_scene: Scene): SceneCallback => {
  createSphere(Vector3.FromArray([0, 4, 0]), 2, { mass: 1, friction: 0, restitution: 0.75 });
  createFloor();
}
```

### Sphere Bounce

This demo is one of the most basic examples of enabling the physic system.
This is based on the demo "Using the Havok Physics System" on the BabylonJS documentation site [HERE](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin#full-in-browser-example-using-the-umd-version)

The source references two utility functions in the [example.ts](../src/util/example.ts) script that allows for quick creation of various shapes.

The method `createSphere` creates a ball at the X,Y,Z location of 0,4,0, with a diameter of 2. Given the sphere has no X or Z motion, it will fall straight down, and has no usage of friction. The sphere has a mass of 1.0, meaning it is Dynamic and can move and be influenced by physics.

The `restitution` value provides a bounciness. A value of 1.0 will cause full energy return, meaning that a ball that falls from 4 height would always return to 4 height. A value of 0.0 would cause full energy absorption, staying on the ground on initial contact as if falling in a sand-pit.

The `createFloor` routine creates a 100x100 X/Z plane at -0.5 Y location under the scene. Although this is created after the ball, the physics system has not yet run so there is no risk of the ball falling through the floor between these two commands. By default, the floor has a mass of 0, meaning it is Static and will never move regardless of the forces of physics acting on it.