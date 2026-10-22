import { describe, expect, it } from "vitest";
import { calculatePricing, defaultPricing } from "@/lib/studio/pricing";

describe("Calculadora Express'Arte", () => {
  it("calcula material e energia com as unidades corretas", () => {
    const result = calculatePricing(defaultPricing);
    expect(result.material).toBeCloseTo(5);
    expect(result.energy).toBeCloseTo(0.405);
    expect(result.machine).toBe(0);
    expect(result.cost).toBeCloseTo(7.905);
  });

  it("aplica lucro sobre o custo e desconta a taxa sobre o preço de venda", () => {
    const result = calculatePricing({ ...defaultPricing, margin: 25, fee: 10 });
    expect(result.salePrice).toBeCloseTo(result.cost * 1.25 / 0.9);
    expect(result.profit).toBeCloseTo(result.cost * 0.25);
  });

  it("calcula desgaste da máquina, mão de obra e reserva de falhas", () => {
    const result = calculatePricing({
      ...defaultPricing,
      machineValue: 2000,
      machineLifeHours: 5000,
      hours: 2,
      laborRate: 20,
      manualHours: 0.5,
      supplies: 0,
      maintenance: 0,
      failureRate: 10,
      margin: 0,
    });
    expect(result.machine).toBeCloseTo(0.8);
    expect(result.labor).toBeCloseTo(10);
    expect(result.productionCost).toBeCloseTo(10 + 0.8 + 5 + 0.27);
    expect(result.failureReserve).toBeCloseTo(result.productionCost * 0.1);
  });

  it("calcula totais do lote sem alterar o preço unitário", () => {
    const one = calculatePricing({ ...defaultPricing, quantity: 1 });
    const ten = calculatePricing({ ...defaultPricing, quantity: 10 });
    expect(ten.salePrice).toBeCloseTo(one.salePrice ?? 0);
    expect(ten.salePriceTotal).toBeCloseTo((one.salePrice ?? 0) * 10);
    expect(ten.costTotal).toBeCloseTo(one.cost * 10);
    expect(ten.totalHours).toBe(30);
  });

  it("bloqueia taxa de venda inválida e vida útil ausente para máquina com custo", () => {
    expect(calculatePricing({ ...defaultPricing, fee: 100 }).valid).toBe(false);
    expect(calculatePricing({ ...defaultPricing, machineValue: 1000, machineLifeHours: 0 }).valid).toBe(false);
    expect(calculatePricing({ ...defaultPricing, quantity: 0 }).valid).toBe(false);
  });
});
