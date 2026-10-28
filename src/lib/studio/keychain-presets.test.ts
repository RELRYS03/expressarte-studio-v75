import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { buildModel, defaultConfig, disposeModel, type ModelConfig } from "./model";

const presets = [
  { name: "redondo", shape: "circle", diameter: 45 },
  { name: "coração", shape: "heart", diameter: 50 },
  { name: "retangular", shape: "rectangle", diameter: 55 },
] as const;

describe("criador de chaveiros: geração e exportação", () => {
  it("permite ocultar texto ou posicioná-lo na frente e no verso", () => {
    const without = buildModel({ ...defaultConfig, shape: "circle", ring: false, border: false, showText: false });
    const front = buildModel({ ...defaultConfig, shape: "circle", ring: false, border: false, name: "ANA", textSide: "front", textPlacement: "top" });
    const back = buildModel({ ...defaultConfig, shape: "circle", ring: false, border: false, name: "ANA", textSide: "back", textPlacement: "bottom" });
    try {
      expect(without.children).toHaveLength(1);
      expect(front.children).toHaveLength(2);
      expect(back.children).toHaveLength(2);
      expect((front.children[1] as THREE.Mesh).position.y).toBeGreaterThan((back.children[1] as THREE.Mesh).position.y);
      expect((front.children[1] as THREE.Mesh).position.z).toBeGreaterThan(0);
      expect((back.children[1] as THREE.Mesh).position.z).toBeGreaterThan(0);
      expect((back.children[1] as THREE.Mesh).position.z).toBeLessThan(defaultConfig.thickness);
      expect((front.children[1] as THREE.Mesh).position.z).toBeLessThan(defaultConfig.thickness);
    } finally {
      disposeModel(without);
      disposeModel(front);
      disposeModel(back);
    }
  });

  for (const preset of presets) {
    it(`posiciona a argola junto ao contorno do chaveiro ${preset.name}`, () => {
      const model = buildModel({
        ...defaultConfig,
        name: "TESTE",
        shape: preset.shape,
        diameter: preset.diameter,
        ring: true,
        border: false,
      });
      try {
        const base = model.children[0] as THREE.Mesh;
        const ring = model.children[1] as THREE.Mesh;
        const connector = model.children[2] as THREE.Mesh;
        expect(ring.geometry).toBeInstanceOf(THREE.TorusGeometry);
        expect(connector.geometry).toBeInstanceOf(THREE.BoxGeometry);
        expect(new THREE.Box3().setFromObject(base).intersectsBox(new THREE.Box3().setFromObject(connector))).toBe(true);
        expect(new THREE.Box3().setFromObject(ring).intersectsBox(new THREE.Box3().setFromObject(connector))).toBe(true);
        if (preset.shape === "rectangle") {
          expect(connector.position.y).toBeCloseTo((preset.diameter / 2) * 0.65, 1);
        }
      } finally {
        disposeModel(model);
      }
    });

    it(`gera STL binário para chaveiro ${preset.name}`, () => {
      const config: ModelConfig = {
        ...defaultConfig,
        name: "TESTE",
        shape: preset.shape,
        diameter: preset.diameter,
        thickness: 3,
        textHeight: 1.2,
        ring: true,
        border: true,
      };
      const model = buildModel(config);
      try {
        expect(model.children.length).toBeGreaterThan(2);
        const result = new STLExporter().parse(model, { binary: true });
        // Binary STL starts with an 80-byte header and a 4-byte triangle count.
        expect(result.byteLength).toBeGreaterThan(84);
        const triangleCount = new DataView(result.buffer).getUint32(80, true);
        expect(triangleCount).toBeGreaterThan(0);
      } finally {
        disposeModel(model);
      }
    });
  }
});
