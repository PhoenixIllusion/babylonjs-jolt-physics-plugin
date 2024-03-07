import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";
function calculateCurve(points, normals, curveInset, curveResolution, easing) {
    const p0 = points[0].subtract(points[1]).normalize().scaleInPlace(curveInset);
    const p1 = points[2].subtract(points[1]).normalize().scaleInPlace(curveInset);
    ;
    const curve3 = Curve3.CreateQuadraticBezier(points[1].add(p0), points[1], points[1].add(p1), curveResolution);
    return interpolateNormalsOverCurve(curve3, normals, easing);
}
function createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing) {
    const looping = (points[0].equals(points[points.length - 1]));
    if (looping) {
        points = [...points, points[1]];
    }
    const triples = [];
    for (let i = 0; i < points.length - 2; i++) {
        triples.push({
            p: [points[i], points[i + 1], points[i + 2]],
            n: normals.length > 1 ? [normals[i], normals[(i + 1) % normals.length]] : [normals[0], normals[0]]
        });
    }
    const newPoints = [];
    const newNormals = [];
    if (!looping) {
        newPoints.push(points[0]);
        newNormals.push(normals[0]);
    }
    triples.forEach(triple => {
        const curve = calculateCurve(triple.p, triple.n, curveInset, curveResolution, getEasing(normalEasing));
        newPoints.push(...curve.positions);
        newNormals.push(...curve.normals);
    });
    if (!looping) {
        newPoints.push(points[points.length - 1]);
        newNormals.push(normals[normals.length - 1]);
    }
    else {
        newPoints.unshift(newPoints[newPoints.length - 1]);
        newNormals.unshift(newNormals[newNormals.length - 1]);
    }
    return { positions: newPoints, normals: newNormals };
}
export function createPath3DWithCurvedCorners(points, normals, curveInset, curveResolution, normalEasing = EasingMethod.LINEAR) {
    const curve = createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing);
    const path3d = new Path3D(curve.positions, normals[0], false, true);
    setPath3DNormals(path3d, curve.normals);
    return path3d;
}
