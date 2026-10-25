/** Colorimetria aproximada em RGB; não substitui medição de pigmentos reais. */
export type Mix = { name: string; grams: number; hex: string };
export type Calibration = { id: number; target: string; measured: string; ingredients: Mix[]; date: string };
export const rgb = (hex: string) => [1,3,5].map(i => Number.parseInt(hex.slice(i,i+2),16));
export const distance = (a: string,b: string) => Math.hypot(...rgb(a).map((v,i)=>v-rgb(b)[i]));
export function closestCalibrations(target: string, entries: Calibration[], limit=3) {
  return entries.filter(e => /^#[0-9a-f]{6}$/i.test(e.measured) && e.ingredients.length>0)
    .map(e => ({...e, distance:distance(target,e.measured)}))
    .sort((a,b)=>a.distance-b.distance).slice(0,limit);
}
export function correction(target:string,measured:string) {
  const [tr,tg,tb]=rgb(target),[mr,mg,mb]=rgb(measured);
  const diffs=[tr-mr,tg-mg,tb-mb];
  const dominant=diffs.reduce((best,v,i)=>Math.abs(v)>Math.abs(diffs[best])?i:best,0);
  const light=(tr+tg+tb)-(mr+mg+mb);
  if(Math.max(...diffs.map(Math.abs))<12) return "Tom digital próximo. Faça uma amostra maior e confira após secagem.";
  if(Math.abs(light)>75 && diffs.every(v=>v>=-15)) return "Amostra mais escura: teste uma quantidade mínima de branco em uma pequena porção.";
  if(Math.abs(light)>75 && diffs.every(v=>v<=15)) return "Amostra mais clara: teste uma quantidade mínima de pigmento escuro em uma pequena porção.";
  const channels=["vermelho","verde","azul"];
  return "Diferença predominante no canal "+channels[dominant]+". "+(diffs[dominant]>0?"A referência tem mais desse canal.":"A amostra tem mais desse canal.")+" Ajuste em uma pequena porção e registre o resultado.";
}
