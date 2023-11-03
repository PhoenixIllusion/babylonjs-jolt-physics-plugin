import { Color3, StandardMaterial, Texture, Material, AbstractMesh, Matrix, Mesh, SceneLoader } from '@babylonjs/core';

import '@babylonjs/core/Materials/standardMaterial';
import { Entity, EntityGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap'
import { MapLoader, MapSceneBuilder, MaterialResolver, MeshResolver  } from '@phoenixillusion/babylonjs-trenchbroom-loader';

export class TestMaterialResolver implements MaterialResolver {
  private _materials: Record<string,Material> = {};
  async forTextureName(name: string): Promise<Material>  {
    const texture = name.replace('general/','');
    if(this._materials[texture]) {
      return this._materials[texture];
    }
    const material = new StandardMaterial(texture);
    this._materials[texture] = material;
    if(texture.match(/Color_/)) {
      material.diffuseColor = Color3.FromHexString('#'+texture.replace('Color_',''));
      return material;
    }
    if(texture.match('checker')) {
      const tiledTexture = new Texture('data:image/gif;base64,R0lGODdhAgACAIABAERERP///ywAAAAAAgACAAACA0QCBQA7');
      tiledTexture.onLoadObservable.add(() => {
        tiledTexture.wrapU = 1;
        tiledTexture.wrapV = 1;
        tiledTexture.vScale = 6;
        tiledTexture.uScale = 6;
        tiledTexture.updateSamplingMode(Texture.NEAREST_NEAREST);
      })
      material.diffuseTexture = tiledTexture;
      return material;
    }
    material.diffuseTexture = new Texture('textures/'+texture+".jpg");
    material.bumpTexture = new Texture('textures/'+texture+"_NormalGL.jpg");
    material.bumpTexture.level = .2;
    material.ambientColor = new Color3(0.3,0.3,0.3);
    return material;
  }
}
export class TestMeshResolver implements MeshResolver {
  private _meshCache : Record<string, Mesh>= {};
  private _meshCacheIdx : Record<string, number>= {};
  async forClassName(modelName: string): Promise<AbstractMesh|undefined> {
      if(!modelName.startsWith('model_')) {
          return undefined;
      }
      modelName = modelName.replace('model_','');
      if(this._meshCache[modelName]) {
      const mesh = this._meshCache[modelName];
      return mesh.createInstance(modelName+'-'+(this._meshCacheIdx[modelName]++));
      }
      const model = await SceneLoader.LoadAssetContainerAsync("models/", modelName+".glb");
      const mesh =  (model.meshes as Mesh[]).find(mesh => mesh.geometry != null) ;
      if(mesh != null) {
      this._meshCache[modelName] = mesh;
      mesh.isVisible = false;
      this._meshCacheIdx[modelName] = 0;
      return mesh.createInstance(modelName+'-'+(this._meshCacheIdx[modelName]++));
      }
      return undefined;
  }
  async instanceLinkedGroup(matrix: Matrix[], meshes: Mesh[]): Promise<AbstractMesh[]> {
      const bufferMatrices = new Float32Array(16 * matrix.length);
      matrix.forEach((m,i) => {
          m.copyToArray(bufferMatrices, i*16);
      });
       if(meshes) {
        meshes.forEach(mesh => {
          mesh.thinInstanceSetBuffer("matrix", bufferMatrices, 16);
          mesh.thinInstanceCount = matrix.length;
        })
      }
      return meshes;
  }
  shouldRenderEntity(_entity: Entity, _geometry: EntityGeometry): boolean {
      if(_entity.properties.h?._tb_layer) {
          return false;
      }
      if(_entity.properties.h?.classname?.startsWith('collision')) {
          return false;
      }
      return true;
  }
  onEntityProduced(_entity: Entity, _meshes: Mesh[]): void {
      /* do nothing */
  }
}