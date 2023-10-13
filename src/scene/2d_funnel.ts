import { Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { createBox, createFloor, createSphere } from "./example";

export default (scene: Scene): (void|((time: number, delta: number) =>void)) => {

    createFloor();

    createBox(new Vector3(-12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), 0.2 * Math.PI), new Vector3(0.1, 10, 1));
    createBox(new Vector3(12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), -0.2 * Math.PI), new Vector3(0.1, 10, 1));

    for (let x = 0; x < 20; ++x)
        for (let y = 0; y < 10; ++y) {
            createSphere(new Vector3(-10 + x, 10 + y, -5), 1, { mass: 1, friction: 0, restitution: 0 }, "#ff0000");
    }
}