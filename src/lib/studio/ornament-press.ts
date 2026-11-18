import { LatheGeometry, Vector2, type BufferGeometry } from "three";

export type BallOrnamentPressConfig = {
  /** Diâmetro externo da bola formada, em milímetros. */
  diameterMm: number;
  /** Espessura da parede da casca, em milímetros. */
  wallThicknessMm: number;
  /** Folga nominal entre os moldes e a casca, em milímetros. */
  clearanceMm: number;
  /** Material ao redor da cavidade do molde, em milímetros. */
  pressMarginMm: number;
  /** Segmentos angulares usados para construir as superfícies. */
  segments: number;
};

export const DEFAULT_BALL_ORNAMENT_PRESS_CONFIG: BallOrnamentPressConfig = {
  diameterMm: 60,
  wallThicknessMm: 1.2,
  clearanceMm: 0.3,
  pressMarginMm: 12,
  segments: 96,
};

export type BallOrnamentPressParts = {
  ornamentUpper: BufferGeometry;
  ornamentLower: BufferGeometry;
  pressMale: BufferGeometry;
  pressFemale: BufferGeometry;
};

function validateConfig(config: BallOrnamentPressConfig) {
  const values = [
    config.diameterMm,
    config.wallThicknessMm,
    config.clearanceMm,
    config.pressMarginMm,
    config.segments,
  ];
  if (!values.every(Number.isFinite)) {
    throw new Error("Todos os parâmetros do adorno devem ser números finitos.");
  }
  if (config.diameterMm < 40 || config.diameterMm > 120) {
    throw new Error("O diâmetro da bola deve ficar entre 40 e 120 mm.");
  }
  if (config.wallThicknessMm < 0.8 || config.wallThicknessMm > 2.4 ||
      config.wallThicknessMm * 2 >= config.diameterMm / 2) {
    throw new Error("A parede deve ficar entre 0,8 e 2,4 mm e ser menor que o raio da bola.");
  }
  if (config.clearanceMm < 0.15 || config.clearanceMm > 0.6) {
    throw new Error("A folga do molde deve ficar entre 0,15 e 0,6 mm.");
  }
  if (config.pressMarginMm < 8 || config.pressMarginMm > 20) {
    throw new Error("A margem do molde deve ficar entre 8 e 20 mm.");
  }
  if (!Number.isInteger(config.segments) || config.segments < 32 || config.segments > 192) {
    throw new Error("Use entre 32 e 192 segmentos inteiros.");
  }
}

function makeLathe(points: Vector2[], segments: number, name: string) {
  const geometry = new LatheGeometry(points, segments);
  geometry.name = name;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A closed, hollow hemispherical shell. The radial profile travels along the
 * inside wall, across the equatorial rim, and back along the outside wall.
 * Y=0 is the equator; the dome extends toward positive Y.
 */
function makeHemisphere(radius: number, wall: number, segments: number, name: string) {
  const innerRadius = radius - wall;
  const profile: Vector2[] = [];

  for (let i = 0; i <= segments / 2; i++) {
    const angle = (i / (segments / 2)) * (Math.PI / 2);
    profile.push(new Vector2(
      innerRadius * Math.sin(angle),
      innerRadius * Math.cos(angle),
    ));
  }

  profile.push(new Vector2(radius, 0));

  for (let i = segments / 2; i >= 0; i--) {
    const angle = (i / (segments / 2)) * (Math.PI / 2);
    profile.push(new Vector2(
      radius * Math.sin(angle),
      radius * Math.cos(angle),
    ));
  }

  return makeLathe(profile, segments, name);
}

function makeMalePressDie(
  radius: number,
  wall: number,
  clearance: number,
  margin: number,
  segments: number,
) {
  const domeRadius = radius - wall - clearance;
  const blockRadius = radius + margin;
  const baseDepth = domeRadius + 8;
  const profile: Vector2[] = [
    new Vector2(0, -baseDepth),
    new Vector2(blockRadius, -baseDepth),
    new Vector2(blockRadius, 0),
    new Vector2(domeRadius, 0),
  ];

  for (let i = segments / 2; i >= 0; i--) {
    const angle = (i / (segments / 2)) * (Math.PI / 2);
    profile.push(new Vector2(
      domeRadius * Math.sin(angle),
      domeRadius * Math.cos(angle),
    ));
  }

  return makeLathe(profile, segments, "molde-macho-bola");
}

function makeFemalePressDie(
  radius: number,
  clearance: number,
  margin: number,
  segments: number,
) {
  const cavityRadius = radius + clearance;
  const blockRadius = radius + margin;
  const baseDepth = cavityRadius + 8;
  const profile: Vector2[] = [
    new Vector2(0, -baseDepth),
    new Vector2(blockRadius, -baseDepth),
    new Vector2(blockRadius, 0),
    new Vector2(cavityRadius, 0),
  ];

  for (let i = segments / 2; i >= 0; i--) {
    const angle = (i / (segments / 2)) * (Math.PI / 2);
    profile.push(new Vector2(
      cavityRadius * Math.sin(angle),
      -cavityRadius * Math.cos(angle),
    ));
  }

  const geometry = makeLathe(profile, segments, "molde-femea-bola");
  // The female cavity faces the male dome across the shared parting plane.
  geometry.rotateX(Math.PI);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Creates the first parametric ball-ornament tooling set:
 * two hollow ornament hemispheres and matching male/female press dies.
 *
 * This first revision intentionally has smooth shell surfaces and no snap
 * joints or decorative perforations. Those features require their own
 * validated geometry and are not implied by this basic tooling set.
 */
export function createBallOrnamentPressParts(
  config: BallOrnamentPressConfig = DEFAULT_BALL_ORNAMENT_PRESS_CONFIG,
): BallOrnamentPressParts {
  validateConfig(config);
  const radius = config.diameterMm / 2;
  const upper = makeHemisphere(
    radius,
    config.wallThicknessMm,
    config.segments,
    "adorno-metade-superior",
  );
  const lower = makeHemisphere(
    radius,
    config.wallThicknessMm,
    config.segments,
    "adorno-metade-inferior",
  );
  lower.rotateX(Math.PI);
  lower.computeVertexNormals();
  lower.computeBoundingBox();
  lower.computeBoundingSphere();

  return {
    ornamentUpper: upper,
    ornamentLower: lower,
    pressMale: makeMalePressDie(
      radius,
      config.wallThicknessMm,
      config.clearanceMm,
      config.pressMarginMm,
      config.segments,
    ),
    pressFemale: makeFemalePressDie(
      radius,
      config.clearanceMm,
      config.pressMarginMm,
      config.segments,
    ),
  };
}

export function disposeBallOrnamentPressParts(parts: BallOrnamentPressParts) {
  parts.ornamentUpper.dispose();
  parts.ornamentLower.dispose();
  parts.pressMale.dispose();
  parts.pressFemale.dispose();
}
