import { useEffect, useState } from "react";
import { Download, RefreshCw, ScanEye } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = { configured: boolean; message: string; device?: string | null };
type Props = { imageFile: File | null };
const BRIDGE = "http://127.0.0.1:8766";
const INITIAL: Status = { configured: false, message: "Verifique se a ponte local do Blender está ligada." };

function dataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Imagem inválida."));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
function saveBase64(data: string) {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "model/gltf-binary" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "expressinho-triposr-local.glb";
  link.click();
  URL.revokeObjectURL(url);
}
export default function ExpressinhoTripoSR({ imageFile }: Props) {
  const [status, setStatus] = useState<Status>(INITIAL);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch(BRIDGE + "/v1/triposr/status");
      if (!res.ok) throw new Error("A ponte local não respondeu.");
      setStatus(await res.json() as Status);
    } catch {
      setStatus(INITIAL);
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => { void check(); }, []);

  async function generate() {
    if (!imageFile || !status.configured || generating) return;
    setError("");
    setModel(null);
    setGenerating(true);
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type) ||
          imageFile.size > 5 * 1024 * 1024 || imageFile.size < 16) {
        throw new Error("Use uma imagem PNG, JPG ou WebP, de até 5 MB.");
      }
      const encoded = await dataUrl(imageFile);
      const imageBase64 = encoded.split(",")[1];
      if (!imageBase64) throw new Error("Imagem inválida.");
      const response = await fetch(BRIDGE + "/v1/triposr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: imageFile.type, imageBase64 }),
      });
      const data = await response.json() as { glbBase64?: string; error?: string };
      if (!response.ok || !data.glbBase64) throw new Error(data.error || "Falha na geração.");
      setModel(data.glbBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na geração.");
    } finally {
      setGenerating(false);
    }
  }
  return <div className="expressinho-plan" aria-label="Gerador TripoSR local">
    <strong><ScanEye size={15} style={{display:"inline", marginRight:6}}/> Imagem para 3D — TripoSR local (experimental)</strong>
    <p>Modelo aberto instalado no seu computador. Usa somente a imagem selecionada acima; o texto ainda não guia esta geração.</p>
    <p>Estado: {status.message}{status.device ? " Dispositivo: " + status.device + "." : ""}</p>
    <div className="expressinho-creation-actions">
      <Button size="sm" variant="outline" disabled={checking || generating} onClick={() => void check()}>
        <RefreshCw size={14}/> {checking ? "Verificando…" : "Verificar motor"}
      </Button>
      <Button size="sm" disabled={!status.configured || !imageFile || generating} onClick={() => void generate()}>
        <ScanEye size={14}/> {generating ? "TripoSR gerando… (pode demorar)" : "Gerar GLB local da imagem"}
      </Button>
      {model && <Button size="sm" variant="outline" onClick={() => saveBase64(model)}><Download size={14}/> Baixar GLB</Button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {model && <p role="status">GLB gerado. Importe no Blender e confira a malha antes de preparar STL para impressão.</p>}
    <p>Não chama a API nem usa créditos Tripo. O primeiro uso pode baixar pesos públicos do modelo, se ainda não estiverem no computador.</p>
  </div>;
}
