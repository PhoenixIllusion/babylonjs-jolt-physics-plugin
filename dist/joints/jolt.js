import { PhysicsJoint } from "@babylonjs/core/Physics/v1/physicsJoint";
export class JoltJoint extends PhysicsJoint {
    get constraint() {
        return this.physicsJoint;
    }
    getParams() {
        return this.jointData.nativeParams.constraint;
    }
}
