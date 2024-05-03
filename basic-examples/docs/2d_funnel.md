```typescript
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor, createSphere } from '../util/example';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';

export default (_scene: Scene): SceneCallback => {

    createFloor({ mass: 0, restitution: 0, friction: 0, frozen: true });

    createBox(new Vector3(-12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), 0.2 * Math.PI), new Vector3(0.1, 10, 1), { mass: 0, restitution: 0, friction: 0, frozen: true });
    createBox(new Vector3(12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), -0.2 * Math.PI), new Vector3(0.1, 10, 1), { mass: 0, restitution: 0, friction: 0, frozen: true });

    for (let x = 0; x < 20; ++x)
        for (let y = 0; y < 10; ++y) {
            createSphere(new Vector3(-10 + x, 10 + y, -5), 1, 
            { mass: 1, friction: 0, restitution: 0, disableBidirectionalTransformation: true },'#ff0000');
        }
}
```

### 2D Funnel

This demo demonstrates the 2d behavior of dropping 200 spheres into a funnel composed of 2x boxes.
The demonstration does not use the axis-lock at this time of Jolt Physics required to maintain the "2D" nature, but Jolt maintains it's own 2D behavior for the initial parts of the simulation until random behavior causes the spheres to finally rush in all directions along the floor.

The `createBox` logic uses Quaternion logic to cause a rotation anlong the Z-axis, which points in the direction the camera is facing, causing the resulting 2D axis to be observable via the camera.

The physics parameters used in the call 'froze' is an optional parameter that indicates that during the lifetime of the object, it will not move. If it will never move (such as a fixed, static object that you will not reposition), it does not need to be synced back to BabylonJS from Jolt's internal system every frame.
