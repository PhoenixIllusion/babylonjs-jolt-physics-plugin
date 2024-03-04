import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import Jolt from './jolt-import';
import type { float } from '@babylonjs/core/types';
import { Path3D } from '@babylonjs/core/Maths/math.path';
import { TmpVectors } from '@babylonjs/core/Maths/math.vector';
import { GetJoltVec3, SetJoltVec3 } from '.';


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

  getClosestPoint(vecPtr: Jolt.Vec3, _fractionHint: float): number {
    const jVec3 = Jolt.wrapPointer(vecPtr as any, Jolt.Vec3);
    GetJoltVec3(jVec3, TmpVectors.Vector3[0]);

    //const prevPathFrac = (fractionHint-2) / this.length;
    //const nextPathFrac = (fractionHint+2) / this.length;

    //const closestPoint = this.path3d.slice(prevPathFrac %1.0, nextPathFrac).getClosestPositionTo(TmpVectors.Vector3[0]);
    //const closestPoint = this.path3d.getClosestPositionTo(TmpVectors.Vector3[0]);
    //return (fractionHint + 4*(closestPoint-0.5)) % this.length;
    const closestPoint = this.path.getClosestPositionTo(TmpVectors.Vector3[0]);
    return (this.length + closestPoint * this.length) % this.length;
  }

  getPathMaxFraction(): float {
    return this.length;
  }

  getPointOnPath(inFraction: float, outPathPositionPtr: Jolt.Vec3, outPathTangentPtr: Jolt.Vec3, outPathNormalPtr: Jolt.Vec3, outPathBinormalPtr: Jolt.Vec3): void {
    const outPathPosition = Jolt.wrapPointer(outPathPositionPtr as any, Jolt.Vec3);
    const outPathTangent = Jolt.wrapPointer(outPathTangentPtr as any, Jolt.Vec3);
    const outPathNormal = Jolt.wrapPointer(outPathNormalPtr as any, Jolt.Vec3);
    const outPathBinormal = Jolt.wrapPointer(outPathBinormalPtr as any, Jolt.Vec3);

    const position = this.path.getPointAt(inFraction / this.length);
    SetJoltVec3(position, outPathPosition);
    const tangent = this.path.getTangentAt(inFraction / this.length, true);
    SetJoltVec3(tangent, outPathTangent);
    const normal = this.path.getNormalAt(inFraction / this.length, true);
    SetJoltVec3(normal, outPathNormal);
    const binormal = this.path.getBinormalAt(inFraction / this.length, true);
    SetJoltVec3(binormal, outPathBinormal);
  }

  setPathNormals(normals: Vector3 | Vector3[]) {
    const normArray = (normals instanceof Array) ? normals: [normals];
    this.path.getNormals().forEach((tan,i) => {
      const newTan = (normArray.length > 1) ? normArray[i] : normArray[0];
      tan.copyFrom(newTan);
    });
    this.recomputeBinormal();
  }

  setPathTangents(tangents: Vector3 | Vector3[]) {
    const tanArray = (tangents instanceof Array) ? tangents: [tangents];
    this.path.getTangents().forEach((tan,i) => {
      const newTan = (tanArray.length > 1) ? tanArray[i] : tanArray[0];
      tan.copyFrom(newTan);
    });
    this.recomputeBinormal();
  }

  protected recomputeBinormal() {
    const normals = this.path.getNormals();
    const tangents = this.path.getTangents();
    const binormals = this.path.getBinormals();
    binormals.forEach((bi, i) => {
      const normal = normals[i];
      const tangent = tangents[i];
      Vector3.CrossToRef(normal, tangent, bi);
    })
  }
}

export class JoltConstraintPointPath extends JoltConstraintPath {
  constructor(points: Vector3[], normal?: Vector3[], tangent?: Vector3[]) {
    const path = new Path3D(points, normal ? normal[0] : new Vector3(0,1,0), false, true);

    if(tangent) {
      path.getTangents().forEach((tan,i) => {
        const newTan = tangent.length > 1 ? tangent[i] : tangent[0];
        tan.copyFrom(newTan);
      })
    }
    const isNormalY = normal && normal.length == 1 && normal[0].equals(Vector3.UpReadOnly);
    if(normal && !isNormalY ) {
      path.getNormals().forEach((norm,i) => {
        const newNorm = normal.length > 1 ? normal[i] : normal[0];
        norm.copyFrom(newNorm);
      })
    }
    super(path);
    if(tangent || !isNormalY) {
      this.recomputeBinormal();
    }
  }
}