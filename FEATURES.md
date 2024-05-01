## Features

### Jolt Impostor Functionality
The JoltJSPlugin makes use of Declaration Merging on the PhysicsImpostor to add Jolt specific functionality and additional features added to impostor. 

#### Thin Instance Support
Instanced meshes are supported, using a custom wrapper around the ThinInstance mesh.
Note: This class has not been tested for bi-directional control, only physics-driven control. 
Usage:
```typescript

import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { ThinPhysicsNode } from '@phoenixillusion/babylonjs-jolt-plugin'

    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1, segments: 32 });
    const extents = new Vector3(0.5, 0.5, 0.5);
    for (let x = 0; x < 20; ++x)
        for (let y = 0; y < 10; ++y) {
            const matrix = Matrix.Translation(-10 + x, 10 + y, -5);
            const idx = sphere.thinInstanceAdd(matrix);
            sphere.material = getMaterial('#ff0000');
            new PhysicsImpostor(new ThinPhysicsNode(extents, idx, sphere), PhysicsImpostor.SphereImpostor, { mass: 1, friction: 0, restitution: 0, disableBidirectionalTransformation: true });
        }
```
**Note: Thin Instance model-view matrix auto-flush after the last thin-instance index is updated. This may not be the actual last-processed thin-instance, so you may need to manually flush the Thin matrix if you run into situations where you are 1-frame-off with some Thin Instance rendering. In the above code, the impostors are added in Thin Instance-Index-order, 0 through 199. If they were reversed, index 199 would process first and auto flush, and the model-view matrix of index 198 through 0 would  be set but not flush to the GPU until the next flush, one physics frame later.**  

#### Minimal Physics Node
Due to restrictions on the functionality of V1 Physics IPhysicsEnabledObject, it was not possible to easily add "physics only" items that had little-to-no presence at all in the BabylonJS scene graph. As such, there is a class `MinimalPhysicsNode` that meets all `IPhysicsEnabledObject` requirements but only extends a TransformNode with no render requirements. It is constructed with a hard coded extent and/or mesh used for physics logic, with Mesh being used for MeshImpostors or ConvexHullImpostors, but ignored for any  render logic.

This class allows easily creating invisible physics objects or creating parallel Physics and Render nodes in a scene. In cases for static geometry, this split bypasses the usual V1 "local only physics" warnings and allows for using hierarchal node structures for rendering Nodes, and instantiating the PhysicsImpostors at the root, using minimal TransformNodes for actual collision Nodes.

When encountering difficult model imports, such as GLTF structures with nested internal transforms, scales, and rotations, it is also possible to configure a Minimal Physics Node of the desired shape and extent, and then parent it to the difficult model such that the Impostor is now an invisible "root" to the imported model, ignoring any underlying transforms that may have complicated default PhysicsImpostor configuration.   

#### Collision Events
PhysicsImpostors have an additional collision callback interface, `registerOnJoltPhysicsCollide`, accepting the events `'on-contact-add'`, `'on-contact-persist'`, or to enable sensor-style behavior `'on-contact-validate'` . These may give additional functionality, such as the ability to alter velocities while in-contact, like conveyor-belts. Since these events are executing mid-physics-step, they should not be used to actually alter the position or velocity of physics bodies, and such changes should be deferred until post-physics execution. 

#### Physics Parameters
In addition to the default `PhysicsImpostorParameters`, the following optional parameters are also accepted:
* `frozen` - boolean : indicates that this object is static and will not move. Physics updates will not automatically move the BabylonJS visual mesh. Newer V2 Physics frameworks have similar functionality.
* `extents` - Vector3 : sets the shape extent data needed to size a Physics shape. This will take precedence  over any Mesh associated with the PhysicsImpostor, should they be different shapes
* `radiusBottom/radiusTop` - number : used for JoltPhysics tapered capsule shapes when creating a `PhysicsImpostor.CapsuleImpostor`.
* `centerOfMass` - Vector3 : used to offset the center of mass on a Physics shape. Critical on shapes such as the motorcycle, where auto-balancing requires a super low center of balance.
* `sensor` - boolean : Declares this shape as a sensor. It will have no collision behavior with items, but will still trigger collision callbacks on items entering.
* `heightMap` - `HeightMapData Config` : Contains the data needed for a `PhysicsImpostor.HeightmapImpostor` 
* `collision` - `Collision Config` : Contains group, subgroup, and filter configuration for custom collision. Example usage: allowing 'exceptions' where an item should be solid except for a case where it is known to sometimes intersect with something else (a wall, floor, another item it is constrained to)

### Constraints
The easiest way to access constraints when building scenes programmatically is using the import `'@phoenixillusion/babylonjs-jolt-plugin/joints'`, a collection of BabylonJS `PhysicsJoint` supporting default parameters and access to Jolt specific getters and setters, as well as easy access to Motors and Springs on the constraints.
```typescript
    const joint = new JoltHingeJoint(
	    /*point*/ new Vector3(0, 10, 0),
	    /*axis*/  new Vector3(0, 0, 1),
	    /*normal*/new Vector3(1, 0, 0));
    hingeImpostor.addJoint(armImpostor, joint);
    joint.motor.mode = MotorMode.Velocity;
    joint.motor.target = 3;
    joint.spring.mode = SpringMode.Frequency;
```
More advanced constraints are also available:
* JoltPathConstraint
* JoltGearConstraint - requires 2x JoltHingeJoint
* JoltRackAndPinionConstraint - requires 1x JoltHingeJoint and 1x JoltSliderJoint 

The Physics plugin attempts to support the classic V1 `PhysicsJoint` defined by the original BabylonJS interface, when easily mapped to Jolt Constraints, including:
* DistanceJoint
* HingeJoint
* PrismaticJoint - SliderConstraint
* LockJoint - FixedConstraint
* PointToPointJoint - PointConstraint

The primary axis of these joints is defined by the `JointData` `mainAxis` and `connectedAxis`. For secondary axis, a `normal-axis-1` and `normal-axis-2` Vector3 nativeParam is expected during construction.

### Vehicles
Vehicle related classes are located in the import `'@phoenixillusion/babylonjs-jolt-plugin/vehicle'`

Vehicles are considered `Constraints` , but the Plugin  implements them using a `Controller` and `VehicleInput` (ex: ) responsible for setting the steering and acceleration each frame (gas, break, turn left, right, emergency-brake, etc) 

Vehicle Controllers require a `PhysicsImpostor` for the vehicle, a Vehicle Configuration, and a `VehicleInput`. 
The following are supported:
* WheeledVehicleController
* MotorcycleController
* ~~TreadedVehicleController (not implemented)~~

Default `VehicleInputs` handle many simple cases, but can be overridden with a custom class implementing the required interface.
* DefaultWheeledVehicleInput
* DefaultMotorcycleInput

"Basic" configurations are available in helper methods on the import using `createBasicCar` and `createBasicMotorcycle`, which can then be modified prior to supplying to the controller. Through more advanced modification of the 
* Basic Car - a 4 wheeled vehicle in front-wheel or 4-wheel-drive, with configurable dimensions on the wheels and their placement on the bounds of the PhysicsImpostor
* Basic Motorcycle - a 2 wheeled vehicle 

The general "wheeled vehicle" can be configured with any combination of wheels, but by default the controller will attempt to steer all wheels with the same steering, and the internal workings attempt to drive all wheels at the same forward/backward rate (the actual direction of 'forward' per-wheel can be redefined at runtime, but not via the Plugin at this time).
