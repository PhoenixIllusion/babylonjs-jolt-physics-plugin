import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EntityGeometry, BrushGeometry, FaceGeometry } from '@phoenixillusion/babylonjs-trenchbroom-loader/hxlibmap';

export class GeometryUtil {
  static HullsFromGeometry(geometry: EntityGeometry): Vector3[][] {
    const hulls: Vector3[][] = [];
    geometry.forEach( (brushGeo: BrushGeometry) => {
        const brushPoints: Vector3[] = [];
        brushGeo.forEach( (faceGeo: FaceGeometry) => {
            faceGeo.indices.forEach((index: number) => {
                const pos = faceGeo.vertices[index].vertex;
                brushPoints.push(new Vector3(-pos.y, pos.z, pos.x));
            })
        });
        hulls.push(brushPoints);
    });
    return hulls;
  }
}