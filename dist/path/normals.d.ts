import type { IEasingFunction } from "@babylonjs/core/Animations/easing";
import type { Curve3, Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export declare function setPath3DNormals(path: Path3D, normals: Vector3[]): void;
export declare function recomputeBinormal(path: Path3D): void;
export declare function interpolateNormalsOverCurve(curve: Curve3, normals: [Vector3, Vector3], easing: IEasingFunction): {
    positions: Vector3[];
    normals: Vector3[];
};
