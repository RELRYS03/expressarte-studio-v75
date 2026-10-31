import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Matrix4, Vector3 } from "three";

const WELD_EPSILON = 1e-5;
const PLANAR_DOT = 0.9995;
const PLANAR_DISTANCE = 1e-4;

export type MeshEdge = readonly [number, number];
export type MeshFaceGroup = {
  id: number;
  triangleIndices: number[];
  vertexIndices: number[];
  boundaryEdges: MeshEdge[];
  normal: [number, number, number];
  center: [number, number, number];
};
export type MeshTopology = {
  faces: MeshFaceGroup[];
  faceByTriangle: number[];
  edges: MeshEdge[];
};

function vertexKey(x: number, y: number, z: number) {
  return [x, y, z].map((value) => Math.round(value / WELD_EPSILON)).join(":");
}

function finalize(geometry: BufferGeometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Welds coincident triangle-soup vertices and returns an indexed surface. */
export function weldGeometry(source: BufferGeometry): BufferGeometry {
  const position = source.getAttribute("position");
  const index = source.index;
  const count = index?.count ?? position?.count ?? 0;
  if (!position || count === 0 || count % 3 !== 0 || count / 3 > 600_000) {
    throw new Error("A malha precisa conter triângulos válidos e ter até 200.000 faces.");
  }

  const unique: number[] = [];
  const indices: number[] = [];
  const lookup = new Map<string, number>();
  for (let i = 0; i < count; i++) {
    const sourceIndex = index?.getX(i) ?? i;
    const x = position.getX(sourceIndex);
    const y = position.getY(sourceIndex);
    const z = position.getZ(sourceIndex);
    if (![x, y, z].every(Number.isFinite)) throw new Error("A malha contém coordenadas inválidas.");
    const key = vertexKey(x, y, z);
    let target = lookup.get(key);
    if (target === undefined) {
      target = unique.length / 3;
      lookup.set(key, target);
      unique.push(x, y, z);
    }
    indices.push(target);
  }

  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(new Float32Array(unique), 3));
  result.setIndex(indices);
  const storedFaceGroups = source.userData["editFaceGroups"];
  if (Array.isArray(storedFaceGroups)) {
    result.userData["editFaceGroups"] = storedFaceGroups.map((group: number[]) => [...group]);
  }
  return finalize(result);
}

function edgeKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function triangleNormal(position: BufferAttribute | InterleavedBufferAttribute, a: number, b: number, c: number) {
  const pa = new Vector3().fromBufferAttribute(position, a);
  const pb = new Vector3().fromBufferAttribute(position, b);
  const pc = new Vector3().fromBufferAttribute(position, c);
  return pb.sub(pa).cross(pc.sub(pa)).normalize();
}

