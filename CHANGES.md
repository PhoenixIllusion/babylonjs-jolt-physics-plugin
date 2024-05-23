
### API Changes

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