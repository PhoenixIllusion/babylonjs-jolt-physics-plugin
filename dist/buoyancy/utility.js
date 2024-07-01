import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
export class BuoyancyUtility {
    constructor(plugin) {
        this.plugin = plugin;
        this._impostors = [];
        this._bounding = new BoundingInfo(Vector3.ZeroReadOnly, Vector3.ZeroReadOnly);
    }
    static getInstance(plugin) {
        let instance = this._instance;
        if (!instance) {
            instance = this._instance = new BuoyancyUtility(plugin);
            plugin.registerPerPhysicsStepCallback(instance.onPhysicsStep.bind(instance));
        }
        return instance;
    }
    onPhysicsStep(delta) {
        this._impostors.forEach(impostor => {
            const buoyancy = impostor.joltPluginData.buoyancy;
            const body = impostor.physicsBody;
            if (buoyancy && body.IsActive()) {
                const impulse = buoyancy.getBuoyancyImpulse(impostor, () => {
                    const bounding = this._bounding.centerOn(Vector3.ZeroReadOnly, impostor.getObjectExtents().scale(0.5));
                    bounding.update(impostor.object.computeWorldMatrix(false));
                    return bounding;
                });
                if (impulse) {
                    this.plugin.applyBuoyancyImpulse(impostor, impulse, delta);
                }
            }
        });
    }
    registerBuoyancy(impostor, buoyancy) {
        impostor.joltPluginData.buoyancy = buoyancy;
        this._impostors.push(impostor);
    }
    unregisterBuoyancy(impostor) {
        this._impostors.slice(this._impostors.indexOf(impostor), 1);
        impostor.joltPluginData.buoyancy = undefined;
    }
}
