import type { BufferGeometry, Object3D } from "three";

/** Convert conventional Z-up STL coordinates into the Workbench's Y-up scene. */
export function orientStlForWorkbench(geometry: BufferGeometry): BufferGeometry {
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Convert the Y-up Workbench scene back to Z-up before writing an STL file. */
export function orientWorkbenchForStl(root: Object3D): void {
  root.rotateX(Math.PI / 2);
  root.updateMatrixWorld(true);
}
