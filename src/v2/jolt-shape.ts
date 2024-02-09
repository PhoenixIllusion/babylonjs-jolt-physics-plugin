import Jolt from "../jolt-import";


export function castJoltShape<T extends Jolt.Shape>(shape: Jolt.Shape): Jolt.Shape|T {
  switch (shape.GetSubType()) {
    case Jolt.EShapeSubType_Sphere:
      shape = Jolt.castObject(shape, Jolt.SphereShape);
      break;
    case Jolt.EShapeSubType_Box:
      shape = Jolt.castObject(shape, Jolt.BoxShape);
      break;
    case Jolt.EShapeSubType_Capsule:
      shape = Jolt.castObject(shape, Jolt.CapsuleShape);
      break;
    case Jolt.EShapeSubType_TaperedCapsule:
      shape = Jolt.castObject(shape, Jolt.TaperedCapsuleShape);
      break;
    case Jolt.EShapeSubType_Cylinder:
      shape = Jolt.castObject(shape, Jolt.CylinderShape);
      break;
    case Jolt.EShapeSubType_ConvexHull:
      shape = Jolt.castObject(shape, Jolt.ConvexHullShape);
      break;
    case Jolt.EShapeSubType_StaticCompound:
      shape = Jolt.castObject(shape, Jolt.StaticCompoundShape);
      break;
    case Jolt.EShapeSubType_RotatedTranslated:
      shape = Jolt.castObject(shape, Jolt.RotatedTranslatedShape);
      break;
    case Jolt.EShapeSubType_Scaled:
      shape = Jolt.castObject(shape, Jolt.ScaledShape);
      break;
    case Jolt.EShapeSubType_OffsetCenterOfMass:
      shape = Jolt.castObject(shape, Jolt.OffsetCenterOfMassShape);
      break;
    case Jolt.EShapeSubType_Mesh:
      shape = Jolt.castObject(shape, Jolt.MeshShape);
      break;
    case Jolt.EShapeSubType_HeightField:
      shape = Jolt.castObject(shape, Jolt.HeightFieldShape);
      break;
  }
  return shape;
} 