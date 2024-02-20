#if UNITY_EDITOR
    public class FixedConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] axisx1 { get; set;}
        public float[] axisy1 { get; set;}
        public float[] point2 { get; set;}
        public float[] axisx2 { get; set;}
        public float[] axisy2 { get; set;}
    }

    public class PointConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] point2 { get; set;}
    }
    public class HingeConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] hingeAxis1 { get; set;}
        public float[] normalAxis1 { get; set;}
        public float[] point2 { get; set;}
        public float[] hingeAxis2 { get; set;}
        public float[] normalAxis2 { get; set;}
        public float limitsMin {get; set;}
        public float limitsMax {get; set;}
        public float maxFrictionTorque {get; set;}
    }
    public class SliderConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] sliderAxis1 { get; set;}
        public float[] normalAxis1 { get; set;}
        public float[] point2 { get; set;}
        public float[] sliderAxis2 { get; set;}
        public float[] normalAxis2 { get; set;}
        public float limitsMin {get; set;}
        public float limitsMax {get; set;}
        public float maxFrictionForce {get; set;}
    }
    public class DistanceConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] point2 { get; set;}
        public float minDistance {get; set;}
        public float maxDistance {get; set;}
    }
    public class ConeConstraint {
        public string space { get; set;}
        public float[] point1 { get; set;}
        public float[] twistAxis1 { get; set;}
        public float[] point2 { get; set;}
        public float[] twistAxis2 { get; set;}
        public float halfConeAngle {get; set;}
    }
    public class PathConstraint {
        public float[][] path { get; set;}
        public float[] pathPosition { get; set;}
        public float[] pathRotation { get; set;}
        public float[] pathNormal { get; set;}
        public float pathFraction { get; set;}
        public string rotationConstraintType { get; set;}
        public float maxFrictionForce {get; set;}
    }
    public class PulleyConstraint {
        public string space { get; set;}
        public float[] bodyPoint1 { get; set;}
        public float[] bodyPoint2 { get; set;}
        public float[] fixedPoint1 { get; set;}
        public float[] fixedPoint2 { get; set;}
        public float ratio {get; set;}
        public float minLength {get; set;}
        public float maxLength {get; set;}
    }
#endif