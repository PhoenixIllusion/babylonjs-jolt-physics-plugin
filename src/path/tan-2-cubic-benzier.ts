import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";

function tan2CubicBenzier(pointA: Vector3, tangentOut: Vector3, tangentIn: Vector3, pointB: Vector3, curveResolution: number): Curve3 {
  return Curve3.CreateCubicBezier(pointA, pointA.add(tangentOut), pointB.add(tangentIn), pointB, curveResolution);
}

export function createPath3DWithTan2CubicBenzier(points: Vector3[], tangents: Vector3[], normals: Vector3[], curveResolution: number = 12, normalEasing: EasingMethod = EasingMethod.LINEAR): Path3D {
  let tanIdx = 1;
  let hermite: Curve3 = tan2CubicBenzier(points[0], tangents[tanIdx++], tangents[tanIdx++], points[1], curveResolution);
  let pathNormals = interpolateNormalsOverCurve(hermite, [normals[0], normals[1]], getEasing(normalEasing)).normals;
  for (let i = 1; i < points.length - 1; i++) {
    const curve = tan2CubicBenzier(points[i], tangents[tanIdx++], tangents[(tanIdx++) % tangents.length], points[i + 1], curveResolution);
    pathNormals.pop();
    pathNormals.push(...interpolateNormalsOverCurve(curve, [normals[i], normals[i + 1]], getEasing(normalEasing)).normals)
    hermite = hermite.continue(curve);
  }
  const path3d = new Path3D(hermite.getPoints(), Vector3.Up(), false, true);
  setPath3DNormals(path3d, pathNormals);
  return path3d;
}
