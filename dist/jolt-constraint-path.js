import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import { Path3D } from '@babylonjs/core/Maths/math.path';
import { TmpVectors } from '@babylonjs/core/Maths/math.vector';
import { GetJoltVec3, SetJoltVec3 } from '.';
export class JoltConstraintPath {
    constructor(points, normal) {
        this.length = 0;
        this.looping = (Vector3.Distance(points[0], points[points.length - 1]) == 0);
        this.path3d = new Path3D(points, normal, false, true);
        this.length = this.path3d.length();
        this.ptr = new Jolt.PathConstraintPathJS();
        this.ptr.GetClosestPoint = this.getClosestPoint.bind(this);
        this.ptr.GetPathMaxFraction = this.getPathMaxFraction.bind(this);
        this.ptr.GetPointOnPath = this.getPointOnPath.bind(this);
    }
    getPtr() {
        return this.ptr;
    }
    getClosestPoint(vecPtr, fractionHint) {
        const jVec3 = Jolt.wrapPointer(vecPtr, Jolt.Vec3);
        GetJoltVec3(jVec3, TmpVectors.Vector3[0]);
        const prevPathFrac = (fractionHint - 0.5) / this.length;
        const nextPathFrac = (fractionHint + 0.5) / this.length;
        const closestPoint = this.path3d.slice(prevPathFrac, nextPathFrac).getClosestPositionTo(TmpVectors.Vector3[0]);
        return prevPathFrac + closestPoint;
    }
    getPathMaxFraction() {
        return this.length;
    }
    getPointOnPath(inFraction, outPathPositionPtr, outPathTangentPtr, outPathNormalPtr, outPathBinormalPtr) {
        const outPathPosition = Jolt.wrapPointer(outPathPositionPtr, Jolt.Vec3);
        const outPathTangent = Jolt.wrapPointer(outPathTangentPtr, Jolt.Vec3);
        const outPathNormal = Jolt.wrapPointer(outPathNormalPtr, Jolt.Vec3);
        const outPathBinormal = Jolt.wrapPointer(outPathBinormalPtr, Jolt.Vec3);
        const position = this.path3d.getPointAt(inFraction);
        SetJoltVec3(position, outPathPosition);
        const tangent = this.path3d.getTangentAt(inFraction, true);
        SetJoltVec3(tangent, outPathTangent);
        const normal = this.path3d.getNormalAt(inFraction, true);
        SetJoltVec3(normal, outPathNormal);
        const binormal = this.path3d.getBinormalAt(inFraction, true);
        SetJoltVec3(binormal, outPathBinormal);
    }
}
