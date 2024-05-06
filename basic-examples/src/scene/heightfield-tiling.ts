import { MeshBuilder, SceneCallback, createHeightField, createMeshForShape, createSphere, getMaterial } from '../util/example';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';

export default (scene: Scene): SceneCallback => {
    const camera = scene.cameras[0] as FlyCamera;
    camera.position.set(-4, 15, 20);
    camera.target = new Vector3(0,0, 0)
    const buffer = new Uint8Array([
            0,1, 1, 1,1,1,1,0,
            1,1,16,16,1,1,1,1,
            1,1,16,16,1,0,1,1,
            1,1,1,16,1,1,1,1,
            1,1,1,16,1,1,1,1,
            1,1, 1, 1,1,1,1,1,
            1,1, 1, 1,1,1,1,1,
            1,1, 1, 1,1,1,1,1,
        ].map(x => [x,x,x,x]).flat());

    const wireMat = getMaterial('#ff0000');
    wireMat.wireframe = true;
    const colors = ['#cccccc', '#00ff00','#0000ff','#ffff00','#00ffff','#ff00ff', '#660000', '#006600', '#000066' ].map(Color3.FromHexString);

    const RES = 4;
    let index = 0;
    for(let x=-1; x<=1; x++)
    for(let y=-1; y<=1; y++)
    {
        const mesh = createHeightField(buffer, wireMat, RES*2, 1, 0, 30);
        const debug = createMeshForShape(mesh.physicsImpostor!, colors[index++]);
        mesh.position.x += x * RES*2;
        mesh.position.z += y * RES*2;
        debug.position.y = -.01;
        debug.parent = mesh;
    }

    const ref0 = MeshBuilder.CreateBox('a', {size: 0.1});
    ref0.position.set(-RES, .1, -RES);
    const ref1 = MeshBuilder.CreateBox('a', {size: 0.1});
    ref1.position.set(RES, .1, -RES);
    const ref2 = MeshBuilder.CreateBox('a', {size: 0.1});
    ref2.position.set(RES, .1, RES);
    const ref3 = MeshBuilder.CreateBox('a', {size: 0.1});
    ref3.position.set(-RES, .1, RES);

    const ball1 = createSphere(new Vector3(3.5,0.51,-3.4), 0.5, { mass: 1}, '#00FFFF');
    ball1.physics.applyImpulse(new Vector3(-2, 0, 0), ball1.sphere.position);

    const ball2 = createSphere(new Vector3(3.5,0.51,3.4), 0.5, { mass: 1}, '#00FFFF');
    ball2.physics.applyImpulse(new Vector3(-2, 0, 0), ball2.sphere.position);
}
