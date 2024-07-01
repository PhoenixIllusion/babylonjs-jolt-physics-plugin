import { createJoltShape } from "./jolt-shapes";
import Jolt from "./jolt-import";
import { LAYER_MOVING, LAYER_NON_MOVING, SetJoltQuat, SetJoltVec3 } from "./jolt-util";
import { PhysicsSettings } from "./jolt-physics";
import { MotionType } from "./jolt-impostor";
import { getObjectLayer } from "./jolt-collision";
import { PhysicsImpostor } from "@babylonjs/core/Physics/v1/physicsImpostor";


export function GetMotionType(motionType: MotionType): Jolt.EMotionType {
  switch (motionType) {
    case 'static':
      return Jolt.EMotionType_Static;
      break;
    case 'dynamic':
      return Jolt.EMotionType_Dynamic;
      break;
    case 'kinematic':
      return Jolt.EMotionType_Kinematic;
  }
  return Jolt.EMotionType_Static;
}


export class BodyUtility {
  static createBody(impostor: PhysicsImpostor, physicsSettings: PhysicsSettings | undefined, bodyInterface: Jolt.BodyInterface, tempVec3A: Jolt.Vec3, tempVec3B: Jolt.Vec3, tempQuaternion: Jolt.Quat): Jolt.Body {
    const shape = createJoltShape(impostor, tempVec3A, tempVec3B, tempQuaternion);
    const mass = impostor.getParam('mass');
    const friction = impostor.getParam('friction');
    const restitution = impostor.getParam('restitution');
    const collision = impostor.getParam('collision');
    const sensor = impostor.getParam('sensor');
    const dof = impostor.getParam('dof');
    const frozen = impostor.getParam('frozen');
    const allowDynamicOrKinematic = impostor.getParam('allowDynamicOrKinematic');

    impostor.object.computeWorldMatrix(true);
    SetJoltVec3(impostor.object.position, tempVec3A);
    SetJoltQuat(impostor.object.rotationQuaternion!, tempQuaternion);

    let motionType = Jolt.EMotionType_Static;
    const pMotionType = impostor.getParam('motionType');
    if (pMotionType) {
      motionType = GetMotionType(pMotionType);
    } else {
      motionType = (mass === 0) ? Jolt.EMotionType_Static : Jolt.EMotionType_Dynamic;
    }

    let layer = 0;
    const pLayer = impostor.getParam('layer');
    const mask = impostor.getParam('mask');
    if (pLayer) {
      layer = getObjectLayer(pLayer, mask, physicsSettings);
    } else {
      layer = ((mass === 0) ? LAYER_NON_MOVING : LAYER_MOVING);
    }

    const settings = new Jolt.BodyCreationSettings(shape, tempVec3A, tempQuaternion, motionType, layer);
    if (collision) {
      if (collision.group !== undefined) {
        settings.mCollisionGroup.SetGroupID(collision.group);
      }
      if (collision.subGroup !== undefined) {
        settings.mCollisionGroup.SetSubGroupID(collision.subGroup);
      }
      if (collision.filter !== undefined) {
        settings.mCollisionGroup.SetGroupFilter(collision.filter.getFilter());
      }
    }
    impostor.joltPluginData.mass = mass;
    impostor.joltPluginData.friction = friction;
    impostor.joltPluginData.restitution = restitution;
    settings.mRestitution = restitution || 0;
    settings.mFriction = friction || 0;

    if (mass !== 0) {
      settings.mOverrideMassProperties = Jolt.EOverrideMassProperties_CalculateInertia;
      settings.mMassPropertiesOverride.mMass = mass;
    }
    if (sensor !== undefined) {
      settings.mIsSensor = sensor;
    }
    if (frozen !== undefined) {
      impostor.joltPluginData.frozen = frozen;
    }
    if (dof !== undefined) {
      settings.mAllowedDOFs = dof;
    }
    if (allowDynamicOrKinematic !== undefined) {
      settings.mAllowDynamicOrKinematic = allowDynamicOrKinematic;
    }

    const body = impostor.physicsBody = bodyInterface.CreateBody(settings);
    shape.Release();
    Jolt.destroy(settings);
    return body;
  }
}