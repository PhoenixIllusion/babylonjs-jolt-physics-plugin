import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, SceneCallback, createSphere, getMaterial } from '../util/example';
import { Scene } from '@babylonjs/core/scene';
import { BuoyancyPlane } from '@phoenixillusion/babylonjs-jolt-plugin/buoyancy';


export default (scene: Scene): SceneCallback => {

  function setupBuoyancy(ballPosition: Vector3, waterPosition: Vector3, color: string) {
    const ball = createSphere(ballPosition, 1, { mass: 1, friction: 0, restitution: 0.75 });
    const fluid = BuoyancyPlane.FromPosition(waterPosition);
  
    const water = MeshBuilder.CreateBox('water', { width: 5, height: 5, depth: 5 }, scene);
    water.position.copyFrom(waterPosition);
    water.position.y -= 2.5;
    const waterMaterial = getMaterial(color)
    water.material = waterMaterial;
    water.visibility = 0.6;
  
    ball.physics.registerBuoyancyInterface(fluid);
  }

  setupBuoyancy(new Vector3(0,3,0), new Vector3(0,0,0), '#000099')
  setupBuoyancy(new Vector3(-6,8,-3), new Vector3(-6,5,-3), '#009900')
  setupBuoyancy(new Vector3(6,3,-3), new Vector3(6,-5,-3), '#990000')
}
