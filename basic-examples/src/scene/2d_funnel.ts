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
