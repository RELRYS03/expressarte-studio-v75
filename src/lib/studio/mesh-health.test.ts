import { describe, expect, it } from "vitest";
import { BoxGeometry, BufferGeometry, Float32BufferAttribute } from "three";
import { analyzeMeshHealth } from "./mesh-health";

function mesh(points: number[]) {
  return new BufferGeometry().setAttribute(
    "position",
    new Float32BufferAttribute(points, 3),
  );
}
describe("mesh health", () => {
  it("welds seams on indexed and unindexed closed cubes without modifying them", () => {
    const cube = new BoxGeometry();
    const original = Array.from(cube.getAttribute("position").array);
    expect(analyzeMeshHealth(cube).closed).toBe(true);
    expect(analyzeMeshHealth(cube.toNonIndexed()).closed).toBe(true);
    expect(Array.from(cube.getAttribute("position").array)).toEqual(original);
  });
  it("counts the three boundary edges of a triangle", () => {
    expect(analyzeMeshHealth(mesh([0, 0, 0, 1, 0, 0, 0, 1, 0])).openEdges).toBe(
      3,
    );
  });
  it("detects inconsistent winding across a shared edge", () => {
    expect(
      analyzeMeshHealth(
        mesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -1, 0]),
      ).inconsistentEdges,
    ).toBe(1);
  });
  it("detects three faces sharing an edge", () => {
    expect(
      analyzeMeshHealth(
        mesh([
          0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0,
          0, 0, 0, 1,
        ]),
      ).nonManifoldEdges,
    ).toBe(1);
  });
  it("rejects a zero area triangle as closed", () => {
    const result = analyzeMeshHealth(mesh([0, 0, 0, 1, 0, 0, 2, 0, 0]));
    expect(result.degenerateTriangles).toBe(1);
    expect(result.closed).toBe(false);
  });
  it("rejects empty, incomplete and non-finite input", () => {
    for (const points of [[], [0, 0, 0], [NaN, 0, 0, 1, 0, 0, 0, 1, 0]]) {
      expect(() => analyzeMeshHealth(mesh(points))).toThrow();
    }
  });
});
