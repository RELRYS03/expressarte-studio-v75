import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { orientStlForWorkbench, orientWorkbenchForStl } from "./stl-orientation";

describe("STL axis conversion", () => {
  it("converts Z-up STL geometry to the Workbench Y-up coordinate system", () => {
    const geometry = new BoxGeometry(10, 20, 30);
    try {
      orientStlForWorkbench(geometry);
      const size = geometry.boundingBox!.getSize(new Vector3());
      expect(size.x).toBeCloseTo(10);
      expect(size.y).toBeCloseTo(30);
      expect(size.z).toBeCloseTo(20);
    } finally {
      geometry.dispose();
    }
  });

  it("converts Workbench Y-up objects back to Z-up for slicer export", () => {
    const group = new Group();
    const mesh = new Mesh(new BoxGeometry(10, 20, 30), new MeshBasicMaterial());
    mesh.position.y = 10;
    group.add(mesh);
    orientWorkbenchForStl(group);
    group.updateMatrixWorld(true);
    const top = new Vector3(0, 10, 0).applyMatrix4(mesh.matrixWorld);
    expect(top.z).toBeCloseTo(20);
    expect(top.y).toBeCloseTo(0);
    mesh.geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  });
});
