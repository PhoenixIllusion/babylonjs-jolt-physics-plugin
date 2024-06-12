import { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod, getEasing } from "./easing";
import { interpolateNormalsOverCurve, setPath3DNormals } from "./normals";
export function createPath3DWithCatmullRomPath(points, normals, curveResolution = 12, looped = true, normalEasing = EasingMethod.LINEAR) {
    function calcNormalForPoints(p0, p1, normal) {
        const t = p1.subtract(p0).normalize();
        const b = normal.cross(t).normalize();
        Vector3.CrossToRef(t, b, normal).normalize();
    }
    const catmullRom = Curve3.CreateCatmullRomSpline(points, curveResolution, looped);
    const curvePoints = catmullRom.getPoints();
    const curveNormals = [];
    normals.forEach((normal, i) => {
        if (i < normals.length - 1) {
            calcNormalForPoints(curvePoints[i * curveResolution], curvePoints[i * curveResolution + 1], normal);
        }
    });
    if (looped) {
        normals = [...normals, normals[0]];
    }
    for (let i = 0; i < normals.length - 1; i++) {
        const curve = new Curve3(curvePoints.slice(i * (curveResolution), (i + 1) * curveResolution + 1));
        let path = interpolateNormalsOverCurve(curve, [normals[i], normals[i + 1]], getEasing(normalEasing));
        if (curveNormals.length > 0) {
            const lastN = curveNormals.pop();
            const newN = path.normals.shift();
            Vector3.SlerpToRef(lastN, newN, 0.5, newN);
            path.normals.unshift(newN);
        }
        curveNormals.push(...path.normals);
    }
    const path3d = new Path3D(curvePoints, Vector3.Up(), false, true);
    setPath3DNormals(path3d, curveNormals);
    return path3d;
}
