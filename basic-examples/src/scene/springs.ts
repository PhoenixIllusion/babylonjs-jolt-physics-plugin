import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SceneCallback, createBox, createFloor } from '../util/example';
import { JoltDistanceJoint, SpringMode, JoltHingeJoint } from '@phoenixillusion/babylonjs-jolt-plugin/joints'

import { float } from '@babylonjs/core/types';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';

export default (_scene: Scene): SceneCallback => {
  createFloor({ friction: 0.8, mass: 0, restitution: 0 });

  type SpringConfig = [SpringMode, float, float, float, Color3];

  const configs: SpringConfig[] = [
    [ SpringMode.Frequency, 0, 0, 0, Color3.Red() ],
    [ SpringMode.Frequency, 1, 0, 0, Color3.Blue() ],
    [ SpringMode.Frequency, 2, 0, 0, Color3.Green() ],
    [ SpringMode.Frequency, 3, 0, 0, Color3.Yellow() ],
    [ SpringMode.Frequency, 4, 0, 0, Color3.FromInts(0,255,255)],

    [ SpringMode.Stiffness, 0, 0, 0, Color3.Red() ],
    [ SpringMode.Stiffness, 0, 0, 250, Color3.Blue() ],
    [ SpringMode.Stiffness, 0, 0.125, 0, Color3.Green() ],
    [ SpringMode.Stiffness, 0, 0.125, 250, Color3.Yellow() ],
    [ SpringMode.Stiffness, 0, 0.125, 500, Color3.FromInts(0,255,255)],

  ]

  configs.forEach((config, i) => {
    const [mode, freq, damping, stiff, color ] = config;
    {
      const position = new Vector3(-10.0 + 2.0 * i + (i>4 ? 2 : 0), 5, 0);
      const anchor = createBox(position, Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 0 }, i>4 ? '#333333' : '#ffffff');
      const weight = createBox(position.add(new Vector3(0,-2,0)), Quaternion.Identity(), new Vector3(0.5, 0.5, 0.5), { mass: 10 }, color.toHexString());
      const rope = new JoltDistanceJoint(position.add(new Vector3(0,-0.5,0)));
      rope.setMinMax(0,2);
      rope.spring.mode = mode;
      if(mode == SpringMode.Frequency) {
        rope.spring.frequency = freq;
      } else {
        rope.spring.stiffness = stiff;
      }
      rope.spring.damping = damping;
  
      weight.physics.addJoint(anchor.physics, rope);
    }

    {
      const position = new Vector3(-10.0 + 2.0 * i + (i>4 ? 2 : 0), 10, 0);
      const anchor = createBox(position, Quaternion.Identity(), new Vector3(0.5, 0.1, 0.5), { mass: 0 }, i>4 ? '#333333' : '#ffffff');
      const weight = createBox(position.add(new Vector3(1,0,0)), Quaternion.Identity(), new Vector3(0.3, 0.1, 0.3), { mass: 10 }, color.toHexString());
      const hinge = new JoltHingeJoint(position.add(new Vector3(0.5,0,0)), new Vector3(0,0,1), new Vector3(1,0,0));
      hinge.setMinMax(0,0);
      hinge.spring.mode = mode;
      if(mode == SpringMode.Frequency) {
        hinge.spring.frequency = freq;
      } else {
        hinge.spring.stiffness = stiff;
      }
      hinge.spring.damping = damping;
  
      weight.physics.addJoint(anchor.physics, hinge);
    }


  });
}
