import { describe, it, expect } from "vitest";
import { interpretLocalKeychain, validate3DPrompt } from "./expressinho-prompt";
describe("interpretação local de criação 3D", () => {
  it("extrai forma largura e nome", () => {
    expect(interpretLocalKeychain("chaveiro de coração com nome EXPRESSARTE, 80 mm"))
      .toMatchObject({kind:"chaveiro",shape:"coracao",widthMm:80,name:"EXPRESSARTE"});
  });
  it("usa tamanho padrão para chaveiro redondo", () => {
    expect(interpretLocalKeychain("um chaveiro redondo")).toMatchObject({shape:"circulo",widthMm:80});
  });
  it("não afirma gerar dragões no Blender paramétrico", () => {
    expect(() => interpretLocalKeychain("crie um chaveiro com dragão azul celestial")).toThrow(/escultura orgânica/);
  });
  it("não inventa modelos genéricos", () => {
    expect(() => interpretLocalKeychain("um boneco de fantasia")).toThrow();
  });
  it("rejeita larguras acima do limite", () => {
    expect(() => interpretLocalKeychain("chaveiro redondo 200 mm")).toThrow(/150 mm/);
  });
  it("verifica descrições vazias", () => {
    expect(() => validate3DPrompt("")).toThrow();
  });
});
