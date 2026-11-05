// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import Module, { type ManifoldToplevel } from "manifold-3d";
import { createRequire } from "node:module";
import { Vector3 } from "three";
import { createNameplateParts } from "./nameplate-geometry";
import { operateSolid } from "./solid-mesh";
import { solidPositions } from "./solid-mesh-client";

let api: ManifoldToplevel;
beforeAll(async () => {
  api = await Module({ locateFile: () => createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm") });
  api.setup();
});

function assertClosed(vertices: Float32Array) {
  const edges = new Map<string, number>();
  for (let i = 0; i < vertices.length; i += 9) {
    const points = [0, 3, 6].map(offset =>
      [vertices[i + offset]!, vertices[i + offset + 1]!, vertices[i + offset + 2]!].join(","),
    );
    for (let j = 0; j < 3; j++) {
      const key = [points[j]!, points[(j + 1) % 3]!].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect([...edges.values()].every(count => count === 2)).toBe(true);
}

describe("nameplate 3D", () => {
  it("builds an 80 × 30 mm rounded base and a centered raised text", () => {
    const parts = createNameplateParts({ text: "EXPRESS ARTE" });
    try {
      parts.base.computeBoundingBox();
      parts.text.computeBoundingBox();
      const baseSize = parts.base.boundingBox!.getSize(new Vector3());
      const textSize = parts.text.boundingBox!.getSize(new Vector3());
      expect([baseSize.x, baseSize.y, baseSize.z]).toEqual([80, 30, 3]);
      expect(textSize.x).toBeLessThanOrEqual(56.02);
      expect(textSize.y).toBeLessThanOrEqual(13.82);
      expect(parts.text.boundingBox!.min.z).toBeCloseTo(2.8, 4);
      expect(parts.text.boundingBox!.max.z).toBeCloseTo(4.2, 4);
    } finally {
      parts.base.dispose();
      parts.text.dispose();
    }
  });

  it("keeps requested dimensions and supports a plaque without mounting holes", () => {
    const parts = createNameplateParts({
      text: "OFICINA",
      widthMm: 120,
      heightMm: 45,
      baseThicknessMm: 4,
      reliefHeightMm: 1.6,
      mountingHoles: false,
    });
    try {
      parts.base.computeBoundingBox();
      expect(parts.base.boundingBox!.getSize(new Vector3()).toArray()).toEqual([120, 45, 4]);
    } finally {
      parts.base.dispose();
      parts.text.dispose();
    }
  });

  it("boolean-unions base and raised text into one watertight solid with Manifold", () => {
    const parts = createNameplateParts({ text: "EXPRESS ARTE", mountingHoles: true });
    try {
      const result = operateSolid(api, solidPositions(parts.base), {
        kind: "union",
        second: solidPositions(parts.text),
      });
      assertClosed(result);
      expect(result.length).toBeGreaterThan(1000);
    } finally {
      parts.base.dispose();
      parts.text.dispose();
    }
  });

  it("rejects invalid plaque sizes and missing text", () => {
    expect(() => createNameplateParts({ text: " " })).toThrow();
    expect(() => createNameplateParts({ text: "X".repeat(33) })).toThrow();
    expect(() => createNameplateParts({ text: "ABC", widthMm: 39 })).toThrow();
    expect(() => createNameplateParts({ text: "ABC", heightMm: 121 })).toThrow();
    expect(() => createNameplateParts({ text: "ABC", reliefHeightMm: 0.2 })).toThrow();
    expect(() => createNameplateParts({ text: "ABC", mountingHoles: true, holeDiameterMm: 1 })).toThrow();
  });
});
