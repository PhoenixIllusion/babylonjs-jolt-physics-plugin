import { IPhysicsEnabledObject, PhysicsImpostor, PhysicsImpostorParameters } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { Scene } from "@babylonjs/core/scene";
import { JoltCharacterVirtual } from "../jolt-physics-character-virtual";
export * from '../jolt-physics-character-virtual';
export declare class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    constructor(object: IPhysicsEnabledObject, type: number, _options: PhysicsImpostorParameters, _scene?: Scene);
    get controller(): JoltCharacterVirtual<PhysicsImpostor>;
    set controller(controller: JoltCharacterVirtual<PhysicsImpostor>);
}
