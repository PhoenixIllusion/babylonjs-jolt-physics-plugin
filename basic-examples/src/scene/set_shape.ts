import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, SceneCallback, createFloor, createMeshForShape } from '../util/example';
import Jolt from '@phoenixillusion/babylonjs-jolt-plugin/import';
import { JoltDistanceJoint, } from '@phoenixillusion/babylonjs-jolt-plugin/joints';
import { PhysicsImpostorParameters } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { Scene } from '@babylonjs/core/scene';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1';
import { MinimalPhysicsNode } from '@phoenixillusion/babylonjs-jolt-plugin/impostor';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Culling/ray';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';

export default (scene: Scene): SceneCallback => {

  const filter = new Jolt.GroupFilterTable(10);

  createFloor({ friction: 0.8, mass: 0, restitution: 0.8 });

  for (let z = 0; z < 9; ++z)
    filter.DisableCollision(z, z + 1);

  const len = 9;

  const boxMesh = MeshBuilder.CreateBox('box');
  const sphereMesh = MeshBuilder.CreateSphere('sphere');
  const cylinderMesh = MeshBuilder.CreateCylinder('cylinder');
  boxMesh.isVisible = sphereMesh.isVisible = cylinderMesh.isVisible = false;


  function createBody(pos: Vector3, z: number) {
    pos.z = z;
    const physOptions: PhysicsImpostorParameters = {
      mass: (z == 0) ? 0 : 100,
      friction: 1,
      restitution: 0,
      collision: {
        filter: filter,
        group: 1,
        subGroup: z
      }
    };
    const node = new MinimalPhysicsNode('box', new Vector3(0.5, 0.5, 0.5), boxMesh);
    node.position.copyFrom(pos);
    const physics = new PhysicsImpostor(node, PhysicsImpostor.BoxImpostor, physOptions, scene);
    const mesh: InstancedMesh[] = [];
    mesh.push(boxMesh.createInstance('box-'+z));
    mesh.push(sphereMesh.createInstance('sphere-'+z));
    mesh.push(cylinderMesh.createInstance('cylinder-'+z));
    mesh.forEach((iM,i) => {
      iM.isVisible = i == 0;
      iM.isPickable = true;
      iM.parent = node
    })
    const debug = createMeshForShape(physics, Color3.FromHexString('#00FF00'));
    debug.parent = node;
    debug.position.x -= 3;
    const box = {
      physics,
      mesh,
      debug
    }
    // Add an impulse (gravity is really boring, many constraints look the same)
    if (z == len - 1)
      box.physics.applyImpulse(new Vector3(100, 0, 0), pos);

    return box;
  }

  let position = new Vector3(0, 20, 0);
  const boxes: { mesh: InstancedMesh[]; physics: PhysicsImpostor; debug: Mesh}[] = [];
  {
    let prevBody = null;

    for (let z = 0; z < len; ++z) {
      let box = createBody(position, z);
      boxes.push(box);

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

  scene.onPointerDown = (_evt, _pickInfo, _type) => {
    const boxClicked = boxes.find(({mesh}) => mesh.find(m => m == _pickInfo.pickedMesh));
    if(boxClicked) {
      const mesh = boxClicked.mesh;
      const newIndex = (mesh.findIndex((x: InstancedMesh) => x.isVisible) + 1) % mesh.length;
      mesh.forEach((x,i) => x.isVisible = i == newIndex);
      let type = PhysicsImpostor.BoxImpostor;
      switch(newIndex) {
        case 0: // box;
          break;
        case 1: // sphere
          type = PhysicsImpostor.SphereImpostor;
          break;
        case 2: // cylinder
          type = PhysicsImpostor.CylinderImpostor;
          break;
      }
      boxClicked.physics.setShape(type, {mass: 0});
      boxClicked.debug.dispose();

      const debug = createMeshForShape(boxClicked.physics, Color3.FromHexString('#00FF00'));
      debug.parent = mesh[0].parent;
      debug.position.x -= 3;
      boxClicked.debug = debug;
    }
  }
}
