import { createFloor } from './example';
import Jolt from '../plugin/jolt-import';

export default (): (void|((time: number, delta: number) =>void)) => {

    createFloor();

    let filter = new Jolt.GroupFilterTable(10);
    for (let z = 0; z < 9; ++z)
      filter.DisableCollision(z, z + 1);

}