export type CreationMode = "text" | "image" | "both";
export type GenerationResult = { modelUrl: string; format: "glb" | "stl" | "obj"; jobId?: string };
export type GenerationInput = { mode: CreationMode; prompt: string; image: File | null; heightMm: number };
/**
 * Provider-neutral contract. A trusted backend must implement POST /api/ai-3d/generate.
 * Do not place model-provider API keys in browser code.
 * The backend must validate uploads and return a same-origin downloadable model URL.
 */
export async function generate3D(input: GenerationInput, signal?: AbortSignal): Promise<GenerationResult> {
  const data = new FormData();
  data.set("mode", input.mode);
  data.set("prompt", input.prompt);
  data.set("heightMm", String(input.heightMm));
  if (input.image) data.set("image", input.image);
  const response = await fetch("/api/ai-3d/generate", { method: "POST", body: data, signal });
  if (!response.ok) {
    if (response.status === 404 || response.status === 501) {
      throw new Error("Motor 3D ainda não configurado no servidor.");
    }
    throw new Error("Falha na geração 3D. Verifique o serviço e tente novamente.");
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Resposta inválida do gerador 3D.");
  const model = payload as Record<string, unknown>;
  if (typeof model.modelUrl !== "string" || !model.modelUrl.startsWith("/") || model.modelUrl.startsWith("//") ||
      !["glb", "stl", "obj"].includes(String(model.format))) {
    throw new Error("O gerador retornou um modelo inválido.");
  }
  return { modelUrl: model.modelUrl, format: model.format as GenerationResult["format"],
    jobId: typeof model.jobId === "string" ? model.jobId : undefined };
}
