#if UNITY_EDITOR

using UnityEngine;
using UnityEditor;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;

public enum JoltConstraintType 
{
    Fixed,
	Point,
	Hinge,
	Slider,
	Distance,
	Cone,
	//SwingTwist,
	//SixDOF,
	Path,
	RackAndPinion,
	Gear,
	Pulley
};

public enum EConstraintSpace {
    Local,
    World
}

public enum EPathRotationConstraintType {
    Free,
	ConstrainAroundTangent,
	ConstrainAroundNormal,
	ConstrainAroundBinormal,
	ConstrainToPath,
	FullyConstrained,
}

public class JoltConstraint : MonoBehaviour
{  
    [SerializeField]
    public string m_ScriptType = "JoltConstraint";
    [SerializeField]
    public GameObject m_Body1;
    [SerializeField]
    public EConstraintSpace m_Space = EConstraintSpace.Local;
    [SerializeField]
    public JoltConstraintType m_ConstraintType = JoltConstraintType.Fixed;
    [SerializeField]
    public Vector3 m_Point1;
    [SerializeField]
    public Vector3 m_AxisX1 = new Vector3(1,0,0);
    [SerializeField]
    public Vector3 m_AxisY1 = new Vector3(0,1,0);
    [SerializeField]
    public Vector3 m_HingeAxis1 = new Vector3(0,1,0);
    [SerializeField]
    public Vector3 m_NormalAxis1 = new Vector3(1,0,0);
    [SerializeField]
    public Vector3 m_TwistAxis1;
    [SerializeField]
    public Vector3 m_SliderAxis1;
    [SerializeField]
    public Vector3 m_PlaneAxis1;
    [SerializeField]
    public Vector3  m_BodyPoint1;
    [SerializeField]
    public Vector3 m_FixedPoint1;

    [SerializeField]
    public Vector3 m_Point2;
    [SerializeField]
    public Vector3 m_AxisX2 = new Vector3(1,0,0);
    [SerializeField]
    public Vector3 m_AxisY2 = new Vector3(0,1,0);
    [SerializeField]
    public Vector3 m_HingeAxis2 = new Vector3(0,1,0);
    [SerializeField]
    public Vector3 m_NormalAxis2 = new Vector3(1,0,0);
    [SerializeField]
    public Vector3 m_TwistAxis2;
    [SerializeField]
    public Vector3 m_SliderAxis2;
    [SerializeField]
    public Vector3 m_PlaneAxis2;
    [SerializeField]
    public Vector3  m_BodyPoint2;
    [SerializeField]
    public Vector3 m_FixedPoint2;

    [SerializeField]
    public float m_MinDistance = -1;
    [SerializeField]
    public float m_MaxDistance = -1;
    [SerializeField]
    public float m_MinLength = 0;
    [SerializeField]
    public float m_MaxLength = -1;
    [SerializeField]
	public float m_LimitsMin = -Mathf.PI;
    [SerializeField]
	public float m_LimitsMax = Mathf.PI;
    [SerializeField]
	public float m_MaxFrictionTorque;
    [SerializeField]
	public float m_MaxFrictionForce;
    
    [SerializeField]
    public float m_HalfConeAngle;
    [SerializeField]
	public float m_Ratio = 1;
    [SerializeField]
	public LineRenderer m_Path;
    [SerializeField]
    public Vector3 m_PathPosition;
    [SerializeField]
    public Vector3 m_PathNormal = new Vector3(0,1,0);
    [SerializeField]
    public Quaternion m_PathRotation = new Quaternion(0,0,0,1);
    [SerializeField]
	public float m_PathFraction = 1;
    [SerializeField]
    public EPathRotationConstraintType m_RotationConstraintType = EPathRotationConstraintType.Free;

    float[] ToArray(Vector3 v3) {
        return new float[] { v3[0], v3[1], v3[2] };
    }

