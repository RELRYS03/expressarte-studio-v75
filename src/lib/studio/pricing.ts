export type Pricing = {
  weight: number;
  price: number;
  hours: number;
  power: number;
  kwh: number;
  labor: number;
  supplies: number;
  maintenance: number;
  fee: number;
  margin: number;
};
export const defaultPricing: Pricing = {
  weight: 50,
  price: 100,
  hours: 3,
  power: 150,
  kwh: 0.9,
  labor: 5,
  supplies: 1.5,
  maintenance: 1,
  fee: 0,
  margin: 30,
};
export function calculatePricing(c: Pricing) {
  const material = (c.weight / 1000) * c.price;
  const energy = (c.hours * c.power / 1000) * c.kwh;
  const cost = material + energy + c.labor + c.supplies + c.maintenance;
  // Margin refers to profit as a proportion of sale price; fees are also paid out of the sale price.
  const portion = 1 - (c.margin + c.fee) / 100;
  const valid = c.margin + c.fee < 100;
  const salePrice = valid ? cost / portion : null;
  return { material, energy, cost, salePrice, profit: salePrice === null ? null : salePrice * (c.margin / 100), valid };
}
