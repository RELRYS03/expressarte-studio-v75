import { describe, expect, it } from "vitest";
import { closestCalibrations, correction, distance } from "./color-learning";
describe("aprendizado de cores", () => {
 it("identifica cores iguais", () => expect(distance("#123456","#123456")).toBe(0));
 it("encontra teste real mais próximo", () => {
  const entries = [
   {id:1,target:"#ffffff",measured:"#101010",date:"2026-01-01",ingredients:[{name:"preto",grams:1,hex:"#000000"}]},
   {id:2,target:"#ffffff",measured:"#fafafa",date:"2026-01-02",ingredients:[{name:"branco",grams:1,hex:"#ffffff"}]}
  ];
  expect(closestCalibrations("#ffffff",entries)[0].id).toBe(2);
 });
 it("sugere ajuste quando amostra é escura", () => expect(correction("#eeeeee","#555555")).toContain("branco"));
 it("não inventa diferença para tons próximos", () => expect(correction("#222222","#242424")).toContain("próximo"));
});
