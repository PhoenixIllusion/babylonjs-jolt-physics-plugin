#if UNITY_EDITOR

using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(JoltConstraint))]
public class JoltConstraintEditor : Editor
{
    SerializedProperty m_Body1;
    SerializedProperty m_Space;
    SerializedProperty m_ConstraintType;
    SerializedProperty m_Point1;
    SerializedProperty m_Rotation1;
    SerializedProperty m_FixedPoint1;
    SerializedProperty m_UseSameRotation;
    SerializedProperty m_UseSamePosition;
    SerializedProperty m_Point2;
    SerializedProperty m_Rotation2;
    SerializedProperty m_AxisY2;
    SerializedProperty m_FixedPoint2;
    SerializedProperty m_MinDistance;
    SerializedProperty m_MaxDistance;
    SerializedProperty m_MinLength;
    SerializedProperty m_MaxLength;
    SerializedProperty m_LimitsMin;
    SerializedProperty m_LimitsMax;
    SerializedProperty m_MaxFrictionTorque;
    SerializedProperty m_MaxFrictionForce;
    SerializedProperty m_HalfConeAngle;
    SerializedProperty m_Ratio;
    SerializedProperty m_Path;
    SerializedProperty m_PathPosition;
    SerializedProperty m_PathRotation;
    SerializedProperty m_PathFraction;
    SerializedProperty m_PathNormal;
    SerializedProperty m_RotationConstraintType;
    SerializedProperty m_SwingType;
    SerializedProperty m_NormalHalfConeAngle;
    SerializedProperty m_PlaneHalfConeAngle;
    SerializedProperty m_TwistMinAngle;
    SerializedProperty m_TwistMaxAngle;
    MotorEditor m_Motor1;
    MotorEditor m_Motor2;



    SerializedProperty m_SelectedProperty;
    // is called once when according object gains focus in the hierachy
    private void OnEnable()
    {

        m_Body1 = serializedObject.FindProperty("m_Body1");
        m_Space = serializedObject.FindProperty("m_Space");
        m_ConstraintType = serializedObject.FindProperty("m_ConstraintType");

        m_Point1 = serializedObject.FindProperty("m_Point1");
        m_Rotation1 = serializedObject.FindProperty("m_Rotation1");
        m_FixedPoint1 = serializedObject.FindProperty("m_FixedPoint1");
        m_UseSameRotation = serializedObject.FindProperty("m_UseSameRotation");
        m_UseSamePosition = serializedObject.FindProperty("m_UseSamePosition");

        m_Point2 = serializedObject.FindProperty("m_Point2");
        m_Rotation2 = serializedObject.FindProperty("m_Rotation2");
        m_FixedPoint2 = serializedObject.FindProperty("m_FixedPoint2");

        m_MinDistance = serializedObject.FindProperty("m_MinDistance");
        m_MaxDistance = serializedObject.FindProperty("m_MaxDistance");
        m_LimitsMin = serializedObject.FindProperty("m_LimitsMin");
        m_LimitsMax = serializedObject.FindProperty("m_LimitsMax");
        m_MinLength = serializedObject.FindProperty("m_MinLength");
        m_MaxLength = serializedObject.FindProperty("m_MaxLength");
        m_MaxFrictionTorque = serializedObject.FindProperty("m_MaxFrictionTorque");
        m_MaxFrictionForce = serializedObject.FindProperty("m_MaxFrictionForce");
        m_HalfConeAngle = serializedObject.FindProperty("m_HalfConeAngle");
        m_Ratio = serializedObject.FindProperty("m_Ratio");
        m_Path = serializedObject.FindProperty("m_Path");
        m_PathPosition = serializedObject.FindProperty("m_PathPosition");
        m_PathRotation = serializedObject.FindProperty("m_PathRotation");
        m_PathNormal = serializedObject.FindProperty("m_PathNormal");
        m_PathFraction = serializedObject.FindProperty("m_PathFraction");
        m_RotationConstraintType = serializedObject.FindProperty("m_RotationConstraintType");
        m_SwingType = serializedObject.FindProperty("m_SwingType");
        m_NormalHalfConeAngle = serializedObject.FindProperty("m_NormalHalfConeAngle");
        m_PlaneHalfConeAngle = serializedObject.FindProperty("m_PlaneHalfConeAngle");
        m_TwistMinAngle = serializedObject.FindProperty("m_TwistMinAngle");
        m_TwistMaxAngle = serializedObject.FindProperty("m_TwistMaxAngle");

        m_Motor1 = new MotorEditor(serializedObject.FindProperty("m_Motor1"));
        m_Motor2 = new MotorEditor(serializedObject.FindProperty("m_Motor2"));
    }

    private void AddPropertyField(SerializedProperty property, int numControls)
    {
        var controlID = GUIUtility.GetControlID(FocusType.Keyboard);
        EditorGUILayout.PropertyField(property);
        if (GUIUtility.keyboardControl > controlID && GUIUtility.keyboardControl < controlID + numControls)
        {
            m_SelectedProperty = property;
        }
    }

