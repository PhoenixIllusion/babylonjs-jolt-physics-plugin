import { AnimationGroup } from "@babylonjs/core";
import { SceneLoader } from "@babylonjs/core/Loading";
import { Mesh } from "@babylonjs/core/Meshes";

export class RiggedModel {
  static async forFile(file: string) {
    const model = await SceneLoader.LoadAssetContainerAsync("models/", file+".glb");
    const mesh =  (model.meshes as Mesh[]).find(mesh => mesh.geometry != null)!;
    return new RiggedModel(mesh.clone(), model.animationGroups);
  }
  constructor(public mesh: Mesh, public animations: AnimationGroup[]) {

  }
  setAnimationLoopRegion(name: string, point: number) {
    const anim = this.animations.find( anim => anim.name === name);
    anim?.onAnimationEndObservable.add(() => {
      if(anim.isPlaying) {
        anim.goToFrame(point)
      }
    })
  }
  setAnimation(name: string, loop = true, speed: number = 1, from?: number, to?: number) {
    this.animations.forEach(anim => {
      if(anim.name !== name && anim.isPlaying){
        anim.stop()
      }
    });
    const anim = this.animations.find( anim => anim.name === name);
    if(anim && !anim.isPlaying) {
      anim.start(loop, speed, from, to);
    }
  }
}