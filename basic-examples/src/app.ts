import './style.css';

import { Jolt, JoltJSPlugin, PhysicsSettings, loadJolt, setJoltModule } from '@phoenixillusion/babylonjs-jolt-plugin';

import { SceneFunction } from './util/example';
import { Engine } from '@babylonjs/core/Engines/engine';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import "@babylonjs/core/Physics/physicsEngineComponent";
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { MemoryAvailableElement, setupMemoryAvailable } from './util/memory-available';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';

import joltWasmUrl from 'jolt-physics/jolt-physics.wasm.wasm?url'

export interface SceneConfig {
    getCamera(): Camera | undefined;
}

type SceneModule = {
    default: SceneFunction,
    config?: SceneConfig,
    settings?: PhysicsSettings
}

export class App {
    private canvas: HTMLCanvasElement;
    private createScene: SceneFunction;
    private config?: SceneConfig;
    private settings?: PhysicsSettings;
    static instance?: App;

    private engine?: Engine;
    private scene?: Scene;
    public ui?: AdvancedDynamicTexture;

    private memoryAvailableEle?: MemoryAvailableElement;

    constructor(module: SceneModule) {
        this.createScene = module.default;
        this.config = module.config;
        this.settings = module.settings;

        // create the canvas html element and attach it to the webpage
        const canvas = this.canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        document.body.style.height = window.innerHeight + 'px';
        document.body.appendChild(canvas);

        this.init();
        App.instance = this;
    }

    disposeScene() {
        this.scene?.dispose();
        this.ui?.dispose();
        this.scene = undefined;
    }
    dispose() {
        this.engine?.dispose();
        this.engine = undefined;
    }
    load(module: SceneModule) {
        this.dispose();
        this.createScene = module.default;
        this.config = module.config;
        this.settings = module.settings;
        this.init();
    }

    async init() {
        const curURL = new URL(window.location.href);
        const initJolt = (await import('jolt-physics/wasm')).default;
        setJoltModule(() => initJolt({
            locateFile: () => joltWasmUrl,
        }) as any);
        if (!this.memoryAvailableEle && curURL.searchParams.get('mem')) {
            await loadJolt({});
            this.memoryAvailableEle = setupMemoryAvailable(Jolt);
        }
        // initialize babylon scene and engine
        const engine = this.engine = new Engine(this.canvas, true);
        const scene = this.scene = new Scene(engine);
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('gui');


        const joltPlugin = await JoltJSPlugin.loadPlugin(true, this.settings);
        scene.enablePhysics(new Vector3(0, -9.8, 0), joltPlugin)

        if (!(this.config && this.config.getCamera)) {
            const camera = new FlyCamera('camera1', new Vector3(0, 15, 30), scene);
            // This targets the camera to scene origin
            camera.setTarget(new Vector3(0, 10, 0));

            // This attaches the camera to the canvas
            camera.attachControl(true);
        } else {
            this.config.getCamera();
        }


        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
        light.position.set(10, 10, 5);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        const maybeCallback = this.createScene(scene);
        const callback = maybeCallback instanceof Promise ? await maybeCallback : maybeCallback;

        joltPlugin.registerPerPhysicsStepCallback(delta => {
            if (callback) [
                callback(performance.now(), delta)
            ]
        })

        // run the main render loop
        engine.runRenderLoop(() => {
            const scene = this.scene;
            if (scene) {
                scene.render();
            }
        });
    }
}
