import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { Curve3, Path3D } from '@babylonjs/core/Maths/math.path';
import { TmpVectors } from '@babylonjs/core/Maths/math.vector';
import { BackEase, BounceEase, CircleEase, CubicEase, EasingFunction, ElasticEase, ExponentialEase, QuadraticEase, QuarticEase, QuinticEase, SineEase } from '@babylonjs/core/Animations/easing';
import { GetJoltVec3, SetJoltVec3 } from './jolt-util';
export class JoltConstraintPath {
    constructor(path) {
        this.path = path;
        this.looping = true;
        this.length = 0;
        this.length = path.length();
        const points = path.getPoints();
        this.looping = points[0].equals(points[points.length - 1]);
        this.ptr = new Jolt.PathConstraintPathJS();
        this.ptr.GetClosestPoint = this.getClosestPoint.bind(this);
        this.ptr.GetPathMaxFraction = this.getPathMaxFraction.bind(this);
        this.ptr.GetPointOnPath = this.getPointOnPath.bind(this);
    }
    getPtr() {
        return this.ptr;
    }
    getClosestPoint(vecPtr, fractionHint, delta = 2) {
        const jVec3 = Jolt.wrapPointer(vecPtr, Jolt.Vec3);
        GetJoltVec3(jVec3, TmpVectors.Vector3[0]);
        let prevPathFrac = fractionHint - delta;
        let nextPathFrac = fractionHint + delta;
        if (this.looping) {
            if (nextPathFrac > this.length) {
                nextPathFrac -= this.length;
                prevPathFrac -= this.length;
            }
        }
        else {
            nextPathFrac = Math.min(this.length, nextPathFrac);
            prevPathFrac = Math.max(0, prevPathFrac);
        }
        if (prevPathFrac >= 0) {
            return this.getClosestPositionTo(TmpVectors.Vector3[0], prevPathFrac, nextPathFrac).closestPosition;
        }
        else {
            const pathA = this.getClosestPositionTo(TmpVectors.Vector3[0], 0, nextPathFrac);
            const pathB = this.getClosestPositionTo(TmpVectors.Vector3[0], prevPathFrac + this.length, this.length);
            const position = pathA.smallestDistance < pathB.smallestDistance ? pathA.closestPosition : pathB.closestPosition;
            return position;
        }
    }
    getClosestPositionTo(target, min, max) {
        let smallestDistance = Number.MAX_VALUE;
        let closestPosition = 0.0;
        const curve = this.path.getPoints();
        const distances = this.path.getDistances();
        let startIndex = this.path.getPreviousPointIndexAt(min / this.length);
        const endIndex = this.path.getPreviousPointIndexAt(max / this.length) + 1;
        for (let i = startIndex; i < endIndex && i < curve.length - 1; i++) {
            const point = curve[i + 0];
            const tangent = curve[i + 1].subtract(point).normalize();
            const subLength = distances[i + 1] - distances[i + 0];
            const subPosition = Math.min((Math.max(Vector3.Dot(tangent, target.subtract(point).normalize()), 0.0) * Vector3.Distance(point, target)) / subLength, 1.0);
            const distance = Vector3.Distance(point.add(tangent.scale(subPosition * subLength)), target);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestPosition = (distances[i + 0] + subLength * subPosition);
            }
        }
        return { closestPosition, smallestDistance };
    }
    getPathMaxFraction() {
        return this.length;
    }
    getPointOnPath(inFraction, outPathPositionPtr, outPathTangentPtr, outPathNormalPtr, outPathBinormalPtr) {
        const outPathPosition = Jolt.wrapPointer(outPathPositionPtr, Jolt.Vec3);
        const outPathTangent = Jolt.wrapPointer(outPathTangentPtr, Jolt.Vec3);
        const outPathNormal = Jolt.wrapPointer(outPathNormalPtr, Jolt.Vec3);
        const outPathBinormal = Jolt.wrapPointer(outPathBinormalPtr, Jolt.Vec3);
        const frac = inFraction / this.length;
        const position = this.path.getPointAt(frac);
        const tangent = this.path.getTangentAt(frac, true);
        const normal = this.path.getNormalAt(frac, true);
        const binormal = this.path.getBinormalAt(frac, true);
        SetJoltVec3(position, outPathPosition);
        SetJoltVec3(tangent, outPathTangent);
        SetJoltVec3(normal, outPathNormal);
        SetJoltVec3(binormal, outPathBinormal);
    }
    setPathNormals(normals) {
        const normArray = (normals instanceof Array) ? normals : [normals];
        setPath3DNormals(this.path, normArray);
        recomputeBinormal(this.path);
    }
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
function calculateCurve(points, normals, curveInset, curveResolution, easing) {
    const p0 = points[0].subtract(points[1]).normalize().scaleInPlace(curveInset);
    const p1 = points[2].subtract(points[1]).normalize().scaleInPlace(curveInset);
    ;
    const curve3 = Curve3.CreateQuadraticBezier(points[1].add(p0), points[1], points[1].add(p1), curveResolution);
    return interpolateNormalsOverCurve(curve3, normals, easing);
}
export function createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing) {
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
export function setPath3DNormals(path, normals) {
    path.getNormals().forEach((norm, i) => {
        const newTan = normals[i];
        norm.copyFrom(newTan);
    });
    recomputeBinormal(path);
}
function recomputeBinormal(path) {
    const normals = path.getNormals();
    const tangents = path.getTangents();
    const binormals = path.getBinormals();
    binormals.forEach((bi, i) => {
        const normal = normals[i].normalize();
        const tangent = tangents[i].normalize();
        Vector3.CrossToRef(tangent, normal, bi).normalize();
    });
}
export function createPath3DWithCurvedCorners(points, normals, curveInset, curveResolution, normalEasing = EasingMethod.LINEAR) {
    const curve = createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing);
    const path3d = new Path3D(curve.positions, normals[0], false, true);
    setPath3DNormals(path3d, curve.normals);
    return path3d;
}
export function createPath3DWithHermitePath(points, tangents, normals, curveResolution = 12, normalEasing = EasingMethod.LINEAR) {
    let hermite = Curve3.CreateHermiteSpline(points[0], tangents[0], points[1], tangents[1], curveResolution);
    let pathNormals = interpolateNormalsOverCurve(hermite, [normals[0], normals[1]], getEasing(normalEasing)).normals;
    for (let i = 1; i < points.length - 1; i++) {
        const curve = Curve3.CreateHermiteSpline(points[i], tangents[i], points[i + 1], tangents[i + 1], curveResolution);
        pathNormals.pop();
        pathNormals.push(...interpolateNormalsOverCurve(curve, [normals[i], normals[i + 1]], getEasing(normalEasing)).normals);
        hermite = hermite.continue(curve);
    }
    const path3d = new Path3D(hermite.getPoints(), Vector3.Up(), false, true);
    setPath3DNormals(path3d, pathNormals);
    return path3d;
}
export class JoltConstraintPointPath extends JoltConstraintPath {
    constructor(points, normal = [new Vector3(0, 1, 0)]) {
        const path = createPath3DWithCurvedCorners(points, normal, 0.25, 12);
        super(path);
    }
}
const LinearEase = class extends EasingFunction {
    ease(gradient) { return gradient; }
};
export var EasingMethod;
(function (EasingMethod) {
    EasingMethod[EasingMethod["LINEAR"] = 0] = "LINEAR";
    EasingMethod[EasingMethod["SINE"] = 1] = "SINE";
    EasingMethod[EasingMethod["QUADRATIC"] = 2] = "QUADRATIC";
    EasingMethod[EasingMethod["CUBIC"] = 3] = "CUBIC";
    EasingMethod[EasingMethod["QUARTIC"] = 4] = "QUARTIC";
    EasingMethod[EasingMethod["QUINTIC"] = 5] = "QUINTIC";
    EasingMethod[EasingMethod["EXPONENTIAL"] = 6] = "EXPONENTIAL";
    EasingMethod[EasingMethod["CIRCLE"] = 7] = "CIRCLE";
    EasingMethod[EasingMethod["BACK"] = 8] = "BACK";
    EasingMethod[EasingMethod["ELASTIC"] = 9] = "ELASTIC";
    EasingMethod[EasingMethod["BOUNCE"] = 10] = "BOUNCE";
})(EasingMethod || (EasingMethod = {}));
const EASE_METHODS = {
    [EasingMethod.SINE]: SineEase,
    [EasingMethod.LINEAR]: LinearEase,
    [EasingMethod.QUADRATIC]: QuadraticEase,
    [EasingMethod.CUBIC]: CubicEase,
    [EasingMethod.QUARTIC]: QuarticEase,
    [EasingMethod.QUINTIC]: QuinticEase,
    [EasingMethod.EXPONENTIAL]: ExponentialEase,
    [EasingMethod.CIRCLE]: CircleEase,
    [EasingMethod.BACK]: BackEase,
    [EasingMethod.ELASTIC]: ElasticEase,
    [EasingMethod.BOUNCE]: BounceEase
};
function getEasing(easing) {
    let easeClass = EASE_METHODS[easing];
    if (!easeClass) {
        easeClass = LinearEase;
    }
    const ease = new easeClass();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    return ease;
}
export function createPath3DWithCatmullRomPath(points, normals, curveResolution = 12, looped = true, normalEasing = EasingMethod.LINEAR) {
    function calcNormalForPoints(p0, p1, normal) {
        const t = p1.subtract(p0).normalize();
        const b = normal.cross(t).normalize();
        Vector3.CrossToRef(t, b, normal).normalize();
    }
    const catmullRom = Curve3.CreateCatmullRomSpline(points, curveResolution, true);
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
