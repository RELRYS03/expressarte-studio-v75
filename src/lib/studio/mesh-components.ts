import { BufferAttribute, BufferGeometry } from "three";

export type MeshComponent = {
  geometry: BufferGeometry;
  triangleCount: number;
  vertexCount: number;
};

/**
 * Divide uma malha triangular em componentes conectados pela posição geométrica
 * dos vértices. A comparação por tolerância também reconhece vértices duplicados
 * em costuras UV/normais e em geometrias não indexadas.
 *
 * A operação não repara furos nem fecha superfícies: apenas separa componentes.
 */
export function splitConnectedComponents(
  source: BufferGeometry,
  tolerance = 1e-5,
): MeshComponent[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 1) {
    throw new Error("A tolerância deve estar entre 0 e 1 mm.");
  }

  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute("position");
  if (!position || position.count < 3 || position.count % 3 !== 0) {
    geometry.dispose();
    throw new Error("A malha precisa conter triângulos válidos.");
  }
  if (position.count / 3 > 2_000_000) {
    geometry.dispose();
    throw new Error("A malha excede o limite de 2 milhões de triângulos.");
  }

  const triangleCount = position.count / 3;
  const parent = new Int32Array(triangleCount);
  const rank = new Uint8Array(triangleCount);
  for (let i = 0; i < triangleCount; i++) parent[i] = i;

  const find = (value: number): number => {
    let root = value;
    while (parent[root] !== root) root = parent[root]!;
    while (parent[value] !== value) {
      const next = parent[value]!;
      parent[value] = root;
      value = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return;
    if (rank[ra]! < rank[rb]!) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra]++;
  };

  const vertexOwners = new Map<string, number>();
  const keyFor = (vertex: number) => {
    const x = Math.round(position.getX(vertex) / tolerance);
    const y = Math.round(position.getY(vertex) / tolerance);
    const z = Math.round(position.getZ(vertex) / tolerance);
    return `${x},${y},${z}`;
  };

  for (let triangle = 0; triangle < triangleCount; triangle++) {
    for (let corner = 0; corner < 3; corner++) {
      const key = keyFor(triangle * 3 + corner);
      const owner = vertexOwners.get(key);
      if (owner === undefined) vertexOwners.set(key, triangle);
      else union(triangle, owner);
    }
  }

  const trianglesByRoot = new Map<number, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const root = find(triangle);
    const list = trianglesByRoot.get(root);
    if (list) list.push(triangle);
    else trianglesByRoot.set(root, [triangle]);
  }

  const components: MeshComponent[] = [];
  for (const triangles of trianglesByRoot.values()) {
    const positions = new Float32Array(triangles.length * 9);
    let cursor = 0;
    for (const triangle of triangles) {
      for (let corner = 0; corner < 3; corner++) {
        const vertex = triangle * 3 + corner;
        positions[cursor++] = position.getX(vertex);
        positions[cursor++] = position.getY(vertex);
        positions[cursor++] = position.getZ(vertex);
      }
    }
    const output = new BufferGeometry();
    output.setAttribute("position", new BufferAttribute(positions, 3));
    output.computeVertexNormals();
    output.computeBoundingBox();
    output.computeBoundingSphere();
    components.push({
      geometry: output,
      triangleCount: triangles.length,
      vertexCount: triangles.length * 3,
    });
  }

  geometry.dispose();
  return components.sort((a, b) => b.triangleCount - a.triangleCount);
}
