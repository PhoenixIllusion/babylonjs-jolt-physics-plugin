
import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
import { JoltCollisionKey, JoltContactSetting, OnContactValidateResponse } from '../jolt-contact';


export type OnContactValidateCallback = (body: PhysicsImpostor) => OnContactValidateResponse;
export type OnContactRemoveCallback = (body: PhysicsImpostor) => void;
export type OnContactCallback = (body: PhysicsImpostor, offset: Vector3, contactSettings: JoltContactSetting) => void;

export interface JoltCollisionCallback<T extends OnContactValidateCallback | OnContactCallback> { callback: T, otherImpostors: Array<PhysicsImpostor> }


export interface JoltPhysicsCollideCallbacks {
  'on-contact-add': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-remove': JoltCollisionCallback<OnContactRemoveCallback>[],
  'on-contact-persist': JoltCollisionCallback<OnContactCallback>[],
  'on-contact-validate': JoltCollisionCallback<OnContactValidateCallback>[]
}

export class JoltPhysicsImpostor extends PhysicsImpostor {

  public _JoltPhysicsCallback: JoltPhysicsCollideCallbacks = { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [], 'on-contact-remove': [] }

  public registerOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public registerOnJoltPhysicsCollide(kind: 'on-contact-remove', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactRemoveCallback): void;
  public registerOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public registerOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    if (kind == 'on-contact-validate') {
      const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
      list.push({ callback: func as OnContactValidateCallback, otherImpostors: collidedAgainstList });
    }  else 
    if (kind == 'on-contact-remove') {
      const list: JoltPhysicsCollideCallbacks['on-contact-remove'] = this._JoltPhysicsCallback['on-contact-remove'];
      list.push({ callback: func as OnContactRemoveCallback, otherImpostors: collidedAgainstList });
    } else {
      const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
      list.push({ callback: func as OnContactCallback, otherImpostors: collidedAgainstList });
    }
  }
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-add' | 'on-contact-persist', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-validate', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactValidateCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: 'on-contact-remove', collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>, func: OnContactRemoveCallback): void;
  public unregisterOnJoltPhysicsCollide(kind: JoltCollisionKey, collideAgainst: PhysicsImpostor | Array<PhysicsImpostor>,
    func: OnContactCallback | OnContactValidateCallback): void {
    const collidedAgainstList: Array<PhysicsImpostor> = collideAgainst instanceof Array ?
      <Array<PhysicsImpostor>>collideAgainst
      : [<PhysicsImpostor>collideAgainst];
    let index = -1;

    const found = this._JoltPhysicsCallback[kind].some((cbDef, idx) => {
      if (cbDef.callback === func && cbDef.otherImpostors.length === collidedAgainstList.length) {
        const sameList = cbDef.otherImpostors.every((impostor) => {
          return collidedAgainstList.indexOf(impostor) > -1;
        });
        if (sameList) {
          index = idx;
        }
        return sameList;
      }
      return false;
    });

    if (found) {
      this._JoltPhysicsCallback[kind].splice(index, 1);
    } else {
      Logger.Warn('Function to remove was not found');
    }
  }

  public onJoltCollide(kind: 'on-contact-add' | 'on-contact-persist', event: { body: PhysicsImpostor, ioSettings: JoltContactSetting }): void;
  public onJoltCollide(kind: 'on-contact-validate', event: { body: PhysicsImpostor }): OnContactValidateResponse | undefined;
  public onJoltCollide(kind: 'on-contact-remove', event: { body: PhysicsImpostor }): void;
  public onJoltCollide(kind: JoltCollisionKey, event: { body: PhysicsImpostor, ioSettings: JoltContactSetting } | { body: PhysicsImpostor }): OnContactValidateResponse | undefined | void {
    if (!this._JoltPhysicsCallback[kind].length) {
      return undefined;
    }
    if (event.body) {
      if (kind == 'on-contact-validate') {
        const ret: OnContactValidateResponse[] = [];
        const list: JoltPhysicsCollideCallbacks['on-contact-validate'] = this._JoltPhysicsCallback['on-contact-validate'];
        const e = event as { body: PhysicsImpostor };
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          const r = obj.callback(e.body);
          if (r !== undefined) {
            ret.push(r);
          }
        });
        //if you have registered multiple validate callback between A & B and they disagree, you have big problems on your hand so I'm not trying to combine
        if (ret.length > 1) {
          console.warn(`Warning: [${ret.length}] Validation Listeners registered between: `, this, event.body);
        }
        return ret[0];
      } else 
      if (kind == 'on-contact-remove') {
        const list: JoltCollisionCallback<OnContactRemoveCallback>[] = this._JoltPhysicsCallback[kind];
        const e = event as { body: PhysicsImpostor, ioSettings: JoltContactSetting };
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          obj.callback(e.body);
        });
      } else {
        let collisionHandlerCount = 0;
        const list: JoltCollisionCallback<OnContactCallback>[] = this._JoltPhysicsCallback[kind];
        const e = event as { body: PhysicsImpostor, ioSettings: JoltContactSetting };
        list.filter((obj) => {
          return obj.otherImpostors.indexOf(event.body) !== -1;
        }).forEach((obj) => {
          obj.callback(e.body, new Vector3(), e.ioSettings);
          collisionHandlerCount++;
        });
        //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
        if (collisionHandlerCount > 1) {
          console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
        }
      }
    }
  }
}