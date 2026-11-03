import { describe, expect, it } from "vitest";
import { imageDefaults, makePrintableMesh, makeMedalMesh, verifyClosed, type RasterSource } from "./image3d";
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
  it("preserva tons distintos em relevo PNG com fundo transparente", () => {
    const src = raster((x, y) => x >= 3 && x <= 20 && y >= 3 && y <= 20);
    for (let y = 3; y <= 20; y++) for (let x = 3; x <= 20; x++) {
      const i = (y * src.width + x) * 4;
      const value = x < 12 ? 30 : 215;
      src.rgba[i] = value; src.rgba[i + 1] = value; src.rgba[i + 2] = value;
    }
    const mesh = makePrintableMesh(src, { ...imageDefaults, mode: "relevo", resolution: 48 });
    const nx = 49;
    const darkerZ = mesh.positions[(20 * nx + 14) * 3 + 2]!;
    const lighterZ = mesh.positions[(20 * nx + 34) * 3 + 2]!;
    expect(darkerZ).toBeGreaterThan(lighterZ + 0.4);
    expect(verifyClosed(mesh).closed).toBe(true);
  });
  it("aplica o relevo da imagem nos vértices da medalha", () => {
    const blank = raster(() => false);
    const art = raster((x, y) => x >= 10 && x <= 13 && y >= 10 && y <= 13);
    const config = { widthMm: 75, baseMm: 2.4, reliefMm: 0.8, borderMm: 2, resolution: 64, threshold: 220 };
    const emptyMesh = makeMedalMesh(blank, config);
    const artworkMesh = makeMedalMesh(art, config);
    const nx = 65;
    const centerZ = ((32 * nx + 32) * 3) + 2;
    expect(artworkMesh.positions[centerZ]!).toBeGreaterThan(emptyMesh.positions[centerZ]!);
    expect(verifyClosed(artworkMesh).closed).toBe(true);
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
});
