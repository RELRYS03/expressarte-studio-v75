import { afterEach, describe, expect, it, vi } from "vitest";
import { generate3D } from "./client";

const input = { mode: "text" as const, prompt: "Boneco colecionável", image: null, heightMm: 150 };

afterEach(() => vi.unstubAllGlobals());

describe("AI Creator: contrato real do servidor", () => {
  it("não anuncia sucesso quando o motor não está instalado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Motor de geração 3D não configurado." }),
      { status: 501, headers: { "content-type": "application/json" } },
    )));
    await expect(generate3D(input)).rejects.toThrow("Motor 3D ainda não configurado");
  });

  it("envia prompt, modo e altura ao endpoint correto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      modelUrl: "/models/figura.glb", format: "glb", jobId: "job-1",
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generate3D(input)).resolves.toEqual({
      modelUrl: "/models/figura.glb", format: "glb", jobId: "job-1",
    });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/ai-3d/generate");
    expect(options.method).toBe("POST");
    const form = options.body as FormData;
    expect(form.get("mode")).toBe("text");
    expect(form.get("prompt")).toBe(input.prompt);
    expect(form.get("heightMm")).toBe("150");
  });

  it.each([
    { modelUrl: "https://outro-site.com/model.glb", format: "glb" },
    { modelUrl: "//outro-site.com/model.glb", format: "glb" },
    { modelUrl: "/models/model.exe", format: "exe" },
    { modelUrl: 42, format: "glb" },
  ])("rejeita resposta de modelo inválida: %j", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(generate3D(input)).rejects.toThrow("modelo inválido");
  });
});
