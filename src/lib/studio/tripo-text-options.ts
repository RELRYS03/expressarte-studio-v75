/** Configurações oficiais da API v3 H Series. Não contém credenciais nem chamadas à rede. */
export type TripoQuality = "standard" | "detailed" | "extreme";
export type TripoTextOptions = {
  prompt: string;
  quality: TripoQuality;
  forPrint: boolean;
  confirmCredits: boolean;
};

export function validateTripoOptions(input: unknown): TripoTextOptions {
  if (!input || typeof input !== "object") throw new Error("Pedido Tripo inválido.");
  const fields = input as Partial<TripoTextOptions>;
  if (typeof fields.prompt !== "string" || fields.prompt.trim().length < 5 ||
      fields.prompt.trim().length > 1024)
    throw new Error("Descreva o modelo em 5 a 1.024 caracteres.");
  if (!["standard", "detailed", "extreme"].includes(String(fields.quality)))
    throw new Error("Qualidade Tripo inválida.");
  if (typeof fields.forPrint !== "boolean") throw new Error("Defina se a peça é para impressão.");
  if (fields.confirmCredits !== true)
    throw new Error("Autorize explicitamente esta tarefa que pode consumir créditos.");
  return {
    prompt: fields.prompt.trim(),
    quality: fields.quality as TripoQuality,
    forPrint: fields.forPrint,
    confirmCredits: true,
  };
}

export function buildTripoTextPayload(input: TripoTextOptions, model = "v3.1-20260211") {
  const texture = !input.forPrint;
  return {
    prompt: input.prompt,
    model,
    texture,
    pbr: texture,
    geometry_quality: input.quality === "standard" ? "standard" : "detailed",
    ...(texture ? {texture_quality: input.quality === "extreme" ? "extreme" : input.quality} : {}),
  };
}
