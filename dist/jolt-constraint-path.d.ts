import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Path3D } from '@babylonjs/core/Maths/math.path';
export declare class JoltConstraintPath {
    path: Path3D;
    looping: boolean;
    private length;
    private ptr;
    constructor(path: Path3D);
    getPtr(): Jolt.PathConstraintPathJS;
    getClosestPoint(vecPtr: Jolt.Vec3, _fractionHint: float): number;
    getPathMaxFraction(): float;
    getPointOnPath(inFraction: float, outPathPositionPtr: Jolt.Vec3, outPathTangentPtr: Jolt.Vec3, outPathNormalPtr: Jolt.Vec3, outPathBinormalPtr: Jolt.Vec3): void;
    setPathNormals(normals: Vector3 | Vector3[]): void;
    setPathTangents(tangents: Vector3 | Vector3[]): void;
    protected recomputeBinormal(): void;
}
export declare class JoltConstraintPointPath extends JoltConstraintPath {
    constructor(points: Vector3[], normal?: Vector3[], tangent?: Vector3[]);
}
