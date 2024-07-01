import { Plane } from "@babylonjs/core/Maths/math.plane";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
export class BuoyancyPlane {
    constructor(plane) {
        this.plane = plane;
        this.buoyancy = 1.2;
        this.linearDrag = 0.3;
        this.angularDrag = 0.05;
        this.fluidVelocity = new Vector3(0, 0, 0);
        const d = plane.d;
        this.surfacePosition = plane.normal.clone().multiplyByFloats(-d, -d, -d);
    }
    static FromPosition(position, normal = Vector3.UpReadOnly) {
        return new BuoyancyPlane(Plane.FromPositionAndNormal(position, normal));
    }
    getBuoyancyImpulse(_impostor, _getBoundingInfo) {
        const { buoyancy, linearDrag, angularDrag, fluidVelocity } = this;
        return {
            buoyancy, linearDrag, angularDrag, fluidVelocity,
            surfaceNormal: this.plane.normal,
            surfacePosition: this.surfacePosition
        };
    }
}
export class BuoyancyAggregate {
    constructor() {
        this.regionInterface = new Map();
    }
    addRegion(bounds, buoyancy) {
        this.regionInterface.set(bounds, buoyancy);
    }
    removeRegion(bounds) {
        this.regionInterface.delete(bounds);
    }
    getBuoyancyImpulse(impostor, getBoundingInfo) {
        const bounds = getBoundingInfo();
        const regions = Array.from(this.regionInterface.entries());
        for (let i = 0; i < regions.length; i++) {
            const [region, buoyancy] = regions[i];
            if (region.intersects(bounds, true)) {
                const impulse = buoyancy.getBuoyancyImpulse(impostor, () => bounds);
                if (impulse !== null) {
                    return impulse;
                }
            }
        }
        return null;
    }
}
