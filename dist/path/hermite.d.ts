import { Path3D } from "@babylonjs/core/Maths/math.path";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { EasingMethod } from "./easing";
export declare function createPath3DWithHermitePath(points: Vector3[], tangents: Vector3[], normals: Vector3[], curveResolution?: number, normalEasing?: EasingMethod): Path3D;
