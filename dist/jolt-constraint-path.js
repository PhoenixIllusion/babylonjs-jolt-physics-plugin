import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { TmpVectors } from '@babylonjs/core/Maths/math.vector';
import { GetJoltVec3, SetJoltVec3, wrapJolt } from './jolt-util';
import { recomputeBinormal, setPath3DNormals } from './path/normals';
export * from './path';
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
        const outPathPosition = wrapJolt(outPathPositionPtr, Jolt.Vec3);
        const outPathTangent = wrapJolt(outPathTangentPtr, Jolt.Vec3);
        const outPathNormal = wrapJolt(outPathNormalPtr, Jolt.Vec3);
        const outPathBinormal = wrapJolt(outPathBinormalPtr, Jolt.Vec3);
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
