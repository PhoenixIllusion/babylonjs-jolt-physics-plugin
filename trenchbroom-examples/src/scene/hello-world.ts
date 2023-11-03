import { AbstractMesh, FlyCamera, Mesh, PhysicsImpostor, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { MapLoader, MapSceneBuilder } from '@phoenixillusion/babylonjs-trenchbroom-loader';
import { Entity, EntityGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap';
import { SceneFunction } from '../app';
import { TestMaterialResolver, TestMeshResolver } from './test-resolvers';
import { createConvexHull, createSphere } from './example';
import { GeometryUtil } from '../util/geometry';

let ball: {sphere: Mesh, physics: PhysicsImpostor};
class HelloWorldMeshResolver extends TestMeshResolver {
    shouldRenderEntity(_entity: Entity, _geometry: EntityGeometry): boolean {
        const hulls = GeometryUtil.HullsFromGeometry(_geometry);
        hulls.forEach(hull => {
            const cHull = createConvexHull(new Vector3(), hull, undefined, '#FF00FF');
            cHull.mesh.freezeWorldMatrix();
        })
        return false;
    }
    async forClassName(modelName: string): Promise<AbstractMesh | undefined> {
        if(modelName === 'info_target') {
           let sphere = createSphere(new Vector3(0, 0, 0), 30, {mass: 10, restitution: 0.3, friction: .5 }, '#ff0000');
           ball = sphere;
           return sphere.sphere;
        }
        return undefined;
    }
} 

const run: SceneFunction = async (scene: Scene) => {

    const camera = new FlyCamera('camera1', new Vector3(150, 80, -150));
    // This targets the camera to scene origin
    camera.setTarget(new Vector3(0,50,0));

    // This attaches the camera to the canvas
    camera.attachControl(true);

    const mapLoader = new MapLoader();
    const map = await mapLoader.parseMap('levels/hello-world.map', {forTexture: (s) => ({ width: 512, height: 512} )});

    const mapBuilder = new MapSceneBuilder(scene, new TestMaterialResolver(), new HelloWorldMeshResolver());
    mapBuilder.build(map);

    ball.physics.applyImpulse(new Vector3(200,0,0), ball.sphere.position);

}
export default run;