import { useEffect, useState } from "react";
import { Download, ImagePlus, RefreshCw, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpressinhoTripoSR from "./ExpressinhoTripoSR";

type Shape = "circulo" | "coracao";
type BridgeState = "checking" | "ready" | "offline";
type BasicResult = { stl: string; blend: string };
const BRIDGE = "http://127.0.0.1:8766";

function downloadBase64(content: string, filename: string) {
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function ExpressinhoCreation() {
  const [shape, setShape] = useState<Shape>("circulo");
  const [widthMm, setWidthMm] = useState(80);
  const [name, setName] = useState("");
  const [bridge, setBridge] = useState<BridgeState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BasicResult | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plan, setPlan] = useState<object | null>(null);

  async function checkBridge(): Promise<boolean> {
    setBridge("checking");
    try {
      const response = await fetch(BRIDGE + "/v1/health", { cache: "no-store" });
      if (!response.ok) throw new Error("A ponte respondeu com erro.");
      const data = await response.json() as { available?: boolean };
      if (!data.available) throw new Error("O executável Blender não foi encontrado.");
      setBridge("ready");
      return true;
    } catch {
      setBridge("offline");
      return false;
    }
  }

  useEffect(() => { void checkBridge(); }, []);
  useEffect(() => {
    if (!imageFile) { setPreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function generateBasic() {
    if (busy) return;
    setError("");
    setResult(null);
    if (!Number.isFinite(widthMm) || widthMm < 30 || widthMm > 150) {
      setError("Escolha uma largura entre 30 e 150 mm.");
      return;
    }
    setBusy(true);
    try {
      if (!await checkBridge()) {
        throw new Error("Não consegui acessar a ponte Blender. Deixe o terminal com blender_bridge.py aberto e use http://127.0.0.1:5173/studio. Teste também http://127.0.0.1:8766/v1/health no navegador.");
      }
      let response: Response;
      try {
        response = await fetch(BRIDGE + "/v1/create-keychain", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "chaveiro", shape, widthMm, name: name.trim() }),
        });
      } catch {
        throw new Error("A ligação com o Blender caiu durante a criação. Verifique o terminal da ponte (porta 8766) e tente novamente.");
      }
      const data = await response.json() as { stlBase64?: string; blendBase64?: string; error?: string };
      if (!response.ok || !data.stlBase64 || !data.blendBase64) {
        throw new Error(data.error || "O Blender não conseguiu gerar os arquivos. Consulte o terminal da ponte.");
      }
      setResult({ stl: data.stlBase64, blend: data.blendBase64 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o chaveiro.");
    } finally {
      setBusy(false);
    }
  }

  function makePlan() {
    if (prompt.trim().length < 5) {
      setError("Escreva uma descrição com pelo menos 5 caracteres.");
      return;
    }
    setError("");
    setPlan({
      version: 1,
      status: "planejamento_sem_geracao_organica",
      description: prompt.trim(),
      referenceImage: imageFile ? imageFile.name : null,
      basicKeychain: { shape, widthMm, name },
      nextStep: "Modelos de dragão, pessoas e criaturas exigem um motor de reconstrução/geração 3D; esta ferramenta Blender cria apenas a base, a argola e o texto.",
    });
  }

  return <section className="expressinho-creation expressinho-simple" aria-label="Criar chaveiro no Blender">
    <div className="expressinho-creation-heading">
      <div>
        <strong><WandSparkles size={17}/> Criar chaveiro</strong>
        <p>Primeiro teste: base + argola + texto editável. Funciona localmente, sem créditos.</p>
      </div>
    </div>
    <div className="expressinho-easy-grid">
      <label>Formato
        <select value={shape} onChange={e => { setShape(e.target.value as Shape); setResult(null); }}>
          <option value="circulo">Redondo</option>
          <option value="coracao">Coração</option>
        </select>
      </label>
      <label>Texto (opcional)
        <input type="text" maxLength={30} placeholder="Ex.: EXPRESSARTE"
          value={name} onChange={e => { setName(e.target.value); setResult(null); }}/>
      </label>
      <label>Largura em milímetros
        <input type="number" min={30} max={150} value={widthMm}
          onChange={e => { setWidthMm(Number(e.target.value)); setResult(null); }}/>
      </label>
    </div>
    <div className="expressinho-bridge-status" role="status">
      <span className={bridge === "ready" ? "expressinho-online" : "expressinho-offline"} aria-hidden="true" />
      {bridge === "ready" ? "Blender conectado" : bridge === "checking" ? "Verificando Blender..." : "Não foi possível conectar ao Blender"}
      <Button size="sm" variant="ghost" disabled={busy || bridge === "checking"} onClick={() => void checkBridge()}>
        <RefreshCw size={13}/> Testar conexão
      </Button>
    </div>
    <div className="expressinho-creation-actions">
      <Button disabled={busy || bridge === "checking"} onClick={() => void generateBasic()}>
        <WandSparkles size={15}/> {busy ? "Criando no Blender…" : "Gerar chaveiro simples"}
      </Button>
    </div>
    {error && <div role="alert" className="expressinho-error">
      <strong>Não foi possível concluir.</strong><p>{error}</p>
    </div>}
    {result && <div role="status" className="expressinho-plan">
      <strong>Arquivos criados!</strong>
      <p>O STL e o arquivo editável .blend estão prontos para baixar. Verifique no fatiador antes de imprimir.</p>
      <div className="expressinho-creation-actions">
        <Button onClick={() => downloadBase64(result.stl, "expressinho-chaveiro.stl")}>
          <Download size={15}/> Baixar STL
        </Button>
        <Button variant="outline" onClick={() => downloadBase64(result.blend, "expressinho-chaveiro.blend")}>
          <Download size={15}/> Baixar projeto Blender
        </Button>
      </div>
    </div>}
    <div className="expressinho-advanced">
      <button className="expressinho-advanced-toggle" type="button" aria-expanded={advanced}
        onClick={() => setAdvanced(x => !x)}>
        {advanced ? "−" : "+"} Descrição livre e imagem (experimental)
      </button>
      {advanced && <div className="expressinho-advanced-content">
        <p><strong>Importante:</strong> o criador simples acima <strong>não gera dragões, personagens ou figuras a partir do texto</strong>. A descrição abaixo serve para planejar. A geração orgânica por IA precisa de um motor compatível configurado.</p>
        <label>Descreva a ideia
          <textarea value={prompt} maxLength={1500} rows={3}
            placeholder="Ex.: um dragão azul celestial para um chaveiro"
            onChange={e => { setPrompt(e.target.value); setPlan(null); }}/>
        </label>
        <label className="expressinho-image"><ImagePlus size={15}/> Imagem de referência
          <input type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => {const f=e.target.files?.[0] || null;
              if (f && f.size > 5*1024*1024) {setError("Imagem até 5 MB.");return;}
              setImageFile(f);setPlan(null);}}/>
        </label>
        {preview && <div className="expressinho-image-preview">
          <img src={preview} alt="Referência escolhida"/>
          <Button variant="outline" size="sm" onClick={() => setImageFile(null)}><X size={13}/> Remover</Button>
        </div>}
        <div className="expressinho-creation-actions">
          <Button variant="outline" onClick={makePlan}>Montar plano de criação</Button>
          {plan && <Button variant="outline" onClick={() => downloadBase64(btoa(unescape(encodeURIComponent(JSON.stringify(plan,null,2)))), "expressinho-plano.json")}>
            <Download size={14}/> Baixar plano
          </Button>}
        </div>
        {plan && <div className="expressinho-plan"><strong>Plano elaborado (sem gerar malha)</strong>
          <pre>{JSON.stringify(plan,null,2)}</pre></div>}
        <ExpressinhoTripoSR imageFile={imageFile}/>
      </div>}
    </div>
  </section>;
}
