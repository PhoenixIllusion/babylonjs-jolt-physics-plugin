import { MeshBuilder, PhysicsImpostor, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { JoltNS, createBox, createCapsule, createFloor, createSphere, getMaterial } from "./example";
import { JoltCharacterVirtualImpostor } from "../plugin/jolt-physics-virtual-character";

export default (Jolt: JoltNS, scene: Scene): (void|((time: number, delta: number) =>void)) => {

    createFloor();

    const createCharacter = () => {
      const capsuleProps = { height: 8, tessellation: 16 }
      const capsule = MeshBuilder.CreateCapsule('capsule', { radius: 2, ... capsuleProps })
      capsule.position.set(0, 10, 0);
      capsule.material = getMaterial('#990000');
      return {
        mesh: capsule,
        phyics: new JoltCharacterVirtualImpostor(capsule, PhysicsImpostor.CapsuleImpostor, { mass: 10})
      } 
    }

    const char = createCharacter();
}