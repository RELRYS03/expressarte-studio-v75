import { useEffect, useState } from "react";
import { Box, Download, RefreshCw, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTripoTextTask, getTripoTask, getTripoTextEngine } from "@/lib/studio/tripo-api";
import { generatedStlToFile } from "@/lib/studio/generated-stl";
import { HANDOFF_STL_KEY, interpretLocalKeychain, validate3DPrompt } from "@/lib/studio/expressinho-prompt";

type Engine = "ai" | "local";
type EngineStatus = {available:boolean;balance:number|null;message:string};
type Phase = "idle" | "creating" | "running" | "success" | "error";
const LAST_TASK = "expressarte:tripo:text-task:v1";
const BRIDGE = "http://127.0.0.1:8766";

function downloadBase64(value: string, filename: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], {type: "application/octet-stream"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function ExpressinhoTextTo3D() {
  const [engine, setEngine] = useState<Engine>("ai");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [confirmCredits, setConfirmCredits] = useState(false);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [taskId, setTaskId] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localResult, setLocalResult] = useState<{stl:string;blend:string}|null>(null);

  async function refreshStatus() {
    setChecking(true);
    try { setStatus(await getTripoTextEngine()); }
    catch { setStatus({available:false,balance:null,message:"O servidor da API não respondeu."}); }
    finally { setChecking(false); }
  }

  useEffect(() => {
    void refreshStatus();
    try {
      const saved = window.localStorage.getItem(LAST_TASK);
      if (saved && /^task_[\w-]{3,120}$/.test(saved)) setTaskId(saved);
    } catch { /* histórico é opcional */ }
  }, []);

  useEffect(() => {
    if (phase !== "running" || !taskId) return;
    let disposed = false;
    let timer: number | undefined;
    let attempts = 0;
    let failures = 0;
    const poll = async () => {
      if (disposed) return;
      try {
        const task = await getTripoTask({data:{taskId}});
        if (disposed) return;
        failures = 0;
        setProgress(task.progress);
        if (task.status === "success") {
          if (!task.modelUrl) throw new Error("A tarefa terminou sem link do modelo 3D.");
          setModelUrl(task.modelUrl);
          setPreviewUrl(task.previewUrl);
          setPhase("success");
          return;
        }
        if (["failed","cancelled","banned"].includes(task.status)) {
          setError(task.message || "O Tripo não concluiu esta tarefa.");
          setPhase("error");
          return;
        }
        if (++attempts >= 120) {
          setError("Consulta interrompida após seis minutos. O ID foi salvo; você pode retomar sem criar outra tarefa.");
          setPhase("error");
          return;
        }
        timer = window.setTimeout(poll, 3000);
      } catch(e) {
        if (disposed) return;
        failures++;
        if (failures < 3) { timer = window.setTimeout(poll, 3000 * failures); return; }
        setError((e instanceof Error ? e.message : "Falha ao consultar tarefa.") +
          " O ID continua salvo. Não iniciarei outra geração automaticamente.");
        setPhase("error");
      }
    };
    timer = window.setTimeout(poll, 1000);
    return () => { disposed = true; if (timer) window.clearTimeout(timer); };
  }, [taskId, phase]);

  async function generate() {
    if (phase === "creating" || phase === "running") return;
    setError(""); setModelUrl(null); setPreviewUrl(null); setLocalResult(null);
    let text: string;
    try { text = validate3DPrompt(prompt); }
    catch(e) { setError(e instanceof Error ? e.message : "Descrição inválida."); return; }
    setPhase("creating");
    try {
      if (engine === "ai") {
        if (!status?.available || status.balance === null || status.balance <= 0)
          throw new Error("O motor Tripo API não está habilitado ou está sem créditos. Nenhuma tarefa foi criada.");
        if (!confirmCredits)
          throw new Error("Marque a confirmação de cobrança somente se quiser usar créditos da API.");
        const {taskId:created} = await createTripoTextTask({data:{prompt:text,confirmCredits:true}});
        setTaskId(created);
        setProgress(0);
        try {window.localStorage.setItem(LAST_TASK,created);} catch { /* armazenamento opcional */ }
        setConfirmCredits(false);
        setPhase("running");
      } else {
        const spec = interpretLocalKeychain(text);
        let health: Response;
        try {health = await fetch(BRIDGE + "/v1/health");}
        catch {throw new Error("A ponte Blender não responde na porta 8766. Inicie blender_bridge.py na sua pasta do Studio.");}
        const service = await health.json() as {available?:boolean};
        if (!health.ok || !service.available) throw new Error("Blender não está disponível na ponte local.");
        const response = await fetch(BRIDGE + "/v1/create-keychain", {
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...spec}),
        });
        const result = await response.json() as {stlBase64?:string;blendBase64?:string;error?:string};
        if (!response.ok || !result.stlBase64 || !result.blendBase64)
          throw new Error(result.error || "O Blender não devolveu o STL e o projeto editável.");
        generatedStlToFile(result.stlBase64);
        setLocalResult({stl:result.stlBase64,blend:result.blendBase64});
        setPhase("success");
      }
    } catch(e) {
      setError(e instanceof Error ? e.message : "Falha na geração.");
      setPhase("error");
    }
  }

  function openLocalInStudio() {
    if (!localResult) return;
    try {
      generatedStlToFile(localResult.stl);
      window.sessionStorage.setItem(HANDOFF_STL_KEY,localResult.stl);
      window.location.assign("/studio");
    } catch {
      setError("Seu navegador não conseguiu transferir a peça diretamente. Baixe o STL e use Abrir STL no editor.");
    }
  }

  function resume() {
    if (!/^task_[\w-]{3,120}$/.test(taskId)) {
      setError("Não há um ID de tarefa válido."); return;
    }
    setError("");
    setPhase("running");
  }

  return <section className="expressinho-text-home" aria-labelledby="expressinho-text-title">
    <div className="expressinho-text-main">
      <span className="expressinho-eyebrow"><Sparkles size={15}/> EXPRESSINHO IA · CRIAÇÃO 3D</span>
      <h1 id="expressinho-text-title">Descreva o que quer criar em 3D.</h1>
      <p>Texto para modelo 3D, sem confundir personagem completo com relevo de imagem.</p>
      <label className="expressinho-text-label" htmlFor="expressinho-description">Sua ideia</label>
      <textarea id="expressinho-description" rows={3} maxLength={1024}
        placeholder='Ex.: Crie um dragão azul celestial, estilo colecionável, corpo inteiro e asas próximas do corpo.'
        value={prompt} onChange={e => setPrompt(e.target.value)} />
      <div className="expressinho-engine-switch" role="group" aria-label="Escolher motor 3D">
        <button type="button" aria-pressed={engine==="ai"} onClick={()=>{setEngine("ai");setError("");}}>
          <WandSparkles size={15}/> Modelo completo com IA
        </button>
        <button type="button" aria-pressed={engine==="local"} onClick={()=>{setEngine("local");setError("");}}>
          <Box size={15}/> Chaveiro básico no Blender
        </button>
      </div>
      {engine === "ai" ? <>
        <div className="expressinho-engine-detail">
          <strong>Tripo API v3 · Texto → modelo 3D</strong>
          <p>{checking ? "Conferindo a conta da API…" : status?.message || "Conferindo o motor…"}</p>
          <div className="expressinho-action-line">
            <Button variant="outline" size="sm" disabled={checking || phase==="creating" || phase==="running"}
              onClick={() => void refreshStatus()}><RefreshCw size={14}/> Verificar motor e saldo</Button>
            {status?.balance !== null && status?.balance !== undefined && <span>Saldo API: {status.balance.toLocaleString("pt-BR")} créditos</span>}
          </div>
        </div>
        <label className="expressinho-consent">
          <input type="checkbox" checked={confirmCredits} onChange={e => setConfirmCredits(e.target.checked)}
            disabled={!status?.available || phase==="creating" || phase==="running"}/>
          <span>Autorizo a criação de **uma tarefa** no Tripo API, que pode consumir créditos. O valor exato depende do serviço.</span>
        </label>
      </> : <div className="expressinho-engine-detail">
        <strong>Blender local · Não gasta créditos</strong>
        <p>Disponível apenas para chaveiros ou medalhas redondas/de coração com texto. Ex.: “chaveiro de coração com nome EXPRESSARTE, 80 mm”. Não cria dragões nem figuras orgânicas.</p>
      </div>}
      <div className="expressinho-text-actions">
        <Button disabled={phase==="creating" || phase==="running" || (engine==="ai" && (!status?.available || !confirmCredits))}
          onClick={() => void generate()}>
          <Sparkles size={16}/> {phase==="creating" ? "Enviando…" : phase==="running" ? "Gerando modelo…" : engine==="ai" ? "Gerar modelo 3D com IA" : "Criar chaveiro no Blender"}
        </Button>
        <a href="/studio">Abrir editor 3D</a>
      </div>
      {error && <div className="expressinho-text-error" role="alert">{error}</div>}
      {engine==="ai" && taskId && <div className="expressinho-task-result" role="status">
        <strong>Tarefa da API: {taskId}</strong>
        {phase==="running" && <p>Processando modelo… {progress}%</p>}
        {phase!=="running" && phase!=="creating" && !modelUrl && <Button size="sm" variant="outline" onClick={resume}>Retomar consulta sem gerar outro modelo</Button>}
        {modelUrl && <>
          <p>Modelo 3D concluído. O link é temporário; baixe o GLB assim que possível.</p>
          {previewUrl && <img className="expressinho-result-preview" src={previewUrl} alt="Prévia do modelo 3D gerado"/>}
          <a href={modelUrl} target="_blank" rel="noopener noreferrer">Baixar modelo GLB</a>
        </>}
      </div>}
      {localResult && <div className="expressinho-task-result" role="status">
        <strong>Chaveiro gerado pelo Blender</strong>
        <p>Arquivo real gerado; revise a malha antes de imprimir.</p>
        <div className="expressinho-text-actions">
          <Button onClick={openLocalInStudio}>Abrir peça no editor</Button>
          <Button variant="outline" onClick={()=>downloadBase64(localResult.stl,"expressinho-chaveiro.stl")}><Download size={15}/> STL</Button>
          <Button variant="outline" onClick={()=>downloadBase64(localResult.blend,"expressinho-chaveiro.blend")}><Download size={15}/> Blender</Button>
        </div>
      </div>}
    </div>
  </section>;