    float[] ToArray(Quaternion v4) {
        return new float[] { v4[0], v4[1], v4[2], v4[3] };
    }


    private void OnDrawGizmos() {
        //Render Collision Shape
        //if (Selection.Contains (gameObject) || (m_Body1 != null && Selection.Contains(m_Body1)))
        if (gameObject != null && m_Body1 != null) {
            renderConstraint();
        }
    }

    private Vector3 GetPoint(Vector3 point, Matrix4x4 matrix) {
        if(m_Space == EConstraintSpace.Local) {
            return matrix.MultiplyPoint(point);
        }
        return point;
    }

    private void DrawRay(Vector3 point, Vector3 direction, Color color, Matrix4x4 matrix) {
        Gizmos.color = color;
        if(m_Space == EConstraintSpace.Local) {
            Gizmos.matrix = matrix;
        } else {
            Gizmos.matrix = Matrix4x4.identity;
        }
        Gizmos.DrawLine(point, point + direction.normalized);
    }
    private void ConnectPoints(Vector3 p1, Vector3 p2) {
        Gizmos.color = Color.yellow;
        Gizmos.matrix = Matrix4x4.identity;
        Gizmos.DrawLine(p1, p2);
    }

    private void DrawArc(Vector3 point, Vector3 axis, Vector3 normal, float degrees, float radius, Color color, Matrix4x4 matrix) {
        Gizmos.color = color;
        if(m_Space == EConstraintSpace.Local) {
            Gizmos.matrix = matrix;
        } else {
            Gizmos.matrix = Matrix4x4.identity;
        } 
        using (new Handles.DrawingScope(Gizmos.color, Gizmos.matrix)) {
            Handles.DrawWireArc(point, axis, normal, degrees, radius);
        }
    }

    public float GetPathLength() {
        if(m_Path == null) {
            return 0;
        }
        int numPoints = m_Path.positionCount;
        Vector3[] pathPoints = new Vector3[numPoints];
        m_Path.GetPositions(pathPoints);
        float distance = 0;
        for(var i = 0; i < numPoints - 1; i++) {
            distance += (pathPoints[i] - pathPoints[i+1]).magnitude;
        }
        if(m_Path.loop) {
            distance += (pathPoints[0] - pathPoints[numPoints-1]).magnitude;
        }
        return distance;
    }
    public Vector3 GetPointAtFraction(float fraction) {
        if(m_Path == null) {
            return new Vector3();
        }
        fraction = fraction % GetPathLength();
        int numPoints = m_Path.positionCount;
        Vector3[] pathPoints = new Vector3[numPoints];
        m_Path.GetPositions(pathPoints);
          for(var i = 0; i < numPoints - 1; i++) {
            float distance = (pathPoints[i] - pathPoints[i+1]).magnitude;
            if(fraction < distance) {
                return Vector3.Lerp(pathPoints[i], pathPoints[i+1], fraction/distance);
            }
            fraction -= distance;
        }
        if(m_Path.loop) {
            float distance = (pathPoints[0] - pathPoints[numPoints-1]).magnitude;
            if(fraction < distance) {
                return Vector3.Lerp(pathPoints[numPoints - 1], pathPoints[0], fraction/distance);
            }
        }
        return new Vector3();
    }

    private float[][] GetPathPoints() {
        if(m_Path == null) {
            return new float[0][];
        }
        int numPoints = m_Path.positionCount;
        Vector3[] pathPoints = new Vector3[numPoints];
        List<float[]> response = new List<float[]>();
        m_Path.GetPositions(pathPoints);
        for(var i = 0; i < numPoints; i++) {
            response.Add(ToArray(pathPoints[i]));
        }
        if(m_Path.loop) {
            response.Add(response[0]);
        }
        return response.ToArray();
    }

