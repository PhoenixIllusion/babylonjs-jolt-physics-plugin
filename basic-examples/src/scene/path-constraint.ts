import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder, SceneCallback, createBox } from "../util/example";
import { JoltPathConstraint, MotorMode } from "@phoenixillusion/babylonjs-jolt-plugin/joints";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import { FlyCamera } from "@babylonjs/core/Cameras/flyCamera";
import { EasingMethod, createPath3DWithCatmullRomPath, createPath3DWithCurvedCorners, createPath3DWithHermitePath } from "@phoenixillusion/babylonjs-jolt-plugin/path";
import { Matrix } from "@babylonjs/core/Maths/math";
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Scene } from '@babylonjs/core/scene';

function showPath3D(path3d: Path3D, size?: number, connectNormals = false) {
  size = size || 0.5;
  const curve = path3d.getCurve();
  const tgts = path3d.getTangents();
  const norms = path3d.getNormals();
  const binorms = path3d.getBinormals();
  const normals: Vector3[] = [];
  const binormals: Vector3[] = [];

  const vcTgt = MeshBuilder.CreateLines("tgt", { points: [Vector3.Zero(), Vector3.Right().scaleInPlace(size)] });
  const vcNorm = MeshBuilder.CreateLines("norm", { points: [Vector3.Zero(), Vector3.Up().scaleInPlace(size)] });
  const vcBinorm = MeshBuilder.CreateLines("binorm", { points: [Vector3.Zero(), Vector3.Forward().scaleInPlace(size)] });
  vcTgt.color = Color3.Red();
  vcNorm.color = Color3.Green();
  vcBinorm.color = Color3.Blue();

  const vcTgt2 = MeshBuilder.CreateLines("tgt", { points: [Vector3.Zero(), Vector3.Right().scaleInPlace(size)] });
  const vcNorm2 = MeshBuilder.CreateLines("norm", { points: [Vector3.Zero(), Vector3.Up().scaleInPlace(size)] });
  const vcBinorm2 = MeshBuilder.CreateLines("binorm", { points: [Vector3.Zero(), Vector3.Forward().scaleInPlace(size)] });
  vcTgt2.color = Color3.FromHexString('#FF9999');
  vcNorm2.color = Color3.FromHexString('#99FF99');
  vcBinorm2.color = Color3.FromHexString('#9999FF');
  

  const line = MeshBuilder.CreateLines("curve", { points: curve });
  for (let i = 0; i < curve.length; i++) {
    const mat = Matrix.FromXYZAxesToRef(tgts[i], norms[i], binorms[i], new Matrix());
    mat.setTranslation(curve[i]);
    vcTgt2.thinInstanceAdd(mat);
    vcNorm2.thinInstanceAdd(mat);
    vcBinorm2.thinInstanceAdd(mat);
    normals.push(curve[i].add(norms[i].scale(size)));
    binormals.push(curve[i].add(binorms[i].scale(size)));
    if(i == 0) {
      const s = MeshBuilder.CreateSphere('start',{diameter: 0.05});
      s.position.copyFrom(curve[i].add(norms[i]));
    }
  }
  const len = path3d.length();
  for(let i=0; i< path3d.length(); i+= 0.05) {
    const tan = path3d.getTangentAt(i/len, true)
    const norm = path3d.getNormalAt(i/len, true);
    const binorm = path3d.getBinormalAt(i/len, true);
    const mat = Matrix.FromXYZAxesToRef(tan, norm, Vector3.CrossToRef(tan, norm, binorm), new Matrix());
    mat.setTranslation(path3d.getPointAt(i/len));
    vcTgt.thinInstanceAdd(mat);
    vcNorm.thinInstanceAdd(mat);
    vcBinorm.thinInstanceAdd(mat);
  }
  vcTgt.thinInstanceBufferUpdated('matrix');
  vcNorm.thinInstanceBufferUpdated('matrix');
  vcBinorm.thinInstanceBufferUpdated('matrix');
  if(connectNormals) {
    const normRibbon = MeshBuilder.CreateLines('normal-ribbon', { points: normals });
    normRibbon.color = Color3.FromHexString('#99FF99');
    normRibbon.freezeWorldMatrix()
    const binormRibbon = MeshBuilder.CreateLines('binormal-ribbon', { points: binormals });
    binormRibbon.color = Color3.FromHexString('#9999FF');
    binormRibbon.edgesWidth = 2;
    binormRibbon.freezeWorldMatrix();
  }
  return line;
}

export default (scene: Scene): SceneCallback => {
  const camera = scene.cameras[0] as FlyCamera;
  camera.speed *= 0.1;
  camera.position.set(-2, 4, 7);
  camera.target = new Vector3(1,0, 0)

  const box1 = createBox(new Vector3(0,0,0), Quaternion.Identity(), new Vector3(.1,.1,.1), {mass : 0});

  const points = [new Vector3(-2,0,3), new Vector3(2,0,3), new Vector3(2,0,-3), new Vector3(-2,0,-3), new Vector3(-2,0,3)];
  const normals = [new Vector3(0,1,0), new Vector3(1,0,0), new Vector3(0,-1,0), new Vector3(-1,0,0)];
  const path3d = createPath3DWithCurvedCorners(points, normals, .25, 12, EasingMethod.SINE);

  showPath3D(path3d, 0.5, true);


  const hermitePoints = [new Vector3(0,4,0), new Vector3(2,4,-3), new Vector3(4, 4, -5), new Vector3(6, 4, -1)];
  const hermiteTangents = [new Vector3(1,0,0), new Vector3(0,10,0), new Vector3(5,0,0), new Vector3(0,-10,0)];
  const hermiteNormals = [new Vector3(0,-1,0), new Vector3(1,0,0), new Vector3(0,0,-1), new Vector3(0,0,-1)];

  hermitePoints.forEach(pt => {
    const s = MeshBuilder.CreateSphere('pt', { diameter: 0.125});
    s.position.copyFrom(pt);
  })
  const hermitePath = createPath3DWithHermitePath(hermitePoints, hermiteTangents, hermiteNormals, 32, EasingMethod.EXPONENTIAL);

  showPath3D(hermitePath, 0.5, true);


  const catmullRomPoints = [new Vector3(2,2.5,0), new Vector3(4,2,-3), new Vector3(6, 2, -5), new Vector3(8, 2, -1)];
  const catmullRomNormals = [new Vector3(1,0,0), new Vector3(0,-1,0), new Vector3(0, 0, -1), new Vector3(0, -1, 0)];
  catmullRomPoints.forEach(pt => {
    const s = MeshBuilder.CreateSphere('pt', { diameter: 0.125});
    s.position.copyFrom(pt);
  })
  const catmullRomPath = createPath3DWithCatmullRomPath(catmullRomPoints, catmullRomNormals, 80, true, EasingMethod.QUINTIC);
  showPath3D(catmullRomPath, 0.5, true);


  const path = path3d;
  const startPoint = 0;
  const box2 = createBox(path.getPointAt(startPoint/path.length()), Quaternion.RotationAxis(Vector3.Up(),Math.PI/2), new Vector3(.1,0.05,.5), {mass : 1});
  const indicator = MeshBuilder.CreateBox('indicator', {width: 0.2, height: 0.4, depth: 0.1})
  indicator.parent = box2.box;
  indicator.position.z = 0.5;
  
  const pathConstraint = new JoltPathConstraint(path, 'ConstrainToPath');
  pathConstraint.setPathFraction(startPoint);
  box1.physics.addJoint(box2.physics, pathConstraint);
  pathConstraint.motor.mode = MotorMode.Velocity;
  pathConstraint.motor.target = 0.4;
}
