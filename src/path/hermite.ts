import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";

export function createPath3DWithHermitePath(points: Vector3[], tangents: Vector3[], normals: Vector3[], curveResolution: number = 12, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  let hermite: Curve3 = Curve3.CreateHermiteSpline(points[0], tangents[0], points[1], tangents[1], curveResolution);
  let pathNormals = interpolateNormalsOverCurve(hermite, [normals[0],normals[1]], getEasing(normalEasing)).normals;
  for(let i=1;i<points.length -1; i++) {
    const curve = Curve3.CreateHermiteSpline(points[i], tangents[i], points[i+1], tangents[i+1], curveResolution);
    pathNormals.pop();
    pathNormals.push(... interpolateNormalsOverCurve(curve, [normals[i], normals[i+1]], getEasing(normalEasing)).normals)
    hermite = hermite.continue(curve);
   }
  const path3d = new Path3D(hermite.getPoints(), Vector3.Up(), false, true);
  setPath3DNormals(path3d, pathNormals);
  return path3d;
}
