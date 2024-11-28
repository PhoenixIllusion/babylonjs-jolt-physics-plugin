import type Jolt from '@phoenixillusion/babylonjs-jolt-plugin/import';
import { DynamicProp, IDynamicProp } from './custom-ele-util';
import { App } from '../app';



export class MemoryAvailableElement extends HTMLElement {
  private dynamicItems: IDynamicProp[] = [];
  base = 0;
  constructor(private jolt: typeof Jolt) {
    super();
    this.base = this.jolt.JoltInterface.prototype.sGetTotalMemory() - this.jolt.JoltInterface.prototype.sGetFreeMemory();
    this.setup();
  }
  setup() {
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement('style');
    style.innerHTML =
      `:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  padding: 5px;
}
:host .bar-chart {
  display: flex;
  align-self: stretch;
  align-items: stretch;
  flex-direction: row;
  justify-content: flex-start;
  border: 1px solid black;
}
:host .bar-chart div {
  background: lightgreen;
}
`;
    const barChart = document.createElement('div');
    barChart.className = 'bar-chart'
    const barInner = document.createElement('div');
    barChart.appendChild(barInner);

    const memoryText = document.createElement('div');
    let time = performance.now();
    this.dynamicItems.push(new DynamicProp(barChart, _X => {
      const NOW = performance.now();
      if (NOW - time > 500) {
        time = NOW;
        const freeMem = this.jolt.JoltInterface.prototype.sGetFreeMemory();
        const totalMem = this.jolt.JoltInterface.prototype.sGetTotalMemory();
        const percentUsed = (100 * (totalMem - freeMem - this.base) / totalMem).toFixed(2) + '%';
        barInner.style.width = percentUsed;
        barInner.innerText = percentUsed;
        memoryText.innerText = `${totalMem - freeMem - this.base} (+ ${this.base}) / ${totalMem}`;
      }
    }));
    const dispose = document.createElement('button');
    dispose.onclick = () => {
      App.instance?.disposeScene();
      this.update();
    }
    dispose.innerText = 'Free Scene';
    shadow.append(style, barChart, memoryText, dispose);
  }

  update() {
    this.dynamicItems.forEach(x => x.update());
    requestAnimationFrame(() => {
      this.update();
    })
  }
}
customElements.define("memory-available", MemoryAvailableElement);


export function setupMemoryAvailable(jolt: typeof Jolt): MemoryAvailableElement {
  const memAvailable: MemoryAvailableElement = new MemoryAvailableElement(jolt);
  document.body.append(memAvailable);
  memAvailable.update();
  return memAvailable;
}