import { ExtrudeGeometry, Path, Shape, type BufferGeometry } from "three";
import { editSolid, solidPositions } from "./solid-mesh-client";

export type OrganizerOptions = {
  width: number;
  length: number;
  height: number;
  wallThickness: number;
  baseThickness: number;
  cornerRadius: number;
};

export const DEFAULT_ORGANIZER_OPTIONS: OrganizerOptions = {
  width: 220,
  length: 140,
  height: 40,
  wallThickness: 2,
  baseThickness: 2.4,
  cornerRadius: 4,
};

export type OrganizerParts = {
  walls: ExtrudeGeometry;
  base: ExtrudeGeometry;
};

function roundedRectangle(
  path: Shape | Path,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  radius: number,
  clockwise = false,
) {
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const bottom = centerY - height / 2;
  const top = centerY + height / 2;
  const r = Math.min(radius, width / 2, height / 2);

  if (clockwise) {
    path.moveTo(left + r, bottom);
    path.quadraticCurveTo(left, bottom, left, bottom + r);
    path.lineTo(left, top - r);
    path.quadraticCurveTo(left, top, left + r, top);
    path.lineTo(right - r, top);
    path.quadraticCurveTo(right, top, right, top - r);
    path.lineTo(right, bottom + r);
    path.quadraticCurveTo(right, bottom, right - r, bottom);
    path.lineTo(left + r, bottom);
    path.closePath();
    return;
  }

  path.moveTo(left + r, bottom);
  path.lineTo(right - r, bottom);
  path.quadraticCurveTo(right, bottom, right, bottom + r);
  path.lineTo(right, top - r);
  path.quadraticCurveTo(right, top, right - r, top);
  path.lineTo(left + r, top);
  path.quadraticCurveTo(left, top, left, top - r);
  path.lineTo(left, bottom + r);
  path.quadraticCurveTo(left, bottom, left + r, bottom);
  path.closePath();
}

/**
 * Creates the two closed solids used to form the tray.
 * The wall network has four pockets: one full-length tool channel and
 * three front compartments for glue, tapes, cutters and pliers.
 */
export function createOrganizerParts(
  options: OrganizerOptions = DEFAULT_ORGANIZER_OPTIONS,
): OrganizerParts {
  const { width, length, height, wallThickness: wall, baseThickness, cornerRadius } = options;
  const values = [width, length, height, wall, baseThickness, cornerRadius];
  if (!values.every(Number.isFinite) ||
      width < 80 || width > 250 ||
      length < 60 || length > 200 ||
      height < 15 || height > 80 ||
      wall < 1.2 || wall > 4 ||
      baseThickness < 1.2 || baseThickness > 5 ||
      cornerRadius < 0 || cornerRadius > 10 ||
      baseThickness >= height) {
    throw new Error("Dimensões inválidas para o organizador.");
  }

  const innerWidth = width - wall * 2;
  const innerLength = length - wall * 2;
  const channelLength = Math.min(40, innerLength * 0.34);
  const lowerLength = innerLength - channelLength - wall;
  const pocketWidth = (innerWidth - wall * 2) / 3;
  if (lowerLength < 25 || pocketWidth < 18) {
    throw new Error("As dimensões não deixam espaço suficiente para os compartimentos.");
  }

  const shell = new Shape();
  roundedRectangle(shell, 0, 0, width, length, cornerRadius);

  const channelY = length / 2 - wall - channelLength / 2;
  const cavityRadius = Math.min(3, cornerRadius / 2);
  const channel = new Path();
  roundedRectangle(channel, 0, channelY, innerWidth, channelLength, cavityRadius, true);
  shell.holes.push(channel);

  const lowerCenterY = -length / 2 + wall + lowerLength / 2;
  for (let column = 0; column < 3; column++) {
    const centerX = -innerWidth / 2 + pocketWidth / 2 + column * (pocketWidth + wall);
    const pocket = new Path();
    roundedRectangle(pocket, centerX, lowerCenterY, pocketWidth, lowerLength, cavityRadius, true);
    shell.holes.push(pocket);
  }

  // Keep the floor slightly inside the outside wall faces so the boolean
  // union does not have to resolve coincident coplanar outer surfaces.
  const baseShape = new Shape();
  roundedRectangle(
    baseShape,
    0,
    0,
    width - wall,
    length - wall,
    Math.max(0, cornerRadius - wall / 2),
  );

  const walls = new ExtrudeGeometry(shell, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
  const base = new ExtrudeGeometry(baseShape, {
    depth: baseThickness,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
  walls.computeBoundingBox();
  base.computeBoundingBox();
  return { walls, base };
}

/** Returns one watertight tray mesh in millimetres, ready for STL export. */
export async function createOrganizerGeometry(
  options: OrganizerOptions = DEFAULT_ORGANIZER_OPTIONS,
): Promise<BufferGeometry> {
  const { walls, base } = createOrganizerParts(options);
  try {
    return await editSolid(solidPositions(walls), {
      kind: "union",
      second: solidPositions(base),
    });
  } finally {
    walls.dispose();
    base.dispose();
  }
}
