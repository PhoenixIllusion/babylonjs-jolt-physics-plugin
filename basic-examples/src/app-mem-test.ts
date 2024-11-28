import './style.css';

import { Jolt, JoltJSPlugin, PhysicsSettings, loadJolt, setJoltModule } from '@phoenixillusion/babylonjs-jolt-plugin';

import { clearMaterials, SceneFunction } from './util/example';
import { Engine } from '@babylonjs/core/Engines/engine';
import { FlyCamera } from '@babylonjs/core/Cameras/flyCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import "@babylonjs/core/Physics/physicsEngineComponent";
import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';

import joltWasmUrl from 'jolt-physics/jolt-physics.wasm.wasm?url'

export interface SceneConfig {
    getCamera(scene: Scene): Camera | undefined;
}

type SceneModule = {
    default: SceneFunction,
    config?: SceneConfig,
    settings?: PhysicsSettings
}

export class AppMemTest {
    private canvas: HTMLCanvasElement;
    static instance: AppMemTest;

    private scene?: Scene;
    public ui?: AdvancedDynamicTexture;
    private engine: Engine;

    constructor() {


        // create the canvas html element and attach it to the webpage
        const canvas = this.canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        document.body.style.height = window.innerHeight + 'px';
        document.body.appendChild(canvas);
        this.engine = new Engine(this.canvas, true);
    }

    async runSequence() {
        const initJolt = (await import('jolt-physics/wasm')).default;
        setJoltModule(() => initJolt({
            locateFile: () => joltWasmUrl,
        }) as any);
        await loadJolt({});
        const freeMem = Jolt.JoltInterface.prototype.sGetFreeMemory();
        const mem = () => freeMem - Jolt.JoltInterface.prototype.sGetFreeMemory();

        const modules = await import.meta.glob('./scene/*.ts')
        const allModules: [string, ()=>Promise<SceneModule>][] = Object.entries(modules) as any;
        for(let i=0;i<allModules.length;i++) {
            const [moduleName, module] = allModules[i];
            this.load(await module());
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.dispose();
            console.log(moduleName, mem());
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    load(module: SceneModule) {
        this.dispose();
        this.init(module);
    }

    dispose() {
        this.scene?.dispose();
        this.ui?.dispose();
        clearMaterials();
        this.scene = undefined;
    }

    async init(module: SceneModule) {
        // initialize babylon scene and engine
        const scene = this.scene = new Scene(this.engine);
        this.ui = AdvancedDynamicTexture.CreateFullscreenUI('gui');


        const { settings, config } = module;
        const createScene = module.default;

        const joltPlugin = await JoltJSPlugin.loadPlugin(true, settings);
        scene.enablePhysics(new Vector3(0, -9.8, 0), joltPlugin)

        if (!(config && config.getCamera)) {
            const camera = new FlyCamera('camera1', new Vector3(0, 15, 30), scene);
            // This targets the camera to scene origin
            camera.setTarget(new Vector3(0, 10, 0));

            // This attaches the camera to the canvas
            camera.attachControl(true);
            scene.activeCamera = camera;
        } else {
            const camera = config.getCamera(scene);
            if(camera)
                scene.activeCamera = camera;
        }


        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
        light.position.set(10, 10, 5);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        const maybeCallback = createScene(scene);
        const callback = maybeCallback instanceof Promise ? await maybeCallback : maybeCallback;

        joltPlugin.registerPerPhysicsStepCallback(delta => {
            if (callback) [
                callback(performance.now(), delta)
            ]
        })
        // run the main render loop
        this.engine.runRenderLoop(() => {
            const scene = this.scene;
            if (scene && scene.isReady() && scene.activeCamera) {
                scene.render();
            }
        });
    }
}
