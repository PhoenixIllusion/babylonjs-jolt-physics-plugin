![Set Layer](./img/set_motion_type.jpg)

[src/scene/set_layer.ts](../src/scene/set_layer.ts)

### Set Layer

This demo displays a customized Collision Layer setup that has NON_MOVING, MOVING, and OTHER layers of collision.
The OTHER layer will not interact with anything effectively turning into a Sensor (non-collidable).

A sphere is setup on a stack of 3 block marked as NON_MOVING.
At regular intervals, the top, middle, and bottom layer will be flagged as OTHER layer and allow the sphere to fall through.
The sphere will need to be 'woken up' in case it fell asleep so that it will begin following physics and fall again.
