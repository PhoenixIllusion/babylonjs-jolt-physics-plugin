import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from '../util/example';
import { JoltSliderJoint, JoltDistanceJoint, JoltFixedJoint, JoltHingeJoint, JoltPointJoint } from '@phoenixillusion/babylonjs-jolt-plugin/joints';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { CollisionTableFilter } from '@phoenixillusion/babylonjs-jolt-plugin';

export default (_scene: Scene): SceneCallback => {

  const rot = Quaternion.Identity();
  const size = new Vector3(0.5, 0.5, 0.5);

  createFloor({ friction: 0.8, mass: 0, restitution: 0.8 });

  const filter = new CollisionTableFilter(10)
  for (let z = 0; z < 9; ++z)
    filter.disableSubGroupPair([z, z + 1]);

  const len = 9;

  function createBody(pos: Vector3, z: number) {

    pos.z = z;
    const physOptions: PhysicsImpostorParameters = {
      mass: (z == 0) ? 0 : 100,
      friction: 1,
      restitution: 0,
      collision: {
        filter,
        group: 1,
        subGroup: z
      }
    };
    const box = createBox(pos, rot, size, physOptions, '#ff0000')

    // Add an impulse (gravity is really boring, many constraints look the same)
    if (z == len - 1)
      box.physics.applyImpulse(new Vector3(100, 0, 0), pos);

    return box;
  }

  let position = new Vector3(-5, 20, 0);
  {
    let prevBody = null;

    for (let z = 0; z < len; ++z) {
      let box = createBody(position, z);
      box.box.name = 'Point-' + z;

      if (prevBody != null) {
        let point = position.clone();
        point.z = z - 0.5;
        const joint = new JoltFixedJoint(point);
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
      box.box.name = 'Point-' + z;

      if (prevBody != null) {
        let point = position.clone();
        point.z = z - 0.5;
        const joint = new JoltPointJoint(point);
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
      box.box.name = 'Point-' + z;

      if (prevBody != null) {
        let point = position.clone();
        point.z = z - 0.5;
        const joint = new JoltDistanceJoint(point);
        joint.setMinMax(0, 1);
        prevBody.physics.addJoint(box.physics, joint);
      }

      prevBody = box;
    }
  }
  position.x += 4;
  {
    let prevBody = null;
    const hingeAxis = new Vector3(1, 0, 0);
    const normalAxis = new Vector3(0, 1, 0);

    for (let z = 0; z < len; ++z) {
      let box = createBody(position, z);
      box.box.name = 'Point-' + z;

      if (prevBody != null) {
        let point = position.clone();
        point.z = z - 0.5;
        const joint = new JoltHingeJoint(point, hingeAxis, normalAxis);
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
      box.box.name = 'Point-' + z;

      if (prevBody != null) {
        let point = position.clone();
        point.z = z - 0.5;
        const joint = new JoltSliderJoint(point, slideAxis);
        joint.setMinMax(0, 1);
        prevBody.physics.addJoint(box.physics, joint);
      }

      prevBody = box;
    }
  }
}
