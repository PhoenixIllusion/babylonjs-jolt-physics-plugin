#if UNITY_EDITOR

using System;
using System.Collections; 
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using UnityEngine.UIElements;

public enum JoltCollisionShape // your custom enumeration
{
    Sphere,
    Box,
    Capsule,
    TaperedCapsule,
    Cylinder,
    ConvexHull,
    //StaticCompound,
    //RotatedTranslated,
    //Scaled,
    //OffsetCenterOfMass,
    Mesh,
    HeightField,
};

public enum JoltMotionType {
    Static,
    Kinematic,
    Dynamic
}

public class JoltRigidBody : MonoBehaviour
{  
    [SerializeField]
    public string m_ScriptType = "JoltRigidBody";

    [SerializeField]
    public JoltMotionType m_MotionType = JoltMotionType.Static;
    [SerializeField]
    public string m_MotionTypeS;
    [SerializeField]
    public float m_Mass;
    [SerializeField]
    public float m_Friction;
    [SerializeField]
    public float m_Restitution;
    [SerializeField]
    public JoltCollisionShape m_CollisionShape = JoltCollisionShape.Box;
    [SerializeField]
    public string m_CollisionShapeS;


    [SerializeField]
    public Vector3 m_WorldPosition; 
    [SerializeField] 
    public Vector3 m_WorldScale;
    [SerializeField]
    public Quaternion m_WorldRotation;
    [SerializeField]
    public Bounds m_LocalBounds;
    //[SerializeField]
    //private Vector3 m_CenterOfMass;

    public class JBounds {
        public float[] center { get; set; }
        public float[] extents { get; set; }
    }

    public class Data {
        public string type { get; set; }
        public string motionType { get; set; }
        public float mass { get; set; }
        public float friction { get; set; }
        public float restitution { get; set; }
        public string collisionShape {get; set;}
        public float[] worldPosition; 
        public float[] worldScale;
        public float[] worldRotation;
        public JBounds localBounds;
    }

    float[] ToArray(Vector3 v3) {
        return new float[] { v3[0], v3[1], v3[2] };
    }

    float[] ToArray(Quaternion v4) {
        return new float[] { v4[0], v4[1], v4[2], v4[3] };
    }

    public Data GetData() {
        if(gameObject.TryGetComponent<MeshRenderer>(out MeshRenderer renderer)) {
            var bounds = renderer.localBounds; 
            var worldMatrix = renderer.localToWorldMatrix;
            m_WorldPosition = worldMatrix.GetPosition();
            m_WorldRotation = worldMatrix.rotation;
            m_WorldScale = worldMatrix.lossyScale;
            m_LocalBounds = bounds; 
        } else if(gameObject.TryGetComponent<SkinnedMeshRenderer>(out SkinnedMeshRenderer skinnedRenderer)) {
            var bounds = skinnedRenderer.localBounds; 
            var worldMatrix = skinnedRenderer.localToWorldMatrix;
            m_WorldPosition = worldMatrix.GetPosition();
            m_WorldRotation = worldMatrix.rotation;
            m_WorldScale = worldMatrix.lossyScale;
            m_LocalBounds = bounds; 
        }
        return new Data {
            type = this.m_ScriptType,
            motionType = this.m_MotionTypeS,
            mass = this.m_Mass,
            friction = this.m_Friction,
            restitution = this.m_Restitution,
            collisionShape = this.m_CollisionShapeS,
            worldPosition = ToArray(this.m_WorldPosition),
            worldScale = ToArray(this.m_WorldScale),
            worldRotation = ToArray(this.m_WorldRotation),
            localBounds = new JBounds { extents = ToArray(this.m_LocalBounds.extents), center = ToArray(this.m_LocalBounds.center) }
        };
    }

