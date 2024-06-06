import './jolt-impostor';
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export class GravityUtility {
    constructor() {
        this._impostors = [];
        this.gravityForce = new Vector3();
    }
    static getInstance(plugin) {
        let instance = this._instance;
        if (!instance) {
            instance = this._instance = new GravityUtility();
            plugin.registerPerPhysicsStepCallback(instance.onPhysicsStep.bind(instance));
        }
        return instance;
    }
    onPhysicsStep(_delta) {
        this._impostors.forEach(impostor => {
            const gravity = impostor.joltPluginData.gravity;
            if (gravity) {
                gravity.scaleToRef(impostor.joltPluginData.mass, this.gravityForce);
                impostor.applyForce(this.gravityForce);
            }
        });
    }
    registerGravityOverride(impostor, gravity) {
        impostor.joltPluginData.gravity = gravity;
        impostor.setGravityFactor(0);
        this._impostors.push(impostor);
    }
    unregisterGravityOverride(impostor) {
        this._impostors.slice(this._impostors.indexOf(impostor), 1);
        impostor.setGravityFactor(1);
        impostor.joltPluginData.gravity = undefined;
    }
}
