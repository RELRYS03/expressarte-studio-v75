/** Validação mínima do STL binário recebido pela ponte Blender local.
 * A verificação de geometria imprimível continua sendo feita no Blender/fatiador.
 */
export const MAX_STUDIO_STL_BYTES = 20 * 1024 * 1024;

export function generatedStlToFile(encoded: string, filename = "expressinho-chaveiro.stl"): File {
  if (typeof encoded !== "string" || encoded.length < 112 || encoded.length > Math.ceil(MAX_STUDIO_STL_BYTES * 4 / 3) + 4) {
    throw new Error("O STL gerado está vazio ou excede 20 MB; abra o arquivo diretamente no Blender.");
  }
  let raw: string;
  try {
    raw = atob(encoded);
  } catch {
    throw new Error("O STL gerado veio com dados inválidos.");
  }
  if (raw.length < 134 || raw.length > MAX_STUDIO_STL_BYTES) {
    throw new Error("O STL gerado não contém triângulos ou é maior que 20 MB.");
  }
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const count = new DataView(bytes.buffer).getUint32(80, true);
  if (!count || 84 + 50 * count !== bytes.byteLength) {
    throw new Error("O STL gerado está incompleto. Confira os erros no terminal do Blender.");
  }
  return new File([bytes], filename, {type:"application/octet-stream"});
}
