import { describe, it, expect } from "vitest";
import { generatedStlToFile } from "./generated-stl";

function stl(triangles: number) {
  const buffer = new ArrayBuffer(84 + 50 * triangles);
  const data = new DataView(buffer);
  data.setUint32(80, triangles, true);
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
describe("generatedStlToFile", () => {
  it("aceita STL binario com um triangulo", () => {
    const file = generatedStlToFile(stl(1));
    expect(file.name).toBe("expressinho-chaveiro.stl");
    expect(file.size).toBe(134);
  });
  it("recusa arquivo sem faces", () => {
    expect(() => generatedStlToFile(stl(0))).toThrow();
  });
  it("recusa contagem de triangulos incorreta", () => {
    const buffer = new ArrayBuffer(134);
    new DataView(buffer).setUint32(80, 9, true);
    expect(() => generatedStlToFile(btoa(String.fromCharCode(...new Uint8Array(buffer))))).toThrow(/incompleto/);
  });
  it("recusa base64 corrompido", () => {
    expect(() => generatedStlToFile("????".repeat(100))).toThrow();
  });
});
