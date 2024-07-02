import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { GravityInterface } from "./types";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
export declare class GravityVector implements GravityInterface {
    gravity: Vector3;
    constructor(gravity: Vector3);
    getGravity(_impostor: PhysicsImpostor, _getCenterOfMass: () => Vector3): Vector3;
}
export declare class GravityPoint implements GravityInterface {
    point: Vector3;
    magnitude: number;
    private _gravity;
    constructor(point: Vector3, magnitude: number);
    getGravity(_impostor: PhysicsImpostor, getCenterOfMass: () => Vector3): Vector3;
}
