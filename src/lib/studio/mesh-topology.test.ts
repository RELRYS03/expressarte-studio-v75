import { BoxGeometry, BufferAttribute, BufferGeometry, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { applyWorldDeltaToVertices, buildMeshTopology, extrudePlanarFace, weldGeometry } from "./mesh-topology";

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
  it("move somente os vértices selecionados usando o delta mundial do gizmo", () => {
    const geometry = weldGeometry(new BoxGeometry(20, 20, 20));
    const position = geometry.getAttribute("position");
    const selectedId = 0;
    const originalLocal = new Vector3().fromBufferAttribute(position, selectedId);
    const untouchedLocal = new Vector3().fromBufferAttribute(position, 1);
    const meshWorld = new Matrix4().compose(
      new Vector3(10, 2, -3),
      new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)),
      new Vector3(2, 1, 1),
    );
    const delta = new Matrix4().makeTranslation(5, 0, 0);
    const expectedWorld = originalLocal.clone().applyMatrix4(meshWorld).applyMatrix4(delta);

    applyWorldDeltaToVertices(
      geometry,
      [{ id: selectedId, local: [originalLocal.x, originalLocal.y, originalLocal.z] }],
      meshWorld,
      delta,
    );

    const actualWorld = new Vector3().fromBufferAttribute(position, selectedId).applyMatrix4(meshWorld);
    const actualUntouched = new Vector3().fromBufferAttribute(position, 1);
    expect(actualWorld.distanceTo(expectedWorld)).toBeLessThan(1e-5);
    expect(actualUntouched.distanceTo(untouchedLocal)).toBeLessThan(1e-6);
    geometry.dispose();
  });


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

  it("preserva a identidade de uma face quadrilateral após deformar um vértice", () => {
    const geometry = weldGeometry(new BoxGeometry(20, 20, 20));
    const before = buildMeshTopology(geometry);
    const face = before.faces[0]!;
    const selectedId = face.vertexIndices[0]!;
    const position = geometry.getAttribute("position");
    const local = new Vector3().fromBufferAttribute(position, selectedId);

    applyWorldDeltaToVertices(
      geometry,
      [{ id: selectedId, local: [local.x, local.y, local.z] }],
      new Matrix4(),
      new Matrix4().makeTranslation(0, 0, 3),
    );

    const after = buildMeshTopology(geometry);
    const preservedFaceId = after.faceByTriangle[face.triangleIndices[0]!]!;
    const preservedFace = after.faces[preservedFaceId]!;
    expect(after.faces).toHaveLength(6);
    expect(preservedFace.triangleIndices).toHaveLength(2);
    expect(preservedFace.vertexIndices).toHaveLength(4);
    expect(preservedFace.boundaryEdges).toHaveLength(4);

    const rewelded = weldGeometry(geometry);
    const afterReweld = buildMeshTopology(rewelded);
    const reweldedFace = afterReweld.faces[afterReweld.faceByTriangle[face.triangleIndices[0]!]!]!;
    expect(reweldedFace.vertexIndices).toHaveLength(4);
    expect(reweldedFace.triangleIndices).toHaveLength(2);

    geometry.dispose();
    rewelded.dispose();
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
