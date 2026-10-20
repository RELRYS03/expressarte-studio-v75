import { createServerFn } from "@tanstack/react-start";

const API_BASE = "https://openapi.tripo3d.ai/v3";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function requireApiKey() {
  const key = process.env["TRIPO_API_KEY"];
  if (!key)
    throw new Error(
      "Configure TRIPO_API_KEY no ambiente do servidor para ativar a geração 3D por IA.",
    );
  return key;
}

async function apiJson(path: string, init: RequestInit, key: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...init.headers },
  });
  const payload = (await response.json().catch(() => null)) as {
    code?: number;
    message?: string;
    data?: Record<string, unknown>;
  } | null;
  if (!response.ok || !payload || payload.code !== 0) {
    throw new Error(payload?.message || `Tripo API respondeu HTTP ${response.status}.`);
  }
  return payload["data"] ?? {};
}

export const createTripoImageTask = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Dados da imagem inválidos.");
    const input = value as {
      base64?: unknown;
      mimeType?: unknown;
      filename?: unknown;
      quality?: unknown;
    };
    if (typeof input.base64 !== "string" || !/^([A-Za-z0-9+/]+={0,2})$/.test(input.base64))
      throw new Error("Imagem inválida.");
    if (typeof input.mimeType !== "string" || !["image/png", "image/jpeg"].includes(input.mimeType))
      throw new Error("Envie uma imagem PNG ou JPEG.");
    if (typeof input.filename !== "string") throw new Error("Nome de arquivo inválido.");
    if (input.quality !== "balanced" && input.quality !== "clean")
      throw new Error("Qualidade inválida.");
    return {
      base64: input.base64,
      mimeType: input.mimeType,
      filename: input.filename.slice(0, 120),
      quality: input.quality,
    };
  })
  .handler(async ({ data }) => {
    const key = requireApiKey();
    const bytes = Buffer.from(data.base64, "base64");
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES)
      throw new Error("A imagem deve ter até 20 MB.");

    const form = new FormData();
    const extension = data.mimeType === "image/png" ? "png" : "jpg";
    form.append(
      "file",
      new Blob([bytes], { type: data.mimeType }),
      `${data.filename.replace(/[^\w.-]/g, "_")}.${extension}`,
    );
    const uploaded = await apiJson("/files", { method: "POST", body: form }, key);
    const fileToken = uploaded["file_token"];
    if (typeof fileToken !== "string")
      throw new Error("Tripo não retornou o identificador do arquivo.");

    const model = data.quality === "clean" ? "P1-20260311" : "v3.1-20260211";
    const created = await apiJson(
      "/generation/image-to-model",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: fileToken, model, texture: true, pbr: true }),
      },
      key,
    );
    if (typeof created["task_id"] !== "string")
      throw new Error("Tripo não retornou o identificador da tarefa.");
    return { taskId: created["task_id"] as string };
  });

export const getTripoTask = createServerFn({ method: "GET" })
  .validator((value: unknown) => {
    if (
      !value ||
      typeof value !== "object" ||
      typeof (value as { taskId?: unknown }).taskId !== "string"
    )
      throw new Error("Identificador de tarefa inválido.");
    const taskId = (value as { taskId: string }).taskId;
    if (!/^task_[\w-]{3,120}$/.test(taskId)) throw new Error("Identificador de tarefa inválido.");
    return { taskId };
  })
  .handler(async ({ data }) => {
    const key = requireApiKey();
    const task = await apiJson(`/tasks/${encodeURIComponent(data.taskId)}`, { method: "GET" }, key);
    const output =
      task["output"] && typeof task["output"] === "object"
        ? (task["output"] as Record<string, unknown>)
        : {};
    return {
      status: typeof task["status"] === "string" ? task["status"] : "unknown",
      progress:
        typeof task["progress"] === "number"
          ? Math.max(0, Math.min(100, task["progress"] as number))
          : 0,
      modelUrl: typeof output["model_url"] === "string" ? output["model_url"] : null,
      previewUrl:
        typeof output["rendered_image_url"] === "string" ? output["rendered_image_url"] : null,
      message: typeof task["message"] === "string" ? task["message"] : null,
    };
  });
