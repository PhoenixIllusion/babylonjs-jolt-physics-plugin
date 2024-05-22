
### Vehicle 

See Demos: 
* [Motorcycle](./vehicle_motorcycle.md)
* [Wheeled](./vehicle_wheeled.md)
* [Tank](./vehicle_tank.md)
 
Vehicles in Jolt are constraints applied to bodies. They inherit from a general Vehicle Constraint, and then this class subclasses into Wheeled Vehicles, like cars and bikes, and Tracked Vehicles, like tanks and some rovers. 

A vehicle is configured with a set of wheels and motors to drive them.
The wheels are configured with positions/suspension around the body, orientation, radius, and width. These allow you to position wheels such that they are below a vehicle via springs, and orient them all in the same (or different) directions. Wider wheels allow more traction, and larger wheels can be influenced via the radius per wheel.

In terms of operation, there are two vehicle types, and each controls the wheels in a different way:
1. Wheeled Vehicles (general and motorcycles) are configured with WheelDifferentials, which specify the influence of the motor on a given wheel and influence of "left" vs "right" steering on the given wheel. A wheeled vehicle wheel also has additional settings (`WheelSettingWV`) given the max steering angle the wheel can turn relative to 'front' and the influence of breaking and hand-breaking on the wheel.
2. Tracked Vehicles have tracks. With Jolt, a maximum of two tracks can be set on a vehicle, specifying left and right with regard to steering control. Each track specifies which wheels belong to it, as well as which wheel is the 'track control' wheel and other configuration regarding the physics of behavior of the track. `WheelSettingTV` allows for control of the lateral and longitudinal friction of a given wheel on a track.

A vehicle will also have a single engine. This engine can be configured to have various gears, and supports automatic gear-shifting or manual gear shifting via `TransmissionSettings` . The transmission also holds the gear-ratios and gear-shifting values, as well as additional clutch configuration. The engine has a minimum and maximum RPM, as well as inertia and angular-dampening settings.

#### Flow

The construction of a Vehicle involves the following flow:
* Creation of Vehicle Controller Settings
* Creation of Vehicle Wheel Settings
* Population of vehicle settings: engine, wheels, additional configuration
* Creation of the actual Constraint using settings and the physics Body
* Setting a custom collision tester
* Adding the constraint to the Physics Simulation
* Setting the constraint to receive a physics callback

Once added to the physics system, the Vehicle controller will be available via the constraint.
From the controller, the state of the wheels and engine may be accessed, as well as driving controls become exposed. Each frame, the driver-input may be set for the vehicle.

#### Plugin

This plugin has this exposed via `WheeledVehicleInput`, with default implementations provided by `DefaultWheeledVehicleInput` and `DefaultMotorcycleInput`. These controls use an X/Y analog input, provided by `VehicleInputState` that is checked every physics frame. The values of `forward`, `back` and `handBrake` are calculated. The default behavior follows the JoltPhysics example, where if the vehicle is moving forward, the negative forward action will apply break until it is no longer moving forward, and once the vehicle is no longer moving 'forward' relative to the engine state, it will change into 'reverse'.  

#### Body

Per the Motorcycle demo, vehicles do best when they have a low center of gravity. In fact, without a center-of-mass almost right at the bottom of the motorcycle, the 'auto stabilize' behavior of a motorcycle attempting to keep it upright will cause the vehicle to wildly bounce and through itself around as stronger and stronger forces apply to both side attempt to upright it until they exceed the force needed to throw the motorcycle into the air. This modified center-of-mass is done using the extension PhysicsParam of 'centerOfMass: Vector3'.

Since cars and tanks usually balance on multiple wheels and treads, and do not rely on an auto-upright behavior, this center of mass is not as critical. 