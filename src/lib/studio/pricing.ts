export type Pricing = {
  weight: number;
  price: number;
  hours: number;
  power: number;
  kwh: number;
  machineValue: number;
  machineLifeHours: number;
  laborRate: number;
  manualHours: number;
  supplies: number;
  maintenance: number;
  quantity: number;
  failureRate: number;
  fee: number;
  margin: number;
};

export const defaultPricing: Pricing = {
  weight: 50,
  price: 100,
  hours: 3,
  power: 150,
  kwh: 0.9,
  machineValue: 0,
  machineLifeHours: 10000,
  laborRate: 0,
  manualHours: 0,
  supplies: 1.5,
  maintenance: 1,
  quantity: 1,
  failureRate: 0,
  fee: 0,
  margin: 50,
};

export function calculatePricing(c: Pricing) {
  const material = (c.weight / 1000) * c.price;
  const energy = (c.hours * c.power / 1000) * c.kwh;
  const machine = c.machineLifeHours > 0
    ? (c.machineValue / c.machineLifeHours) * c.hours
    : 0;
  const labor = c.laborRate * c.manualHours;
  const productionCost = material + energy + machine + labor + c.supplies + c.maintenance;
  const failureReserve = productionCost * (c.failureRate / 100);
  const cost = productionCost + failureReserve;
  const quantity = Math.floor(c.quantity);
  // Margin is a markup on full unit cost; marketplace fees are a percentage of the sale price.
  const valid =
    Number.isFinite(cost) &&
    Object.values(c).every((value) => Number.isFinite(value) && value >= 0) &&
    Number.isInteger(c.quantity) &&
    quantity >= 1 &&
    (c.machineValue === 0 || c.machineLifeHours > 0) &&
    c.fee < 100;

  const salePrice = valid ? (cost * (1 + c.margin / 100)) / (1 - c.fee / 100) : null;
  const profit = salePrice === null ? null : salePrice * (1 - c.fee / 100) - cost;

  return {
    material,
    energy,
    machine,
    labor,
    supplies: c.supplies,
    maintenance: c.maintenance,
    failureReserve,
    productionCost,
    cost,
    costTotal: cost * quantity,
    salePrice,
    salePriceTotal: salePrice === null ? null : salePrice * quantity,
    profit,
    profitTotal: profit === null ? null : profit * quantity,
    quantity,
    totalHours: c.hours * quantity,
    valid,
  };
}
