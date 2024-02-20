#if UNITY_EDITOR

using UnityEngine;
using UnityEditor;
using System;

[CustomEditor(typeof(JoltConstraint))]
public class JoltConstraintEditor : Editor
{
    SerializedProperty m_Body1;
    SerializedProperty m_Space;
    SerializedProperty m_ConstraintType;
    SerializedProperty m_Point1;
    SerializedProperty m_AxisX1;
    SerializedProperty m_AxisY1;
    SerializedProperty m_HingeAxis1;
    SerializedProperty m_NormalAxis1;
    SerializedProperty m_TwistAxis1;
    SerializedProperty m_SliderAxis1;
    SerializedProperty m_PlaneAxis1;
    SerializedProperty m_BodyPoint1;
    SerializedProperty m_FixedPoint1;
    SerializedProperty m_Point2;
    SerializedProperty m_AxisX2;
    SerializedProperty m_AxisY2;
    SerializedProperty m_HingeAxis2;
    SerializedProperty m_NormalAxis2;
    SerializedProperty m_TwistAxis2;
    SerializedProperty m_SliderAxis2;
    SerializedProperty m_PlaneAxis2;
    SerializedProperty m_BodyPoint2;
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
    SerializedProperty  m_Path;
    SerializedProperty  m_PathPosition;
    SerializedProperty  m_PathRotation;
    SerializedProperty  m_PathFraction;
    SerializedProperty  m_PathNormal;
    SerializedProperty  m_RotationConstraintType;

    SerializedProperty m_SelectedProperty;
    // is called once when according object gains focus in the hierachy
    private void OnEnable()
    {

        m_Body1 = serializedObject.FindProperty("m_Body1");
        m_Space = serializedObject.FindProperty("m_Space");
        m_ConstraintType = serializedObject.FindProperty("m_ConstraintType");
        m_Point1 = serializedObject.FindProperty("m_Point1");
        m_AxisX1 = serializedObject.FindProperty("m_AxisX1");
        m_AxisY1 = serializedObject.FindProperty("m_AxisY1");
        m_HingeAxis1 = serializedObject.FindProperty("m_HingeAxis1");
        m_NormalAxis1 = serializedObject.FindProperty("m_NormalAxis1");
        m_TwistAxis1 = serializedObject.FindProperty("m_TwistAxis1");
        m_SliderAxis1 = serializedObject.FindProperty("m_SliderAxis1");
        m_PlaneAxis1 = serializedObject.FindProperty("m_PlaneAxis1");
        m_BodyPoint1 = serializedObject.FindProperty("m_BodyPoint1");
        m_FixedPoint1 = serializedObject.FindProperty("m_FixedPoint1");
        m_Point2 = serializedObject.FindProperty("m_Point2");
        m_AxisX2 = serializedObject.FindProperty("m_AxisX2");
        m_AxisY2 = serializedObject.FindProperty("m_AxisY2");
        m_HingeAxis2 = serializedObject.FindProperty("m_HingeAxis2");
        m_NormalAxis2 = serializedObject.FindProperty("m_NormalAxis2");
        m_TwistAxis2 = serializedObject.FindProperty("m_TwistAxis2");
        m_SliderAxis2 = serializedObject.FindProperty("m_SliderAxis2");
        m_PlaneAxis2 = serializedObject.FindProperty("m_PlaneAxis2");
        m_BodyPoint2 = serializedObject.FindProperty("m_BodyPoint2");
        m_FixedPoint2 = serializedObject.FindProperty("m_FixedPoint2");
        m_MinDistance = serializedObject.FindProperty("m_MinDistance");
        m_MaxDistance = serializedObject.FindProperty("m_MaxDistance");
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
    }

    private void AddPropertyField( SerializedProperty property, int numControls) {
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
        AddPropertyField(m_ConstraintType,2);
        AddPropertyField(m_Body1,2);

        var joltRigidBody = target as JoltConstraint;
        if(joltRigidBody != null) {
            switch(joltRigidBody.m_ConstraintType) {
                case JoltConstraintType.Fixed:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_AxisX1,5);
                    AddPropertyField(m_AxisY1,5);
                    AddPropertyField(m_Point2,5);
                    AddPropertyField(m_AxisX2,5);
                    AddPropertyField(m_AxisY2,5);
                    break;
                case JoltConstraintType.Point:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_Point2,5);
                    break;
                case JoltConstraintType.Hinge:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_HingeAxis1,5);
                    AddPropertyField(m_NormalAxis1,5);
                    AddPropertyField(m_Point2,5);
                    AddPropertyField(m_HingeAxis2,5);
                    AddPropertyField(m_NormalAxis2,5);
                    AddPropertyField(m_LimitsMin,2);
                    AddPropertyField(m_LimitsMax,2);
                    AddPropertyField(m_MaxFrictionTorque,2);
                    break;
                case JoltConstraintType.Slider:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_SliderAxis1,5);
                    AddPropertyField(m_NormalAxis1,5);
                    AddPropertyField(m_Point2,5);
                    AddPropertyField(m_SliderAxis2,5);
                    AddPropertyField(m_NormalAxis2,5);
                    AddPropertyField(m_LimitsMin,2);
                    AddPropertyField(m_LimitsMax,2);
                    AddPropertyField(m_MaxFrictionTorque,2);
                    break;
                case JoltConstraintType.Distance:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_Point2,5);
                    AddPropertyField(m_MinDistance,2);
                    AddPropertyField(m_MaxDistance,2);
                    break;
                case JoltConstraintType.Cone:
                    AddPropertyField(m_Space,2);
                    AddPropertyField(m_Point1,5);
                    AddPropertyField(m_TwistAxis1,5);
                    AddPropertyField(m_Point2,5);
                    AddPropertyField(m_TwistAxis2,5);
                    AddPropertyField(m_HalfConeAngle,2);
                    break;
                //case JoltConstraintType.SwingTwist:
                //case JoltConstraintType.SixDOF:
                case JoltConstraintType.Path:
                    AddPropertyField(m_Path,5);
                    AddPropertyField(m_PathPosition,5);
                    AddPropertyField(m_PathRotation,5);
                    AddPropertyField(m_PathNormal,5);
                    EditorGUILayout.LabelField("Path Length: ", ""+joltRigidBody.GetPathLength());
                    AddPropertyField(m_PathFraction,2);
                    AddPropertyField(m_RotationConstraintType,2);
                    AddPropertyField(m_MaxFrictionForce,2);
                    break;
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
                case JoltConstraintType.Pulley:
                    AddPropertyField(m_Space, 2);
                    AddPropertyField(m_BodyPoint1, 5);
                    AddPropertyField(m_FixedPoint1, 5);
                    AddPropertyField(m_BodyPoint2, 5);
                    AddPropertyField(m_FixedPoint2, 5);
                    AddPropertyField(m_Ratio, 2);
                    AddPropertyField(m_MinLength, 2);
                    AddPropertyField(m_MaxLength, 2);
                    break;
            }
        }
        EditorGUILayout.LabelField("Selected Property: ", (m_SelectedProperty != null) ? m_SelectedProperty.name: "(none)");

        // write back serialized values to the real instance
        // automatically handles all m_arking dirty and undo/redo
        serializedObject.ApplyModifiedProperties();
    }
}

#endif