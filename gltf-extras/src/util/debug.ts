import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Path3D } from "@babylonjs/core/Maths/math.path";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import '@babylonjs/core/Meshes/thinInstanceMesh';


import { CreateLines } from '@babylonjs/core/Meshes/Builders/linesBuilder';
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";

export const MeshBuilder = {
  CreateSphere,
  CreateLines
}

export function showPath3D(path3d: Path3D, size?: number, connectNormals = false) {
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