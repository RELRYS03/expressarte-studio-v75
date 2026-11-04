// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Mesh, MeshBasicMaterial, Vector3 } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { createText3DGeometry } from "./text-geometry";

describe("text 3D geometry", () => {
  it("creates extruded text with exact width/depth and centered XY bounds", () => {
    const geometry = createText3DGeometry({
      text: "EXPRESS ARTE",
      widthMm: 80,
      depthMm: 3,
    });
    try {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      const size = bounds.getSize(new Vector3());
      expect(size.x).toBeCloseTo(80, 2);
      expect(size.z).toBeCloseTo(3, 2);
      expect(bounds.min.x + bounds.max.x).toBeCloseTo(0, 4);
      expect(bounds.min.y + bounds.max.y).toBeCloseTo(0, 4);
      expect(bounds.min.z).toBeCloseTo(0, 5);
      expect(geometry.getAttribute("position").count).toBeGreaterThan(30);
      expect(Array.from(geometry.getAttribute("position").array).every(Number.isFinite)).toBe(true);
    } finally {
      geometry.dispose();
    }
  });

  it("keeps the requested extrusion depth when the text width changes", () => {
    const geometry = createText3DGeometry({ text: "ABC", widthMm: 120, depthMm: 2.4 });
    try {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.getSize(new Vector3()).z).toBeCloseTo(2.4, 3);
    } finally {
      geometry.dispose();
    }
  });

  it("exports the generated text as a valid non-empty binary STL", () => {
    const geometry = createText3DGeometry({ text: "NOME TESTE", widthMm: 90, depthMm: 2.5 });
    const material = new MeshBasicMaterial();
    try {
      const result = new STLExporter().parse(new Mesh(geometry, material), { binary: true });
      const triangleCount = new DataView(result.buffer, result.byteOffset, result.byteLength).getUint32(80, true);
      expect(result.byteLength).toBeGreaterThan(84);
      expect(triangleCount).toBeGreaterThan(0);
      expect(84 + triangleCount * 50).toBe(result.byteLength);
    } finally {
      geometry.dispose();
      material.dispose();
    }
  });

  it("rejects empty, multiline, unsupported and overlong text", () => {
    expect(() => createText3DGeometry({ text: "   " })).toThrow();
    expect(() => createText3DGeometry({ text: "LINHA 1\nLINHA 2" })).toThrow();
    expect(() => createText3DGeometry({ text: "JOÃO" })).toThrow(/caracteres/);
    expect(() => createText3DGeometry({ text: "A".repeat(33) })).toThrow(/32 caracteres/);
  });

  it("rejects dimensions outside the printable input limits", () => {
    expect(() => createText3DGeometry({ text: "ABC", widthMm: 9 })).toThrow();
    expect(() => createText3DGeometry({ text: "ABC", widthMm: 251 })).toThrow();
    expect(() => createText3DGeometry({ text: "ABC", depthMm: 0.5 })).toThrow();
    expect(() => createText3DGeometry({ text: "ABC", depthMm: 21 })).toThrow();
    expect(() => createText3DGeometry({ text: "ABC", depthMm: Number.NaN })).toThrow();
  });
});
