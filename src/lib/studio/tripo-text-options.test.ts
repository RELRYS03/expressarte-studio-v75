import { describe, it, expect } from "vitest";
import { buildTripoTextPayload, validateTripoOptions } from "./tripo-text-options";

describe("Tripo texto→3D", () => {
  const base = {prompt:"Um dragão azul celestial detalhado",quality:"detailed",forPrint:false,confirmCredits:true};
  it("monta pedido oficial de alta qualidade", () => {
    const options = validateTripoOptions(base);
    expect(buildTripoTextPayload(options)).toMatchObject({
      model:"v3.1-20260211",texture:true,pbr:true,
      texture_quality:"detailed",geometry_quality:"detailed",
    });
  });
  it("modo para impressão remove textura sem cortar detalhe geométrico", () => {
    const options = validateTripoOptions({...base,forPrint:true,quality:"extreme"});
    const payload = buildTripoTextPayload(options);
    expect(payload.texture).toBe(false);
    expect(payload.pbr).toBe(false);
    expect(payload.geometry_quality).toBe("detailed");
    expect("texture_quality" in payload).toBe(false);
  });
  it("extreme só para textura, geometry detailed", () => {
    const options = validateTripoOptions({...base,quality:"extreme"});
    expect(buildTripoTextPayload(options)).toMatchObject({
      texture_quality:"extreme",geometry_quality:"detailed"
    });
  });
  it("bloqueia geração sem consentimento explícito", () => {
    expect(() => validateTripoOptions({...base,confirmCredits:false})).toThrow(/Autorize/);
  });
  it("recusa parâmetros de qualidade desconhecidos", () => {
    expect(() => validateTripoOptions({...base,quality:"hidden_max"})).toThrow();
  });
});
