import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Curve3, Path3D } from '@babylonjs/core/Maths/math.path';
import { IEasingFunction } from '@babylonjs/core/Animations/easing';
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
export declare function interpolateNormalsOverCurve(curve: Curve3, normals: [Vector3, Vector3], easing: IEasingFunction): {
    positions: Vector3[];
    normals: Vector3[];
};
export declare function createCurvedCorners(points: Vector3[], normals: Vector3[], curveInset: number, curveResolution: number, normalEasing: EasingMethod): {
    positions: Vector3[];
    normals: Vector3[];
};
export declare function setPath3DNormals(path: Path3D, normals: Vector3[]): void;
export declare function createPath3DWithCurvedCorners(points: Vector3[], normals: Vector3[], curveInset: number, curveResolution: number, normalEasing?: EasingMethod): Path3D;
export declare function createPath3DWithHermitePath(points: Vector3[], tangents: Vector3[], normals: Vector3[], curveResolution?: number, normalEasing?: EasingMethod): Path3D;
export declare class JoltConstraintPointPath extends JoltConstraintPath {
    constructor(points: Vector3[], normal?: Vector3[]);
}
export declare enum EasingMethod {
    LINEAR = 0,
    SINE = 1,
    QUADRATIC = 2,
    CUBIC = 3,
    QUARTIC = 4,
    QUINTIC = 5,
    EXPONENTIAL = 6,
    CIRCLE = 7,
    BACK = 8,
    ELASTIC = 9,
    BOUNCE = 10
}
export declare function createPath3DWithCatmullRomPath(points: Vector3[], normals: Vector3[], curveResolution?: number, looped?: boolean, normalEasing?: EasingMethod): Path3D;
