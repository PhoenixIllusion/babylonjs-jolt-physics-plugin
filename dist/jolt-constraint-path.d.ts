import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Path3D } from '@babylonjs/core/Maths/math.path';
import { RawPointer } from './jolt-util';
export * from './path';
export declare class JoltConstraintPath {
    path: Path3D;
    looping: boolean;
    private length;
    private ptr;
    constructor(path: Path3D);
    getPtr(): Jolt.PathConstraintPathJS;
    getClosestPoint(vecPtr: RawPointer<Jolt.Vec3>, fractionHint: float, delta?: number): number;
    getClosestPositionTo(target: Vector3, min: number, max: number): {
        closestPosition: number;
        smallestDistance: number;
    };
    getPathMaxFraction(): float;
    getPointOnPath(inFraction: float, outPathPositionPtr: RawPointer<Jolt.Vec3>, outPathTangentPtr: RawPointer<Jolt.Vec3>, outPathNormalPtr: RawPointer<Jolt.Vec3>, outPathBinormalPtr: RawPointer<Jolt.Vec3>): void;
    setPathNormals(normals: Vector3 | Vector3[]): void;
}
