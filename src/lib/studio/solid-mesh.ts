import type { Manifold, ManifoldToplevel, Vec3 } from "manifold-3d";
import type { MeshAxis } from "./mesh-editing";

export const MAX_SOLID_VERTICES = 600_000;
export type SolidOperation = { kind: "union"; second: Float32Array } | {
  kind: "cut"; axis: MeshAxis; offset: number; keepPositive: boolean;
};

/** Triangle soup in millimetres. Does not mutate or repair the input. */
export function operateSolid(api: ManifoldToplevel, positions: Float32Array, operation: SolidOperation): Float32Array {
  const owned: Manifold[] = [];
  const input = (vertices: Float32Array) => {
    if (!vertices.length || vertices.length % 9 || vertices.length / 3 > MAX_SOLID_VERTICES ||
        vertices.some(value => !Number.isFinite(value))) {
      throw new Error("Malha inválida ou acima do limite de 200.000 triângulos por peça.");
    }
    const mesh = new api.Mesh({ numProp: 3, vertProperties: vertices,
      triVerts: Uint32Array.from({ length: vertices.length / 3 }, (_, i) => i) });
    // STL repeats vertices at each face. Merge coincident topology, not holes.
    mesh.merge();
    const solid = new api.Manifold(mesh);
    owned.push(solid);
    if (solid.status() !== "NoError" || solid.isEmpty() || solid.volume() <= 0)
      throw new Error("A peça precisa ser um sólido fechado e orientado. Verifique a malha no Blender.");
    return solid;
  };
  try {
    const first = input(positions);
    let result: Manifold;
    if (operation.kind === "union") result = first.add(input(operation.second));
    else {
      if (!["x", "y", "z"].includes(operation.axis) || !Number.isFinite(operation.offset))
        throw new Error("Plano de corte inválido.");
      const sign = operation.keepPositive ? 1 : -1;
      const normal: Vec3 = [0, 0, 0];
      normal[operation.axis === "x" ? 0 : operation.axis === "y" ? 1 : 2] = sign;
      result = first.trimByPlane(normal, sign * operation.offset);
    }
    owned.push(result);
    if (result.status() !== "NoError" || result.isEmpty() || result.volume() <= 0)
      throw new Error("A operação não produziu um sólido válido. Ajuste o corte ou as peças.");
    const mesh = result.getMesh();
    if (mesh.triVerts.length > MAX_SOLID_VERTICES * 2)
      throw new Error("Resultado acima do limite de edição.");
    const output = new Float32Array(mesh.triVerts.length * 3);
    mesh.triVerts.forEach((vertex, i) => {
      for (let axis = 0; axis < 3; axis++) output[i * 3 + axis] = mesh.vertProperties[vertex * mesh.numProp + axis]!;
    });
    return output;
  } finally {
    for (const solid of owned.reverse()) solid.delete();
  }
}