    void renderConstraint() {
        Gizmos.color = Color.white;
        var matrix1 = m_Body1.transform.localToWorldMatrix;
        var matrix2 = transform.localToWorldMatrix;
        switch(m_ConstraintType) {
            case JoltConstraintType.Fixed: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                DrawRay(m_Point1, m_AxisX1, Color.red, matrix1);
                DrawRay(m_Point2, m_AxisX2, Color.red, matrix2);
                DrawRay(m_Point1, m_AxisY1, Color.green, matrix1);
                DrawRay(m_Point2, m_AxisY2, Color.green, matrix2);
                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);
            }
            break;
            case JoltConstraintType.Point: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);
            }
            break;
            case JoltConstraintType.Hinge: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                DrawRay(m_Point1, m_HingeAxis1, Color.red, matrix1);
                DrawRay(m_Point2, m_HingeAxis2, Color.red, matrix2);
                DrawRay(m_Point1, m_NormalAxis1, Color.green, matrix1);
                DrawRay(m_Point2, m_NormalAxis2, Color.green, matrix2);


                DrawArc(m_Point1, m_HingeAxis1.normalized, m_NormalAxis1.normalized, m_LimitsMin * 180.0f / Mathf.PI, 1, Color.red, matrix1);
                DrawArc(m_Point1, m_HingeAxis1.normalized, m_NormalAxis1.normalized, m_LimitsMax * 180.0f / Mathf.PI, 1, Color.green, matrix1);

                DrawArc(m_Point2, m_HingeAxis2.normalized, m_NormalAxis2.normalized, m_LimitsMin * 180.0f / Mathf.PI, 1, Color.red, matrix2);
                DrawArc(m_Point2, m_HingeAxis2.normalized, m_NormalAxis2.normalized, m_LimitsMax * 180.0f / Mathf.PI, 1, Color.green, matrix2);

                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);
            }
            break;
            case JoltConstraintType.Slider: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                DrawRay(m_Point1, m_SliderAxis1, Color.red, matrix1);
                DrawRay(m_Point2, m_SliderAxis2, Color.red, matrix2);
                DrawRay(m_Point1, m_NormalAxis1, Color.green, matrix1);
                DrawRay(m_Point2, m_NormalAxis2, Color.green, matrix2);
                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);

            }
            break;
            case JoltConstraintType.Distance: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);
            }
            break;
            case JoltConstraintType.Cone: {
                Vector3 p1 = GetPoint(m_Point1, matrix1);
                Vector3 p2 = GetPoint(m_Point2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                ConnectPoints(p1, p2);
                ConnectPoints(m_Body1.transform.position, p1);
                ConnectPoints(transform.position, p2);
            }
            break;
            case JoltConstraintType.Path: {
                if(m_Path != null) {
                    Matrix4x4 trs = Matrix4x4.TRS(m_PathPosition, m_PathRotation, new Vector3(1f,1f,1f));
                    Vector3 p1 = matrix1.MultiplyPoint(trs.MultiplyPoint(new Vector3(0,0,0)));
                    ConnectPoints(m_Body1.transform.position, p1);
                    Gizmos.DrawWireSphere(p1, 0.1f);

                    Vector3[] pathPoints = new Vector3[m_Path.positionCount];
                    m_Path.GetPositions(pathPoints);
                    Gizmos.matrix = m_Body1.transform.localToWorldMatrix * trs;
                    
                    Gizmos.DrawLineStrip(pathPoints, true);
                    Vector3 body2Point = GetPointAtFraction(m_PathFraction);
                    Vector3 worldBody2Point = Gizmos.matrix.MultiplyPoint(body2Point);
                    Gizmos.matrix = Matrix4x4.identity;

                    Gizmos.color = Color.yellow;
                    Gizmos.DrawWireSphere(worldBody2Point, 0.1f);
                    ConnectPoints(transform.position, worldBody2Point);
                }
            }
            break;
            case JoltConstraintType.Pulley: {
                Vector3 p1 = GetPoint(m_BodyPoint1, matrix1);
                Vector3 p2 = GetPoint(m_BodyPoint2, matrix2);
                Gizmos.DrawWireSphere(p1, 0.1f);
                Gizmos.DrawWireSphere(p2, 0.1f);
                Gizmos.color = Color.red;
                Gizmos.DrawWireSphere(m_FixedPoint1, 0.1f);
                Gizmos.DrawWireSphere(m_FixedPoint2, 0.1f);
                Gizmos.DrawLine(m_FixedPoint1, m_FixedPoint2);

                ConnectPoints(p1, m_FixedPoint1);
                ConnectPoints(p2, m_FixedPoint2);
            }
            break;
        }
    }

    public JObject GetData() {
        switch(m_ConstraintType) {
            case JoltConstraintType.Fixed:
            return JObject.FromObject(new FixedConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                axisx1 = ToArray(m_AxisX1),
                axisy1 = ToArray(m_AxisY1),
                point2 = ToArray(m_Point2),
                axisx2 = ToArray(m_AxisX2),
                axisy2 = ToArray(m_AxisY2),
            });
            case JoltConstraintType.Point:
            return JObject.FromObject(new PointConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                point2 = ToArray(m_Point2)
            });
            case JoltConstraintType.Hinge:
            return JObject.FromObject(new HingeConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                hingeAxis1 = ToArray(m_HingeAxis1),
                normalAxis1 = ToArray(m_NormalAxis1),
                point2 = ToArray(m_Point2),
                hingeAxis2 = ToArray(m_HingeAxis2),
                normalAxis2 = ToArray(m_NormalAxis2),
                limitsMin = m_LimitsMin,
                limitsMax = m_LimitsMax,
                maxFrictionTorque = m_MaxFrictionTorque
            });
            case JoltConstraintType.Slider:
            return JObject.FromObject(new SliderConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                sliderAxis1 = ToArray(m_SliderAxis1),
                normalAxis1 = ToArray(m_NormalAxis1),
                point2 = ToArray(m_Point2),
                sliderAxis2 = ToArray(m_SliderAxis2),
                normalAxis2 = ToArray(m_NormalAxis2),
                limitsMin = m_LimitsMin,
                limitsMax = m_LimitsMax,
                maxFrictionForce = m_MaxFrictionForce
            });
            case JoltConstraintType.Distance:
            return JObject.FromObject(new DistanceConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                point2 = ToArray(m_Point2),
                minDistance = m_MinDistance,
                maxDistance = m_MaxDistance,
            });
            case JoltConstraintType.Cone:
            return JObject.FromObject(new ConeConstraint {
                space = m_Space.ToString(),
                point1 = ToArray(m_Point1),
                twistAxis1 = ToArray(m_TwistAxis1),
                point2 = ToArray(m_Point2),
                twistAxis2 = ToArray(m_TwistAxis2),
                halfConeAngle = m_HalfConeAngle
            });
            case JoltConstraintType.Path:
            return JObject.FromObject(new PathConstraint {
                path = GetPathPoints(),
                pathPosition = ToArray(m_PathPosition),
                pathRotation = ToArray(m_PathRotation),
                pathNormal = ToArray(m_PathNormal),
                pathFraction = m_PathFraction,
                rotationConstraintType = m_RotationConstraintType.ToString(),
                maxFrictionForce = m_MaxFrictionForce
            });
            case JoltConstraintType.Pulley:
            return JObject.FromObject(new PulleyConstraint {
                space = m_Space.ToString(),
                bodyPoint1 = ToArray(m_BodyPoint1),
                bodyPoint2 = ToArray(m_BodyPoint2),
                fixedPoint1 = ToArray(m_FixedPoint1),
                fixedPoint2 = ToArray(m_FixedPoint2),
                ratio = m_Ratio,
                minLength = m_MinLength,
                maxLength = m_MaxLength
            });
        }
        return null;
    }
}

#endif