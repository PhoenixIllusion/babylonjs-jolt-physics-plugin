
### API Changes

#### Version 1.4.0
* Set Motion Type
* Move Kinematic
* Set Layer - PhysicsImpostor, Raycast, CharacterVirtual

##### Major
* Collision
  * Support registering a collision system during Plugin init
    * Layer - Well defined layers of collision that interact with only other layers
    * Mask - Collision of objects defined by meeting requirements of a collision mask + interaction mask
* Buoyancy
  * setBuoyancyInterface - set a callback that will be called each physics frame to register the fluid surface level and properties

##### New Demos
* Alternative Collision Filtering - Demo of using Mask-based Collision group/mask
* Buoyancy - Demos spheres dropped into independent buoyant regions
* Buoyancy Aggregate - Demo spheres dropped into single buoyant interface wrapping several regions of fluid

##### Breaking in 1.4.0
* Gravity - Callback for custom gravity now has 1st parameter of 'impostor'
* Tracked Vehicle - Fixed typo in name from `Trackeded` to `Tracked`
* Collision Group - changed requirement from raw Jolt collision group to wrapped `CollisionTableFilter`


#### Version 1.3.0
* Wheeled Vehicle - Modify traction using friction curves

##### Major
* Gravity System and GravityInterface
  * setGravityOverride available on physicsImpostors, characters, and vehicle controllers

##### New Demos
* Vehicle Kart - high speed track with collectables
* Gravity Override
* Gravity Factor
* Character Virtual - Sphere and Ribbon gravity
* Vehicle Kart - Sphere and Ribbon gravity

##### Breaking in 1.3.0
* Center of Mass - fixed spelling

#### Version 1.2.0
* Heightfield - enable support of alphaFilter
* Motors - changing target value will auto-activate the constraint
* Impostor: SetShape support
  * extra Parameter: copyShape(impostor: PhysicsImpostor) to copy existing shape instead of creating new
* Character Virtual - support runtime modifying configuration values
* Impostor: GetShapeVertexData added

##### Major
* Vehicles
  * `Tracked` variant added
  * Now importable from independent imports `vehicles/wheeled`, `vehicles/motorcycle`, `vehicles/tracked`
  * Wrapped access to many vehicle modifiable internals
    * non-dynamic-update values cached on JS side

#### New Demos
* Vehicles: Tracked
* Set Shape

##### Breaking in 1.2.0
* Vehicle Controller `wheelTransforms` removed
  * Now accessible via controller `wheels` array
    * worldPosition
    * worldRotation