import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { JoltJSPlugin, PhysicsSettings } from "./jolt-physics";
import Jolt from "./jolt-import";

export class CollisionTableFilter {
  private _filter: Jolt.GroupFilterTable;
  constructor(size: number, scene?: Scene) {
    if (!scene) {
      scene = Engine.LastCreatedScene!;
    }
    if (!scene) {
      throw new Error('No Scene Created');
    }
    const plugin = scene.getPhysicsEngine()?.getPhysicsPlugin();
    if (!plugin || !(plugin instanceof JoltJSPlugin)) {
      throw new Error('Jolt Plugin Not Instantiated');
    }
    this._filter = new Jolt.GroupFilterTable(size);
  }
  enableSubGroupPair(pair: [number, number]): void {
    const [a, b] = pair;
    this._filter.EnableCollision(a, b);
  }
  enableSubgroupPairs(pairs: [number, number][]): void {
    pairs.forEach(([a, b]) => {
      this._filter.EnableCollision(a, b);
    });
  }
  disableSubGroupPair(pair: [number, number]): void {
    const [a, b] = pair;
    this._filter.DisableCollision(a, b);
  }
  disableSubgroupPairs(pairs: [number, number][]): void {
    pairs.forEach(([a, b]) => {
      this._filter.DisableCollision(a, b);
    });
  }
  getFilter() {
    return this._filter;
  }
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
  includesObjectLayers: number[]
}

export interface LayerCollisionConfiguration extends SystemCollisionConfiguration {
  type: 'layer',
  objectLayers: ObjectLayerPairTable[];
  broadphase: BroadPhaseLayerTable[];
}

interface BroadPhaseLayerMask {
  id: number;
  includes: number;
  excludes?: number;
}

export interface MaskCollisionConfiguration extends SystemCollisionConfiguration {
  type: 'mask',
  broadphase: BroadPhaseLayerMask[];
}

export function configureSystemCollision(settings: Jolt.JoltSettings, configuration: SystemCollisionConfiguration): void {
  if (configuration.type == 'layer') {
    const config = configuration as LayerCollisionConfiguration;

    const NUM_OBJECT_LAYERS = config.objectLayers.length;
    const NUM_BROAD_PHASE_LAYERS = config.broadphase.length;

    const object_filter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
    config.objectLayers.forEach(c => {
      c.collides.forEach(layer => {
        object_filter.EnableCollision(c.id, layer);
      })
    })

    const bp_interface = new Jolt.BroadPhaseLayerInterfaceTable(NUM_OBJECT_LAYERS, NUM_BROAD_PHASE_LAYERS);

    config.broadphase.forEach(bpLayer => {
      const BP_LAYER = new Jolt.BroadPhaseLayer(bpLayer.id);
      bpLayer.includesObjectLayers.forEach(objLayer => {
        bp_interface.MapObjectToBroadPhaseLayer(objLayer, BP_LAYER);
      })
      Jolt.destroy(BP_LAYER);
    });
    // Initialize Jolt
    settings.mObjectLayerPairFilter = object_filter;
    settings.mBroadPhaseLayerInterface = bp_interface;
    settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(
      settings.mBroadPhaseLayerInterface, NUM_BROAD_PHASE_LAYERS, settings.mObjectLayerPairFilter, NUM_OBJECT_LAYERS);
  } else if (configuration.type == 'mask') {
    const config = configuration as MaskCollisionConfiguration;
    const object_filter = new Jolt.ObjectLayerPairFilterMask();
    const NUM_BROAD_PHASE_LAYERS = config.broadphase.length;
    const bp_interface = new Jolt.BroadPhaseLayerInterfaceMask(NUM_BROAD_PHASE_LAYERS);

    config.broadphase.forEach(bpLayer => {
      const BP_LAYER = new Jolt.BroadPhaseLayer(bpLayer.id);
      bp_interface.ConfigureLayer(BP_LAYER, bpLayer.includes, bpLayer.excludes || 0);
      Jolt.destroy(BP_LAYER);
    });

    settings.mObjectLayerPairFilter = object_filter;
    settings.mBroadPhaseLayerInterface = bp_interface;
    settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterMask(bp_interface);

  } else {
    throw new Error('System collision currently only supports "layer" or "mask" types.')
  }
}

export function getObjectLayer(layer: number, mask?: number, settings?: PhysicsSettings): number {
  if (settings && settings.collision && settings.collision.type == 'mask') {
    layer = Jolt.ObjectLayerPairFilterMask.prototype.sGetObjectLayer(layer, mask || 0xffffffff);
  }
  return layer;
}