/** Groups adjacent coplanar triangles into selectable polygonal faces. */
export function buildMeshTopology(geometry: BufferGeometry): MeshTopology {
  const position = geometry.getAttribute("position");
  const index = geometry.index;
  const count = index?.count ?? position?.count ?? 0;
  if (!position || count === 0 || count % 3 !== 0) {
    throw new Error("A malha não possui triângulos válidos para edição.");
  }

  const triangleCount = count / 3;
  const triangles: { vertices: [number, number, number]; normal: Vector3; center: Vector3 }[] = [];
  const edgeTriangles = new Map<string, number[]>();
  const allEdges = new Map<string, MeshEdge>();

  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const a = index?.getX(triangle * 3) ?? triangle * 3;
    const b = index?.getX(triangle * 3 + 1) ?? triangle * 3 + 1;
    const c = index?.getX(triangle * 3 + 2) ?? triangle * 3 + 2;
    const normal = triangleNormal(position, a, b, c);
    const center = new Vector3()
      .fromBufferAttribute(position, a)
      .add(new Vector3().fromBufferAttribute(position, b))
      .add(new Vector3().fromBufferAttribute(position, c))
      .multiplyScalar(1 / 3);
    triangles.push({ vertices: [a, b, c], normal, center });

    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) {
      const key = edgeKey(from, to);
      const connected = edgeTriangles.get(key) ?? [];
      connected.push(triangle);
      edgeTriangles.set(key, connected);
      allEdges.set(key, from < to ? [from, to] : [to, from]);
    }
  }

  const cachedGroups = geometry.userData["editFaceGroups"] as unknown;
  const cachedGroupsValid = Array.isArray(cachedGroups)
    && cachedGroups.length > 0
    && cachedGroups.every((group: unknown) =>
      Array.isArray(group)
      && group.length > 0
      && group.every((triangle: unknown) =>
        typeof triangle === "number"
        && Number.isInteger(triangle)
        && triangle >= 0
        && triangle < triangleCount
      )
    )
    && cachedGroups.flat().length === triangleCount
    && new Set(cachedGroups.flat()).size === triangleCount;

  const grouped = new Map<number, number[]>();
  if (cachedGroupsValid) {
    (cachedGroups as number[][]).forEach((members, id) => grouped.set(id, [...members]));
  } else {
    const parent = Array.from({ length: triangleCount }, (_, i) => i);
    const find = (value: number): number => {
      if (parent[value] !== value) parent[value] = find(parent[value]!);
      return parent[value]!;
    };
    const unite = (a: number, b: number) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent[rootB] = rootA;
    };

    for (const connected of edgeTriangles.values()) {
      if (connected.length < 2) continue;
      for (let i = 0; i < connected.length; i++) {
        for (let j = i + 1; j < connected.length; j++) {
          const first = triangles[connected[i]!]!;
          const second = triangles[connected[j]!]!;
          if (first.normal.dot(second.normal) < PLANAR_DOT) continue;
          const distance = Math.abs(first.normal.dot(second.center.clone().sub(first.center)));
          if (distance <= PLANAR_DISTANCE) unite(connected[i]!, connected[j]!);
        }
      }
    }

    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const root = find(triangle);
      const members = grouped.get(root) ?? [];
      members.push(triangle);
      grouped.set(root, members);
    }
    geometry.userData["editFaceGroups"] = [...grouped.values()].map((members) => [...members]);
  }

  const faces: MeshFaceGroup[] = [];
  const faceByTriangle = new Array<number>(triangleCount).fill(-1);
  for (const triangleIndices of grouped.values()) {
    const boundaryCounts = new Map<string, { edge: MeshEdge; count: number }>();
    const vertices = new Set<number>();
    const normal = new Vector3();
    const center = new Vector3();

    for (const triangleIndex of triangleIndices) {
      faceByTriangle[triangleIndex] = faces.length;
      const triangle = triangles[triangleIndex]!;
      normal.add(triangle.normal);
      center.add(triangle.center);
      const [a, b, c] = triangle.vertices;
      vertices.add(a); vertices.add(b); vertices.add(c);
      for (const [from, to] of [[a, b], [b, c], [c, a]] as const) {
        const key = edgeKey(from, to);
        const existing = boundaryCounts.get(key);
        if (existing) existing.count++;
        else boundaryCounts.set(key, { edge: [from, to], count: 1 });
      }
    }

    normal.normalize();
    center.multiplyScalar(1 / triangleIndices.length);
    faces.push({
      id: faces.length,
      triangleIndices,
      vertexIndices: [...vertices],
      boundaryEdges: [...boundaryCounts.values()].filter((item) => item.count === 1).map((item) => item.edge),
      normal: [normal.x, normal.y, normal.z],
      center: [center.x, center.y, center.z],
    });
  }

  return { faces, faceByTriangle, edges: [...allEdges.values()] };
}

export function faceGroupForTriangle(geometry: BufferGeometry, triangleIndex: number) {
  const topology = buildMeshTopology(geometry);
  const groupId = topology.faceByTriangle[triangleIndex];
  return groupId === undefined || groupId < 0 ? null : topology.faces[groupId] ?? null;
}

