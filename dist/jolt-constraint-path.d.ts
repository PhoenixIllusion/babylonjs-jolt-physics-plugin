import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
export declare class JoltConstraintPath {
    private length;
    looping: boolean;
    private path3d;
    private ptr;
    constructor(points: Vector3[], normal: Vector3);
    getPtr(): Jolt.PathConstraintPathJS;
    getClosestPoint(vecPtr: Jolt.Vec3, _fractionHint: float): number;
    getPathMaxFraction(): float;
    getPointOnPath(inFraction: float, outPathPositionPtr: Jolt.Vec3, outPathTangentPtr: Jolt.Vec3, outPathNormalPtr: Jolt.Vec3, outPathBinormalPtr: Jolt.Vec3): void;
}
