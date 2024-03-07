import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";
import { IEasingFunction } from "@babylonjs/core/Animations/easing";

function calculateCurve(points: [Vector3,Vector3,Vector3], normals: [Vector3, Vector3], curveInset: number, curveResolution: number, easing: IEasingFunction ): {positions: Vector3[], normals: Vector3[]} {
  const p0 = points[0].subtract(points[1]).normalize().scaleInPlace(curveInset);
  const p1 = points[2].subtract(points[1]).normalize().scaleInPlace(curveInset);;
  const curve3 = Curve3.CreateQuadraticBezier(points[1].add(p0), points[1], points[1].add(p1), curveResolution);
  return interpolateNormalsOverCurve(curve3, normals, easing);
}

function createCurvedCorners(points: Vector3[],  normals: Vector3[], curveInset: number, curveResolution: number, normalEasing: EasingMethod): {positions: Vector3[], normals: Vector3[]} {
  const looping = (points[0].equals(points[points.length - 1]))
  if(looping) {
    points = [... points, points[1]];
  }
  const triples: {p: [Vector3,Vector3,Vector3], n: [Vector3,Vector3]}[] = [];
  for(let i=0;i<points.length-2;i++) {
    triples.push({
      p: [points[i],points[i+1],points[i+2]],
      n: normals.length > 1 ? [normals[i], normals[(i+1) % normals.length]]: [normals[0],normals[0]]
    });
  }
  const newPoints: Vector3[] = [];
  const newNormals: Vector3[] = [];
  if(!looping) {
    newPoints.push(points[0]);
    newNormals.push(normals[0]);
  }
  triples.forEach(triple => {
    const curve = calculateCurve(triple.p, triple.n, curveInset, curveResolution, getEasing(normalEasing));
    newPoints.push(... curve.positions);
    newNormals.push(... curve.normals);
  });
  if(!looping) {
    newPoints.push(points[points.length-1]);
    newNormals.push(normals[normals.length-1]);
  } else {
    newPoints.unshift(newPoints[newPoints.length-1]);
    newNormals.unshift(newNormals[newNormals.length-1]);
  }
  return { positions: newPoints, normals: newNormals };
}


export function createPath3DWithCurvedCorners(points: Vector3[],  normals: Vector3[], curveInset: number, curveResolution: number, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  const curve = createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing);
  const path3d = new Path3D(curve.positions, normals[0], false, true);
  setPath3DNormals(path3d, curve.normals);
  return path3d;
}
