export interface IDynamicProp {
  update(): void;
}
export class DynamicProp<T extends HTMLElement> implements IDynamicProp {
  constructor(public ele: T, private onUpdate: (ele: T) => void) { }
  update() {
    this.onUpdate(this.ele);
  }
}