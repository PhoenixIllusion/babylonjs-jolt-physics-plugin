import { Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod } from "./easing";
export declare function createPath3DWithCurvedCorners(points: Vector3[], normals: Vector3[], curveInset: number, curveResolution: number, normalEasing?: EasingMethod): Path3D;
