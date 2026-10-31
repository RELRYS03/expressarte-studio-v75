// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import Module, { type ManifoldToplevel } from "manifold-3d";
import { createRequire } from "node:module";
import { solidPositions } from "./solid-mesh-client";
import { operateSolid } from "./solid-mesh";
import { createOrganizerParts, DEFAULT_ORGANIZER_OPTIONS } from "./organizer";

let api: ManifoldToplevel;
beforeAll(async () => {
  api = await Module({ locateFile: () => createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm") });
  api.setup();
});

function assertWatertight(vertices: Float32Array) {
  const edges = new Map<string, number>();
  for (let i = 0; i < vertices.length; i += 9) {
    const points = [0, 1, 2].map((vertex) =>
      [0, 1, 2].map((axis) => vertices[i + vertex * 3 + axis]!.toFixed(5)).join(","),
    );
    for (let edge = 0; edge < 3; edge++) {
      const key = [points[edge]!, points[(edge + 1) % 3]!].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect(edges.size).toBeGreaterThan(0);
  expect([...edges.values()].every((count) => count === 2)).toBe(true);
}

describe("organizador paramétrico", () => {
  it("gera bandeja 220 × 140 × 40 mm com base e canal longo", () => {
    const { walls, base } = createOrganizerParts();
    try {
      expect(walls.boundingBox).not.toBeNull();
      expect(base.boundingBox).not.toBeNull();
      expect(walls.boundingBox!.max.z - walls.boundingBox!.min.z).toBeCloseTo(40);
      expect(base.boundingBox!.max.z - base.boundingBox!.min.z).toBeCloseTo(2.4);
      expect(walls.boundingBox!.max.x - walls.boundingBox!.min.x).toBeCloseTo(220);
      expect(walls.boundingBox!.max.y - walls.boundingBox!.min.y).toBeCloseTo(140);

      const result = operateSolid(api, solidPositions(walls), {
        kind: "union",
        second: solidPositions(base),
      });
      assertWatertight(result);
      expect([...result].every(Number.isFinite)).toBe(true);
    } finally {
      walls.dispose();
      base.dispose();
    }
  });

  it("mantém as dimensões parametrizadas e rejeita paredes impossíveis", () => {
    const { walls, base } = createOrganizerParts({
      ...DEFAULT_ORGANIZER_OPTIONS,
      width: 200,
      length: 120,
      height: 35,
    });
    try {
      expect(walls.boundingBox!.max.x - walls.boundingBox!.min.x).toBeCloseTo(200);
      expect(walls.boundingBox!.max.y - walls.boundingBox!.min.y).toBeCloseTo(120);
      expect(walls.boundingBox!.max.z - walls.boundingBox!.min.z).toBeCloseTo(35);
    } finally {
      walls.dispose();
      base.dispose();
    }
    expect(() => createOrganizerParts({ ...DEFAULT_ORGANIZER_OPTIONS, wallThickness: 0.5 })).toThrow();
  });
});
