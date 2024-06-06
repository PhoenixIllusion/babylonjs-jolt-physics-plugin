import Jolt from "../jolt-import";
export interface VehicleInputState {
    forward: number;
    right: number;
    brake: boolean;
    handBrake: boolean;
}
export interface BaseVehicleInput<T extends Jolt.VehicleController> {
    onPrePhysicsUpdate(bodyInterface: Jolt.BodyInterface, controller: T, deltaTime: number): void;
}
export declare class DefaultVehicleInput {
    protected body: Jolt.Body;
    input: VehicleInputState;
    protected bodyId: Jolt.BodyID;
    constructor(body: Jolt.Body);
    private _linearV;
    private _rotationQ;
    getVelocity(): number;
}
