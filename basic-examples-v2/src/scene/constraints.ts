
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from './example';

import Jolt from '@phoenixillusion/babylonjs-jolt-plugin/import'
import { PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsConstraint } from '@babylonjs/core/Physics/v2/physicsConstraint';
import { PhysicsConstraintType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';

export default (scene: Scene): SceneCallback => {

  const rot = Quaternion.Identity();
  const size = new Vector3(0.5, 0.5, 0.5);
  const filter = new Jolt.GroupFilterTable(10);
  
  createFloor({ friction: 0.8, mass: 0, restitution: 0.8 });

  for (let z = 0; z < 9; ++z)
    filter.DisableCollision(z, z + 1);


    const len = 9;

    function createBody(pos: Vector3, z: number) {

      pos.z = z;
      const physOptions = {
        mass: (z==0)?0: 100,
        friction: 1,
        restitution: 0,
        'collision-filter': filter,
        'collision-group': 1,
        'collision-sub-group': z
      };
      const box = createBox(pos, rot, size, physOptions, '#ff0000')

      // Add an impulse (gravity is really boring, many constraints look the same)
      if (z == len-1)
        box.physics.body.applyImpulse(new Vector3(100, 0, 0), pos);

      return box;
    }

    let position = new Vector3(-5, 20, 0);
    {
      let prevBody = null;

      for (let z = 0; z < len; ++z) {
        let box = createBody(position, z);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = z - 0.5;
          const joint = new PhysicsConstraint(PhysicsConstraintType.LOCK, { pivotA: point, pivotB: point }, scene );
          prevBody.physics.body.addConstraint(box.physics.body, joint);
        }

        prevBody = box;
      }
    }
    position.x += 4;
    {
      let prevBody = null;

      for (let z = 0; z < len; ++z) {
        const pZ = z * 1.2;
        let box = createBody(position, pZ);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = pZ - 0.6;
          const joint = new PhysicsConstraint(PhysicsConstraintType.BALL_AND_SOCKET, { pivotA: point, pivotB: point }, scene );
          prevBody.physics.body.addConstraint(box.physics.body, joint);
        }

        prevBody = box;
      }
    }
    position.x += 4;
    {
      let prevBody = null;

      for (let z = 0; z < len; ++z) {
        let box = createBody(position, z);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = z - 0.5;
          const joint = new PhysicsConstraint(PhysicsConstraintType.DISTANCE, { pivotA: point, pivotB: point, maxDistance: 1 }, scene );
          prevBody.physics.body.addConstraint(box.physics.body, joint);
        }

        prevBody = box;
      }
    }
    position.x += 4;
    {
      let prevBody = null;
      const hingeAxis = new Vector3(1,0,0);
      const perpAxis = new Vector3(0,1,0);

      for (let z = 0; z < len; ++z) {
        const pZ = z * 1.2;
        let box = createBody(position, pZ);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = pZ - 0.6;
          const joint = new PhysicsConstraint(PhysicsConstraintType.HINGE, {
            pivotA: point, pivotB: point,
            axisA: hingeAxis, axisB: hingeAxis,
            perpAxisA: perpAxis, perpAxisB: perpAxis
          }, scene );
          prevBody.physics.body.addConstraint(box.physics.body, joint);
        }

        prevBody = box;
      }
    }
    position.x += 4;
    {
      let prevBody = null;

      const slideAxis = new Vector3(0, -1, 1).normalize();
      const normalAxis = new Vector3();
      slideAxis.getNormalToRef(normalAxis);

      for (let z = 0; z < len; ++z) {
        let box = createBody(position, z);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = z - 0.5;
          const joint = new PhysicsConstraint(PhysicsConstraintType.PRISMATIC, {
            pivotA: point, pivotB: point,
            axisA: slideAxis, axisB: slideAxis,
            perpAxisA: normalAxis, perpAxisB: normalAxis,
            maxDistance: 1 }, scene );
          prevBody.physics.body.addConstraint(box.physics.body, joint);
        }

        prevBody = box;
      }
    }
}