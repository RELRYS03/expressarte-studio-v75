import type { BufferGeometry } from "three";

/** Places a raised logo at the top XY centre, embedded 0.25mm for boolean union. */
export function placeRaisedLogo(base: BufferGeometry, logo: BufferGeometry, overlap = 0.25): void {
  base.computeBoundingBox();
  logo.computeBoundingBox();
  const b = base.boundingBox, l = logo.boundingBox;
  if (!b || !l || !Number.isFinite(overlap) || overlap <= 0) throw new Error("Malha ou sobreposição inválida.");
  const bx = (b.min.x + b.max.x) / 2, by = (b.min.y + b.max.y) / 2;
  const lx = (l.min.x + l.max.x) / 2, ly = (l.min.y + l.max.y) / 2;
  const depth = l.max.z - l.min.z;
  if (depth <= overlap) throw new Error("O relevo deve ser maior que a sobreposição.");
  logo.translate(bx - lx, by - ly, b.max.z - overlap - l.min.z);
  logo.computeBoundingBox();
}
