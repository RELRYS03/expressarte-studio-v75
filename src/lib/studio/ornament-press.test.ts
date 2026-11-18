// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import Module, { type ManifoldToplevel } from "manifold-3d";
import { createRequire } from "node:module";
import { BoxGeometry } from "three";
import { operateSolid } from "./solid-mesh";
import { solidPositions } from "./solid-mesh-client";
import {
  createBallOrnamentPressParts,
  DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
} from "./ornament-press";

let api: ManifoldToplevel;

beforeAll(async () => {
  api = await Module({
    locateFile: () => createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm"),
  });
  api.setup();
});

describe("núcleo paramétrico de bola de adorno e prensa", () => {
  it("gera duas metades ocas e dois moldes com dimensões finitas", () => {
    const parts = createBallOrnamentPressParts();
    try {
      for (const geometry of Object.values(parts)) {
        const position = geometry.getAttribute("position");
        expect(position).toBeDefined();
        expect(position.count).toBeGreaterThan(100);
        expect(geometry.boundingBox).not.toBeNull();
        const box = geometry.boundingBox!;
        expect([
          box.min.x, box.min.y, box.min.z,
          box.max.x, box.max.y, box.max.z,
        ].every(Number.isFinite)).toBe(true);
      }
      expect(parts.ornamentUpper.boundingBox!.max.y).toBeCloseTo(30, 2);
      expect(parts.ornamentUpper.boundingBox!.min.y).toBeCloseTo(0, 2);
      expect(parts.ornamentLower.boundingBox!.min.y).toBeCloseTo(-30, 2);
      expect(parts.ornamentLower.boundingBox!.max.y).toBeCloseTo(0, 2);
      expect(parts.pressMale.boundingBox!.max.x).toBeCloseTo(42, 2);
      expect(parts.pressFemale.boundingBox!.max.x).toBeCloseTo(42, 2);
    } finally {
      Object.values(parts).forEach((geometry) => geometry.dispose());
    }
  });

  it("produz quatro sólidos fechados aceitos pelo Manifold real", () => {
    const parts = createBallOrnamentPressParts();
    const remoteCube = new BoxGeometry(2, 2, 2).translate(200, 0, 0);
    try {
      for (const geometry of Object.values(parts)) {
        const combined = operateSolid(api, solidPositions(geometry), {
          kind: "union",
          second: solidPositions(remoteCube),
        });
        expect(combined.length).toBeGreaterThan(0);
        expect([...combined].every(Number.isFinite)).toBe(true);
      }
    } finally {
      remoteCube.dispose();
      Object.values(parts).forEach((geometry) => geometry.dispose());
    }
  });

  it("aceita o tamanho grande de 100 mm", () => {
    const parts = createBallOrnamentPressParts({
      ...DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
      diameterMm: 100,
    });
    try {
      expect(parts.ornamentUpper.boundingBox!.max.y).toBeCloseTo(50, 2);
      expect(parts.ornamentLower.boundingBox!.min.y).toBeCloseTo(-50, 2);
      expect(parts.pressMale.boundingBox!.max.x).toBeCloseTo(62, 2);
    } finally {
      Object.values(parts).forEach((geometry) => geometry.dispose());
    }
  });

  it("rejeita dimensões e folgas fora dos limites seguros", () => {
    expect(() => createBallOrnamentPressParts({
      ...DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
      diameterMm: 20,
    })).toThrow(/40 e 120 mm/);
    expect(() => createBallOrnamentPressParts({
      ...DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
      wallThicknessMm: 0.4,
    })).toThrow(/0,8 e 2,4 mm/);
    expect(() => createBallOrnamentPressParts({
      ...DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
      clearanceMm: 1,
    })).toThrow(/0,15 e 0,6 mm/);
    expect(() => createBallOrnamentPressParts({
      ...DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
      segments: 31,
    })).toThrow(/32 e 192 segmentos/);
  });
});
