/** Colorimetria aproximada em RGB; não substitui medição de pigmentos reais. */
export type Mix = { name: string; grams: number; hex: string };
export type Calibration = { id: number; target: string; measured: string; ingredients: Mix[]; date: string };
export type RGB = readonly [number, number, number];

export function rgb(hex: string): RGB {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Informe uma cor HEX válida no formato #RRGGBB.");
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

export function distance(a: string, b: string): number {
  const first = rgb(a);
  const second = rgb(b);
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

export function closestCalibrations(target: string, entries: Calibration[], limit = 3) {
  return entries
    .filter((entry) => /^#[0-9a-f]{6}$/i.test(entry.measured) && entry.ingredients.length > 0)
    .map((entry) => ({ ...entry, distance: distance(target, entry.measured) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function correction(target: string, measured: string): string {
  const [tr, tg, tb] = rgb(target);
  const [mr, mg, mb] = rgb(measured);
  const diffs: RGB = [tr - mr, tg - mg, tb - mb];
  const dominant = diffs.reduce(
    (best, value, index) => Math.abs(value) > Math.abs(diffs[best]!) ? index : best,
    0,
  );
  const light = (tr + tg + tb) - (mr + mg + mb);

  if (Math.max(...diffs.map(Math.abs)) < 12) {
    return "Tom digital próximo. Faça uma amostra maior e confira após secagem.";
  }
  if (Math.abs(light) > 75 && diffs.every((value) => value >= -15)) {
    return "Amostra mais escura: teste uma quantidade mínima de branco em uma pequena porção.";
  }
  if (Math.abs(light) > 75 && diffs.every((value) => value <= 15)) {
    return "Amostra mais clara: teste uma quantidade mínima de pigmento escuro em uma pequena porção.";
  }
  const channels = ["vermelho", "verde", "azul"] as const;
  return "Diferença predominante no canal " + channels[dominant] + ". " +
    (diffs[dominant]! > 0 ? "A referência tem mais desse canal." : "A amostra tem mais desse canal.") +
    " Ajuste em uma pequena porção e registre o resultado.";
}
