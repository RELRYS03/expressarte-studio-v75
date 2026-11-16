import { BoxGeometry, BufferGeometry, BufferAttribute } from "three";
import { describe, expect, it } from "vitest";
import { splitConnectedComponents } from "./mesh-components";

function combine(...geometries: BufferGeometry[]) {
  const values: number[] = [];
  for (const geometry of geometries) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    const position = flat.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      values.push(position.getX(i), position.getY(i), position.getZ(i));
    }
  }
  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(new Float32Array(values), 3));
  return result;
}

describe("splitConnectedComponents", () => {
  it("separa dois sólidos desconectados em uma geometria só", () => {
    const a = new BoxGeometry(10, 10, 10);
    const b = new BoxGeometry(4, 4, 4);
    b.translate(30, 0, 0);
    const input = combine(a, b);

    const parts = splitConnectedComponents(input);

    expect(parts).toHaveLength(2);
    expect(parts.map((part) => part.triangleCount).sort((x, y) => y - x)).toEqual([12, 12]);
    expect(parts[0]!.geometry.boundingBox).not.toBeNull();
    parts.forEach((part) => part.geometry.dispose());
    a.dispose();
    b.dispose();
    input.dispose();
  });

  it("mantém uma malha conectada como um único componente", () => {
    const input = new BoxGeometry(12, 8, 5);
    const parts = splitConnectedComponents(input);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.triangleCount).toBe(12);
    parts[0]!.geometry.dispose();
    input.dispose();
  });

  it("rejeita tolerância inválida e dados sem triângulos", () => {
    const input = new BufferGeometry();
    input.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0]), 3));
    expect(() => splitConnectedComponents(input)).toThrow(/triângulos válidos/i);
    expect(() => splitConnectedComponents(input, 0)).toThrow(/tolerância/i);
    input.dispose();
  });
});
