import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";
function tan2CubicBenzier(pointA, tangentOut, tangentIn, pointB, curveResolution) {
    return Curve3.CreateCubicBezier(pointA, pointA.add(tangentOut), pointB.add(tangentIn), pointB, curveResolution);
}
export function createPath3DWithTan2CubicBenzier(points, tangents, normals, curveResolution = 12, normalEasing = EasingMethod.LINEAR) {
    let tanIdx = 1;
    let hermite = tan2CubicBenzier(points[0], tangents[tanIdx++], tangents[tanIdx++], points[1], curveResolution);
    let pathNormals = interpolateNormalsOverCurve(hermite, [normals[0], normals[1]], getEasing(normalEasing)).normals;
    for (let i = 1; i < points.length - 1; i++) {
        const curve = tan2CubicBenzier(points[i], tangents[tanIdx++], tangents[(tanIdx++) % tangents.length], points[i + 1], curveResolution);
        pathNormals.pop();
        pathNormals.push(...interpolateNormalsOverCurve(curve, [normals[i], normals[i + 1]], getEasing(normalEasing)).normals);
        hermite = hermite.continue(curve);
    }
    const path3d = new Path3D(hermite.getPoints(), Vector3.Up(), false, true);
    setPath3DNormals(path3d, pathNormals);
    return path3d;
}
