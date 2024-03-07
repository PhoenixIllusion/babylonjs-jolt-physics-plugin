import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Path3D } from '@babylonjs/core/Maths/math.path';
export * from './path';
export declare class JoltConstraintPath {
    path: Path3D;
    looping: boolean;
    private length;
    private ptr;
    constructor(path: Path3D);
    getPtr(): Jolt.PathConstraintPathJS;
    getClosestPoint(vecPtr: Jolt.Vec3, fractionHint: float, delta?: number): number;
    getClosestPositionTo(target: Vector3, min: number, max: number): {
        closestPosition: number;
        smallestDistance: number;
    };
    getPathMaxFraction(): float;
    getPointOnPath(inFraction: float, outPathPositionPtr: Jolt.Vec3, outPathTangentPtr: Jolt.Vec3, outPathNormalPtr: Jolt.Vec3, outPathBinormalPtr: Jolt.Vec3): void;
    setPathNormals(normals: Vector3 | Vector3[]): void;
}