    public override void OnInspectorGUI()
    {
        // fetch current values from the real instance into the serialized "clone"
        serializedObject.Update();

        m_SelectedProperty = null;
        // Draw field for A
        AddPropertyField(m_ConstraintType, 2);
        AddPropertyField(m_Body1, 2);

        var joltRigidBody = target as JoltConstraint;
        if (joltRigidBody != null)
        {
            switch (joltRigidBody.m_ConstraintType)
            {
                case JoltConstraintType.Fixed:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_Rotation1, 5);
                    AddPropertyField(m_UseSameRotation, 2);
                    if (!m_UseSameRotation.boolValue)
                        AddPropertyField(m_Rotation2, 5);
                    break;
                case JoltConstraintType.Point:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    break;
                case JoltConstraintType.Hinge:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_Rotation1, 5);
                    AddPropertyField(m_UseSameRotation, 2);
                    if (!m_UseSameRotation.boolValue)
                        AddPropertyField(m_Rotation2, 5);
                    AddPropertyField(m_LimitsMin, 2);
                    AddPropertyField(m_LimitsMax, 2);
                    AddPropertyField(m_MaxFrictionTorque, 2);
                    EditorGUILayout.LabelField("Motor");
                    m_Motor1.render();
                    break;
                case JoltConstraintType.Slider:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_Rotation1, 5);
                    AddPropertyField(m_UseSameRotation, 2);
                    if (!m_UseSameRotation.boolValue)
                        AddPropertyField(m_Rotation2, 5);
                    AddPropertyField(m_LimitsMin, 2);
                    AddPropertyField(m_LimitsMax, 2);
                    AddPropertyField(m_MaxFrictionTorque, 2);
                    EditorGUILayout.LabelField("Motor");
                    m_Motor1.render();
                    break;
                case JoltConstraintType.Distance:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_MinDistance, 2);
                    AddPropertyField(m_MaxDistance, 2);
                    break;
                case JoltConstraintType.Cone:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_Rotation1, 5);
                    AddPropertyField(m_UseSameRotation, 2);
                    if (!m_UseSameRotation.boolValue)
                        AddPropertyField(m_Rotation2, 5);
                    AddPropertyField(m_HalfConeAngle, 2);
                    break;
                case JoltConstraintType.SwingTwist:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_UseSamePosition, 2);
                    if (!m_UseSamePosition.boolValue)
                        AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_Rotation1, 5);
                    AddPropertyField(m_UseSameRotation, 2);
                    if (!m_UseSameRotation.boolValue)
                        AddPropertyField(m_Rotation2, 5);
                    AddPropertyField(m_SwingType, 2);
                    AddPropertyField(m_NormalHalfConeAngle, 2);
                    AddPropertyField(m_PlaneHalfConeAngle, 2);
                    AddPropertyField(m_TwistMinAngle, 2);
                    AddPropertyField(m_TwistMaxAngle, 2);
                    AddPropertyField(m_MaxFrictionTorque, 2);
                    EditorGUILayout.LabelField("Swing Motor");
                    m_Motor1.render();
                    EditorGUILayout.LabelField("Twist Motor");
                    m_Motor2.render();
                    break;
                //case JoltConstraintType.SixDOF:
                case JoltConstraintType.Path:
                    AddPropertyField(m_Path, 5);
                    AddPropertyField(m_PathPosition, 5);
                    AddPropertyField(m_PathRotation, 5);
                    AddPropertyField(m_PathNormal, 5);
                    EditorGUILayout.LabelField("Path Length: ", "" + joltRigidBody.GetPathLength());
                    AddPropertyField(m_PathFraction, 2);
                    AddPropertyField(m_RotationConstraintType, 2);
                    AddPropertyField(m_MaxFrictionForce, 2);
                    EditorGUILayout.LabelField("Position Motor");
                    m_Motor1.render();
                    break;
                /*
                case JoltConstraintType.RackAndPinion:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_HingeAxis1,5);
                    AddPropertyField(m_SliderAxis1,5);
                    AddPropertyField(m_Ratio,2);
                    break;
                case JoltConstraintType.Gear:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_HingeAxis1,5);
                    AddPropertyField(m_HingeAxis2,5);
                    AddPropertyField(m_Ratio,2);
                    break;
                    */
                case JoltConstraintType.Pulley:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_Point1, 5);
                    AddPropertyField(m_FixedPoint1, 5);
                    AddPropertyField(m_Point2, 5);
                    AddPropertyField(m_FixedPoint2, 5);
                    AddPropertyField(m_Ratio, 2);
                    AddPropertyField(m_MinLength, 2);
                    AddPropertyField(m_MaxLength, 2);
                    break;
            }
            if (m_UseSameRotation.boolValue)
            {
                joltRigidBody.m_Rotation2 = joltRigidBody.m_Rotation1;
            }
            if (m_UseSamePosition.boolValue && joltRigidBody.m_Body1 != null && joltRigidBody.m_ConstraintType != JoltConstraintType.Pulley)
            {
                Matrix4x4 matrix1 = joltRigidBody.m_Body1.transform.localToWorldMatrix;
                Matrix4x4 matrix2 = joltRigidBody.transform.localToWorldMatrix;
                joltRigidBody.m_Point2 = joltRigidBody.SetWorldPoint(joltRigidBody.GetWorldPoint(joltRigidBody.m_Point1, matrix1), matrix2);
            }
        }
        EditorGUILayout.LabelField("Selected Property: ", (m_SelectedProperty != null) ? m_SelectedProperty.name : "(none)");

        // write back serialized values to the real instance
        // automatically handles all m_arking dirty and undo/redo
        serializedObject.ApplyModifiedProperties();
    }

    public void OnSceneGUI()
    {

        var jolt = target as JoltConstraint;
        if (jolt != null && m_SelectedProperty != null)
        {
            // General Points
            // Body 1 Specific
            if (jolt.m_Body1 != null)
            {
                Matrix4x4 matrix1 = jolt.m_Body1.transform.localToWorldMatrix;
                Vector3 p1 = jolt.GetWorldPoint(jolt.m_Point1, matrix1);
                if (m_SelectedProperty == m_Point1)
                {
                    jolt.m_Point1 = jolt.SetWorldPoint(Handles.PositionHandle(p1, Quaternion.identity), matrix1);
                }
                if (m_SelectedProperty == m_FixedPoint1)
                {
                    jolt.m_FixedPoint1 = Handles.PositionHandle(jolt.m_FixedPoint1, Quaternion.identity);
                }
                if (m_SelectedProperty == m_Rotation1)
                {
                    jolt.m_Rotation1 = Handles.RotationHandle(jolt.m_Rotation1, p1);
                }
                if (m_SelectedProperty == m_PathPosition)
                {
                    Vector3 pos = matrix1.MultiplyPoint(jolt.m_PathPosition);
                    pos = Handles.PositionHandle(pos, Quaternion.identity);
                    jolt.m_PathPosition = matrix1.inverse.MultiplyPoint(pos);
                }
                if (m_SelectedProperty == m_PathRotation)
                {
                    Vector3 pos = matrix1.MultiplyPoint(jolt.m_PathPosition);
                    jolt.m_PathRotation = Handles.RotationHandle(jolt.m_PathRotation, pos);
                }
                if (m_SelectedProperty == m_PathNormal)
                {
                    Vector3 pos = matrix1.MultiplyPoint(jolt.m_PathPosition);
                    jolt.m_PathNormal = Handles.RotationHandle(jolt.m_PathNormal, pos);
                }
            }
            // Body 2 Specific
            {
                Matrix4x4 matrix2 = jolt.transform.localToWorldMatrix;
                Vector3 p2 = jolt.GetWorldPoint(jolt.m_Point2, matrix2);
                if (m_SelectedProperty == m_Point2)
                {
                    jolt.m_Point2 = jolt.SetWorldPoint(Handles.PositionHandle(p2, Quaternion.identity), matrix2);
                }
                if (m_SelectedProperty == m_FixedPoint2)
                {
                    jolt.m_FixedPoint2 = Handles.PositionHandle(jolt.m_FixedPoint2, Quaternion.identity);
                }
                if (m_SelectedProperty == m_Rotation2)
                {
                    jolt.m_Rotation2 = Handles.RotationHandle(jolt.m_Rotation1, p2);
                }
            }

        }
    }
}

