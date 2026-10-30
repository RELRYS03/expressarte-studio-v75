import { ExtrudeGeometry, Path, Shape, Vector3 } from "three";

export type LedChannelOptions = {
  width: number; height: number; depth: number; wall: number; lidThickness?: number;
};
/** Two independent printable components; not a complete LED letter or electrical design. */
export function createLedChannelPart(part: "frame" | "lid", o: LedChannelOptions): ExtrudeGeometry {
  const { width, height, depth, wall } = o;
  const lid = o.lidThickness ?? 1.6;
  if (![width, height, depth, wall, lid].every(Number.isFinite) ||
      width < 25 || width > 300 || height < 25 || height > 300 ||
      depth < 5 || depth > 80 || wall < 1.2 || wall > 8 ||
      2 * wall >= Math.min(width, height) - 4 || lid < 0.8 || lid > 8) {
    throw new Error("Dimensões de canal LED inválidas.");
  }
  const outline = new Shape();
  outline.moveTo(0, 0);
  outline.lineTo(width, 0);
  outline.lineTo(width, height);
  outline.lineTo(0, height);
  outline.closePath();
  if (part === "frame") {
    const inner = new Path();
    inner.moveTo(wall, wall);
    inner.lineTo(wall, height - wall);
    inner.lineTo(width - wall, height - wall);
    inner.lineTo(width - wall, wall);
    inner.closePath();
    outline.holes.push(inner);
  } else if (part !== "lid") {
    throw new Error("Componente LED desconhecido.");
  }
  const geometry = new ExtrudeGeometry(outline, {
    depth: part === "lid" ? lid : depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.translate(-width / 2, -height / 2, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new Vector3());
  if (Math.abs(size.x - width) > 0.01 || Math.abs(size.y - height) > 0.01) {
    geometry.dispose();
    throw new Error("Falha ao gerar canal LED.");
  }
  return geometry;
}