/** Builds a small overlay geometry for the selected coplanar face group. */
export function createFaceGroupGeometry(geometry: BufferGeometry, triangleIndex: number, offset = 0.015) {
  const face = faceGroupForTriangle(geometry, triangleIndex);
  if (!face) throw new Error("Selecione uma face válida.");
  const position = geometry.getAttribute("position");
  const index = geometry.index;
  const normal = new Vector3(...face.normal).multiplyScalar(offset);
  const vertices: number[] = [];
  for (const triangleIndexValue of face.triangleIndices) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index?.getX(triangleIndexValue * 3 + corner) ?? triangleIndexValue * 3 + corner;
      const point = new Vector3().fromBufferAttribute(position, vertex).add(normal);
      vertices.push(point.x, point.y, point.z);
    }
  }
  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
  return finalize(result);
}


export type VertexPositionSnapshot = { id: number; local: readonly [number, number, number] };

/** Applies a world-space gizmo delta to selected vertices, based on their drag-start positions. */
export function applyWorldDeltaToVertices(
  geometry: BufferGeometry,
  snapshots: readonly VertexPositionSnapshot[],
  meshWorldMatrix: Matrix4,
  worldDelta: Matrix4,
) {
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("A malha não possui posições editáveis.");
  const inverseMesh = meshWorldMatrix.clone().invert();
  for (const snapshot of snapshots) {
    if (snapshot.id < 0 || snapshot.id >= position.count) {
      throw new Error("A seleção contém um vértice que não existe mais.");
    }
    const local = new Vector3(...snapshot.local);
    const transformed = local.applyMatrix4(meshWorldMatrix).applyMatrix4(worldDelta).applyMatrix4(inverseMesh);
    position.setXYZ(snapshot.id, transformed.x, transformed.y, transformed.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export type ExtrudeFaceResult = { geometry: BufferGeometry; capTriangleIndex: number };

/** Extrudes a complete planar face group and creates side walls around its boundary. */
export function extrudePlanarFace(
  source: BufferGeometry,
  triangleIndex: number,
  distance: number,
): ExtrudeFaceResult {
  if (!Number.isFinite(distance) || Math.abs(distance) < 0.01 || Math.abs(distance) > 1000) {
    throw new Error("A extrusão deve estar entre 0,01 e 1.000 mm.");
  }

  const geometry = weldGeometry(source);
  const position = geometry.getAttribute("position");
  const index = geometry.index;
  const face = faceGroupForTriangle(geometry, triangleIndex);
  if (!face || face.boundaryEdges.length < 3) {
    geometry.dispose();
    throw new Error("A face selecionada não possui um contorno válido para extrusão.");
  }

  const normal = new Vector3(...face.normal).multiplyScalar(distance);
  const positions = Array.from(position.array as ArrayLike<number>);
  const moved = new Map<number, number>();
  for (const vertex of face.vertexIndices) {
    const point = new Vector3().fromBufferAttribute(position, vertex).add(normal);
    moved.set(vertex, positions.length / 3);
    positions.push(point.x, point.y, point.z);
  }

  const selectedTriangles = new Set(face.triangleIndices);
  const outputIndices: number[] = [];
  const triangleCount = (index?.count ?? position.count) / 3;
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    if (selectedTriangles.has(triangle)) continue;
    for (let corner = 0; corner < 3; corner++) {
      outputIndices.push(index?.getX(triangle * 3 + corner) ?? triangle * 3 + corner);
    }
  }

  const capTriangleIndex = outputIndices.length / 3;
  for (const triangle of face.triangleIndices) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index?.getX(triangle * 3 + corner) ?? triangle * 3 + corner;
      outputIndices.push(moved.get(vertex)!);
    }
  }

  for (const [a, b] of face.boundaryEdges) {
    const aTop = moved.get(a)!;
    const bTop = moved.get(b)!;
    outputIndices.push(a, b, bTop, a, bTop, aTop);
  }

  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  result.setIndex(outputIndices);
  finalize(result);
  geometry.dispose();

  const resultTopology = buildMeshTopology(result);
  const capGroup = resultTopology.faceByTriangle[capTriangleIndex];
  if (capGroup === undefined || capGroup < 0) {
    result.dispose();
    throw new Error("Não foi possível identificar a nova face extrudada.");
  }
  return { geometry: result, capTriangleIndex };
}
