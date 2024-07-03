import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "./example";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

interface TextPlaneOptions {
  font: string;
  textHeight: number;
  height: number;
  color: string;
  bgColor: string | null;
  padding?: number;
}

export class TextUtility {
  temp: DynamicTexture;
  constructor(private scene: Scene) {
    this.temp = new DynamicTexture("DynamicTexture", 64, scene);
  }

  createText(text: string, options: Partial<TextPlaneOptions>): Mesh {
    const tmpctx = this.temp.getContext();
    const font = tmpctx.font = options?.font ?? '24px Arial';
    const DTWidth = tmpctx.measureText(text).width;
    const planeHeight = options?.height ?? 0.5;
    const DTHeight = options?.textHeight ?? 32; 
    const ratio = planeHeight / DTHeight;
    const planeWidth = DTWidth * ratio;

    const scene = this.scene;
    const padding = options?.padding ?? 0;
    const dynamicTexture = new DynamicTexture("DynamicTexture", { width: DTWidth+padding*2, height: DTHeight }, scene, false);
    const mat = new StandardMaterial("mat", scene);
    mat.diffuseTexture = dynamicTexture;

    const color = options?.color ?? '#000000';
    const bgColor = options?.bgColor ?? '#FFFFFF';
    dynamicTexture.drawText(text, null, null, font, color, bgColor, true); //use of null, null centers the text

    const plane = MeshBuilder.CreatePlane("plane", { width: planeWidth, height: planeHeight }, scene);
    plane.material = mat;
    return plane;
  }
}