import { Vector3 } from '@babylonjs/core';
import { SceneCallback, createBox, createCapsule, createConvexHull, createCylinder, createMeshFloor, createSphere, getRandomQuat } from './example';

export default (): SceneCallback => {

    const objectTimePeriod = 0.5;
    let timeNextSpawn = objectTimePeriod;
    const maxNumObjects = 100;

    //createFloor();
    createMeshFloor(25, 2, 3, new Vector3(0,-2,0));

    let meshesCreated = 0;
    const generateObject = () => {
      let numTypes = 6;
      let objectType = Math.ceil(Math.random() * numTypes);

      let colors = ['#ff0000', '#d9b1a3', '#4d4139', '#ccad33', '#f2ff40', '#00ff00', '#165943', '#567371', '#80d5ff', '#69778c',
         '#beb6f2', '#7159b3', '#73004d', '#d90074', '#ff8091', '#bf3030', '#592400', '#a66c29', '#b3aa86', '#296600', '#00e600',
          '#66ccaa', '#00eeff', '#3d9df2', '#000e33', '#3d00e6', '#b300a7', '#ff80d5', '#330d17', '#59332d', '#ff8c40', '#33210d',
           '#403c00', '#89d96c', '#0d3312', '#0d3330', '#005c73', '#0066ff', '#334166', '#1b0066', '#4d3949', '#bf8faf', '#59000c']

      let pos = new Vector3((Math.random() - 0.5) * 25, 15, (Math.random() - 0.5) * 25);
      let rot = getRandomQuat();
      const physicSetting = { mass: 1, restitution: 0.5, friction: 0};
      switch (objectType) {
        case 1: {
          // Sphere
          let radius = 0.5 + Math.random();
          createSphere(pos, radius, physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }
        case 2: {
          // Box
          let sx = 1 + Math.random();
          let sy = 1 + Math.random();
          let sz = 1 + Math.random();
          createBox(pos, rot, new Vector3(sx * 0.5, sy * 0.5, sz * 0.5), physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }
        case 3: {
          // Cylinder
          let radius = 0.5 + Math.random();
          let halfHeight = 0.5 + 0.5 * Math.random();
          createCylinder(pos, radius, halfHeight * 2, physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }
        case 4: {
          // Capsule
          let radius = 0.5 + Math.random();
          let halfHeight = 0.5 + 0.5 * Math.random();
          createCapsule(pos, radius, radius, halfHeight * 2, physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }/*
        case 5:{
          // Tapered capsule
          let topRadius = 0.1 + Math.random()/2;
          let bottomRadius = 0.5 + Math.random()/2;
          let halfHeight = 0.5 * (topRadius + bottomRadius + Math.random());
          createCapsule(pos, topRadius, bottomRadius, halfHeight * 2, physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }*/
        case 6:{
          // Convex hull
          const points = [];
          for (let p = 0; p < 10; ++p)
            points.push(new Vector3(-0.5 + 2 * Math.random(), -0.5 + 2 * Math.random(), -0.5 + 2 * Math.random()));
							
          createConvexHull(pos, points, physicSetting, colors[objectType - 1]);
          meshesCreated++;
          break;
        }
      }
    }
    return (time: number, _deltaTime: number) => {
      if (meshesCreated < maxNumObjects && time > timeNextSpawn) {
        generateObject();
        timeNextSpawn = time + objectTimePeriod;
      }
    }
}