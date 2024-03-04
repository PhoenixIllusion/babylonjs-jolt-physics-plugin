import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder, SceneCallback, createBox } from "../util/example";
import { JoltPathConstraint, MotorMode } from "../../../dist";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Path3D } from "@babylonjs/core/Maths/math.path";

function showPath3D(path3d: Path3D, size?: number) {
  size = size || 0.5;
  const curve = path3d.getCurve();
  const tgts = path3d.getTangents();
  const norms = path3d.getNormals();
  const binorms = path3d.getBinormals();
  let vcTgt, vcNorm, vcBinorm;
  const line = MeshBuilder.CreateLines("curve", { points: curve });
  for (let i = 0; i < curve.length; i++) {
    vcTgt = MeshBuilder.CreateLines("tgt" + i, { points: [curve[i], curve[i].add(tgts[i].scale(size))] });
    vcNorm = MeshBuilder.CreateLines("norm" + i, { points: [curve[i], curve[i].add(norms[i].scale(size))] });
    vcBinorm = MeshBuilder.CreateLines("binorm" + i, { points: [curve[i], curve[i].add(binorms[i].scale(size))] });
    vcTgt.color = Color3.Red();
    vcNorm.color = Color3.Green();
    vcBinorm.color = Color3.Blue();
  }
  return line;
}

export default (): SceneCallback => {
  const box1 = createBox(new Vector3(0,0,0), Quaternion.Identity(), new Vector3(.1,.1,.1), {mass : 0});
  const box2 = createBox(new Vector3(0,0,3.5), Quaternion.Identity(), new Vector3(1,0.2,1), {mass : 1});

  const points = [new Vector3(-2,0,3), new Vector3(2,0,3), new Vector3(2,0,-3), new Vector3(-2,0,-3), new Vector3(-2,0,3),new Vector3(2,0,3),];
  const path3d = new Path3D(points, new Vector3(0,1,0), false, true);
  {
    path3d.getPoints().pop();
    path3d.getNormals().pop();
    path3d.getBinormals().pop();
    path3d.getDistances().pop();
  }

  const pathConstraint = new JoltPathConstraint(path3d, 'ConstrainToPath');
  //pathConstraint.setPathNormals([new Vector3(0,1,0), new Vector3(0,1,0), new Vector3(0,1,0), new Vector3(0,1,0), new Vector3(0,1,0)])
  //pathConstraint.setPathTangents([new Vector3(1,0,0), new Vector3(0,0,-1), new Vector3(-1,0,0), new Vector3(0,0,1), new Vector3(1,0,0)])
  pathConstraint.setPathFraction(2);
  box1.physics.addJoint(box2.physics, pathConstraint);
  showPath3D(pathConstraint.jointData.nativeParams.constraint.pathObject!.path);
  pathConstraint.motor.mode = MotorMode.Velocity;
  pathConstraint.motor.target = -0.5;
}