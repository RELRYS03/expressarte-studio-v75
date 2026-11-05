// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import Module, { type ManifoldToplevel } from "manifold-3d";
import { createRequire } from "node:module";
import { BoxGeometry } from "three";
import { operateSolid } from "./solid-mesh";
import { solidPositions } from "./solid-mesh-client";

let api: ManifoldToplevel;
beforeAll(async () => {
  api = await Module({ locateFile: () => createRequire(import.meta.url).resolve("manifold-3d/manifold.wasm") });
  api.setup();
});
const cube = () => solidPositions(new BoxGeometry(2, 2, 2));
function measure(vertices: Float32Array) {
  const edges = new Map<string, number>();
  let volume = 0;
  const point = (i: number) => [vertices[i]!, vertices[i + 1]!, vertices[i + 2]!];
  for (let i = 0; i < vertices.length; i += 9) {
    const [a, b, c] = [point(i), point(i + 3), point(i + 6)] as [number[], number[], number[]];
    volume += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) + a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    const points = [a.join(","), b.join(","), c.join(",")];
    for (let j = 0; j < 3; j++) {
      const key = [points[j]!, points[(j + 1) % 3]!].sort().join("|");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect([...edges.values()].every(count => count === 2)).toBe(true);
  return volume;
}
describe("Manifold WASM real", () => {
  for (const axis of ["x", "y", "z"] as const) for (const keepPositive of [true, false]) {
    it(`fecha o corte ${axis} no lado ${keepPositive}`, () => {
      const input = cube();
      const copy = input.slice();
      const output = operateSolid(api, input, { kind: "cut", axis, offset: 0.25, keepPositive });
      expect(measure(output)).toBeCloseTo(keepPositive ? 3 : 5, 5);
      expect(input).toEqual(copy);
    });
  }
  it("funde sobreposição sem duplicar o volume", () => {
    const second = new BoxGeometry(2, 2, 2).translate(1, 0, 0);
    expect(measure(operateSolid(api, cube(), { kind: "union", second: solidPositions(second) }))).toBeCloseTo(12);
  });
  it("preserva corpos separados numa união", () => {
    expect(measure(operateSolid(api, cube(), { kind: "union", second: solidPositions(new BoxGeometry(2, 2, 2).translate(3, 0, 0)) }))).toBeCloseTo(16);
  });
  it("rejeita entrada aberta", () => {
    expect(() => operateSolid(api, cube().slice(9), { kind: "cut", axis: "z", offset: 0, keepPositive: true })).toThrow();
  });
  it("rejeita resultado vazio", () => {
    expect(() => operateSolid(api, cube(), { kind: "cut", axis: "z", offset: 4, keepPositive: true })).toThrow();
  });
  it("rejeita coordenadas não finitas", () => {
    const input = cube(); input[0] = NaN;
    expect(() => operateSolid(api, input, { kind: "union", second: cube() })).toThrow();
  });
  it("rejeita plano inválido", () => {
    expect(() => operateSolid(api, cube(), { kind: "cut", axis: "x", offset: Infinity, keepPositive: true })).toThrow();
  });
});
