import { ExtrudeGeometry, Path, Shape } from "three";

/** Editable starter solids in millimetres. SVG/text tools will extend these presets. */
export type StarterPreset = "round-keychain" | "rectangle-keychain" | "nameplate";

export function createStarterGeometry(preset: StarterPreset): ExtrudeGeometry {
  const shape = new Shape();
  let thickness = 3;
  if (preset === "round-keychain") {
    shape.absarc(0, 0, 25, 0, Math.PI * 2, false);
    const hole = new Path();
    hole.absarc(0, 18, 2.5, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else if (preset === "rectangle-keychain") {
    shape.moveTo(-30, -16);
    shape.lineTo(30, -16);
    shape.lineTo(30, 16);
    shape.lineTo(-30, 16);
    shape.closePath();
    const hole = new Path();
    hole.absarc(-23, 0, 2.5, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else if (preset === "nameplate") {
    shape.moveTo(-40, -15);
    shape.lineTo(40, -15);
    shape.lineTo(40, 15);
    shape.lineTo(-40, 15);
    shape.closePath();
    thickness = 2.5;
  } else {
    throw new Error("Modelo inicial desconhecido.");
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 64,
    steps: 1,
  });
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return geometry;
}
