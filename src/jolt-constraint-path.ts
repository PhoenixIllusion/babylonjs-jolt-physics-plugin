import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Curve3, Path3D } from '@babylonjs/core/Maths/math.path';
import { TmpVectors } from '@babylonjs/core/Maths/math.vector';
import { BackEase, BounceEase, CircleEase, CubicEase, EasingFunction, ElasticEase, ExponentialEase, IEasingFunction, QuadraticEase, QuarticEase, QuinticEase, SineEase } from '@babylonjs/core/Animations/easing';
import { GetJoltVec3, SetJoltVec3 } from './jolt-util';


export class JoltConstraintPath {
  public looping = true;
  private length: float = 0;
  private ptr: Jolt.PathConstraintPathJS;
  constructor(public path: Path3D) {
    this.length = path.length();
    const points = path.getPoints();
    this.looping = points[0].equals(points[points.length - 1]);
    
    this.ptr = new Jolt.PathConstraintPathJS();
    this.ptr.GetClosestPoint = this.getClosestPoint.bind(this);
    this.ptr.GetPathMaxFraction = this.getPathMaxFraction.bind(this);
    this.ptr.GetPointOnPath = this.getPointOnPath.bind(this);
  }

  getPtr() {
    return this.ptr;
  }

  getClosestPoint(vecPtr: Jolt.Vec3, fractionHint: float, delta = 2): number {
    const jVec3 = Jolt.wrapPointer(vecPtr as any, Jolt.Vec3);
    GetJoltVec3(jVec3, TmpVectors.Vector3[0]);

    let prevPathFrac = fractionHint-delta;
    let nextPathFrac = fractionHint+delta;

    if(this.looping) {
      if(nextPathFrac > this.length) {
        nextPathFrac -=  this.length;
        prevPathFrac -=  this.length;
      }
    } else {
      nextPathFrac = Math.min(this.length, nextPathFrac);
      prevPathFrac = Math.max(0, prevPathFrac);
    }

    if(prevPathFrac >= 0) {
      return this.getClosestPositionTo(TmpVectors.Vector3[0], prevPathFrac, nextPathFrac).closestPosition;
    } else {
      const pathA = this.getClosestPositionTo(TmpVectors.Vector3[0], 0, nextPathFrac);
      const pathB = this.getClosestPositionTo(TmpVectors.Vector3[0], prevPathFrac + this.length, this.length);
      const position = pathA.smallestDistance < pathB.smallestDistance ? pathA.closestPosition : pathB.closestPosition;
      return position;
    }
  }

  public getClosestPositionTo(target: Vector3, min: number, max: number) {
    let smallestDistance = Number.MAX_VALUE;
    let closestPosition = 0.0;
    const curve = this.path.getPoints();
    const distances = this.path.getDistances();

    let startIndex = this.path.getPreviousPointIndexAt(min/this.length);
    const endIndex = this.path.getPreviousPointIndexAt(max/this.length) + 1;


    for (let i = startIndex; i < endIndex && i < curve.length - 1; i++) {
        const point = curve[i + 0];
        const tangent = curve[i + 1].subtract(point).normalize();
        const subLength = distances[i + 1] - distances[i + 0];
        const subPosition = Math.min((Math.max(Vector3.Dot(tangent, target.subtract(point).normalize()), 0.0) * Vector3.Distance(point, target)) / subLength, 1.0);
        const distance = Vector3.Distance(point.add(tangent.scale(subPosition * subLength)), target);

        if (distance < smallestDistance) {
            smallestDistance = distance;
            closestPosition = (distances[i + 0] + subLength * subPosition);
        }
    }
    return { closestPosition, smallestDistance };
}

  getPathMaxFraction(): float {
    return this.length;
  }

  getPointOnPath(inFraction: float, outPathPositionPtr: Jolt.Vec3, outPathTangentPtr: Jolt.Vec3, outPathNormalPtr: Jolt.Vec3, outPathBinormalPtr: Jolt.Vec3): void {
    const outPathPosition = Jolt.wrapPointer(outPathPositionPtr as any, Jolt.Vec3);
    const outPathTangent = Jolt.wrapPointer(outPathTangentPtr as any, Jolt.Vec3);
    const outPathNormal = Jolt.wrapPointer(outPathNormalPtr as any, Jolt.Vec3);
    const outPathBinormal = Jolt.wrapPointer(outPathBinormalPtr as any, Jolt.Vec3);

    const frac = inFraction / this.length;
    const position = this.path.getPointAt(frac);
    const tangent = this.path.getTangentAt(frac, true);
    const normal = this.path.getNormalAt(frac, true);
    const binormal = this.path.getBinormalAt(frac, true);
    SetJoltVec3(position, outPathPosition);
    SetJoltVec3(tangent, outPathTangent);
    SetJoltVec3(normal, outPathNormal);
    SetJoltVec3(binormal, outPathBinormal);
  }

