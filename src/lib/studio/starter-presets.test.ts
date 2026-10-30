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
