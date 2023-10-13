import './style.css';

import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { Engine, Scene,  Vector3, HemisphericLight,  MeshBuilder, FreeCamera, PhysicsAggregate, PhysicsShapeType, PhysicsImpostor, DirectionalLight, FlyCamera } from "@babylonjs/core";
import { JoltJSPlugin } from './plugin/jolt-physics';

import initJolt from 'https://www.unpkg.com/jolt-physics/dist/jolt-physics.wasm-compat.js';
import { SceneFunction } from './scene/example';

export class App {
    private canvas: HTMLCanvasElement;
    constructor(private createScene: SceneFunction) {
        // create the canvas html element and attach it to the webpage
        const canvas = this.canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        this.init();
    }
    async init() {

        // initialize babylon scene and engine
        var engine = new Engine(this.canvas, true);
        var scene = new Scene(engine);

        const Jolt = await initJolt();
        const settings = new Jolt.JoltSettings();
        const joltInterface = new Jolt.JoltInterface(settings);

        scene.enablePhysics(new Vector3(0, -9.8, 0), new JoltJSPlugin(Jolt, joltInterface))
        const camera = new FlyCamera("camera1", new Vector3(0, 15, 30), scene);
        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new DirectionalLight("light", new Vector3(-1, -3, 0), scene);
        light.position.set(10, 10, 5);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        const callback = this.createScene(Jolt, scene);
  
        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

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
