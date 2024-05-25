import { IBaseVehicleController } from "@phoenixillusion/babylonjs-jolt-plugin/vehicle";
import { DynamicProp, IDynamicProp } from "./custom-ele-util";

function deg(d: number) { return d / 360 * 2 * Math.PI }
export class TachometerElement extends HTMLElement {
  public controller?: IBaseVehicleController

  private bg!: CanvasRenderingContext2D;
  private overlay!: CanvasRenderingContext2D;

  private dynamicItems: IDynamicProp[] = [];

  constructor() {
    super();
  }
  setup() {

    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement('style');
    style.innerHTML =
      `:host {
    position: relative;
    padding: 10px 0;
    width: 200px;
    height: 260px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    background: rgba(0,0,0,0.5);
    color: white;
    font-weight: bold;
    font-family: Arial, Helvetica, sans-serif;
  }
  :host .base canvas{
    position: absolute;
    left: 0;
    top: 10px;
  }
  :host .gears, :host .modes {
    display: flex;
    flex-direction: row;
    border-radius: 3px;
    border: 1px solid white;
    background: #333333;
    z-index: 1;
    margin-bottom:4px;
  }
  :host .speed {
    display: flex;
    flex-direction: row;    align-items: baseline;
    width: 100%;
    font-size: 32px;
    font-weight: bold;
    color: yellow;
    margin-bottom:4px;
  }
  :host .speed .value {
    flex: 1.75;
    text-align: right;
  }
  :host .speed .label {
    flex: 1;
    font-size: 60%;
    text-align: left;
    margin-left: 8px;
  }
  :host .gears .gear, :host .modes .mode {
    padding: 4px;
  }
  :host .gears .active ,:host .modes .active {
    color: red;
  }
`;
    shadow.appendChild(style);
    const tachometerBase = document.createElement('div');
    tachometerBase.className = "base";
    const bg = document.createElement('canvas');
    this.bg = bg.getContext('2d')!;
    tachometerBase.appendChild(bg);
    const overlay = document.createElement('canvas');
    this.overlay = overlay.getContext('2d')!;
    tachometerBase.appendChild(overlay);

    bg.width = bg.height = overlay.width = overlay.height = 200;
    shadow.appendChild(tachometerBase);

    this.renderBackground();

    shadow.appendChild(this.setupSpeed());
    shadow.appendChild(this.setupAutomaticManual());
    shadow.appendChild(this.setupGears());
  }


  startAngle = 140;
  endAngle = 380;
  maxRPMDrawn = 10;

  private getRadialPoint(angle: number, dist: number) {
    const x = 100 + Math.cos(deg(angle)) * dist;
    const y = 100 + Math.sin(deg(angle)) * dist;
    return [x, y];
  }

  private calculateRPMAngle(rpm: number): number {
    const maxRPMDrawn = this.maxRPMDrawn
    const startAngle = this.startAngle;
    const endAngle = this.endAngle;

    const percent = rpm / maxRPMDrawn;
    return startAngle + (endAngle - startAngle) * percent;
  }

  private renderBackground() {
    const ctx = this.bg;
    const controller = this.controller!;
    const startAngle = this.startAngle;
    const endAngle = this.endAngle;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(100, 100, 90, deg(startAngle), deg(endAngle));
    ctx.stroke();

    const maxRPMDrawn = this.maxRPMDrawn = Math.ceil(controller.engine.maxRPM / 1000) * 1000;
    const numHatch = maxRPMDrawn / 1000 * 2;
    const hatchAngle = (endAngle - startAngle) / numHatch;

    //redline
    const redlineStart = this.calculateRPMAngle(controller.transmission.shiftUpRPM);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(100, 100, 85, deg(redlineStart), deg(endAngle));
    ctx.stroke();

    //hatching and number
    ctx.strokeStyle = 'white';
    ctx.textBaseline = "middle";
    ctx.font = "14px Arial"
    for (let i = 0; i <= numHatch; i++) {
      const angle = startAngle + hatchAngle * i;
      let hatchStart = 80;
      let lineWidth = 2;
      if (i % 2 == 0) {
        hatchStart = 72;
        lineWidth = 3;
        const [xT, yT] = this.getRadialPoint(angle, 60);
        ctx.lineWidth = 1.5;
        const text = "" + i / 2;
        ctx.strokeText(text, xT - ctx.measureText(text).width / 2, yT);
      }
      const [xS, yS] = this.getRadialPoint(angle, hatchStart)
      const [xE, yE] = this.getRadialPoint(angle, 90 + lineWidth / 2)

      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(xS, yS);
      ctx.lineTo(xE, yE);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(100, 100, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }

  toMPH(meterPerSecond: number) {
    return (meterPerSecond * 2.2369).toFixed(0)
  }

  private setupSpeed(): HTMLDivElement {
    const speed = document.createElement('div');
    speed.className = 'speed';

    const speedMPH = document.createElement('div');
    speedMPH.className = 'value'
    speed.appendChild(speedMPH);
    this.dynamicItems.push(new DynamicProp(speedMPH,
      (x) => {
        x.innerText = `${this.toMPH(this.controller!.getLinearVelocity().length())}`
      }))
    const label = document.createElement('div');
    label.innerText = 'mph'
    label.className = 'label'
    speed.appendChild(label);

    return speed;
  }

  private setupAutomaticManual(): HTMLDivElement {
    const modes = document.createElement('div');
    modes.className = 'modes';
    const automatic = document.createElement('div');
    automatic.innerText = 'AUTO';
    const manual = document.createElement('div');
    manual.innerText = 'MANUAL';
    automatic.className = manual.className = 'mode';
    this.dynamicItems.push(new DynamicProp(automatic, (x) => x.classList.toggle('active', this.controller!.transmission.mode == 'auto')))
    this.dynamicItems.push(new DynamicProp(manual, (x) => x.classList.toggle('active', this.controller!.transmission.mode != 'auto')))
    modes.appendChild(manual);
    modes.appendChild(automatic);
    return modes;
  }

  private setupGears(): HTMLDivElement {
    const gears = document.createElement('div');
    gears.className = 'gears';

    const gearNames = ['R', 'N'];
    this.controller!.transmission.gearRatios.forEach((_o, i) => {
      gearNames.push('' + (1 + i));
    });
    const allGears: HTMLDivElement[] = [];
    gearNames.forEach(name => {
      const gear = document.createElement('div');
      gear.innerText = name;
      gear.className = 'gear';
      gears.appendChild(gear);
      allGears.push(gear);
    });
    this.dynamicItems.push(new DynamicProp(gears, () => {
      const currentGear = this.controller!.transmission.gear;
      allGears.forEach((gear, i) => {
        gear.classList.toggle('active', (i - 1) === currentGear);
      })
    }));
    return gears;
  }

  private drawTachometerIndicator() {
    const ctx = this.overlay;
    ctx.clearRect(0, 0, 200, 200);

    ctx.beginPath();
    const angle = this.calculateRPMAngle(this.controller!.engine.rpm);
    const [xS, yS] = this.getRadialPoint(angle, 6)
    const [xE, yE] = this.getRadialPoint(angle, 50)

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xS, yS);
    ctx.lineTo(xE, yE);
    ctx.stroke();
    ctx.stroke();
  }

  update(): void {
    this.drawTachometerIndicator();
    this.dynamicItems.forEach(x => x.update());
  }

}
customElements.define("basic-tachometer", TachometerElement);