class MotorEditor
{

    public SerializedProperty m_MotorState;

    public SerializedProperty m_TargetValue;

    public SerializedProperty m_MaxForceLimit;
    public SerializedProperty m_MinForceLimit;
    public SerializedProperty m_MinTorqueLimit;
    public SerializedProperty m_MaxTorqueLimit;
    public SerializedProperty m_SelectedProperty;

    public MotorEditor(SerializedProperty motor)
    {
        m_MotorState = motor.FindPropertyRelative("m_MotorState");
        m_TargetValue = motor.FindPropertyRelative("m_TargetValue");
        m_MinForceLimit = motor.FindPropertyRelative("m_MinForceLimit");
        m_MaxForceLimit = motor.FindPropertyRelative("m_MaxForceLimit");
        m_MinTorqueLimit = motor.FindPropertyRelative("m_MinTorqueLimit");
        m_MaxTorqueLimit = motor.FindPropertyRelative("m_MaxTorqueLimit");
    }
    public void render() {
        m_SelectedProperty = null;
        AddPropertyField(m_MotorState, 2);
        if(m_MotorState.enumValueIndex != 0) {
            AddPropertyField(m_TargetValue,2);
            AddPropertyField(m_MinForceLimit,2);
            AddPropertyField(m_MinForceLimit,2);
            AddPropertyField(m_MinTorqueLimit,2);
            AddPropertyField(m_MaxTorqueLimit,2);
        }
    }
    private void AddPropertyField(SerializedProperty property, int numControls)
    {
        var controlID = GUIUtility.GetControlID(FocusType.Keyboard);
        EditorGUILayout.PropertyField(property);
        if (GUIUtility.keyboardControl > controlID && GUIUtility.keyboardControl < controlID + numControls)
        {
            m_SelectedProperty = property;
        }
    }
}

#endif