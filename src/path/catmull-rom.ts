import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";

export function createPath3DWithCatmullRomPath(points: Vector3[], normals: Vector3[], curveResolution: number = 12, looped = true, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  function calcNormalForPoints(p0: Vector3, p1: Vector3, normal: Vector3): void {
    const t = p1.subtract(p0).normalize();
    const b = normal.cross(t).normalize();
    Vector3.CrossToRef(t,b,normal).normalize();
  }
  const catmullRom: Curve3 = Curve3.CreateCatmullRomSpline(points, curveResolution, true);
  const curvePoints = catmullRom.getPoints();
  const curveNormals: Vector3[] = [];
  normals.forEach((normal, i) => {
    if(i < normals.length - 1) {
      calcNormalForPoints(curvePoints[i * curveResolution], curvePoints[i * curveResolution + 1], normal);
    }
  })
  if(looped) {
    normals = [... normals, normals[0]];
  }
  for(let i=0;i<normals.length - 1; i++) {
    const curve = new Curve3(curvePoints.slice(i * (curveResolution), (i+1)*curveResolution+1));
    let path = interpolateNormalsOverCurve(curve, [normals[i],normals[i+1]], getEasing(normalEasing));
    if(curveNormals.length > 0) {
      const lastN = curveNormals.pop()!;
      const newN = path.normals.shift()!;
      Vector3.SlerpToRef(lastN, newN, 0.5, newN);
      path.normals.unshift(newN);
    }
    curveNormals.push(... path.normals);
  }
  const path3d = new Path3D(curvePoints, Vector3.Up(), false, true);
  setPath3DNormals(path3d, curveNormals);
  return path3d;
}
