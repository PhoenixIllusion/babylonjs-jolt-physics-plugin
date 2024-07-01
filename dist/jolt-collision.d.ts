import { Scene } from "@babylonjs/core/scene";
import { PhysicsSettings } from "./jolt-physics";
import Jolt from "./jolt-import";
export declare class CollisionTableFilter {
    private _filter;
    constructor(size: number, scene?: Scene);
    enableSubGroupPair(pair: [number, number]): void;
    enableSubgroupPairs(pairs: [number, number][]): void;
    disableSubGroupPair(pair: [number, number]): void;
    disableSubgroupPairs(pairs: [number, number][]): void;
    getFilter(): Jolt.GroupFilterTable;
}
export interface SystemCollisionConfiguration {
    type: 'layer' | 'mask';
}
interface ObjectLayerPairTable {
    id: number;
    collides: number[];
}
interface BroadPhaseLayerTable {
    id: number;
    includesObjectLayers: number[];
}
export interface LayerCollisionConfiguration extends SystemCollisionConfiguration {
    type: 'layer';
    objectLayers: ObjectLayerPairTable[];
    broadphase: BroadPhaseLayerTable[];
}
interface BroadPhaseLayerMask {
    id: number;
    includes: number;
    excludes?: number;
}
export interface MaskCollisionConfiguration extends SystemCollisionConfiguration {
    type: 'mask';
    broadphase: BroadPhaseLayerMask[];
}
export declare function configureSystemCollision(settings: Jolt.JoltSettings, configuration: SystemCollisionConfiguration): void;
export declare function getObjectLayer(layer: number, mask?: number, settings?: PhysicsSettings): number;
export {};
