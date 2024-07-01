import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export namespace SVG {
  export interface Element {
    id: string
  }
  export interface Point extends Element {
    center: Vector3
  }
  export interface Circle extends Point {
    radius: number
  }
  export interface Ellipse extends Circle {
    rx: number,
    ry: number
  }

  export interface Rect extends Point {
    width: number;
    height: number;
  }
}


function svgVal(v: SVGAnimatedLength): number {
  return v.baseVal.value;
}

function getEllipse(ellipse: SVGEllipseElement): SVG.Ellipse {
  const { cx, cy, rx, ry } = ellipse;
  const [ cx_, cy_, rx_, ry_ ] = [ cx, cy, rx, ry  ].map(svgVal);
  const center =  new Vector3(cx_, 0, cy_);
  return {
    center,
    rx: rx_,
    ry: ry_,
    radius: Math.max(rx_,ry_),
    id: ellipse.id || ''
  }
}

function getAreaFromRect(rect: SVGRectElement): SVG.Rect {
  const x = rect.x.baseVal.value;
  const y = rect.y.baseVal.value;
  const width = rect.width.baseVal.value;
  const height = rect.height.baseVal.value;

  return {
    center: new Vector3(x + width / 2, 0, y + height / 2),
    width,
    height,
    id: rect.id || ''
  }
}

export async function loadSVGData(path: string, scale: number) {
  const xml = await fetch(path).then(res => res.text());
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'image/svg+xml');
  const svg = doc.querySelector('svg') as SVGSVGElement;
  const paths = Array.from(svg.querySelectorAll('path'));
  const svgWidth = svg.viewBox!.baseVal.width;
  const svgHeight = svg.viewBox!.baseVal.height;
  const offset = new Vector3(-(svgWidth * scale) / 2, 0, -(svgHeight * scale) / 2);
  const pathArray: SVG.Rect[] = [];
  paths.forEach(path => {
    const len = path.getTotalLength();
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(len);
    const dx = Math.abs(start.x - end.x) * scale;
    const dy = Math.abs(start.y - end.y) * scale;
    const midX = ((start.x + end.x) / 2) * scale;
    const midY = ((start.y + end.y) / 2) * scale;
    pathArray.push({center: new Vector3(midX, 0, midY).add(offset), width: dx, height: dy, id: path.id || ''})
  })
  
  const ellipse = Array.from(svg.querySelectorAll('ellipse')).map(ele => {
    const el = getEllipse(ele);
    el.center = el.center.scale(scale).add(offset)
    el.radius *= scale;
    el.rx *= scale;
    el.ry *= scale;
    return el;
  })
  const rect = Array.from(svg.querySelectorAll('rect')).map(ele => {
    const el = getAreaFromRect(ele);
    el.center = el.center.scale(scale).add(offset)
    el.width *= scale;
    el.height *= scale;
    return el;  
  })
  return {
    paths: pathArray,
    ellipse,
    rect
  }
}