import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export function setPath3DNormals(path, normals) {
    path.getNormals().forEach((norm, i) => {
        const newTan = normals[i];
        norm.copyFrom(newTan);
    });
    recomputeBinormal(path);
}
export function recomputeBinormal(path) {
    const normals = path.getNormals();
    const tangents = path.getTangents();
    const binormals = path.getBinormals();
    binormals.forEach((bi, i) => {
        const normal = normals[i].normalize();
        const tangent = tangents[i].normalize();
        Vector3.CrossToRef(tangent, normal, bi).normalize();
    });
}
export function interpolateNormalsOverCurve(curve, normals, easing) {
    const length = curve.length();
    const newPositions = curve.getPoints();
    const newNormals = [];
    let distance = 0;
    for (let i = 0; i < newPositions.length - 1; i++) {
        const n = Vector3.SlerpToRef(normals[0], normals[1], easing.ease(distance / length), new Vector3());
        const t = newPositions[i + 1].subtract(newPositions[i]).normalize();
        const b = n.cross(t).normalize();
        Vector3.CrossToRef(t, b, n).normalize();
        newNormals.push(n);
        distance += Vector3.Distance(newPositions[i], newPositions[i + 1]);
    }
    newNormals.push(normals[1]);
    return { positions: newPositions, normals: newNormals };
}
