#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEditor;
using UnityEngine.SceneManagement;

using GLTFast;
using GLTFast.Logging;
using GLTFast.Export;
using Newtonsoft.Json.Linq;

public class ExportJoltGLB : MonoBehaviour
{   

        const string k_GltfExtension = "gltf";
        const string k_GltfBinaryExtension = "glb";

        static string SaveFolderPath
        {
            get
            {
                var saveFolderPath = EditorUserSettings.GetConfigValue("glTF.saveFilePath");
                if (string.IsNullOrEmpty(saveFolderPath))
                {
                    saveFolderPath = Application.streamingAssetsPath;
                }
                return saveFolderPath;
            }
            set => EditorUserSettings.SetConfigValue("glTF.saveFilePath", value);
        }
        static ExportSettings GetDefaultSettings(bool binary)
        {
            var settings = new ExportSettings
            {
                Format = binary ? GltfFormat.Binary : GltfFormat.Json
            };
            return settings;
        }

        static bool ValidateMagic(Span<byte> span, byte d, byte c, byte b, byte a) {
          if( span[0] == a && span[1] == b && span[2] == c && span[3] == d) {
            return true;
          }
          return false;
        }

        static uint ReadUInt32(Span<byte> span) {
          byte[] bytes = span.ToArray();

          if (!BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
          return BitConverter.ToUInt32(bytes, 0);
        }

        static Span<byte> WriteUInt32(int val) {
          byte[] bytes = BitConverter.GetBytes(val);
          if (!BitConverter.IsLittleEndian)
            Array.Reverse(bytes);
          return new Span<byte>(bytes);
        }

        static void AddJoltData(Dictionary<GameObject, int> nodeMap, JObject json) {
          var allGameObjects = nodeMap.Keys;
          foreach(GameObject obj in allGameObjects) {
            int nodeIndex = nodeMap[obj];
            JObject node;
            if (obj.TryGetComponent(out JoltRigidBody rigidBody))
            {
              node = (JObject)json["nodes"][nodeIndex];
              string nodeName = (string) node["name"];
              if(!nodeName.Equals(obj.name)) {
                Debug.LogError("Node Mismatch at index ["+nodeIndex+"] - Expected: ["+obj.name+"] and got ["+nodeName+"]");
              }
              node["extras"] = node["extras"] ?? new JObject();
              node["extras"]["jolt"] = new JObject();
              var joltExtras = node["extras"]["jolt"];
              joltExtras["id"] = nodeIndex;
              joltExtras["collision"] = JObject.FromObject(rigidBody.GetData());
              json["nodes"][nodeIndex] = node;
            }
            var constraints = obj.GetComponents<JoltConstraint>();
            if(constraints.Length > 0 && rigidBody != null) 
            {
              node = (JObject)json["nodes"][nodeIndex];
              node["extras"] = node["extras"] ?? new JObject();
              node["extras"]["jolt"] = node["extras"]["jolt"] ?? new JObject();
              var joltExtras = node["extras"]["jolt"];
              joltExtras["id"] = nodeIndex;
              var jsonConstraints = new List<JObject>();
              for(var i=0;i<constraints.Length; i++) {
                var constraint = constraints[i];
                if(constraint.m_Body1 != null) {
                  var constraintJson = constraint.GetData();
                  constraintJson["type"] = constraint.m_ConstraintType.ToString();
                  constraintJson["body1"] = nodeMap[constraint.m_Body1];
                  jsonConstraints.Add(constraintJson);
                }
              }
              joltExtras["constraints"] = new JArray(jsonConstraints.ToArray());
              json["nodes"][nodeIndex] = node;
            }
          }
        } 

        static Span<byte> ModifyJSON(Dictionary<GameObject, int> nodeMap, Span<byte> json_bytes) {
            var utf8 = new UTF8Encoding();
            var json_string = utf8.GetString(json_bytes.ToArray());
            JObject json = JObject.Parse(json_string);
            AddJoltData(nodeMap, json);
            json_string = json.ToString(Newtonsoft.Json.Formatting.None);
            var length = json_string.Length;
            var json_padding = "";
            if(length % 4 != 0)
            for(var i=0;i< 4 - (length % 4);i++) {
              json_padding += " ";
            }
            json_string += json_padding;
            length = json_string.Length;

            var bytes = new byte[length];
            int bytesEncodedCount = utf8.GetBytes(json_string, 0, length, bytes, 0);
            return new Span<byte>(bytes);
        }

        static void AddGameObject(GameObject gameObject, Dictionary<GameObject,int> nodeMap, int lastId, out int nodeId, GameObjectExportSettings gameObjectExportSettings, ExportSettings settings) {
            nodeId = -1;
            if (gameObjectExportSettings.OnlyActiveInHierarchy && !gameObject.activeInHierarchy
                || gameObject.CompareTag("EditorOnly"))
            {
                return;
            }
            var childCount = gameObject.transform.childCount;
            bool hasChildren = false;
            if (childCount > 0)
            {
                for (var i = 0; i < childCount; i++)
                {
                    var child = gameObject.transform.GetChild(i);
                    AddGameObject(child.gameObject, nodeMap, lastId, out var childNodeId, gameObjectExportSettings, settings);
                    if (childNodeId >= 0)
                    {
                      nodeId = lastId = childNodeId;
                      hasChildren = true;
                    }
                }
            }

            var onIncludedLayer = ((1 << gameObject.layer) & gameObjectExportSettings.LayerMask) != 0;

            if (onIncludedLayer || hasChildren)
            {
                nodeMap[gameObject] = lastId;
                nodeId = lastId + 1;

                if (onIncludedLayer)
                {
                    if (gameObject.TryGetComponent(out Camera camera))
                    {
                        if (camera.enabled || gameObjectExportSettings.DisabledComponents)
                        {
                            nodeId = nodeId + 1;
                        }
                    }

                    if (gameObject.TryGetComponent(out Light light))
                    {
                        if (light.enabled || gameObjectExportSettings.DisabledComponents)
                        {
                          if ((settings.ComponentMask & ComponentType.Light) != 0)
                          {
                            if (light.type != LightType.Point)
                            {
                              nodeId = nodeId + 1;
                            }
                          }
                        }
                    }
                }
            }
        }

        static void MapGameObjects(GameObject[] gameObjects, Dictionary<GameObject,int> nodeMap, GameObjectExportSettings gameObjectExportSettings, ExportSettings settings) {
            int nodeId = 0;
            for (var index = 0; index < gameObjects.Length; index++)
            {
                var gameObject = gameObjects[index];
                AddGameObject(gameObject, nodeMap, nodeId, out nodeId, gameObjectExportSettings, settings);
            }
        }

        [MenuItem("File/Export Scene/Jolt glTF-Binary (.glb)", false, 174)]
        static void ExportSceneBinaryMenu()
        {
            var scene = SceneManager.GetActiveScene();
            var gameObjects = scene.GetRootGameObjects();
            var extension = k_GltfBinaryExtension;

            var path = EditorUtility.SaveFilePanel(
                "glTF Export Path",
                SaveFolderPath,
                $"{scene.name}.{extension}",
                extension
                );
            if (!string.IsNullOrEmpty(path))
            {
                SaveFolderPath = Directory.GetParent(path)?.FullName;
                var settings = GetDefaultSettings(true);
                var gameObjectExportSettings = new GameObjectExportSettings();
                var export = new GameObjectExport(settings, gameObjectExportSettings, logger: new ConsoleLogger());
                export.AddScene(gameObjects, scene.name);
                var stream = new MemoryStream();
                AsyncHelpers.RunSync(() => export.SaveToStreamAndDispose(stream));

                var header_magic = new Span<byte>(new byte[4]);
                var header_version = new Span<byte>(new byte[4]);
                var header_doc_length = new Span<byte>(new byte[4]);

                var json_chunk_length = new Span<byte>(new byte[4]);
                var json_chunk_type = new Span<byte>(new byte[4]);

                stream.Seek(0, SeekOrigin.Begin);

                stream.Read(header_magic);
                stream.Read(header_version);
                stream.Read(header_doc_length);
                if(!ValidateMagic(header_magic, 0x46, 0x54, 0x6C, 0x67)) {
                  Debug.LogError("GLTF Magic Mismatch");
                }
                if(!ValidateMagic(header_version, 0x00, 0x00, 0x00, 0x02)) {
                  Debug.LogError("GLTF Version Not 2");
                }

                stream.Read(json_chunk_length);
                stream.Read(json_chunk_type);
                if(!ValidateMagic(json_chunk_type, 0x4E, 0x4F, 0x53, 0x4A)) {
                  Debug.LogError("JSON Header Magic Number Not Match");
                }
                var json_length = ReadUInt32(json_chunk_length);
                var json_bytes = new Span<byte>(new byte[json_length]);
                stream.Read(json_bytes);

                var bin_data = new Span<byte>(new byte[stream.Length - stream.Position]);
                stream.Read(bin_data);

                var gameObjectMap = new Dictionary<GameObject,int>();
                MapGameObjects(gameObjects, gameObjectMap, gameObjectExportSettings, settings);
                var new_json = ModifyJSON(gameObjectMap, json_bytes);

                var outStream = new FileStream(path, FileMode.Create);
                outStream.Write(header_magic);
                outStream.Write(header_version);

                int totalLength = 12 + 8 + new_json.Length + bin_data.Length;
                outStream.Write(WriteUInt32(totalLength));
                outStream.Write(WriteUInt32(new_json.Length));
                outStream.Write(json_chunk_type);
                outStream.Write(new_json);
                outStream.Write(bin_data);
                outStream.Close();
            }
        }
}

#endif
