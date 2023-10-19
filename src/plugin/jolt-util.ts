import { Vector3 } from '@babylonjs/core';
import Jolt from './jolt-import';


export const SetJoltVec3 = (vec3: Vector3, jVec3: Jolt.Vec3) => {
  jVec3.Set(vec3.x, vec3.y, vec3.z)
}
export const GetJoltVec3 = (jVec3: Jolt.Vec3, vec3: Vector3) => {
  vec3.set(jVec3.GetX(), jVec3.GetY(), jVec3.GetZ())
}

export type FILTER_PROPS<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
}[keyof Base]; // <- gets all keys of specified types.


export function WrapJolt<T extends { jolt: K },  K, L extends keyof K>(jolt: new () => K, key: L) {
  return function (target: ClassAccessorDecoratorTarget<T, K[L]>, context: ClassAccessorDecoratorContext<T, K[L]>): ClassAccessorDecoratorResult<T, K[L]> {
    return {
      get(): K[L] {
        return this.jolt[key];
      },
      set(val: K[L]) {
        this.jolt[key] = val;
      },
      init(this: T, initialValue: K[L]) { return initialValue; }
    }
  }
}
export function WrapJoltReversable<T extends {jolt: K, rev: boolean}, K, L extends keyof K>(jolt: new () => K, key1: L, key2: L) {
  type RetType = K[L];
  return function (target: ClassAccessorDecoratorTarget<T, RetType>, context: ClassAccessorDecoratorContext<T, RetType>): ClassAccessorDecoratorResult<T, RetType> {
    return {
      get(): RetType {
        return (this.rev ? this.jolt[key2] :this.jolt[key1]);
      },
      set(val: RetType) {
        this.rev ? (this.jolt[key2] = val) : (this.jolt[key1] = val);
      },
      init(this: T, initialValue: RetType) { return initialValue; }
    }
  }
}
export function WrapJoltVec3<T extends { jolt: K}, K>(jolt: new () => K, key: FILTER_PROPS<K, Jolt.Vec3>) {
  return function (target: ClassAccessorDecoratorTarget<T, Vector3>, context: ClassAccessorDecoratorContext): ClassAccessorDecoratorResult<T, Vector3> {
    let v3 = new Vector3();
    return {
      get(): Vector3 {
        GetJoltVec3(this.jolt[key] as Jolt.Vec3, v3);
        return v3;
      },
      set(val: Vector3) {
        v3 = val;
        SetJoltVec3(val, this.jolt[key] as Jolt.Vec3);
      },
      init(this: T, initialValue: Vector3) { return initialValue; }
    }
  }
}