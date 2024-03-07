import { MeshBuilder, SceneCallback, createHeightField, createImageMaterial, getImagePixels, getMaterial, loadSVGImage } from '../util/example';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { ThinPhysicsNode } from '@phoenixillusion/babylonjs-jolt-plugin';
import { Engine } from '@babylonjs/core/Engines/engine';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';

function addBalls() {
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1, segments: 32 });
    const extents = new Vector3(0.5, 0.5, 0.5);
    for (let x = 0; x < 20; ++x)
        for (let y = 0; y < 20; ++y) {
            const px = -31 + x * 62 / 20;
            const py = -31 + y * 62 / 20;
            const matrix = Matrix.Translation(px, 20, py);
            const idx = sphere.thinInstanceAdd(matrix);
            sphere.material = getMaterial('#ff0000');
            new PhysicsImpostor(new ThinPhysicsNode(extents, idx, sphere), PhysicsImpostor.SphereImpostor,
                        { mass: 1, friction: 0, restitution: 0, disableBidirectionalTransformation: true });
        }
}

async function build() {
    const svg = await loadSVGImage(document.querySelector('svg')!.outerHTML, 256, 256);
    const buffer = getImagePixels(svg);
    const material = createImageMaterial('depthTex', svg);
    const heightMap = createHeightField(buffer, material, 256, 0.25, 0, 30);
    heightMap.position.y -= 20;
    addBalls();
}

export default (): SceneCallback => {
    const scene = Engine.LastCreatedScene!;
    const camera = scene.cameras[0] as FlyCamera;
    camera.position.set(0, 30, -50);
    camera.target = new Vector3(0,0, 0)
    build();
}
