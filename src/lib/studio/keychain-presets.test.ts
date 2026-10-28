import { describe, expect, it } from "vitest";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { buildModel, defaultConfig, disposeModel, type ModelConfig } from "./model";

const presets = [
  { name: "redondo", shape: "circle", diameter: 45 },
  { name: "coração", shape: "heart", diameter: 50 },
  { name: "retangular", shape: "rectangle", diameter: 55 },
] as const;

describe("criador de chaveiros: geração e exportação", () => {
  for (const preset of presets) {
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
