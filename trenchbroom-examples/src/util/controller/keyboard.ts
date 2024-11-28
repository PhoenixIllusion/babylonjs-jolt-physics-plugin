import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import type { KeyboardInfo } from "@babylonjs/core/Events";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

type DIRECTION_KEY = 'a' | 's' | 'd' | 'w' | 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight';
type ROTATE_KEY = 'q' | 'e' | 'z' | 'c';
type ACTION_KEY = 'r' | ' ';

type KEY = DIRECTION_KEY | ROTATE_KEY | ACTION_KEY;


interface IKeyState<T> {
  LEFT: T;
  RIGHT: T;
  FORWARD: T;
  BACKWARD: T;
  ROTATE_LEFT: T;
  ROTATE_RIGHT: T;
  ROTATE_UP: T;
  ROTATE_DOWN: T;
  JUMP: T;
}

class KeyCodesState implements IKeyState<KEY[]> {
  LEFT: KEY[] = ['a', 'ArrowLeft'];
  RIGHT: KEY[] = ['d', 'ArrowRight'];
  FORWARD: KEY[] = ['w', 'ArrowUp'];
  BACKWARD: KEY[] = ['s', 'ArrowDown'];
  ROTATE_LEFT: KEY[] = ['q'];
  ROTATE_RIGHT: KEY[] = ['e'];
  ROTATE_UP: KEY[] = ['z'];
  ROTATE_DOWN: KEY[] = ['c'];
  JUMP: KEY[] = [' '];
}
export class KeyState implements IKeyState<boolean> {
  LEFT: boolean = false;
  RIGHT: boolean = false;
  FORWARD: boolean = false;
  BACKWARD: boolean = false;
  ROTATE_LEFT: boolean = false;
  ROTATE_RIGHT: boolean = false;
  ROTATE_UP: boolean = false;
  ROTATE_DOWN: boolean = false;
  JUMP: boolean = false;
  KEY_PRESSED: boolean = false;
}

export class KeyboardControl {
  private _keys = new Array<number>();
  private _onCanvasBlurObserver?: Nullable<Observer<AbstractEngine>>;
  private _onKeyboardObserver?: Nullable<Observer<KeyboardInfo>>;

  public state = new KeyState();
  private keys = new KeyCodesState();

  attachControl(scene: Scene) {
    if (this._onCanvasBlurObserver) {
      return;
    }
    const engine = EngineStore.LastCreatedEngine;
    if (engine) {
      this._onCanvasBlurObserver = engine.onCanvasBlurObservable.add(() => {
        this._keys.length = 0;
      });
    }
    const stateKeys = Object.keys(this.keys) as (keyof KeyState & keyof KeyCodesState)[];
    this._onKeyboardObserver = scene.onKeyboardObservable.add((info) => {
      const evt = info.event;
      const key = evt.key as KEY;
      if (!evt.metaKey) {
        if (info.type === KeyboardEventTypes.KEYDOWN || info.type === KeyboardEventTypes.KEYUP) {
          this.state.KEY_PRESSED = false;
          const set_state = info.type === KeyboardEventTypes.KEYDOWN ? true : false;
          stateKeys.forEach(k => {
            if (this.keys[k].indexOf(key) >= 0) {
              this.state[k] = set_state;
            }
            this.state.KEY_PRESSED = this.state.KEY_PRESSED || this.state[k];
          })
        }
      }
    });
  }
  detachControl(scene: Scene) {
    if (scene && EngineStore.LastCreatedEngine) {
      const engine = EngineStore.LastCreatedEngine;
      if (this._onKeyboardObserver) {
        scene.onKeyboardObservable.remove(this._onKeyboardObserver);
      }

      if (this._onCanvasBlurObserver) {
        engine.onCanvasBlurObservable.remove(this._onCanvasBlurObserver);
      }
      this._onKeyboardObserver = null;
      this._onCanvasBlurObserver = null;
    }
    this._keys.length = 0;
  }
}