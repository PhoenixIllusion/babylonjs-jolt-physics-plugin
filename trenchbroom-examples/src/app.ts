import './style.css';

import { JoltJSPlugin } from '@phoenixillusion/babylonjs-jolt-plugin';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';

export type SceneCallback = (void | ((time: number, delta: number) => void))
export type SceneFunction = (scene: Scene) => Promise<SceneCallback>;

export class App {
    private canvas: HTMLCanvasElement;
    public static ui: AdvancedDynamicTexture; 

    constructor(private createScene: SceneFunction) {
        // create the canvas html element and attach it to the webpage
        const canvas = this.canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        document.body.style.height = window.innerHeight + 'px';
        document.body.appendChild(canvas);
        this.init();
    }
    async init() {

        // initialize babylon scene and engine
        var engine = new Engine(this.canvas, true);
        var scene = new Scene(engine);
        App.ui = AdvancedDynamicTexture.CreateFullscreenUI('gui');

        scene.enablePhysics(new Vector3(0, -9.8, 0), await JoltJSPlugin.loadPlugin())

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
        light.position.set(10, 10, 5);
        const hemi = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
        hemi.intensity = 0.8;
        hemi.specular = Color3.Black();
        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = .5;
        light.specular = new Color3(0.1, 0.1, 0.1);

        const callback = await this.createScene(scene);


        let last = performance.now();
        // run the main render loop
        engine.runRenderLoop(() => {
            if (callback) {
                const now = performance.now();
                callback(now, now - last);
                last = now;
            }
            scene.render();
        });
    }
}
