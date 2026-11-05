export type CreationKind = "keychain" | "organizer" | "figure";
export type CreationSpec = {
  kind: CreationKind; width: number; length: number; height: number;
  name: string; shape: "round-keychain" | "rectangle-keychain" | "hex-keychain";
  hat: boolean;
};
export const creationDefaults: Record<CreationKind, CreationSpec> = {
  keychain: { kind: "keychain", width: 60, length: 35, height: 3, name: "", shape: "round-keychain", hat: false },
  organizer: { kind: "organizer", width: 180, length: 120, height: 40, name: "", shape: "round-keychain", hat: false },
  figure: { kind: "figure", width: 60, length: 45, height: 100, name: "", shape: "round-keychain", hat: false },
};

/** Small, explicit vocabulary; never executes model-generated code. */
export function parseCreationPrompt(prompt: string, fallback: CreationSpec): CreationSpec {
  const text = prompt.trim().toLocaleLowerCase("pt-BR");
  if (prompt.length > 1000) throw new Error("Use uma descrição de até 1.000 caracteres.");
  const kind: CreationKind = /organizador|bandeja|compartimento/.test(text) ? "organizer"
    : /chaveiro|medalha|plaquinha/.test(text) ? "keychain"
    : /funko|bonec[oa]|colecion[aá]vel|miniatura/.test(text) ? "figure" : fallback.kind;
  const spec = { ...(kind === fallback.kind ? fallback : creationDefaults[kind]) };
  if (kind === "figure" && /drag[aã]o|dinossauro|asas|r[eé]plica|id[eê]ntic[oa]|fotorrealista/.test(text))
    throw new Error("Esse pedido exige um gerador de personagem livre. O modelo guiado cria um boneco base com altura e boné; use Por imagem para reconstrução com o motor 3D local.");
  if (kind === "keychain" && /cora[cç][aã]o|estrela/.test(text))
    throw new Error("Aqui o chaveiro pode ser redondo, retangular ou hexagonal. Para coração ou estrela, use as formas do Editor 3D.");
  const compartments = text.match(/(\d+)\s*(?:compartimentos|divis[oó]rias)/);
  if (kind === "organizer" && compartments && Number(compartments[1]) !== 4)
    throw new Error("Este organizador possui quatro compartimentos. Outras divisões precisam ser ajustadas no editor.");
  const triple = text.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*mm\b/);
  if (triple && kind === "figure") throw new Error("Para o boneco, descreva a altura em mm; largura e profundidade seguem as proporções do modelo.");
  if (triple) [spec.width, spec.length, spec.height] = triple.slice(1).map(x => Number(x.replace(",", "."))) as [number, number, number];
  const height = text.match(/(?:altura\s*(?:de|:)?\s*|com\s+)(\d+(?:[.,]\d+)?)\s*mm(?:\s*de altura)?/);
  if (height) spec.height = Number(height[1]!.replace(",", "."));
  const width = text.match(/largura\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*mm/);
  if (width) spec.width = Number(width[1]!.replace(",", "."));
  const name = prompt.match(/(?:nome|escrito|texto)\s*[:=]?\s*["“]([^"”]{1,24})["”]/i)
    ?? prompt.match(/(?:nome|escrito|texto)\s*[:=]?\s*([\p{L}0-9 ]{1,24})(?=,|$)/iu);
  if (name) spec.name = name[1]!.trim();
  if (/hexagonal|hex[aá]gono/.test(text)) spec.shape = "hex-keychain";
  else if (/retangular|ret[aâ]ngulo/.test(text)) spec.shape = "rectangle-keychain";
  else if (/redondo|circular/.test(text)) spec.shape = "round-keychain";
  if (/sem bon[eé]/.test(text)) spec.hat = false;
  else if (/bon[eé]/.test(text)) spec.hat = true;
  validateCreationSpec(spec);
  return spec;
}

export function validateCreationSpec(spec: CreationSpec) {
  if (![spec.width, spec.length, spec.height].every(Number.isFinite)) throw new Error("Informe medidas válidas em milímetros.");
  if (spec.kind === "figure") {
    if (spec.height < 50 || spec.height > 200) throw new Error("Use altura entre 50 e 200 mm para o boneco.");
  } else if (spec.kind === "organizer") {
    if (spec.width < 80 || spec.width > 250 || spec.length < 60 || spec.length > 200 || spec.height < 15 || spec.height > 80)
      throw new Error("Organizador: largura 80–250, comprimento 60–200 e altura 15–80 mm.");
  } else {
    if (spec.width < 30 || spec.width > 120 || spec.length < 20 || spec.length > 120 || spec.height < 2 || spec.height > 8)
      throw new Error("Chaveiro: largura 30–120, altura da face 20–120 e espessura 2–8 mm.");
    if (spec.name.length > 24) throw new Error("Use até 24 caracteres no nome.");
  }
}
