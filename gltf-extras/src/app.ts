import './style.css';

import { JoltJSPlugin } from '@phoenixillusion/babylonjs-jolt-plugin';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Physics/physicsEngineComponent';
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
