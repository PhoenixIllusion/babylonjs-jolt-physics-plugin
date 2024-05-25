import { EngineStore } from "@babylonjs/core/Engines/engineStore";
import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import type { KeyboardInfo } from "@babylonjs/core/Events";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Scene } from "@babylonjs/core/scene";
import { Nullable } from "@babylonjs/core/types";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";

export class BaseKeyCodes {
  LEFT: KeyboardEventTypes[] = ['KeyA', 'ArrowLeft'];
  RIGHT: KeyboardEventTypes[] = ['KeyD', 'ArrowRight'];
  FORWARD: KeyboardEventTypes[] = ['KeyW', 'ArrowUp'];
  BACKWARD: KeyboardEventTypes[] = ['KeyS', 'ArrowDown'];
  ROTATE_LEFT: KeyboardEventTypes[] = ['KeyQ'];
  ROTATE_RIGHT: KeyboardEventTypes[] = ['KeyE'];
  ROTATE_UP: KeyboardEventTypes[] = ['KeyZ'];
  ROTATE_DOWN: KeyboardEventTypes[] = ['KeyC'];
}

export type KeyCodeState<T extends BaseKeyCodes> = { [key in keyof T]: boolean };

export class KeyState<T extends BaseKeyCodes> {
  state: KeyCodeState<T>;
  constructor(keycodes: T) {
    const state: { [k: string]: boolean } = {};
    Object.keys(keycodes).forEach(key => {
      state[key] = false;
    });
    this.state = state as any;
  }
}

export class KeyboardControl<T extends BaseKeyCodes> {
  private _keys = new Array<number>();
  private _onCanvasBlurObserver?: Nullable<Observer<AbstractEngine>>;
  private _onKeyboardObserver?: Nullable<Observer<KeyboardInfo>>;

  public state: KeyCodeState<T>;
  private keys: T;

  constructor(keycodes: T) {
    this.keys = keycodes;
    this.state = new KeyState(keycodes).state;
  }

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
    this._onKeyboardObserver = scene.onKeyboardObservable.add((info) => {
      const evt = info.event;
      const key = evt.code;
      if (!evt.metaKey) {
        if (info.type === KeyboardEventTypes.KEYDOWN || info.type === KeyboardEventTypes.KEYUP) {
          const set_state = info.type === KeyboardEventTypes.KEYDOWN ? true : false;
          Object.entries(this.keys).forEach(([k, v]) => {
            if (v.indexOf(key) >= 0) {
              this.state[k as keyof T] = set_state;
            }
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