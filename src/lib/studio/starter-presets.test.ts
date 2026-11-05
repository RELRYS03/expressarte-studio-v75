// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { createStarterGeometry, type StarterPreset } from "./starter-presets";

describe("starter models in millimetres", () => {
  for (const [preset, size] of [
    ["round-keychain", [50, 50, 3]],
    ["rectangle-keychain", [60, 32, 3]],
    ["nameplate", [80, 30, 2.5]],
  ] as const satisfies ReadonlyArray<readonly [StarterPreset, readonly number[]]>) {
    it("builds " + preset + " with expected dimensions and finite coordinates", () => {
      const mesh = createStarterGeometry(preset);
      try {
        mesh.computeBoundingBox();
        const span = mesh.boundingBox!.getSize(new Vector3());
        expect([span.x, span.y, span.z].map(v => Math.round(v * 1000) / 1000)).toEqual(size);
        expect(Array.from(mesh.getAttribute("position").array).every(Number.isFinite)).toBe(true);
      } finally { mesh.dispose(); }
    });
  }
});

describe("parametric tools", () => {
  it("scales a rectangular keychain without changing extrusion depth", () => {
    const mesh = createStarterGeometry("rectangle-keychain", { width: 85, height: 40, thickness: 4, holeDiameter: 6 });
    try {
      mesh.computeBoundingBox();
      const size = mesh.boundingBox!.getSize(new Vector3());
      expect([size.x, size.y, size.z]).toEqual([85, 40, 4]);
    } finally { mesh.dispose(); }
  });
  it("generates a hexagonal keychain and round tag", () => {
    for (const preset of ["hex-keychain", "round-tag"] as const) {
      const geometry = createStarterGeometry(preset);
      expect(geometry.getAttribute("position").count).toBeGreaterThan(30);
      geometry.dispose();
    }
  });
  it("rejects invalid dimensions instead of producing corrupt STL", () => {
    expect(() => createStarterGeometry("round-keychain", { width: NaN })).toThrow();
    expect(() => createStarterGeometry("round-keychain", { holeDiameter: 25 })).toThrow();
    expect(() => createStarterGeometry("nameplate", { thickness: 0 })).toThrow();
  });
});

describe("keychain STL export regression", () => {
  for (const preset of ["round-keychain", "rectangle-keychain", "hex-keychain"] as const) {
    it(`exports and reopens a valid binary STL for ${preset}`, () => {
      const source = createStarterGeometry(preset, {
        width: 45, height: 30, thickness: 3, holeDiameter: 5,
      });
      const material = new MeshStandardMaterial();
      const group = new Group();
      group.add(new Mesh(source, material));
      try {
        const binary = new STLExporter().parse(group, { binary: true });
        const bytes = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
        expect(bytes.byteLength).toBeGreaterThan(84);
        const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
        expect(count).toBeGreaterThan(0);
        expect(bytes.byteLength).toBe(84 + count * 50);
        const loaded = new STLLoader().parse(bytes.buffer.slice(
          bytes.byteOffset, bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer);
        try {
          expect(loaded.getAttribute("position").count).toBe(count * 3);
          expect(Array.from(loaded.getAttribute("position").array).every(Number.isFinite)).toBe(true);
          loaded.computeBoundingBox();
          const size = loaded.boundingBox!.getSize(new Vector3());
          expect(size.x).toBeCloseTo(preset === "hex-keychain" ? 45 * Math.sqrt(3) / 2 : 45, 3);
          expect(size.z).toBeCloseTo(3, 3);
        } finally {
          loaded.dispose();
        }
      } finally {
        source.dispose();
        material.dispose();
      }
    });
  }
});
