import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder, SceneCallback, createBox, createFloor, getMaterial } from '../util/example';
import { Scene } from '@babylonjs/core/scene';

import '@babylonjs/core/Culling/ray';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';

export default (scene: Scene): SceneCallback => {
  createFloor({ friction: 0.8, mass: 0, restitution: 0 });

  let pointGravity: Vector3 | undefined = undefined;

  const boxes: PhysicsImpostor[] = [];
  for (let i = 0; i < 10; i++) {
    // Create physics body
    const position = new Vector3(-10.0 + 2.0 * i, 15, 0);
    const box = createBox(position, Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 10, friction: 0.1 * i, restitution: 0.2 }, '#990099');
    box.physics.setGravityOverride(new Vector3(0, -9.81, 0));
    boxes.push(box.physics)
    position.z -= 2;
    createBox(position, Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 10, friction: 0.1 * i, restitution: 0.2 }, '#ff0000');
  }

  const gravityLeft = MeshBuilder.CreateBox('gravity-left', { size: 1}, scene);
  gravityLeft.material = getMaterial('#ff0000');
  gravityLeft.position.x -= 15;
  gravityLeft.isPickable = true;

  const gravityRight = MeshBuilder.CreateBox('gravity-right', { size: 1}, scene);
  gravityRight.material = getMaterial('#00ff00');
  gravityRight.position.x += 15;
  gravityRight.isPickable = true;

  const gravityCenter = MeshBuilder.CreateBox('gravity-center', { size: 1}, scene);
  gravityCenter.material = getMaterial('#00ffff');
  gravityCenter.position.y += 15;
  gravityCenter.isPickable = true;

  scene.onPointerDown = (_evt, _pickInfo, _type) => {
    if(_pickInfo.pickedMesh == gravityLeft) {
      boxes.forEach(box => box.setGravityOverride(new Vector3(-9.81, 0, 0)));
      pointGravity = undefined;
    }
    if(_pickInfo.pickedMesh == gravityRight) {
      boxes.forEach(box => box.setGravityOverride(new Vector3(9.81, 0, 0)))
      pointGravity = undefined;
    }
    if(_pickInfo.pickedMesh == gravityCenter) {
      pointGravity = gravityCenter.position;
    }
  }

  return (_time: number, _delta: number) => {
    if(pointGravity) {
      boxes.forEach(box => {
        const newGravity = pointGravity!.subtract(box.object.getAbsolutePosition()).normalize().scale(9.81*3);
        box.setGravityOverride(newGravity);
      });
    }
  }
}
