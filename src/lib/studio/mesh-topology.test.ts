import { BoxGeometry, BufferAttribute, BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { buildMeshTopology, extrudePlanarFace, weldGeometry } from "./mesh-topology";

function signedVolume(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.index;
  const count = index?.count ?? position.count;
  let volume = 0;
  for (let i = 0; i < count; i += 3) {
    const a = new Float64Array([position.getX(index?.getX(i) ?? i), position.getY(index?.getX(i) ?? i), position.getZ(index?.getX(i) ?? i)]);
    const b = new Float64Array([position.getX(index?.getX(i + 1) ?? i + 1), position.getY(index?.getX(i + 1) ?? i + 1), position.getZ(index?.getX(i + 1) ?? i + 1)]);
    const c = new Float64Array([position.getX(index?.getX(i + 2) ?? i + 2), position.getY(index?.getX(i + 2) ?? i + 2), position.getZ(index?.getX(i + 2) ?? i + 2)]);
    volume += (
      a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) +
      a[1]! * (b[2]! * c[0]! - b[0]! * c[2]!) +
      a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)
    ) / 6;
  }
  return volume;
}

function expectClosed(geometry: BufferGeometry) {
  const index = geometry.index!;
  const edges = new Map<string, number>();
  for (let i = 0; i < index.count; i += 3) {
    const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge]!;
      const b = triangle[(edge + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect([...edges.values()].every((count) => count === 2)).toBe(true);
}

describe("topologia e edição de malha", () => {
  it("une vértices coincidentes de uma caixa e mantém 12 triângulos", () => {
    const source = new BoxGeometry(20, 20, 20);
    const welded = weldGeometry(source);
    expect(welded.getAttribute("position").count).toBe(8);
    expect(welded.index?.count).toBe(36);
    source.dispose();
    welded.dispose();
  });

  it("identifica as seis faces planas da caixa, agrupando os dois triângulos de cada lado", () => {
    const geometry = weldGeometry(new BoxGeometry(20, 20, 20));
    const topology = buildMeshTopology(geometry);
    expect(topology.faces).toHaveLength(6);
    expect(topology.faces.every((face) => face.triangleIndices.length === 2)).toBe(true);
    expect(topology.faces.every((face) => face.boundaryEdges.length === 4)).toBe(true);
    geometry.dispose();
  });

  it("extruda uma face inteira, cria paredes laterais e mantém o sólido fechado", () => {
    const source = new BoxGeometry(20, 20, 20);
    const welded = weldGeometry(source);
    const topology = buildMeshTopology(welded);
    const topTriangle = topology.faces.findIndex((face) => face.normal[1] > 0.99);
    expect(topTriangle).toBeGreaterThanOrEqual(0);

    const result = extrudePlanarFace(welded, topology.faces[topTriangle]!.triangleIndices[0]!, 5);
    expect(result.geometry.index?.count).toBe(60);
    expectClosed(result.geometry);
    expect(signedVolume(result.geometry)).toBeCloseTo(10_000, 3);

    source.dispose();
    welded.dispose();
    result.geometry.dispose();
  });

  it("aceita STL não indexado e extruda uma face triangular", () => {
    const source = new BoxGeometry(20, 20, 20).toNonIndexed();
    const result = extrudePlanarFace(source, 0, 2);
    expect(result.geometry.index).not.toBeNull();
    expect(result.geometry.getAttribute("position").count).toBeGreaterThan(8);
    source.dispose();
    result.geometry.dispose();
  });

  it("rejeita distância nula, excessiva e índice de face inválido", () => {
    const geometry = weldGeometry(new BoxGeometry(20, 20, 20));
    expect(() => extrudePlanarFace(geometry, 0, 0)).toThrow();
    expect(() => extrudePlanarFace(geometry, 0, 1001)).toThrow();
    expect(() => extrudePlanarFace(geometry, 999, 5)).toThrow();
    geometry.dispose();
  });

  it("rejeita geometria sem triângulos", () => {
    const empty = new BufferGeometry();
    empty.setAttribute("position", new BufferAttribute(new Float32Array(), 3));
    expect(() => weldGeometry(empty)).toThrow();
    empty.dispose();
  });
});
