import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder, SceneCallback, createBox, createFloor, getMaterial } from '../util/example';
import { RayHelper } from '@babylonjs/core/Debug/rayHelper';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';

export default (): SceneCallback => {
  createFloor();

  const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2, segments: 32 });
  sphere.position.set(0, 4, 0);

  const rayOrigin = new TransformNode('ray-origin')
  rayOrigin.parent = sphere;
  const rayDest = new TransformNode('ray-dest');
  rayDest.position.x += 20;
  rayDest.parent = sphere

  const getOrigin = () =>
    rayOrigin.getAbsolutePosition()
  const getDest = () =>
    rayDest.getAbsolutePosition()
  const getDirection = () =>
    getDest().subtract(getOrigin()).normalize()
  const getDistance = () =>
    getDest().subtract(getOrigin()).length()

  var ray1 = new Ray(getOrigin(), getDirection(), getDistance());
  var ray1Helper = new RayHelper(ray1);
  ray1Helper.show(sphere.getScene(), new Color3(1, 0, 1));

  const boxes: { box: Mesh, physics: PhysicsImpostor }[] = []
  for (let x = -30; x < 30; x += 4)
    for (let y = -30; y < 30; y += 4)
      boxes.push(
        createBox(new Vector3(x, 5, y),
          Quaternion.Identity(), new Vector3(0.5, 5, 0.5), { mass: 10, restitution: 0, friction: 1 }, '#ff0000')
      );

  const colorRed = getMaterial('#ff0000');
  const colorBlue = getMaterial('#0000ff');
  const engine = sphere.getScene().getPhysicsEngine()!;
  const yAxis = new Vector3(0, 1, 0);
  return (_time: number, _delta: number) => {
    sphere.rotate(yAxis, (Math.PI / 10000) * _delta)
    ray1.origin.copyFrom(getOrigin())
    ray1.direction.copyFrom(getDirection())
    ray1.length = getDistance();

    const result = engine.raycast(getOrigin(), getDest());
    if (result.hasHit) {
      boxes.forEach(box => {
        if (box.physics.physicsBody == result.body) {
          box.box.material = colorBlue;
        } else {
          if (box.box.material != colorRed) {
            box.box.material = colorRed;
          }
        }
      })
    }
  }
}