  setPathNormals(normals: Vector3 | Vector3[]) {
    const normArray = (normals instanceof Array) ? normals: [normals];
    setPath3DNormals(this.path, normArray);
    recomputeBinormal(this.path);
  }
}

export function interpolateNormalsOverCurve(curve: Curve3, normals: [Vector3, Vector3], easing: IEasingFunction): {positions: Vector3[], normals: Vector3[]} {
  const length = curve.length();
  const newPositions = curve.getPoints();
  const newNormals: Vector3[] = [];
  let distance = 0;
  for(let i=0; i < newPositions.length - 1; i++){
    const n = Vector3.SlerpToRef(normals[0], normals[1], easing.ease(distance/length), new Vector3())
    const t = newPositions[i+1].subtract(newPositions[i]).normalize();
    const b = n.cross(t).normalize();
    Vector3.CrossToRef(t,b,n).normalize();
    newNormals.push(n);
    distance += Vector3.Distance(newPositions[i], newPositions[i+1]);
  }
  newNormals.push(normals[1]);

  return { positions: newPositions, normals: newNormals };
}

function calculateCurve(points: [Vector3,Vector3,Vector3], normals: [Vector3, Vector3], curveInset: number, curveResolution: number, easing: IEasingFunction ): {positions: Vector3[], normals: Vector3[]} {
  const p0 = points[0].subtract(points[1]).normalize().scaleInPlace(curveInset);
  const p1 = points[2].subtract(points[1]).normalize().scaleInPlace(curveInset);;
  const curve3 = Curve3.CreateQuadraticBezier(points[1].add(p0), points[1], points[1].add(p1), curveResolution);
  return interpolateNormalsOverCurve(curve3, normals, easing);
}

export function createCurvedCorners(points: Vector3[],  normals: Vector3[], curveInset: number, curveResolution: number, normalEasing: EasingMethod): {positions: Vector3[], normals: Vector3[]} {
  const looping = (points[0].equals(points[points.length - 1]))
  if(looping) {
    points = [... points, points[1]];
  }
  const triples: {p: [Vector3,Vector3,Vector3], n: [Vector3,Vector3]}[] = [];
  for(let i=0;i<points.length-2;i++) {
    triples.push({
      p: [points[i],points[i+1],points[i+2]],
      n: normals.length > 1 ? [normals[i], normals[(i+1) % normals.length]]: [normals[0],normals[0]]
    });
  }
  const newPoints: Vector3[] = [];
  const newNormals: Vector3[] = [];
  if(!looping) {
    newPoints.push(points[0]);
    newNormals.push(normals[0]);
  }
  triples.forEach(triple => {
    const curve = calculateCurve(triple.p, triple.n, curveInset, curveResolution, getEasing(normalEasing));
    newPoints.push(... curve.positions);
    newNormals.push(... curve.normals);
  });
  if(!looping) {
    newPoints.push(points[points.length-1]);
    newNormals.push(normals[normals.length-1]);
  } else {
    newPoints.unshift(newPoints[newPoints.length-1]);
    newNormals.unshift(newNormals[newNormals.length-1]);
  }
  return { positions: newPoints, normals: newNormals };
}

export function setPath3DNormals(path: Path3D, normals: Vector3[]) {
  path.getNormals().forEach((norm,i) => {
    const newTan = normals[i];
    norm.copyFrom(newTan);
  });
  recomputeBinormal(path);
}

function recomputeBinormal(path: Path3D) {
  const normals = path.getNormals();
  const tangents = path.getTangents();
  const binormals = path.getBinormals();
  binormals.forEach((bi, i) => {
    const normal = normals[i].normalize();
    const tangent = tangents[i].normalize();
    Vector3.CrossToRef(tangent, normal, bi).normalize();
  })
}

export function createPath3DWithCurvedCorners(points: Vector3[],  normals: Vector3[], curveInset: number, curveResolution: number, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  const curve = createCurvedCorners(points, normals, curveInset, curveResolution, normalEasing);
  const path3d = new Path3D(curve.positions, normals[0], false, true);
  setPath3DNormals(path3d, curve.normals);
  return path3d;
}

