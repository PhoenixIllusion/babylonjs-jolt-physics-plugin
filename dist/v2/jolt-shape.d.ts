import { PhysicsShape } from "@babylonjs/core/Physics/v2/physicsShape";
import Jolt from "../jolt-import";
import { PhysicsShapeParameters, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsMaterial } from "@babylonjs/core/Physics/v2/physicsMaterial";
interface IChildShape {
    child: JoltPhysicsShape;
    translation?: Vector3 | undefined;
    rotation?: Quaternion | undefined;
    scale?: Vector3 | undefined;
}
interface IJoltShapeData {
    isTrigger: boolean;
    shape: Jolt.Shape | null;
    children: IChildShape[];
    density?: number;
    material?: PhysicsMaterial;
}
export declare class JoltPhysicsShape extends PhysicsShape {
    _pluginData: IJoltShapeData;
}
export declare function castJoltShape<T extends Jolt.Shape>(shape: Jolt.Shape): Jolt.Shape | T;
export declare function createShape(type: PhysicsShapeType, parameters: PhysicsShapeParameters, _tmpVec: Jolt.Vec3): Jolt.Shape | null;
export {};
