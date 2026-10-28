import { describe, expect, it } from "vitest";
import { imageDefaults, makePrintableMesh, verifyClosed, type RasterSource } from "./image3d";
import { stlBinary, threeMfFile } from "./print-exports";

function raster(fn: (x: number, y: number) => boolean): RasterSource {
  const width = 24, height = 24;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const pos = (y * width + x) * 4;
    rgba[pos] = 126; rgba[pos + 1] = 50; rgba[pos + 2] = 23; rgba[pos + 3] = fn(x, y) ? 255 : 0;
  }
  return { name: "teste.png", width, height, rgba };
}
const source = raster((x, y) => x > 4 && x < 19 && y > 4 && y < 19 && !(x > 10 && x < 14 && y > 10 && y < 14));
describe("Imagem para impressão 3D", () => {
  for (const mode of ["relevo", "litofania", "silhueta"] as const) {
    it(`gera ${mode} com malha fechada e extensão física positiva`, () => {
      const mesh = makePrintableMesh(source, { ...imageDefaults, mode, resolution: 48 });
      expect(mesh.triangles).toBeGreaterThan(30);
      expect(mesh.depthMm).toBeGreaterThan(0);
      expect(mesh.widthMm).toBe(100);
      expect(verifyClosed(mesh).closed).toBe(true);
    });
  }
  it("constrói silhueta sem base com abertura interna", () => {
    const mesh = makePrintableMesh(source, { ...imageDefaults, mode: "silhueta", silhouetteBase: false, resolution: 48 });
    expect(verifyClosed(mesh).nonManifoldEdges).toBe(0);
    expect(mesh.triangles).toBeGreaterThan(0);
  });
  it("gera STL binário com contagem de triângulos correta", async () => {
    const mesh = makePrintableMesh(source, imageDefaults);
    const bytes = await stlBinary(mesh).arrayBuffer();
    expect(bytes.byteLength).toBe(84 + mesh.triangles * 50);
    expect(new DataView(bytes).getUint32(80, true)).toBe(mesh.triangles);
  });
  it("gera arquivo 3MF com cabeçalho ZIP", async () => {
    const mesh = makePrintableMesh(source, { ...imageDefaults, resolution: 32 });
    const buffer = await threeMfFile(mesh).arrayBuffer();
    expect(new DataView(buffer).getUint32(0, true)).toBe(0x04034b50);
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
  it("preserva tons diferentes em PNG transparente usado como referência de chaveiro", () => {
    const rgba = new Uint8ClampedArray(24 * 24 * 4);
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const i = (y * 24 + x) * 4;
      // Two visible regions of different luminance on transparent background.
      const visible = x >= 2 && x < 22 && y >= 2 && y < 22;
      const shade = x < 12 ? 30 : 200;
      rgba[i] = shade;
      rgba[i + 1] = shade;
      rgba[i + 2] = shade;
      rgba[i + 3] = visible ? 255 : 0;
    }
    const mesh = makePrintableMesh(
      { name: "referencia-chaveiro.png", width: 24, height: 24, rgba },
      { ...imageDefaults, widthMm: 48, resolution: 24, mode: "relevo" },
    );
    const topZ = (x: number, y: number) => mesh.positions[(y * 25 + x) * 3 + 2]!;
    expect(topZ(6, 12)).toBeGreaterThan(topZ(18, 12) + 0.5);
    expect(mesh.widthMm).toBe(48);
    expect(mesh.heightMm).toBe(48);
    expect(verifyClosed(mesh).closed).toBe(true);
  });

});
