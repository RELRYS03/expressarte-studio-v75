import { describe, expect, it } from "vitest";
import { createPrimitive, type PrimitiveKind } from "./workbench-primitives";

describe("primitivas do Model Workbench", () => {
  const kinds: PrimitiveKind[] = ["cube", "sphere", "cylinder", "cone", "torus", "plane"];

  it.each(kinds)("cria %s com geometria e material válidos", (kind) => {
    const mesh = createPrimitive(kind);
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.getAttribute("position").count).toBeGreaterThan(0);
    expect(mesh.geometry.boundingBox).not.toBeNull();
    expect(mesh.material).toBeDefined();
    expect(mesh.userData.primitive).toBe(kind);
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material.dispose());
  });

  it("posiciona o cubo inicial apoiado no plano de trabalho", () => {
    const cube = createPrimitive("cube");
    expect(cube.position.y).toBe(10);
    expect(cube.name).toBe("Cubo");
    cube.geometry.dispose();
    (cube.material as import("three").Material).dispose();
  });
});
