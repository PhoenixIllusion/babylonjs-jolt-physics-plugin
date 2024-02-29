import { MeshBuilder, SceneCallback, getMaterial } from './example';
import { CreateGroundFromHeightMapVertexData } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { ThinPhysicsNode } from '@phoenixillusion/babylonjs-jolt-plugin';


async function build() {
    const IMAGE_SIZE = 256;
    const displacementCanvas = document.createElement('canvas');
    const img = new Image();
    img.width = displacementCanvas.width = IMAGE_SIZE;
    img.height = displacementCanvas.height = IMAGE_SIZE;
    const displacementContext2D = displacementCanvas.getContext('2d')!;
    img.src = 'data:image/svg+xml;base64,' + btoa(document.querySelector('svg')!.outerHTML);
    await new Promise(resolve => img.onload = resolve);
    displacementContext2D.drawImage(img, 0, 0);
    const imgData = displacementContext2D.getImageData(0, 0, img.width, img.height);

    const bufferSize = imgData.width;
    const heightBuffer = new Float32Array(bufferSize * bufferSize);
    const ground = CreateGroundFromHeightMapVertexData( {
        width: IMAGE_SIZE / 4,
        height: IMAGE_SIZE / 4,
        subdivisions: IMAGE_SIZE-1,
        bufferHeight: IMAGE_SIZE,
        bufferWidth: IMAGE_SIZE, 
        buffer: new Uint8Array(imgData.data.buffer),
        minHeight: 0,
        maxHeight: 30,
        colorFilter: new Color3(1, 0, 0),
        alphaFilter: 0,
        heightBuffer: heightBuffer
    });
    const mesh = new Mesh('height-map');
    ground.applyToMesh(mesh);
    const material = getMaterial('#cccccc'); 
    material.diffuseTexture =  new Texture(`texture`, mesh.getScene(), true,
    true, Texture.BILINEAR_SAMPLINGMODE,
    null, null, img, true);
    mesh.material = material;
    mesh.position.y -= 22;
    mesh.rotate(new Vector3(0,1,0), Math.PI)
    mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor.HeightmapImpostor, {
        mass: 0,
        heightMap: {
            size: IMAGE_SIZE,
            data: heightBuffer,
            alphaFilter: 0
        }
    });

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


export default (): SceneCallback => {
    build();
}