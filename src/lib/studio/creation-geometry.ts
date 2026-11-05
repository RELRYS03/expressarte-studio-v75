import { Box3, BufferGeometry, CylinderGeometry, SphereGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import fontData from "@/assets/studio-font.json";
import { createStarterGeometry } from "./starter-presets";
import { createOrganizerParts } from "./organizer";
import { solidPositions } from "./solid-mesh-client";
import { validateCreationSpec, type CreationSpec } from "./creation-spec";
import type { PrintableMesh } from "./image3d";

const font = new FontLoader().parse(fontData);

/** Closed constituent solids, Z up, millimetres. Caller owns disposal. */
export function createGuidedParts(spec: CreationSpec): BufferGeometry[] {
  validateCreationSpec(spec);
  if (spec.kind === "organizer") {
    const { walls, base } = createOrganizerParts({ width: spec.width, length: spec.length, height: spec.height,
      wallThickness: 2, baseThickness: 2.4, cornerRadius: 4 });
    return [walls, base];
  }
  if (spec.kind === "keychain") {
    const base = createStarterGeometry(spec.shape, { width: spec.width, height: spec.length, thickness: spec.height, holeDiameter: 5 });
    if (!spec.name.trim()) return [base];
    const name = spec.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const letters = new TextGeometry(name, { font, size: 8, depth: 1.1, curveSegments: 3, bevelEnabled: false });
    letters.computeBoundingBox();
    const bounds = letters.boundingBox!;
    const dimensions = bounds.getSize(new Vector3());
    if (!dimensions.x || !dimensions.y) { letters.dispose(); base.dispose(); throw new Error("Não foi possível desenhar esse nome."); }
    const faceHeight = spec.shape === "rectangle-keychain" ? spec.length : spec.width;
    const factor = Math.min(spec.width * .65 / dimensions.x, faceHeight * .3 / dimensions.y);
    letters.scale(factor, factor, 1);
    letters.translate(-(bounds.min.x + dimensions.x / 2) * factor, -(bounds.min.y + dimensions.y / 2) * factor - 2, spec.height - .25);
    return [base, letters];
  }
  const h = spec.height;
  const parts: BufferGeometry[] = [];
  const box = (w: number, d: number, z: number, x: number, y: number, height: number) => {
    const g = new RoundedBoxGeometry(w * h, d * h, z * h, 2, .012 * h);
    g.translate(x * h, y * h, height * h); parts.push(g);
  };
  const ellipsoid = (rx: number, ry: number, rz: number, x: number, y: number, z: number) => {
    const g = new SphereGeometry(1, 20, 12); g.scale(rx * h, ry * h, rz * h); g.translate(x * h, y * h, z * h); parts.push(g);
  };
  const base = new CylinderGeometry(.25 * h, .25 * h, .05 * h, 48);
  base.rotateX(Math.PI / 2); base.translate(0, 0, .025 * h); parts.push(base);
  for (const side of [-1, 1]) {
    box(.14, .21, .09, side * .09, -.025, .085);
    box(.09, .12, .28, side * .085, 0, .23);
    box(.10, .14, .25, side * .175, 0, .40);
    ellipsoid(.055, .07, .06, side * .175, -.005, .285);
  }
  box(.28, .21, .3, 0, 0, .41);
  ellipsoid(.075, .08, .08, 0, 0, .555);
  box(.56, .40, .43, 0, 0, .76);
  for (const side of [-1, 1]) ellipsoid(.052, .027, .064, side * .13, -.198, .75);
  if (spec.hat) {
    box(.58, .42, .075, 0, 0, .97);
    box(.46, .25, .04, 0, -.22, .95);
  }
  // One physical height independent of the chosen hat. Keep the base at Z=0.
  const bounds = new Box3();
  for (const g of parts) { g.computeBoundingBox(); bounds.union(g.boundingBox!); }
  const scale = h / (bounds.max.z - bounds.min.z);
  for (const g of parts) { g.translate(0, 0, -bounds.min.z); g.scale(scale, scale, scale); }
  return parts;
}

export function guidedSolidInputs(spec: CreationSpec): Float32Array[] {
  const parts = createGuidedParts(spec);
  try { return parts.map(solidPositions); }
  finally { parts.forEach(g => g.dispose()); }
}

export function geometryToPrintableMesh(geometry: BufferGeometry): PrintableMesh {
  const positions = solidPositions(geometry);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new Vector3());
  const indices = Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from(positions.subarray(i, i + 9)) as [number,number,number,number,number,number,number,number,number];
    volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return { positions, indices, widthMm: size.x, heightMm: size.y, depthMm: size.z,
    triangles: indices.length / 3, volumeMm3: Math.abs(volume), regions: 1,
    warnings: ["Revise orientação, suportes e espessuras no fatiador antes de imprimir."] };
}
