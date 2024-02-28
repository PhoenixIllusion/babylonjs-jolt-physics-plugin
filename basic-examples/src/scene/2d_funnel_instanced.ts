import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, createBox, createFloor, getMaterial } from './example';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { JoltPhysicsImpostor, ThinPhysicsNode } from '@phoenixillusion/babylonjs-jolt-plugin'

export default (): (void | ((time: number, delta: number) => void)) => {

    createFloor();

    createBox(new Vector3(-12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), 0.2 * Math.PI), new Vector3(0.1, 10, 1));
    createBox(new Vector3(12, 8, -5), Quaternion.RotationAxis(new Vector3(0, 0, 1), -0.2 * Math.PI), new Vector3(0.1, 10, 1));

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1, segments: 32 });
    const extents = new Vector3(0.5, 0.5, 0.5);
    for (let x = 0; x < 20; ++x)
        for (let y = 0; y < 10; ++y) {
            const matrix = Matrix.Translation(-10 + x, 10 + y, -5);
            const idx = sphere.thinInstanceAdd(matrix);
            sphere.material = getMaterial('#ff0000');
            new JoltPhysicsImpostor(new ThinPhysicsNode(extents, idx, sphere), PhysicsImpostor.SphereImpostor, { mass: 1, friction: 0, restitution: 0, disableBidirectionalTransformation: true });
        }
}