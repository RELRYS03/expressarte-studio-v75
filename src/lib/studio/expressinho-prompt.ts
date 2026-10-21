/** Comandos de texto seguros: o modo Blender cobre apenas medalhas/chaveiros.
 * Personagens organicos requerem um gerador 3D de verdade.
 */
export const HANDOFF_STL_KEY = "expressarte:handoff:generated-stl:v1";

export function validate3DPrompt(value: unknown): string {
  if (typeof value !== "string") throw new Error("Escreva o modelo que deseja criar.");
  const prompt = value.trim();
  if (prompt.length < 5 || prompt.length > 1024) {
    throw new Error("A descrição precisa ter entre 5 e 1.024 caracteres.");
  }
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(prompt)) {
    throw new Error("O texto contém caracteres inválidos.");
  }
  return prompt;
}

export function interpretLocalKeychain(value: string): {
  kind: "chaveiro"; shape: "circulo" | "coracao"; widthMm: number; name: string;
} {
  const prompt = validate3DPrompt(value);
  if (!/\b(chaveiro|medalha)\b/i.test(prompt)) {
    throw new Error("O Blender local atualmente cria apenas chaveiros ou medalhas com forma e texto. Para personagens completos, escolha o motor de IA 3D.");
  }
  if (/drag[aã]o|personage[mn]|bonec[oa]|escultur[ae]|bich[oa]|dinossaur|caricatura|rost[oa]|avatar|criatur[ae]|humanoid|rob[oô]/i.test(prompt)) {
    throw new Error("Este modelo exige escultura orgânica. O Blender simples não consegue criar o personagem descrito: escolha o motor de IA 3D, quando disponível.");
  }
  const widthMatch = prompt.match(/(\d{2,3})(?:[.,]\d+)?\s*(?:mm|mil[ií]metros)\b/i);
  const widthMm = widthMatch ? Number(widthMatch[1]) : 80;
  if (widthMm < 30 || widthMm > 150) throw new Error("Chaveiros simples precisam ter entre 30 e 150 mm.");
  const textMatch = prompt.match(/(?:\b(?:nome|texto|escrito)\s*[:=-]?\s*)["“']?([\p{L}0-9 ]{2,30})["”']?(?:[,.!]|$)/iu);
  const name = textMatch ? textMatch[1]!.trim().slice(0, 30) : "";
  return {
    kind: "chaveiro",
    shape: /cora(?:ç|c)[aã]o|cora[cç]ao/i.test(prompt) ? "coracao" : "circulo",
    widthMm,
    name,
  };
}
