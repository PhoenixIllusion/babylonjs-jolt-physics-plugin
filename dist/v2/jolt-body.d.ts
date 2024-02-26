import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import Jolt from "../jolt-import";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PhysicsMassProperties, PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { JoltPhysicsShape } from "./jolt-shape";
import { JoltJSPlugin } from "./jolt-physics";
export interface IJoltBodyData {
    body: Jolt.Body | null;
    massProperties: PhysicsMassProperties;
    shape: JoltPhysicsShape | null;
    motionType: PhysicsMotionType;
    position: Vector3;
    orientation: Quaternion;
    toDispose: any[];
    plugin: JoltJSPlugin;
}
export declare class JoltPhysicsBody extends PhysicsBody {
    _pluginDataInstances: IJoltBodyData[];
    _pluginData: IJoltBodyData;
}
export declare class JoltBodyManager {
    private static position;
    private static orientation;
    static init(): void;
    static dispose(): void;
    static getPluginReference(body: JoltPhysicsBody, instanceIndex?: number): IJoltBodyData;
    static getAllPluginReference(body: JoltPhysicsBody): IJoltBodyData[];
    static syncTransform(body: PhysicsBody, transformNode: TransformNode): void;
    static syncBody(position: Vector3, orientation: Quaternion, body: Jolt.Body, bodyInterface: Jolt.BodyInterface): void;
    static generatePhysicsBody(bodyInterface: Jolt.BodyInterface, data: IJoltBodyData): Jolt.Body;
    private static _generatePhysicsBody;
    static GetMotionType(motionType: PhysicsMotionType): Jolt.EMotionType;
}
