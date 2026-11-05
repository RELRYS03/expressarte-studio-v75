// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { editSolid } from "./solid-mesh-client";
class FakeWorker {
  static last: FakeWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { FakeWorker.last = this; }
}
const operation = { kind: "cut", axis: "x", offset: 0, keepPositive: true } as const;
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal("Worker", FakeWorker); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it("encerra o worker após uma resposta válida", async () => {
  const result = editSolid(new Float32Array(9), operation);
  FakeWorker.last.onmessage?.({ data: { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) } });
  const geometry = await result;
  expect(geometry.getAttribute("position").count).toBe(3);
  expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
  geometry.dispose();
});
it("propaga erro do motor e libera o worker", async () => {
  const result = editSolid(new Float32Array(9), operation);
  FakeWorker.last.onmessage?.({ data: { error: "Malha aberta" } });
  await expect(result).rejects.toThrow("Malha aberta");
  expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
});
it("libera o worker em falha de carregamento", async () => {
  const result = editSolid(new Float32Array(9), operation);
  FakeWorker.last.onerror?.();
  await expect(result).rejects.toThrow("carregar");
  expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
});
it("interrompe uma operação que excede 60 segundos", async () => {
  const result = editSolid(new Float32Array(9), operation);
  const assertion = expect(result).rejects.toThrow("60 segundos");
  await vi.advanceTimersByTimeAsync(60_000);
  await assertion;
  expect(FakeWorker.last.terminate).toHaveBeenCalledOnce();
});
