import { Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { JoltNS, createBox, createFloor, createSphere } from "./example";

export default (Jolt: JoltNS, scene: Scene): (void|((time: number, delta: number) =>void)) => {

    createFloor();

    let filter = new Jolt.GroupFilterTable(10);
    for (let z = 0; z < 9; ++z)
      filter.DisableCollision(z, z + 1);

}