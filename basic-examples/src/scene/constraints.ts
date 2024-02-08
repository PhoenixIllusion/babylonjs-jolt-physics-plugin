
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from './example';

import Jolt from '@phoenixillusion/babylonjs-jolt-plugin/import'
import { PhysicsJoint } from '@babylonjs/core/Physics/v1/physicsJoint';

export default (): SceneCallback => {

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
        box.physics.applyImpulse(new Vector3(100, 0, 0), pos);

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
          const jointConfig = {
            mainPivot: point,
            connectedPivot: point
          };
          const joint = new PhysicsJoint(PhysicsJoint.LockJoint, jointConfig);
          prevBody.physics.addJoint(box.physics, joint);
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
          const jointConfig = {
            mainPivot: point,
            connectedPivot: point
          };
          const joint = new PhysicsJoint(PhysicsJoint.PointToPointJoint, jointConfig);
          prevBody.physics.addJoint(box.physics, joint);
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
          const jointConfig = {
            mainPivot: point,
            connectedPivot: point,
            nativeParams: {
              'min-distance': 0,
              'max-distance': 1,
            }
          };
          const joint = new PhysicsJoint(PhysicsJoint.DistanceJoint, jointConfig);
          prevBody.physics.addJoint(box.physics, joint);
        }

        prevBody = box;
      }
    }
    position.x += 4;
    {
      let prevBody = null;
      const hingeAxis = new Vector3(1,0,0);

      for (let z = 0; z < len; ++z) {
        let box = createBody(position, z);
        box.box.name = 'Point-'+z;

        if (prevBody != null) {
          let point = position.clone();
          point.z = z - 0.5;
          const jointConfig = {
            mainPivot: point,
            connectedPivot: point,
            mainAxis: hingeAxis,
            connectedAxis: hingeAxis,
            nativeParams: {
              'normal-axis-1': new Vector3(0,1,0),
              'normal-axis-2': new Vector3(0,1,0),
            }
          };
          const joint = new PhysicsJoint(PhysicsJoint.HingeJoint, jointConfig);
          prevBody.physics.addJoint(box.physics, joint);
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
          const jointConfig = {
            mainPivot: point,
            connectedPivot: point,
            mainAxis: slideAxis,
            connectedAxis:  slideAxis,
            nativeParams: {
              'normal-axis-1': normalAxis,
              'normal-axis-2': normalAxis,
              'min-limit': 0,
              'max-limit': 1,
            }
          };
          const joint = new PhysicsJoint(PhysicsJoint.PrismaticJoint, jointConfig);
          prevBody.physics.addJoint(box.physics, joint);
        }

        prevBody = box;
      }
    }
}