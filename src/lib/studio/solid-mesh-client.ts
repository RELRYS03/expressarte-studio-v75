import { BufferAttribute, BufferGeometry } from "three";
import { MAX_SOLID_VERTICES, type SolidOperation } from "./solid-mesh";

export function solidPositions(geometry: BufferGeometry): Float32Array {
  const source = geometry.getAttribute("position");
  const count = geometry.index?.count ?? source?.count ?? 0;
  if (!source || !count || count % 3 || count > MAX_SOLID_VERTICES)
    throw new Error("Use um STL triangular com até 200.000 triângulos.");
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const vertex = geometry.index?.getX(i) ?? i;
    positions.set([source.getX(vertex), source.getY(vertex), source.getZ(vertex)], i * 3);
  }
  return positions;
}

export function editSolid(positions: Float32Array, operation: SolidOperation): Promise<BufferGeometry> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./solid-mesh.worker.ts", import.meta.url), { type: "module" });
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error("A operação excedeu 60 segundos. Tente uma malha menor.")); }, 60_000);
    worker.onerror = () => { finish(); reject(new Error("Não foi possível carregar o motor de sólidos.")); };
    worker.onmessage = (event: MessageEvent<{ positions?: Float32Array; error?: string }>) => {
      finish();
      if (!event.data.positions) { reject(new Error(event.data.error ?? "Resultado inválido.")); return; }
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(event.data.positions, 3));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      resolve(geometry);
    };
    worker.postMessage({ positions, operation });
  });
}
