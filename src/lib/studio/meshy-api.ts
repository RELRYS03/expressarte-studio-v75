import { createServerFn } from "@tanstack/react-start";

const API_BASE = "https://api.meshy.ai/openapi/v1";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 40 * 1024 * 1024;
const IMAGE_DATA_URL =
  /^data:image\/(png|jpeg|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/;
const MODEL_FORMATS = ["glb", "gltf", "obj", "fbx", "usdz", "stl", "3mf"] as const;

type ModelFormat = (typeof MODEL_FORMATS)[number];
type MeshyTask = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function base64ByteLength(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function validateImages(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4)
    throw new Error("Envie de uma a quatro imagens do mesmo objeto.");

  let totalBytes = 0;
  const images = value.map((image) => {
    if (typeof image !== "string") throw new Error("Imagem inválida.");
    const match = IMAGE_DATA_URL.exec(image);
    if (!match) throw new Error("Use imagens PNG, JPEG ou WebP válidas.");

    const size = base64ByteLength(match[2]!);
    if (size < 1 || size > MAX_IMAGE_BYTES) throw new Error("Cada imagem deve ter até 20 MB.");
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_IMAGE_BYTES)
      throw new Error("O conjunto de imagens deve ter até 40 MB.");
    return image;
  });

  return images;
}

function requireApiKey() {
  const key = process.env["MESHY_API_KEY"];
  if (!key)
    throw new Error(
      "Configure MESHY_API_KEY no ambiente do servidor para ativar a geração com Meshy.",
    );
  return key;
}

function providerErrorMessage(payload: unknown) {
  if (!isRecord(payload)) return null;
  if (typeof payload["message"] === "string") return payload["message"];
  if (typeof payload["error"] === "string") return payload["error"];
  if (isRecord(payload["error"]) && typeof payload["error"]["message"] === "string")
    return payload["error"]["message"];
  return null;
}

async function apiJson(path: string, key: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("A chave MESHY_API_KEY foi recusada. Confira a configuração no servidor.");
    if (response.status === 402)
      throw new Error(
        "A Meshy informou que não há créditos ou plano suficiente para esta geração.",
      );
    if (response.status === 403)
      throw new Error("Seu plano ou chave Meshy não tem acesso a este recurso.");
    if (response.status === 429)
      throw new Error("Limite de solicitações da Meshy atingido. Aguarde e tente novamente.");
    const detail = providerErrorMessage(payload);
    throw new Error(detail || `A API Meshy respondeu HTTP ${response.status}.`);
  }
  if (!isRecord(payload)) throw new Error("A API Meshy retornou uma resposta inválida.");

  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  const retryAfterMs = Number.isFinite(retryAfterSeconds)
    ? Math.max(1_000, Math.min(10_000, retryAfterSeconds * 1_000))
    : 2_000;
  return { payload, retryAfterMs };
}

export const createMeshyImageTask = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!isRecord(value)) throw new Error("Dados da geração inválidos.");
    const images = validateImages(value["images"]);
    return { images };
  })
  .handler(async ({ data }) => {
    const key = requireApiKey();
    const multiView = data.images.length > 1;
    const requestBody = {
      ...(multiView ? { image_urls: data.images } : { image_url: data.images[0] }),
      ai_model: "latest",
      model_type: "standard",
      topology: "triangle",
      target_polycount: 30_000,
      should_texture: true,
      enable_pbr: false,
      target_formats: ["glb", "obj", "fbx", "stl", "3mf"],
    };
    const { payload } = await apiJson(multiView ? "/multi-image-to-3d" : "/image-to-3d", key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const taskId = payload["result"];
    if (typeof taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(taskId))
      throw new Error("A Meshy não retornou um identificador de tarefa válido.");
    return { taskId, multiView };
  });

export const getMeshyImageTask = createServerFn({ method: "GET" })
  .validator((value: unknown) => {
    if (!isRecord(value)) throw new Error("Identificador de tarefa inválido.");
    const taskId = value["taskId"];
    const multiView = value["multiView"];
    if (typeof taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(taskId))
      throw new Error("Identificador de tarefa inválido.");
    if (typeof multiView !== "boolean") throw new Error("Tipo de tarefa inválido.");
    return { taskId, multiView };
  })
  .handler(async ({ data }) => {
    const key = requireApiKey();
    const route = data.multiView ? "multi-image-to-3d" : "image-to-3d";
    const { payload, retryAfterMs } = await apiJson(
      `/${route}/${encodeURIComponent(data.taskId)}`,
      key,
    );
    const status = typeof payload["status"] === "string" ? payload["status"] : "UNKNOWN";
    const modelUrls: Partial<Record<ModelFormat, string>> = {};
    if (isRecord(payload["model_urls"])) {
      for (const format of MODEL_FORMATS) {
        const url = payload["model_urls"][format];
        if (typeof url === "string" && isHttpsUrl(url)) modelUrls[format] = url;
      }
    }
    const taskError = isRecord(payload["task_error"]) ? payload["task_error"]["message"] : null;

    return {
      status,
      progress:
        typeof payload["progress"] === "number"
          ? Math.max(0, Math.min(100, payload["progress"]))
          : 0,
      modelUrls,
      thumbnailUrl:
        typeof payload["thumbnail_url"] === "string" && isHttpsUrl(payload["thumbnail_url"])
          ? payload["thumbnail_url"]
          : null,
      errorMessage: typeof taskError === "string" ? taskError : null,
      expiresAt: typeof payload["expires_at"] === "number" ? payload["expires_at"] : null,
      consumedCredits:
        typeof payload["consumed_credits"] === "number" ? payload["consumed_credits"] : null,
      retryAfterMs,
    };
  });

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
