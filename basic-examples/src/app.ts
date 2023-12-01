import './style.css';

import { JoltJSPlugin } from '@phoenixillusion/babylonjs-jolt-plugin';

import { SceneFunction } from './scene/example';
import { Engine } from '@babylonjs/core/Engines/engine';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import "@babylonjs/core/Physics/physicsEngineComponent";
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';

export interface SceneConfig {
    getCamera(): Camera|undefined;
}

export class App {
    private canvas: HTMLCanvasElement;
    constructor(private createScene: SceneFunction, private config?: SceneConfig) {
        // create the canvas html element and attach it to the webpage
        const canvas = this.canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        document.body.style.height = window.innerHeight+'px';
        document.body.appendChild(canvas);
        this.init();
    }
    async init() {

        // initialize babylon scene and engine
        var engine = new Engine(this.canvas, true);
        var scene = new Scene(engine);

        scene.enablePhysics(new Vector3(0, -9.8, 0), await JoltJSPlugin.loadPlugin())

        if(!(this.config && this.config.getCamera())) {
            const camera = new FlyCamera('camera1', new Vector3(0, 15, 30), scene);
            // This targets the camera to scene origin
            camera.setTarget(new Vector3(0,10,0));
    
            // This attaches the camera to the canvas
            camera.attachControl(true);
        }


        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
        light.position.set(10, 10, 5);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        const callback = this.createScene();
  
        /*
        // hide/show the Inspector
        window.addEventListener('keydown', (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });*/

        let last = performance.now();
        // run the main render loop
        engine.runRenderLoop(() => {
            if(callback) {
                const now = performance.now();
                callback(now, now - last);
                last = now;
            }
            scene.render();
        });
    }
}
