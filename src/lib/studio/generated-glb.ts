export const MAX_GENERATED_GLB_BYTES = 50 * 1024 * 1024;

/** Container validation only; GLTFLoader still validates the scene on import. */
export function generatedGlbToFile(encoded: string): File {
  if (typeof encoded !== "string" || encoded.length > Math.ceil(MAX_GENERATED_GLB_BYTES / 3) * 4)
    throw new Error("O modelo excede 50 MB.");
  let raw: string;
  try { raw = atob(encoded); }
  catch { throw new Error("O motor retornou dados inválidos."); }
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  if (bytes.length < 24 || bytes.length > MAX_GENERATED_GLB_BYTES)
    throw new Error("O motor retornou um modelo vazio ou grande demais.");
  const view = new DataView(bytes.buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== bytes.length || view.getUint32(16, true) !== 0x4e4f534a)
    throw new Error("O motor não retornou um arquivo GLB 2 válido.");
  const jsonLength = view.getUint32(12, true);
  if (jsonLength < 4 || jsonLength % 4 || 20 + jsonLength > bytes.length)
    throw new Error("O arquivo GLB está incompleto.");
  return new File([bytes], "expressinho-imagem-3d.glb", { type: "model/gltf-binary" });
}
