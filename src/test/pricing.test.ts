import { describe, expect, it } from "vitest";
import { calculatePricing, defaultPricing } from "@/lib/studio/pricing";

describe("Calculadora Express'Arte", () => {
  it("calcula material e energia com as unidades corretas", () => {
    const result = calculatePricing(defaultPricing);
    expect(result.material).toBeCloseTo(5);
    expect(result.energy).toBeCloseTo(0.405);
    expect(result.cost).toBeCloseTo(12.905);
  });
  it("aplica a margem sobre o valor de venda", () => {
    const result = calculatePricing({ ...defaultPricing, margin: 25, fee: 10 });
    expect(result.salePrice).toBeCloseTo(result.cost / 0.65);
    expect(result.profit).toBeCloseTo((result.salePrice ?? 0) * 0.25);
  });
  it("bloqueia soma inválida de margem e taxa", () => {
    const result = calculatePricing({ ...defaultPricing, margin: 90, fee: 10 });
    expect(result.valid).toBe(false);
    expect(result.salePrice).toBeNull();
  });
});
