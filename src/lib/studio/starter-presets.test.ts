// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createStarterGeometry, type StarterPreset } from "./starter-presets";

describe("starter models in millimetres", () => {
  for (const [preset, size] of [
    ["round-keychain", [50, 50, 3]],
    ["rectangle-keychain", [60, 32, 3]],
    ["nameplate", [80, 30, 2.5]],
  ] as const satisfies ReadonlyArray<readonly [StarterPreset, readonly number[]]>) {
    it("builds " + preset + " with expected dimensions and finite coordinates", () => {
      const mesh = createStarterGeometry(preset);
      try {
        mesh.computeBoundingBox();
        const span = mesh.boundingBox!.getSize(new Vector3());
        expect([span.x, span.y, span.z].map(v => Math.round(v * 1000) / 1000)).toEqual(size);
        expect(Array.from(mesh.getAttribute("position").array).every(Number.isFinite)).toBe(true);
      } finally { mesh.dispose(); }
    });
  }
});

describe("parametric tools", () => {
  it("scales a rectangular keychain without changing extrusion depth", () => {
    const mesh = createStarterGeometry("rectangle-keychain", { width: 85, height: 40, thickness: 4, holeDiameter: 6 });
    try {
      mesh.computeBoundingBox();
      const size = mesh.boundingBox!.getSize(new Vector3());
      expect([size.x, size.y, size.z]).toEqual([85, 40, 4]);
    } finally { mesh.dispose(); }
  });
  it("generates a hexagonal keychain and round tag", () => {
    for (const preset of ["hex-keychain", "round-tag"] as const) {
      const geometry = createStarterGeometry(preset);
      expect(geometry.getAttribute("position").count).toBeGreaterThan(30);
      geometry.dispose();
    }
  });
  it("rejects invalid dimensions instead of producing corrupt STL", () => {
    expect(() => createStarterGeometry("round-keychain", { width: NaN })).toThrow();
    expect(() => createStarterGeometry("round-keychain", { holeDiameter: 25 })).toThrow();
    expect(() => createStarterGeometry("nameplate", { thickness: 0 })).toThrow();
  });
});