    private void OnDrawGizmos() {
        //Render Collision Shape
        if (Selection.Contains (gameObject))
        if (gameObject != null) {
            if(gameObject.TryGetComponent<MeshRenderer>(out MeshRenderer renderer))
            {
                var bounds = renderer.localBounds;
                renderShape(bounds);
            } else if(gameObject.TryGetComponent<SkinnedMeshRenderer>(out SkinnedMeshRenderer skinnedRenderer)) {
                var bounds = skinnedRenderer.localBounds;
                renderShape(bounds);
            }
        }
    }
    void renderShape(Bounds bounds) {
        var extents = bounds.extents;
        Gizmos.color = Color.white;
        Gizmos.matrix = GetComponent<Renderer>().localToWorldMatrix;
        switch(m_CollisionShape) {
            case JoltCollisionShape.Sphere:
                Gizmos.DrawWireSphere(bounds.center, Mathf.Max(extents.x, Mathf.Max(extents.y, extents.z )));
                break;
            case JoltCollisionShape.Box:
                Gizmos.DrawWireCube(bounds.center, bounds.size);
                break;
            case JoltCollisionShape.Capsule: {
                var radius = Mathf.Max(extents.x,extents.z);
                var p1 = bounds.center + Vector3.zero;
                var p2 = bounds.center + Vector3.zero;
                p1.y = p1.y - extents.y + radius;
                p2.y = p2.y + extents.y - radius;
                DrawWireCapsule(p1, p2, radius, radius);
                break;
            }
            case JoltCollisionShape.Cylinder: {
                var radius = Mathf.Max(extents.x,extents.z);
                var p1 = bounds.center + Vector3.zero;
                var p2 = bounds.center + Vector3.zero;
                p1.y = p1.y - extents.y;
                p2.y = p2.y + extents.y;
                DrawWireCylinder(p1, p2, radius);
                break;
            }
            case JoltCollisionShape.Mesh: {
                if (gameObject != null && gameObject.TryGetComponent<MeshFilter>(out MeshFilter mFilter))
                {
                    Gizmos.DrawWireMesh(mFilter.sharedMesh);
                }
                break;
            }
        }
    }
    
    public static void DrawWireCapsule(Vector3 p1, Vector3 p2, float radius1, float radius2)
    {
        using (new UnityEditor.Handles.DrawingScope(Gizmos.color, Gizmos.matrix))
        {
            Quaternion p1Rotation = Quaternion.LookRotation(p1 - p2);
            Quaternion p2Rotation = Quaternion.LookRotation(p2 - p1);
            // Check if capsule direction is collinear to Vector.up
            float c = Vector3.Dot((p1 - p2).normalized, Vector3.up);
            if (c == 1f || c == -1f)
            {
                // Fix rotation
                p2Rotation = Quaternion.Euler(p2Rotation.eulerAngles.x, p2Rotation.eulerAngles.y + 180f, p2Rotation.eulerAngles.z);
            }
            // First side
            UnityEditor.Handles.DrawWireArc(p1, p1Rotation * Vector3.left,  p1Rotation * Vector3.down, 180f, radius1);
            UnityEditor.Handles.DrawWireArc(p1, p1Rotation * Vector3.up,  p1Rotation * Vector3.left, 180f, radius1);
            UnityEditor.Handles.DrawWireDisc(p1, (p2 - p1).normalized, radius1);
            // Second side
            UnityEditor.Handles.DrawWireArc(p2, p2Rotation * Vector3.left,  p2Rotation * Vector3.down, 180f, radius2);
            UnityEditor.Handles.DrawWireArc(p2, p2Rotation * Vector3.up,  p2Rotation * Vector3.left, 180f, radius2);
            UnityEditor.Handles.DrawWireDisc(p2, (p1 - p2).normalized, radius2);
            // Lines
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.down * radius1, p2 + p2Rotation * Vector3.down * radius2);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.left * radius1, p2 + p2Rotation * Vector3.right * radius2);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.up * radius1, p2 + p2Rotation * Vector3.up * radius2);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.right * radius1, p2 + p2Rotation * Vector3.left * radius2);
        }
    }
    public static void DrawWireCylinder(Vector3 p1, Vector3 p2, float radius)
    {
        using (new UnityEditor.Handles.DrawingScope(Gizmos.color, Gizmos.matrix))
        {
            Quaternion p1Rotation = Quaternion.LookRotation(p1 - p2);
            Quaternion p2Rotation = Quaternion.LookRotation(p2 - p1);
            // Check if capsule direction is collinear to Vector.up
            float c = Vector3.Dot((p1 - p2).normalized, Vector3.up);
            if (c == 1f || c == -1f)
            {
                // Fix rotation
                p2Rotation = Quaternion.Euler(p2Rotation.eulerAngles.x, p2Rotation.eulerAngles.y + 180f, p2Rotation.eulerAngles.z);
            }
            // First side
            UnityEditor.Handles.DrawWireDisc(p1, (p2 - p1).normalized, radius);
            // Second side
            UnityEditor.Handles.DrawWireDisc(p2, (p1 - p2).normalized, radius);
            // Lines
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.down * radius, p2 + p2Rotation * Vector3.down * radius);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.left * radius, p2 + p2Rotation * Vector3.right * radius);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.up * radius, p2 + p2Rotation * Vector3.up * radius);
            UnityEditor.Handles.DrawLine(p1 + p1Rotation * Vector3.right * radius, p2 + p2Rotation * Vector3.left * radius);
        }
    }
}

