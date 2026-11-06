import type { BufferGeometry } from "three";

export interface MeshHealth {
  openEdges: number;
  nonManifoldEdges: number;
  inconsistentEdges: number;
  degenerateTriangles: number;
  closed: boolean;
}

/** Exact coordinate welding: UV/normal seams do not count as open edges.
 * Reports edge topology only, not self-intersections or printability.
 */
export function analyzeMeshHealth(geometry: BufferGeometry): MeshHealth {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index?.count ?? position?.count ?? 0;
  if (!position || count === 0 || count % 3 !== 0) {
    throw new Error("A malha deve conter triângulos completos.");
  }
  const vertices = new Map<string, number>();
  const ids: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const coordinates = [position.getX(i), position.getY(i), position.getZ(i)];
    if (coordinates.some((value) => !Number.isFinite(value))) {
      throw new Error("A malha contém coordenadas inválidas.");
    }
    const key = coordinates.join(",");
    if (!vertices.has(key)) vertices.set(key, vertices.size);
    ids.push(vertices.get(key)!);
  }
  const edges = new Map<string, { count: number; direction: number }>();
  let degenerateTriangles = 0;
  for (let i = 0; i < count; i += 3) {
    const face = [0, 1, 2].map((offset) =>
      index ? index.getX(i + offset) : i + offset,
    );
    if (
      face.some((v) => !Number.isInteger(v) || v < 0 || v >= position.count)
    ) {
      throw new Error("A malha contém índices inválidos.");
    }
    const [a, b, c] = face as [number, number, number];
    const ux = position.getX(b) - position.getX(a);
    const uy = position.getY(b) - position.getY(a);
    const uz = position.getZ(b) - position.getZ(a);
    const vx = position.getX(c) - position.getX(a);
    const vy = position.getY(c) - position.getY(a);
    const vz = position.getZ(c) - position.getZ(a);
    if (
      Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) === 0
    ) {
      degenerateTriangles++;
      continue;
    }
    const welded = face.map((v) => ids[v]);
    for (let j = 0; j < 3; j++) {
      const from = welded[j]!,
        to = welded[(j + 1) % 3]!;
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const edge = edges.get(key) ?? { count: 0, direction: 0 };
      edge.count++;
      edge.direction += from < to ? 1 : -1;
      edges.set(key, edge);
    }
  }
  let openEdges = 0,
    nonManifoldEdges = 0,
    inconsistentEdges = 0;
  for (const edge of edges.values()) {
    if (edge.count === 1) openEdges++;
    else if (edge.count > 2) nonManifoldEdges++;
    else if (edge.direction !== 0) inconsistentEdges++;
  }
  return {
    openEdges,
    nonManifoldEdges,
    inconsistentEdges,
    degenerateTriangles,
    closed:
      edges.size > 0 &&
      openEdges === 0 &&
      nonManifoldEdges === 0 &&
      inconsistentEdges === 0 &&
      degenerateTriangles === 0,
  };
}
