import { BufferAttribute, BufferGeometry, Vector3 } from "three";

export type MeshAxis = "x" | "y" | "z";

export function geometryDimensions(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error("A malha não tem limites válidos.");
  const size = box.getSize(new Vector3());
  return { x: size.x, y: size.y, z: size.z };
}

function finalize(geometry: BufferGeometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function resizeGeometry(source: BufferGeometry, dimensions: Record<MeshAxis, number>) {
  const geometry = source.clone();
  const current = geometryDimensions(geometry);
  if (
    Object.values(dimensions).some((size) => !Number.isFinite(size) || size <= 0 || size > 2000)
  ) {
    geometry.dispose();
    throw new Error("Informe dimensões entre 0 e 2.000 mm.");
  }
  geometry.scale(dimensions.x / current.x, dimensions.y / current.y, dimensions.z / current.z);
  return finalize(geometry);
}

export function transformGeometry(
  source: BufferGeometry,
  operation: "rotate-x" | "rotate-y" | "rotate-z" | "mirror-x" | "mirror-y" | "mirror-z" | "center",
) {
  const geometry = source.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) throw new Error("A malha não tem limites válidos.");
  if (operation === "center") {
    const center = box.getCenter(new Vector3());
    geometry.translate(-center.x, -center.y, -box.min.z);
  } else {
    const center = box.getCenter(new Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    if (operation.startsWith("rotate")) {
      const axis = operation.slice(-1) as MeshAxis;
      const fn =
        axis === "x" ? geometry.rotateX : axis === "y" ? geometry.rotateY : geometry.rotateZ;
      fn.call(geometry, Math.PI / 2);
    } else {
      const axis = operation.slice(-1) as MeshAxis;
      geometry.scale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1, axis === "z" ? -1 : 1);
      const position = geometry.getAttribute("position");
      if (operation.startsWith("mirror") && position && position.count % 3 === 0) {
        for (let i = 0; i < position.count; i += 3) {
          const first: [number, number, number] = [
            position.getX(i + 1),
            position.getY(i + 1),
            position.getZ(i + 1),
          ];
          const second: [number, number, number] = [
            position.getX(i + 2),
            position.getY(i + 2),
            position.getZ(i + 2),
          ];
          position.setXYZ(i + 1, second[0], second[1], second[2]);
          position.setXYZ(i + 2, first[0], first[1], first[2]);
        }
        position.needsUpdate = true;
      }
    }
    geometry.translate(center.x, center.y, center.z);
  }
  return finalize(geometry);
}

export function combineGeometries(first: BufferGeometry, second: BufferGeometry) {
  const a = first.getAttribute("position");
  const b = second.getAttribute("position");
  if (!a || !b || a.count + b.count > 3_000_000)
    throw new Error("A soma das malhas excede o limite desta edição.");
  const positions = new Float32Array((a.count + b.count) * 3);
  positions.set(a.array as Float32Array, 0);
  positions.set(b.array as Float32Array, a.count * 3);
  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(positions, 3));
  return finalize(result);
}

/** Retains one side of a plane cut. The new boundary is intentionally left open. */
export function cutGeometry(
  source: BufferGeometry,
  axis: MeshAxis,
  offset: number,
  keepPositive: boolean,
) {
  const position = source.getAttribute("position");
  if (!position || position.count % 3 !== 0)
    throw new Error("A malha precisa ser triangular e não indexada.");
  const component = axis === "x" ? 0 : axis === "y" ? 1 : 2;
  const output: number[] = [];
  type Point3 = [number, number, number];
  const point = (i: number): Point3 => [position.getX(i), position.getY(i), position.getZ(i)];
  const inside = (p: Point3) => (keepPositive ? p[component] >= offset : p[component] <= offset);
  const intersection = (a: Point3, b: Point3): Point3 => {
    const denominator = b[component] - a[component];
    const t = denominator === 0 ? 0 : (offset - a[component]) / denominator;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  for (let i = 0; i < position.count; i += 3) {
    const triangle: Point3[] = [point(i), point(i + 1), point(i + 2)];
    const polygon: Point3[] = [];
    for (let j = 0; j < 3; j++) {
      const current = triangle[j]!;
      const next = triangle[(j + 1) % 3]!;
      const currentInside = inside(current);
      const nextInside = inside(next);
      if (currentInside) polygon.push(current);
      if (currentInside !== nextInside) polygon.push(intersection(current, next));
    }
    for (let j = 1; j < polygon.length - 1; j++)
      output.push(...polygon[0]!, ...polygon[j]!, ...polygon[j + 1]!);
  }
  if (!output.length) throw new Error("O plano não atravessa a malha ou removeu todas as faces.");
  const result = new BufferGeometry();
  result.setAttribute("position", new BufferAttribute(new Float32Array(output), 3));
  return finalize(result);
}
