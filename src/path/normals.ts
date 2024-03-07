import type { IEasingFunction } from "@babylonjs/core/Animations/easing";
import type { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function setPath3DNormals(path: Path3D, normals: Vector3[]) {
  path.getNormals().forEach((norm,i) => {
    const newTan = normals[i];
    norm.copyFrom(newTan);
  });
  recomputeBinormal(path);
}

export function recomputeBinormal(path: Path3D) {
  const normals = path.getNormals();
  const tangents = path.getTangents();
  const binormals = path.getBinormals();
  binormals.forEach((bi, i) => {
    const normal = normals[i].normalize();
    const tangent = tangents[i].normalize();
    Vector3.CrossToRef(tangent, normal, bi).normalize();
  })
}

export function interpolateNormalsOverCurve(curve: Curve3, normals: [Vector3, Vector3], easing: IEasingFunction): {positions: Vector3[], normals: Vector3[]} {
  const length = curve.length();
  const newPositions = curve.getPoints();
  const newNormals: Vector3[] = [];
  let distance = 0;
  for(let i=0; i < newPositions.length - 1; i++){
    const n = Vector3.SlerpToRef(normals[0], normals[1], easing.ease(distance/length), new Vector3())
    const t = newPositions[i+1].subtract(newPositions[i]).normalize();
    const b = n.cross(t).normalize();
    Vector3.CrossToRef(t,b,n).normalize();
    newNormals.push(n);
    distance += Vector3.Distance(newPositions[i], newPositions[i+1]);
  }
  newNormals.push(normals[1]);

  return { positions: newPositions, normals: newNormals };
}
