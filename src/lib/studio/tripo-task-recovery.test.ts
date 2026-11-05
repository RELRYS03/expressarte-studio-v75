import { describe, expect, it } from "vitest";
import { normalizeTripoTaskId } from "./tripo-task-recovery";

describe("normalizeTripoTaskId", () => {
  it("aceita e normaliza IDs da API", () => {
    expect(normalizeTripoTaskId("  task_abc123  ")).toBe("task_abc123");
    expect(normalizeTripoTaskId("task_a-9_X")).toBe("task_a-9_X");
  });
  it("rejeita identificadores arbitrarios, URLs e valores vazios", () => {
    expect(normalizeTripoTaskId("")).toBeNull();
    expect(normalizeTripoTaskId("https://auth.tripo3d.ai")).toBeNull();
    expect(normalizeTripoTaskId("../private")).toBeNull();
    expect(normalizeTripoTaskId("task_a/b")).toBeNull();
    expect(normalizeTripoTaskId("task_" + "x".repeat(121))).toBeNull();
  });
});
