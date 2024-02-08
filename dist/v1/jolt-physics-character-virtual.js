import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
export * from '../jolt-physics-character-virtual';
export class JoltCharacterVirtualImpostor extends PhysicsImpostor {
    constructor(object, type, _options, _scene) {
        super(object, type, _options, _scene);
    }
    get controller() {
        return this._pluginData.controller;
    }
    set controller(controller) {
        this._pluginData.controller = controller;
    }
}
