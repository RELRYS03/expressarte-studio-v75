import { describe, expect, it } from "vitest";
import { A1_BUILD_PLATE } from "./build-plate";

describe("mesa de impressão Bambu Lab A1", () => {
  it("usa a área física de 256 × 256 mm", () => {
    expect(A1_BUILD_PLATE.widthMm).toBe(256);
    expect(A1_BUILD_PLATE.depthMm).toBe(256);
  });

  it("divide a grade em quadrículas de 16 mm", () => {
    expect(A1_BUILD_PLATE.widthMm / A1_BUILD_PLATE.gridDivisions).toBe(16);
  });

  it("mantém a grade acima da placa e abaixo dos modelos em Y = 0", () => {
    expect(A1_BUILD_PLATE.gridY).toBeGreaterThan(A1_BUILD_PLATE.floorY);
    expect(A1_BUILD_PLATE.gridY).toBeLessThan(0);
  });
});
