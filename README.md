
This plugin uses Jolt Physics JS (https://github.com/jrouwe/JoltPhysics.js)
The plugin currently only uses the BabylonJS V1 Physics protocol.
All code is maintained to the best of my ability, but has no guarantees.

### Demos:
View: https://phoenixillusion.github.io/babylonjs-jolt-physics-plugin/

(Details in README under respective folders)

The [`basic-examples`](./basic-examples) folder ports many of the [JoltPhysicsJS Examples](https://github.com/jrouwe/JoltPhysics.js/tree/main/Examples). This folder is used to test feature parity with base Jolt Physics JS library. 

The [`trenchbroom-examples`](./trenchbroom-examples) folder demonstrate load *.MAP files created using TrenchBroom (https://github.com/TrenchBroom/TrenchBroom) . These produce mainly brush-based levels.

The [`gltf-extras`](./gltf-extras) folder is a personal project, serializing Jolt physics constraint/configuration data into the `extras` parameter of a GLTF file. It is paired with a Unity extension that uses [`com.unity.cloud.gltfast`](https://github.com/Unity-Technologies/com.unity.cloud.gltfast)  to markup GameObjects with jolt-specific collision and constraint data, as well as places markup, configuration, and other data in the UI widgets and editor panels.



### Basic Usage:

For most behavior, the JoltJS Physics Plugin is a drop-in replacement for basic Physics functionality, requiring only `scene.enablePhysics` be used to enable it.

```typescript
    import { JoltJSPlugin } from  '@phoenixillusion/babylonjs-jolt-plugin';

    const engine = new Engine(this.canvas, true);
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -9.8, 0), await JoltJSPlugin.loadPlugin())
  
    const camera = new FlyCamera('camera1', new Vector3(0, 15, 30), scene);
    camera.setTarget(new Vector3(0, 10, 0));
    camera.attachControl(true);

    const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
    light.position.set(10, 10, 5);
    light.intensity = 0.7;

    const ground = MeshBuilder.CreateGround('ground', { width: 100, height: 100 });
    new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
      mass: 0,
      friction: 0,
      restitution: 0.5
    })
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 4, segments: 32 });
    sphere.position.set(0, 10, 0);
    new PhysicsImpostor(sphere, PhysicsImpostor.SphereImpostor, {
      mass: 5,
      friction: 0,
      restitution: 0.7
    });
    engine.runRenderLoop(() => {
        scene.render();
    });
```
### Additional Features
[See FEATURES.md](./FEATURES.md)

### Jolt Version and Configuration (advanced)
The existing build is configured to load a fixed version of Jolt's `wasm-compat` library using https://www.unpkg.com/browse/jolt-physics/ . 
In cases where you wish to use another wasm binary, or  where upgrading to a newer version of Jolt is not a breaking change, you can configure and override the `Jolt` import using the `'@phoenixillusion/babylonjs-jolt-plugin/import'` `setJoltModule` interface

```typescript
    import { JoltJSPlugin } from  '@phoenixillusion/babylonjs-jolt-plugin';
    import initJolt from '<custom jolt build or version>'
    import setJoltModule from  '@phoenixillusion/babylonjs-jolt-plugin/import';

    setJoltModule(initJolt);
    const engine = new Engine(this.canvas, true);
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -9.8, 0), await JoltJSPlugin.loadPlugin())
```

Although most Jolt internals are abstracted away from the plugin, using the BabylonJS physics interface and custom utilities, the raw `Jolt` module remains accessible if needed. The shared instantiation of the Jolt module `Jolt` will not be available until after the first instance of a plugin has loaded. After this, you may access any internal Jolt features if needed.

```typescript
import Jolt  from '@phoenixillusion/babylonjs-jolt-plugin/import';
```