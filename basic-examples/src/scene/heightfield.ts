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

const SVG = `
<svg id="sampleImg" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 256 256">
    <defs>
        <filter id="turbulenceFilter">
            <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="5" result="turbulence" />
            <feColorMatrix in="turbulence" type="matrix" result="grayscale" values=".33 .33 .33 0 0
                                            .33 .33 .33 0 0
                                            .33 .33 .33 0 0
                                            0 0 0 1 0" />
            <feComposite operator="in" in="grayscale" in2="SourceGraphic" />
            <feComponentTransfer color-interpolation-filters="sRGB">
                <feFuncR type="gamma" exponent="1.5" amplitude="1.3" offset="0"></feFuncR>
                <feFuncG type="gamma" exponent="1.5" amplitude="1.3" offset="0"></feFuncG>
                <feFuncB type="gamma" exponent="1.5" amplitude="1.3" offset="0"></feFuncB>
            </feComponentTransfer>
        </filter>
    </defs>
    <rect x="0" y="0" width="256" height="256" filter="url(#turbulenceFilter)"></rect>
    <text x="64" y="96" style="font-weight: bold; font-size: 52px; user-select: none; fill: #f0f">JOLT</text>
    <text x="16" y="168" style="font-weight: bold; font-size: 52px; user-select: none; fill: #ff0">PHYSICS</text>
</svg>`

async function build() {
    const svg = await loadSVGImage(SVG, 256, 256);
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
