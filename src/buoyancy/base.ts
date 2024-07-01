import { Plane } from "@babylonjs/core/Maths/math.plane";
import { BuoyancyImpulse, BuoyancyInterface } from "./type";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";
import { BoundingInfo } from "@babylonjs/core/Culling/boundingInfo";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class BuoyancyPlane implements BuoyancyInterface {
  buoyancy = 1.2;
  linearDrag = 0.3;
  angularDrag = 0.05;

  fluidVelocity = new Vector3(0,0,0);

  surfacePosition: Vector3;

  constructor(private plane: Plane) { 
    const d = plane.d;
    this.surfacePosition = plane.normal.clone().multiplyByFloats(-d,-d,-d);
  }

  static FromPosition(position: Vector3, normal = Vector3.UpReadOnly) {
    return new BuoyancyPlane(Plane.FromPositionAndNormal(position, normal));
  }

  getBuoyancyImpulse(_impostor: PhysicsImpostor, _getBoundingInfo: () => BoundingInfo): BuoyancyImpulse | null {
    const { buoyancy, linearDrag, angularDrag, fluidVelocity } = this;
    return {
      buoyancy, linearDrag, angularDrag, fluidVelocity,
      surfaceNormal: this.plane.normal,
      surfacePosition: this.surfacePosition
    }    
  }
  
}

export class BuoyancyAggregate implements BuoyancyInterface {
  
  regionInterface: Map<BoundingInfo, BuoyancyInterface> = new Map<BoundingInfo, BuoyancyInterface>();
  constructor() {}

  addRegion(bounds: BoundingInfo, buoyancy: BuoyancyInterface) {
    this.regionInterface.set(bounds, buoyancy);
  }
  removeRegion(bounds: BoundingInfo) {
    this.regionInterface.delete(bounds);
  }

  getBuoyancyImpulse(impostor: PhysicsImpostor, getBoundingInfo: () => BoundingInfo): BuoyancyImpulse | null {
    const bounds = getBoundingInfo();
    const regions = Array.from(this.regionInterface.entries());
    for(let i=0; i<regions.length; i++) {
      const [ region, buoyancy ] = regions[i];
      if(region.intersects(bounds, true)) {
        const impulse = buoyancy.getBuoyancyImpulse(impostor, () => bounds);
        if(impulse !== null) {
          return impulse;
        }
      }
    }
    return null;
  }
}