export function createPath3DWithHermitePath(points: Vector3[], tangents: Vector3[], normals: Vector3[], curveResolution: number = 12, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  let hermite: Curve3 = Curve3.CreateHermiteSpline(points[0], tangents[0], points[1], tangents[1], curveResolution);
  let pathNormals = interpolateNormalsOverCurve(hermite, [normals[0],normals[1]], getEasing(normalEasing)).normals;
  for(let i=1;i<points.length -1; i++) {
    const curve = Curve3.CreateHermiteSpline(points[i], tangents[i], points[i+1], tangents[i+1], curveResolution);
    pathNormals.pop();
    pathNormals.push(... interpolateNormalsOverCurve(curve, [normals[i], normals[i+1]], getEasing(normalEasing)).normals)
    hermite = hermite.continue(curve);
   }
  const path3d = new Path3D(hermite.getPoints(), Vector3.Up(), false, true);
  setPath3DNormals(path3d, pathNormals);
  return path3d;
}

export class JoltConstraintPointPath extends JoltConstraintPath {
  constructor(points: Vector3[], normal: Vector3[] = [new Vector3(0,1,0)]) {
    const path = createPath3DWithCurvedCorners(points, normal, 0.25, 12);
    super(path);
  }
}


const LinearEase = class extends EasingFunction { ease(gradient: number) { return gradient; }};

export enum EasingMethod {
  LINEAR,
  SINE,
  QUADRATIC,
  CUBIC,
  QUARTIC,
  QUINTIC,
  EXPONENTIAL,
  CIRCLE,
  BACK,
  ELASTIC,
  BOUNCE
}

type EasingMethodHash = { [key in EasingMethod]: {new (): EasingFunction } }

const EASE_METHODS:  EasingMethodHash = {
  [EasingMethod.SINE]: SineEase,
  [EasingMethod.LINEAR]: LinearEase,
  [EasingMethod.QUADRATIC]: QuadraticEase,
  [EasingMethod.CUBIC]: CubicEase,
  [EasingMethod.QUARTIC]: QuarticEase,
  [EasingMethod.QUINTIC]: QuinticEase,
  [EasingMethod.EXPONENTIAL]: ExponentialEase,
  [EasingMethod.CIRCLE]: CircleEase,
  [EasingMethod.BACK]: BackEase,
  [EasingMethod.ELASTIC]: ElasticEase,
  [EasingMethod.BOUNCE]: BounceEase
}

function getEasing(easing: EasingMethod): IEasingFunction {
  let easeClass: {new (): EasingFunction } | undefined = EASE_METHODS[easing];
  if(!easeClass) {
    easeClass = LinearEase;
  }
  const ease = new easeClass();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  return ease;
}


export function createPath3DWithCatmullRomPath(points: Vector3[], normals: Vector3[], curveResolution: number = 12, looped = true, normalEasing: EasingMethod = EasingMethod.LINEAR ): Path3D {
  function calcNormalForPoints(p0: Vector3, p1: Vector3, normal: Vector3): void {
    const t = p1.subtract(p0).normalize();
    const b = normal.cross(t).normalize();
    Vector3.CrossToRef(t,b,normal).normalize();
  }
  const catmullRom: Curve3 = Curve3.CreateCatmullRomSpline(points, curveResolution, true);
  const curvePoints = catmullRom.getPoints();
  const curveNormals: Vector3[] = [];
  normals.forEach((normal, i) => {
    if(i < normals.length - 1) {
      calcNormalForPoints(curvePoints[i * curveResolution], curvePoints[i * curveResolution + 1], normal);
    }
  })
  if(looped) {
    normals = [... normals, normals[0]];
  }
  for(let i=0;i<normals.length - 1; i++) {
    const curve = new Curve3(curvePoints.slice(i * (curveResolution), (i+1)*curveResolution+1));
    let path = interpolateNormalsOverCurve(curve, [normals[i],normals[i+1]], getEasing(normalEasing));
    if(curveNormals.length > 0) {
      const lastN = curveNormals.pop()!;
      const newN = path.normals.shift()!;
      Vector3.SlerpToRef(lastN, newN, 0.5, newN);
      path.normals.unshift(newN);
    }
    curveNormals.push(... path.normals);
  }
  const path3d = new Path3D(curvePoints, Vector3.Up(), false, true);
  setPath3DNormals(path3d, curveNormals);
  return path3d;
}