[CustomEditor(typeof(JoltRigidBody))]
public class JoltRigidBodyEditor : Editor
{
    SerializedProperty m_ScriptType;
    SerializedProperty m_MotionType;
    SerializedProperty m_MotionTypeS;
    SerializedProperty m_Mass;
    SerializedProperty m_Friction;
    SerializedProperty m_Restitution;
    SerializedProperty m_CollisionShape;
    SerializedProperty m_CollisionShapeS;
    //SerializedProperty m_CenterOfMass; 

    // is called once when according object gains focus in the hierachy
    private void OnEnable()
    {
        m_ScriptType = serializedObject.FindProperty("m_ScriptType");
        m_MotionType = serializedObject.FindProperty("m_MotionType");
        m_MotionTypeS = serializedObject.FindProperty("m_MotionTypeS");
        m_Mass = serializedObject.FindProperty("m_Mass");
        m_Friction = serializedObject.FindProperty("m_Friction");
        m_Restitution = serializedObject.FindProperty("m_Restitution");
        m_CollisionShape = serializedObject.FindProperty("m_CollisionShape");
        m_CollisionShapeS = serializedObject.FindProperty("m_CollisionShapeS");
        //m_CenterOfMass = serializedObject.FindProperty("m_CenterOfMass");
    }

    public override void OnInspectorGUI()
    {
        // fetch current values from the real instance into the serialized "clone"
        serializedObject.Update();

        // Draw field for A
        EditorGUILayout.PropertyField(m_Mass);
        EditorGUILayout.PropertyField(m_Friction);
        EditorGUILayout.PropertyField(m_Restitution);
        EditorGUILayout.PropertyField(m_CollisionShape);
        EditorGUILayout.PropertyField(m_MotionType);

        var joltRigidBody = target as JoltRigidBody;
        if (joltRigidBody != null && joltRigidBody.gameObject != null) {
            var gameObject = joltRigidBody.gameObject;
            if(gameObject.TryGetComponent<MeshRenderer>(out MeshRenderer renderer)) {
                var bounds = renderer.localBounds; 
                var worldMatrix = renderer.localToWorldMatrix;
                joltRigidBody.m_WorldPosition = worldMatrix.GetPosition();
                joltRigidBody.m_WorldRotation = worldMatrix.rotation;
                joltRigidBody.m_WorldScale = worldMatrix.lossyScale;
                joltRigidBody.m_LocalBounds = bounds; 
            } else if(gameObject.TryGetComponent<SkinnedMeshRenderer>(out SkinnedMeshRenderer skinnedRenderer)) {
                var bounds = skinnedRenderer.localBounds; 
                var worldMatrix = skinnedRenderer.localToWorldMatrix;
                joltRigidBody.m_WorldPosition = worldMatrix.GetPosition();
                joltRigidBody.m_WorldRotation = worldMatrix.rotation;
                joltRigidBody.m_WorldScale = worldMatrix.lossyScale;
                joltRigidBody.m_LocalBounds = bounds; 
            }
        }
/*
        if(m_CollisionShape.enumNames[m_CollisionShape.enumValueIndex].Equals("OffsetCenterOfMass"))
        {
            // Draw field for B
            EditorGUILayout.PropertyField(m_CenterOfMass);
        }
*/

        m_MotionTypeS.stringValue = m_MotionType.enumNames[m_MotionType.enumValueIndex];
        m_CollisionShapeS.stringValue = m_CollisionShape.enumNames[m_CollisionShape.enumValueIndex];
        // write back serialized values to the real instance
        // automatically handles all marking dirty and undo/redo
        serializedObject.ApplyModifiedProperties();
    }
}

#endif