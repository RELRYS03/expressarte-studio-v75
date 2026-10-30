import { ExtrudeGeometry, Path, Shape } from "three";

export type StarterPreset = "round-keychain" | "rectangle-keychain" | "nameplate" | "hex-keychain" | "round-tag";
export type StarterOptions = { width?: number; height?: number; thickness?: number; holeDiameter?: number };

export function createStarterGeometry(preset: StarterPreset, options: StarterOptions = {}): ExtrudeGeometry {
  const round = preset === "round-keychain" || preset === "round-tag";
  const hex = preset === "hex-keychain";
  const plate = preset === "nameplate";
  const width = options.width ?? (round ? 50 : hex ? 54 : plate ? 80 : 60);
  const height = round || hex ? width : options.height ?? (plate ? 30 : 32);
  const thickness = options.thickness ?? (plate ? 2.5 : 3);
  const holeDiameter = plate ? 0 : options.holeDiameter ?? 5;
  if (![width, height, thickness, holeDiameter].every(Number.isFinite) ||
      width < 15 || width > 300 || height < 15 || height > 300 ||
      thickness < 0.8 || thickness > 30 || holeDiameter < 0 ||
      holeDiameter > Math.min(width, height) / 3) {
    throw new Error("Dimensões inválidas: largura/altura 15–300 mm, espessura 0,8–30 mm e furo de até 1/3 da peça.");
  }
  const shape = new Shape();
  if (round) {
    shape.absarc(0, 0, width / 2, 0, Math.PI * 2, false);
  } else if (hex) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + i * Math.PI / 3;
      const x = width / 2 * Math.cos(angle);
      const y = width / 2 * Math.sin(angle);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
  } else if (preset === "rectangle-keychain" || plate) {
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();
  } else {
    throw new Error("Modelo inicial desconhecido.");
  }
  if (holeDiameter > 0) {
    const radius = holeDiameter / 2;
    const margin = Math.max(3, radius + 2);
    const hole = new Path();
    const hx = preset === "rectangle-keychain" ? -width / 2 + margin : 0;
    const hy = preset === "rectangle-keychain" ? 0 : height / 2 - margin - (hex ? 2 : 0);
    hole.absarc(hx, hy, radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 64, steps: 1 });
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return geometry;
}
