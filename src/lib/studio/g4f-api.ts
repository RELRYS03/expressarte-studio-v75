import { createServerFn } from "@tanstack/react-start";

const DEFAULT_G4F_BASE = "http://127.0.0.1:1337/v1";
const MAX_PROMPT_LENGTH = 1200;

function getG4fBase() {
  return (process.env["G4F_API_BASE"] || DEFAULT_G4F_BASE).replace(/\/+$/, "");
}

async function g4fRequest(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const apiKey = process.env["G4F_API_KEY"];
    const response = await fetch(`${getG4fBase()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...init.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export const checkG4fConnection = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await g4fRequest("/models");
    if (!response.ok)
      return { connected: false, message: `g4f respondeu HTTP ${response.status}.` };
    return { connected: true, message: "GPT4Free conectado e respondendo." };
  } catch {
    return {
      connected: false,
      message: "GPT4Free não respondeu. Inicie o serviço local na porta 1337.",
    };
  }
});

export const askG4f = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const messages = (value as { messages?: unknown } | null)?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12)
      throw new Error("A conversa deve conter até 12 mensagens recentes.");
    const validated = messages.map((message) => {
      if (
        !message ||
        typeof message !== "object" ||
        !["user", "assistant"].includes((message as { role?: string }).role ?? "") ||
        typeof (message as { content?: unknown }).content !== "string"
      )
        throw new Error("Mensagem de conversa inválida.");
      const content = (message as { content: string }).content.trim();
      if (!content || content.length > MAX_PROMPT_LENGTH)
        throw new Error(`Cada mensagem deve ter até ${MAX_PROMPT_LENGTH} caracteres.`);
      return { role: (message as { role: "user" | "assistant" }).role, content };
    });
    if (validated.at(-1)?.role !== "user")
      throw new Error("Envie uma pergunta antes de consultar.");
    return { messages: validated };
  })
  .handler(async ({ data }) => {
    let response: Response;
    try {
      response = await g4fRequest("/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env["G4F_MODEL"] || "openrouter/auto",
          messages: [
            {
              role: "system",
              content:
                "Você é o assistente do Express'Arte Studio, em português do Brasil. Ajude a criar produtos para impressão 3D: sugira design imprimível, materiais, público, faixa de preço em reais, cuidados de segurança e próximos passos. Seja claro e não invente que um arquivo 3D foi criado.",
            },
            ...data.messages,
          ],
          stream: false,
          max_tokens: 700,
        }),
      });
    } catch {
      throw new Error(
        "GPT4Free não respondeu. Confira se o serviço está ativo em http://127.0.0.1:1337.",
      );
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string } | string;
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    if (response.status === 429)
      throw new Error(
        "GPT4Free está conectado, mas o provedor gratuito atingiu o limite de uso (HTTP 429). Tente mais tarde ou configure um provedor autorizado com sua própria chave.",
      );
    if (!response.ok) {
      const error = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
      throw new Error(error || `GPT4Free respondeu HTTP ${response.status}.`);
    }
    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim())
      throw new Error("GPT4Free respondeu sem texto. Tente novamente ou escolha outro modelo.");
    return { answer: answer.trim().slice(0, 8_000) };
  });
