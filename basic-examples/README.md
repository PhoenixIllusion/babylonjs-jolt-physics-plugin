
### Basic Examples

These demos attempt to recreate many of the [JoltPhysicsJS Examples](https://github.com/jrouwe/JoltPhysics.js/tree/main/Examples)

View Live Demos: https://phoenixillusion.github.io/babylonjs-jolt-physics-plugin/basic-examples/

### Running the Demos Yourself
```bash
npm install
npm run dev
```

### Vite JS
This demo uses Vite JS [https://vitejs.dev/] for live-reload and quick development.
The [vite.config.ts](./vite.config.ts) uses a Multi-Page-Application plugin to dynamically generate the shell HTML pages, based on the Scene TS files detected in [./src/scene/](./src/scene/).


The root page [`static/_index.html`](static/_index.html) will auto populate, with 1 link per line linking to the individual demo Scene TS file generated template pages.
The child pages [static/_template.html](static/_template.html) will populate using the default exports of a given Scene TS file, launching an App class and passing in the individual camera and the scene-creation methods.

### Application

The [`app.ts`](./src/app.ts) file is shared among all demo scenes. This file is a minimal BabylonJS startup routine. It performs the following:
1. Create a `<canvas>` and append it to the body of the page
2. Initialize
	- a. Create a BabylonJS [`Engine`](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine)
	- b. Create a BabylonJS [`Scene`](https://doc.babylonjs.com/typedoc/classes/BABYLON.Scene) 
	- c. Load the JoltJS Physics Plugin
	- d. Check if the Scene TS has a custom camera, otherwise add a default [`Camera`](https://doc.babylonjs.com/typedoc/classes/BABYLON.Camera)
	- e. Add a [`Light`](https://doc.babylonjs.com/typedoc/classes/BABYLON.Light)
	- f. Call the Scene TS `createScene()` method
	- g. Start the [`engine.runRenderLoop()`](https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine#runRenderLoop)

### Individual Demo Details

#### Basic

* [sphere_bounce](./docs/sphere_bounce.md) - simplest demo.
* [friction](./docs/friction.md) - influence of friction on bodies
* [2d_funnel](./docs/2d_funnel.md)
* [2d_funnel_instanced](./docs/2d_funnel_instanced.md) - using thin-mesh instances 
* [add_remove_bodies](./docs/add_remove_bodies.md) - adding and removing falling cubes from a live scene
* [set_motion_type](./docs/set_motion_type.md) - set a body as being Kinematic, Dynamic, or Static


#### Collision
* [alternative_collision_filtering](./docs/alternative_collision_filtering.md) - how to configure mask-based filtering
* [set_layer](./docs/set_layer.md) - change the collision layer of an existing object

#### Shapes

* [falling_shapes](./docs/falling_shapes.md) - demo of the various supported Physics shapes
* [heightfield](./docs/heightfield.md) - loading of height fields from image-maps to create terrain
* [heightfield-tiling](./docs/heightfield-tiling.md) - tiling height fields into a larger field
* [set_shape](./docs/set_shape.md)

#### Other
* [conveyor_belt](./docs/conveyor_belt.md) - usage of contact listeners to influence contacting bodies angular and linear velocities
* [ray_cast](./docs/ray_cast.md) - raycasting from a source body, and selecting the intersected body

#### Constraints
* [constraints](./docs/constraints.md) - Demonstrates multiple constraints, used as chains of cubes
* [motor](./docs/motor.md) - using constraint motors. Demonstrates hinge-based windmill and slider 
* [springs](./docs/springs.md) - configuring springs on various constraints
* [path-constraint](./docs/path-constraint.md) - creation of paths, and connecting bodies to paths
* [gears](./docs/gears.md) - advanced constraint - multiple gears or gear-and-pinion

#### Custom Controllers - keyboard controlled
* [character_virtual](./docs/character_virtual.md) - Demonstrates a CharacterVirtual controller, allowing navigation and demonstrating contact-validation and conveyor-belt behavior
* [vehicle_motorcycle](./docs/vehicle_motorcycle.md) - demonstrates a simple 2-wheeled motrocycle
* [vehicle_wheeled](./docs/vehicle_wheeled.md) - demonstrates a simple 4-wheeled vehicle
* [vehicle_tracked](./docs/vehicle_tracked.md) - demonstrated a 2-tracked tank-link vehicle
* [vehicle_kart](./docs/vehicle_kart.md) - demonstrate a vehicle with tires modified to support higher speeds around corners on a track

#### Gravity
* [gravity_factor](./docs/gravity_factor.md) - Setting gravity factor between 0 and 1 on a given body
* [gravity_override](./docs/gravity_override.md) - Customizing the impact of gravity on an individual or multiple bodies
* [character_virtual_gravity](./docs/character_virtual_gravity.md) - Customizing gravity on a Character Virtual
* [vehicle_gravity](./docs/vehicle_gravity.md) - Customizing gravity on a Vehicle

#### Buoyancy
* [buoyancy](./docs/buoyancy.md) - Applying a buoyancy interface to individual bodies
* [buoyancy_aggregate](./docs/buoyancy_aggregate.md) - Using a custom grouping of buoyancy regions under a parent interface