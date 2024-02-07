This plugin uses Jolt Physics JS (https://github.com/jrouwe/JoltPhysics.js)
The plugin currently only uses the V1 Physics protocol, but may eventually migrate or support both V2 and V1.

Demos: https://phoenixillusion.github.io/babylonjs-jolt-physics-plugin/

Basic Usage:
```javascript
    const engine = new Engine(this.canvas, true);
    const scene = new Scene(engine);

    const camera = new FlyCamera('camera1', new Vector3(0, 15, 30), scene);
    camera.setTarget(new Vector3(0, 10, 0));
    camera.attachControl(true);

    const light = new DirectionalLight('light', new Vector3(-1, -3, 0), scene);
    light.position.set(10, 10, 5);
    light.intensity = 0.7;

    scene.enablePhysics(new Vector3(0, -9.8, 0), await JoltJSPlugin.loadPlugin())
  
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

You may use `JoltPhysicsImpostor` instead of `PhysicsImpostor` to access some specific functionality to JoltPhysics,
such as the collision specific codes that trigger `'on-contact-add'`, `'on-contact-persist'`, or to enable sensor-style behavior `'on-contact-validate'`

The `basic-examples` folder holds code for most cases mirroring demo behavior similar to the JoltPhysicsJS examples.

The Vehicle and CharacterVirual controller examples shows special behavior to use the demonstrate JoltPhysicJS's special controllers for these behaviors.

The `trenchbroom-example` folder uses demos where the environment is loaded using MAP files created using TrenchBroom (https://github.com/TrenchBroom/TrenchBroom)