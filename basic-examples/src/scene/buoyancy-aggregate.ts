import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, SceneCallback, createFloor, createSphere, getMaterial } from '../util/example';
import { Scene } from '@babylonjs/core/scene';
import { BuoyancyAggregate, BuoyancyPlane } from '@phoenixillusion/babylonjs-jolt-plugin/buoyancy';


export default (scene: Scene): SceneCallback => {

  const buoyancyAggregate = new BuoyancyAggregate();
  function setupBuoyancy(waterPosition: Vector3, color: string) {
    const fluid = BuoyancyPlane.FromPosition(waterPosition);
  
    const water = MeshBuilder.CreateBox('water', { width: 5, height: 3, depth: 5 }, scene);
    water.position.copyFrom(waterPosition);
    water.position.y -= 1.5;
    const waterMaterial = getMaterial(color)
    water.material = waterMaterial;
    water.visibility = 0.6;
  
    water.computeWorldMatrix(true);
    water.refreshBoundingInfo();
    buoyancyAggregate.addRegion(water.getBoundingInfo(), fluid);
  }

  createFloor();

  setupBuoyancy(new Vector3(0,4,0), '#000099')
  setupBuoyancy(new Vector3(-6,8,-3), '#009900')
  setupBuoyancy(new Vector3(6,6,-3), '#990000')



  const x = 3;
  const z = 0;
  for(let x = -8; x <= 8; x+=1)
  for(let z = -8; z <= 8; z+=1)
  {
    const ball = createSphere(new Vector3(x, 10, z), 0.5, { mass: 1});
    ball.physics.registerBuoyancyInterface(buoyancyAggregate);
  }
}
