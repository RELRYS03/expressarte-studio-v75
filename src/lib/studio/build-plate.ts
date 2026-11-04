/**
 * Physical work area and vertical offsets for the Bambu Lab A1 build plate.
 * Dimensions are in millimeters; Y offsets keep the grid visible without
 * intersecting models placed at the bed origin.
 */
export const A1_BUILD_PLATE = {
  widthMm: 256,
  depthMm: 256,
  gridDivisions: 16,
  floorY: -0.04,
  gridY: -0.02,
} as const;
