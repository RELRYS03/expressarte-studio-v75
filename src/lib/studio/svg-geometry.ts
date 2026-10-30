import { ExtrudeGeometry, Shape, Vector3 } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export function validateSvgSource(source: string): void {
  if (!source || source.length > 2_000_000 || !/<svg[\s>]/i.test(source))
    throw new Error("Escolha um SVG válido de até 2 MB.");
  if (/<\s*(script|foreignObject|image|use|animate|set|iframe|object|embed|style|filter|mask|pattern|text)\b/i.test(source) ||
      /\bon[a-z]+\s*=|\b(href|src)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(source))
    throw new Error("SVG contém elementos externos ou não suportados. Converta texto e imagens em caminhos vetoriais.");
}

/** Import locally authored vector paths as a 3D solid. This does not weld disjoint regions. */
export function geometryFromSvg(source: string, widthMm: number, depthMm: number): ExtrudeGeometry {
  validateSvgSource(source);
  if (!Number.isFinite(widthMm) || widthMm < 5 || widthMm > 300 ||
      !Number.isFinite(depthMm) || depthMm < 0.8 || depthMm > 30)
    throw new Error("Largura deve ser 5–300 mm e espessura 0,8–30 mm.");
  const parsed = new SVGLoader().parse(source);
  const shapes: Shape[] = [];
  for (const path of parsed.paths) {
    if ((path.userData?.["style"] as { fill?: string } | undefined)?.fill === "none") continue;
    shapes.push(...SVGLoader.createShapes(path));
  }
  if (!shapes.length || shapes.length > 500) throw new Error("SVG sem caminhos preenchidos ou excessivamente complexo.");
  const geometry = new ExtrudeGeometry(shapes, { depth: depthMm, bevelEnabled: false, steps: 1, curveSegments: 12 });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new Vector3());
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || size.x <= 0 || size.y <= 0 ||
      geometry.getAttribute("position").count > 600_000) {
    geometry.dispose();
    throw new Error("SVG gerou geometria vazia ou acima do limite.");
  }
  const scale = widthMm / size.x;
  geometry.translate(-box.min.x, -box.min.y, -box.min.z);
  geometry.scale(scale, scale, 1);
  geometry.translate(-widthMm / 2, -size.y * scale / 2, 0);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return geometry;
}
