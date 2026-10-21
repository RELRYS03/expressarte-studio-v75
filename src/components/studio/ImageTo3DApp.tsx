import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import {
  Box,
  ImageUp,
  Layers,
  Shapes,
  FolderOpen,
  Calculator,
  Users,
  Store,
  Stethoscope,
  Download,
  FileArchive,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderInput,
  ChevronRight,
  Save,
  Image as ImageIcon,
  Eye,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  decodeImage,
  imageDefaults,
  makePrintableMesh,
  makeMedalMesh,
  verifyClosed,
  type ImageSettings,
  type ImageMode,
  type RasterSource,
} from "@/lib/studio/image3d";
import { stlBinary, threeMfFile, threeMfColoredFile, saveModel } from "@/lib/studio/print-exports";
import { createTripoImageTask, getTripoTask } from "@/lib/studio/tripo-api";
import { LAST_TRIPO_TASK_KEY, normalizeTripoTaskId } from "@/lib/studio/tripo-task-recovery";
import MeshyImageTo3D from "./MeshyImageTo3D";
import ExpressinhoTextTo3D from "./ExpressinhoTextTo3D";

const Preview3D = lazy(() => import("./ImagePreview3D"));
const menu = [
  { to: "/", label: "Criar com IA", icon: Sparkles },
  { to: "/studio", label: "Editor 3D", icon: Box },
  { to: "/formas", label: "Formas", icon: Shapes },
  { to: "/catalogo", label: "Catálogo", icon: Store },
  { to: "/projetos", label: "Projetos", icon: FolderOpen },
  { to: "/calculadora", label: "Calculadora", icon: Calculator },
  { to: "/mesh-doctor", label: "Mesh Doctor", icon: Stethoscope },
  { to: "/comunidade", label: "Comunidade", icon: Users },
] as const;
const cards: { mode: ImageMode; title: string; description: string }[] = [
  { mode: "relevo", title: "Relevo", description: "Fotos, ilustrações, placas e logos." },
  { mode: "silhueta", title: "Silhueta", description: "Recorte de logos, símbolos e desenhos." },
  { mode: "litofania", title: "Litofania", description: "Fotos visíveis com iluminação traseira." },
];
function imageDataUrl(src: RasterSource) {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.putImageData(new ImageData(new Uint8ClampedArray(src.rgba), src.width, src.height), 0, 0);
  return canvas.toDataURL("image/png");
}
function exampleImage(): RasterSource {
  const w = 128,
    h = 128,
    rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = (x - 63.5) / 50,
        fy = (63.5 - y) / 50;
      const heart = Math.pow(fx * fx + fy * fy - 1, 3) - fx * fx * Math.pow(fy, 3) < 0;
      const i = 4 * (y * w + x);
      rgba[i] = 125;
      rgba[i + 1] = 57;
      rgba[i + 2] = 33;
      rgba[i + 3] = heart ? 255 : 0;
    }
  return { width: w, height: h, rgba, name: "exemplo-coracao.png" };
}
async function tripoCompatibleImage(file: File | null, fallbackDataUrl: string): Promise<File> {
  let source: File;
  if (file) source = file;
  else {
    const blob = await (await fetch(fallbackDataUrl)).blob();
    source = new File([blob], "imagem-exemplo.png", { type: blob.type || "image/png" });
  }
  if (source.type === "image/png" || source.type === "image/jpeg") return source;
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem para a IA.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Não foi possível converter a imagem para PNG.")),
      "image/png",
    ),
  );
  return new File([blob], `${source.name.replace(/\.[^.]+$/, "") || "imagem"}.png`, {
    type: "image/png",
  });
}
async function fileBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem para envio."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
const first = { ...imageDefaults };
function validSettings(input: unknown): ImageSettings {
  if (!input || typeof input !== "object") return { ...first };
  const p = input as Partial<ImageSettings>;
  const num = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  return {
    mode: (["relevo", "silhueta", "litofania"] as unknown[]).includes(p.mode)
      ? p.mode!
      : first.mode,
    widthMm: num(p.widthMm, first.widthMm, 10, 240),
    resolution: num(p.resolution, first.resolution, 24, 192),
    baseMm: num(p.baseMm, first.baseMm, 0.6, 8),
    heightMm: num(p.heightMm, first.heightMm, 0.2, 15),
    minMm: num(p.minMm, first.minMm, 0.6, 9),
    maxMm: num(p.maxMm, first.maxMm, 0.8, 12),
    threshold: num(p.threshold, first.threshold, 1, 254),
    contrast: num(p.contrast, first.contrast, 0.25, 3),
    invert: typeof p.invert === "boolean" ? p.invert : first.invert,
    silhouetteBase: typeof p.silhouetteBase === "boolean" ? p.silhouetteBase : first.silhouetteBase,
  };
}
function NumberControl({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="im3-range">
      <span className="im3-range-label">
        {label}
        <strong>
          {value.toLocaleString("pt-BR")} {unit}
        </strong>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <span className="im3-range-limits">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </label>
  );
}
export default function ImageTo3DApp() {
  const [toolMode, setToolMode] = useState<"image" | "medal">("image");
  const [medal, setMedal] = useState({
    widthMm: 75,
    baseMm: 2.4,
    reliefMm: 0.8,
    borderMm: 3,
    resolution: 128,
    threshold: 220,
  });
  const [palette, setPalette] = useState(["#D8AE22", "#FFF9EA", "#242321", "#E95539"]);
  const [settings, setSettings] = useState<ImageSettings>({ ...first });
  const [source, setSource] = useState<RasterSource | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [picture, setPicture] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [topDown, setTopDown] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("Destaque");
  const [quality, setQuality] = useState<"balanced" | "clean">("balanced");
  const [tripoState, setTripoState] = useState<
    "idle" | "uploading" | "processing" | "success" | "failed"
  >("idle");
  const [tripoTaskId, setTripoTaskId] = useState("");
  const [recoverTripoId, setRecoverTripoId] = useState("");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_TRIPO_TASK_KEY);
      if (saved && normalizeTripoTaskId(saved)) setRecoverTripoId(saved);
    } catch {
      // Navegadores podem bloquear armazenamento; a consulta manual continua disponível.
    }
  }, []);
  const resumeTripo = () => {
    const taskId = normalizeTripoTaskId(recoverTripoId);
    if (!taskId) {
      setMessage("Digite um ID válido da API Tripo v3, começando por task_.");
      return;
    }
    setTripoResult(null);
    setTripoTaskId(taskId);
    setTripoProgress(0);
    setTripoState("processing");
    setMessage("Consultando tarefa existente. Nenhuma geração nova será iniciada.");
    try { window.localStorage.setItem(LAST_TRIPO_TASK_KEY, taskId); } catch { /* armazenamento opcional */ }
  };
  const [tripoProgress, setTripoProgress] = useState(0);
  const [tripoResult, setTripoResult] = useState<{
    modelUrl: string;
    previewUrl: string | null;
  } | null>(null);
  const [reset, setReset] = useState(0);
  const picker = useRef<HTMLInputElement>(null);
  const projectPicker = useRef<HTMLInputElement>(null);
  const update = <K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const current = useMemo(() => {
    if (!source) return { mesh: null, error: "" };
    try {
      return {
        mesh:
          toolMode === "medal" ? makeMedalMesh(source, medal) : makePrintableMesh(source, settings),
        error: "",
      };
    } catch (e) {
      return {
        mesh: null,
        error: e instanceof Error ? e.message : "Não foi possível construir o modelo.",
      };
    }
  }, [source, settings, toolMode, medal]);
  const mesh = current.mesh;
  const checks = useMemo(() => (mesh ? verifyClosed(mesh) : null), [mesh]);
  const setLoaded = (src: RasterSource, file: File | null = null) => {
    setSourceFile(file);
    setSource(src);
    setPicture(imageDataUrl(src));
    setMessage("");
    setReset((r) => r + 1);
  };
  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      setLoaded(await decodeImage(file), file);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha na leitura da imagem.");
    } finally {
      setUploading(false);
    }
  };
  const generateWithTripo = async () => {
    if (!source || !picture) {
      setMessage("Escolha uma imagem antes de gerar o modelo com IA.");
      return;
    }
    if (!window.confirm("Enviar imagem ao Tripo API para gerar modelo 3D? Esta tarefa pode consumir créditos da API, que são diferentes dos créditos Tripo Studio. Deseja continuar?")) {
      return;
    }
    setTripoState("uploading");
    setTripoProgress(0);
    setTripoResult(null);
    setTripoTaskId("");
    try {
      const file = await tripoCompatibleImage(sourceFile, picture);
      if (file.size > 20 * 1024 * 1024)
        throw new Error("A imagem preparada excede o limite de 20 MB do Tripo.");
      const { taskId } = await createTripoImageTask({
        data: { base64: await fileBase64(file), mimeType: file.type, filename: file.name, quality },
      });
      setTripoTaskId(taskId);
      setRecoverTripoId(taskId);
      try { window.localStorage.setItem(LAST_TRIPO_TASK_KEY, taskId); } catch { /* armazenamento opcional */ }
      setTripoState("processing");
      setMessage(`Tarefa Tripo ${taskId} criada. A geração pode levar alguns minutos.`);
    } catch (error) {
      setTripoState("failed");
      setMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar a geração no Tripo.",
      );
    }
  };
  useEffect(() => {
    if (!tripoTaskId || tripoState !== "processing") return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    let consecutiveErrors = 0;
    const poll = async () => {
      if (cancelled) return;
      try {
        const result = await getTripoTask({ data: { taskId: tripoTaskId } });
        if (cancelled) return;
        consecutiveErrors = 0;
        setTripoProgress(result.progress);
        if (result.status === "success" && result.modelUrl) {
          setTripoResult({ modelUrl: result.modelUrl, previewUrl: result.previewUrl });
          setTripoState("success");
          setMessage(
            "Modelo IA pronto. Baixe o GLB imediatamente: os links do Tripo expiram após alguns minutos.",
          );
          return;
        }
        if (["failed", "cancelled", "banned"].includes(result.status)) {
          setTripoState("failed");
          setMessage(result.message || `A tarefa Tripo terminou com status: ${result.status}.`);
          return;
        }
        if (++attempts >= 120) {
          setTripoState("failed");
          setMessage(
            "A geração excedeu o tempo de espera desta página. O task ID foi mantido para consulta: " +
              tripoTaskId,
          );
          return;
        }
        timer = window.setTimeout(poll, 2000);
      } catch (error) {
        if (cancelled) return;
        consecutiveErrors++;
        if (consecutiveErrors < 3 && attempts < 120) {
          setMessage("Falha temporária ao consultar Tripo; tentando novamente sem criar nova tarefa.");
          timer = window.setTimeout(poll, 3000 * consecutiveErrors);
          return;
        }
        setTripoState("failed");
        setMessage((error instanceof Error ? error.message : "Falha ao consultar o Tripo.") +
          " Você pode retomar a consulta pelo ID, sem pagar por outra geração.");
      }
    };
    timer = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [tripoTaskId, tripoState]);
  const handleExport = (format: "stl" | "3mf") => {
    if (!mesh || !checks?.closed) {
      setMessage("A malha não passou na verificação básica de fechamento.");
      return;
    }
    try {
      const filename =
        (source?.name ?? "expressarte").replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") ||
        "expressarte";
      saveModel(
        format === "stl"
          ? stlBinary(mesh)
          : toolMode === "medal"
            ? threeMfColoredFile(mesh, palette)
            : threeMfFile(mesh),
        `ExpressArte-${filename}-${toolMode === "medal" ? "medalha" : settings.mode}.${format}`,
      );
      setMessage(
        `${format.toUpperCase()} gerado em milímetros. Abra no Bambu Studio, confira o fatiamento e só então imprima.`,
      );
    } catch {
      setMessage("Não foi possível gerar o arquivo. Diminua a resolução e tente novamente.");
    }
  };
  const saveProject = () => {
    if (!source) return;
    saveModel(
      new Blob(
        [
          JSON.stringify({
            format: "expressarte-image3d",
            version: "7.5",
            settings,
            image: {
              name: source.name,
              width: source.width,
              height: source.height,
              rgba: Array.from(source.rgba),
            },
          }),
        ],
        { type: "application/json" },
      ),
      "ExpressArte-imagem-3D-projeto.json",
    );
    setMessage("Projeto com imagem e ajustes salvo como JSON. Guarde uma cópia no computador.");
  };
  const loadProject = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error("Projeto JSON maior que 4 MB.");
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== "object") throw new Error("Projeto inválido.");
      const object = value as Record<string, unknown>;
      if (object["format"] !== "expressarte-image3d")
        throw new Error("Este não é um projeto Imagem para 3D.");
      const data = object["image"] as Record<string, unknown>;
      if (
        !data ||
        typeof data["width"] !== "number" ||
        !Number.isInteger(data["width"]) ||
        typeof data["height"] !== "number" ||
        !Number.isInteger(data["height"])
      )
        throw new Error("Tamanho de imagem inválido.");
      const w = Number(data["width"]),
        h = Number(data["height"]);
      if (
        w < 2 ||
        h < 2 ||
        w > 192 ||
        h > 192 ||
        !Array.isArray(data["rgba"]) ||
        data["rgba"].length !== w * h * 4
      )
        throw new Error("Dados da imagem inválidos.");
      const src: RasterSource = {
        name: typeof data["name"] === "string" ? data["name"].slice(0, 120) : "imagem.png",
        width: w,
        height: h,
        rgba: new Uint8ClampedArray(data["rgba"]),
      };
      setSettings(validSettings(object["settings"]));
      setLoaded(src);
      setMessage("Projeto carregado e pronto para edição.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao abrir projeto.");
    }
  };
  return (
    <>
      <header className="app-header im3-header">
        <Link to="/" className="brand">
          <svg className="brand-mark" viewBox="0 0 36 40" fill="none" aria-hidden="true">
            <path d="m18 2 16 9v18l-16 9L2 29V11L18 2Z" stroke="currentColor" strokeWidth="2.4" />
            <path
              d="m2 11 16 9 16-9M18 20v18M10 7l16 9v10l-8 5"
              stroke="currentColor"
              strokeWidth="2.4"
            />
          </svg>
          <span>
            express<em>'</em>arte<small>CRIATIVIDADE EM CADA CAMADA</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          {menu.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${item.to === "/" ? "active" : ""}`}
            >
              <item.icon />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-end">
          <span className="version">STUDIO v7.5</span>
          <span className="avatar">EA</span>
        </div>
      </header>
      <main className="im3-page">
        <ExpressinhoTextTo3D />
        <section className="im3-generator">
          <div className="im3-generator-copy">
            <div className="im3-eyebrow">
              <Sparkles size={14} /> EXPRESS’ARTE STUDIO · CRIAÇÃO 3D
            </div>
            <h1>
              Traga sua imagem
              <br />
              <span>para o mundo 3D.</span>
            </h1>
            <p>
              Transforme fotos, desenhos e logos em relevos, medalhas e litofanias para impressão.
              Personagens 360° exigem um motor de IA separado.
            </p>
            <div className="im3-generator-actions">
              <Button onClick={() => picker.current?.click()}>
                <ImageUp size={16} /> Escolher imagem ou SVG
              </Button>
              <Button variant="outline" onClick={() => setLoaded(exampleImage())}>
                <Sparkles size={15} /> Experimentar exemplo
              </Button>
            </div>
            <div className="im3-generator-options">
              <span>Ferramenta</span>
              <button
                className={toolMode === "image" ? "chosen" : ""}
                onClick={() => setToolMode("image")}
              >
                Imagem para 3D
              </button>
              <button
                className={toolMode === "medal" ? "chosen" : ""}
                onClick={() => {
                  setToolMode("medal");
                  if (!source) setLoaded(exampleImage());
                }}
              >
                Medalha 3D
              </button>
            </div>
            <div className="im3-generator-options">
              <span>Opção da IA externa</span>
              <button
                className={quality === "balanced" ? "chosen" : ""}
                onClick={() => setQuality("balanced")}
              >
                <CheckCircle2 size={15} /> Tripo equilibrado
              </button>
              <button
                className={quality === "clean" ? "chosen" : ""}
                onClick={() => setQuality("clean")}
              >
                <Shapes size={15} /> Tripo P1
              </button>
            </div>
            <p className="im3-instructions">Como usar: escolha uma imagem → ajuste o relevo → exporte STL ou 3MF na seção de edição.</p>
            <div className="im3-generator-note">
              <span className="status-dot" /> Seus arquivos são processados localmente no navegador
            </div>
          </div>
          <div className="im3-generator-preview">
            <div className="im3-preview-orbit orbit-one" />
            <div className="im3-preview-orbit orbit-two" />
            <div className="im3-preview-model">
              <Box size={112} strokeWidth={0.8} />
              <span>3D</span>
            </div>
            <div className="preview-chip chip-top">Imagem → malha</div>
            <div className="preview-chip chip-bottom">STL · 3MF</div>
          </div>
        </section>
        <details className="im3-ai-options">
          <summary><Sparkles size={16} /> Modelos 360° com IA externa (Tripo / Meshy) — opcional</summary>
          <p className="im3-ai-explain">
            Para personagens e modelos completos, selecione uma imagem acima e configure a API do serviço.
            Essas operações podem consumir créditos; a conversão local em relevo e litofania é gratuita.
          </p>
        <section className="im3-tripo" aria-labelledby="tripo-title">
          <div className="im3-tripo-copy">
            <span className="im3-eyebrow">
              <Sparkles size={13} /> GERAÇÃO 3D COM IA
            </span>
            <h2 id="tripo-title">Crie um modelo 360° com Tripo</h2>
            <p>
              Envie a imagem ao serviço oficial do Tripo para gerar geometria e textura 3D. O
              processamento pode consumir créditos da sua conta Tripo.
            </p>
            <div className="im3-tripo-controls">
              <Button
                onClick={() => void generateWithTripo()}
                disabled={!source || tripoState === "uploading" || tripoState === "processing"}
              >
                <Sparkles size={16} />
                {tripoState === "uploading"
                  ? "Enviando imagem…"
                  : tripoState === "processing"
                    ? `Gerando ${tripoProgress}%…`
                    : "Gerar modelo com Tripo IA"}
              </Button>
              <span>
                {quality === "clean"
                  ? "P1 · topologia otimizada"
                  : "Tripo v3.1 · qualidade equilibrada"}
              </span>
            </div>
            <div className="im3-tripo-controls" style={{ marginTop: 10 }}>
              <label htmlFor="tripo-existing-task" style={{ fontSize: 12 }}>Retomar tarefa da API:</label>
              <input
                id="tripo-existing-task"
                aria-label="ID de tarefa existente do Tripo"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="task_..."
                value={recoverTripoId}
                maxLength={130}
                onChange={(event) => setRecoverTripoId(event.target.value)}
                style={{ maxWidth: 260, width: "100%", padding: 8, borderRadius: 5 }}
              />
              <Button variant="outline" onClick={resumeTripo}
                disabled={tripoState === "uploading" || tripoState === "processing" || !normalizeTripoTaskId(recoverTripoId)}>
                Consultar tarefa
              </Button>
            </div>
            <small>
              Consulta o ID já criado na sua conta da API, mesmo após reabrir a página.
              Não cria um novo modelo nem recupera tarefas da conta Studio sem acesso à API.
            </small>
            {(tripoState === "uploading" || tripoState === "processing") && (
              <div
                className="im3-tripo-progress"
                role="progressbar"
                aria-valuenow={tripoProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  style={{
                    width: `${tripoState === "uploading" ? 8 : Math.max(5, tripoProgress)}%`,
                  }}
                />
              </div>
            )}
            <small>
              A chave fica no servidor. A imagem selecionada é enviada ao Tripo para processamento,
              conforme a API oficial.
            </small>
          </div>
          {tripoResult ? (
            <div className="im3-tripo-result">
              {tripoResult.previewUrl && (
                <img src={tripoResult.previewUrl} alt="Prévia do modelo 3D gerado pelo Tripo" />
              )}
              <div>
                <strong>Modelo concluído</strong>
                <span>
                  Baixe o GLB e abra no Studio ou Blender. A geração de IA é um modelo 3D completo;
                  a exportação local STL/3MF continua disponível para relevo e litofania.
                </span>
                <a href={tripoResult.modelUrl} target="_blank" rel="noreferrer" download>
                  Baixar modelo GLB
                </a>
              </div>
            </div>
          ) : (
            <div className="im3-tripo-idle">
              <Box size={42} />
              <span>
                {tripoTaskId ? `Tarefa ${tripoTaskId}` : "A prévia do modelo aparecerá aqui"}
              </span>
            </div>
          )}
        </section>
        <MeshyImageTo3D sourceFile={sourceFile} picture={picture} />
        </details>
        <section className="im3-gallery">
          <div className="im3-gallery-heading">
            <div>
              <span className="im3-eyebrow">
                <Sparkles size={13} /> INSPIRE-SE
              </span>
              <h2>Explore a galeria</h2>
              <p>Escolha um ponto de partida para a sua próxima criação.</p>
            </div>
            <div className="im3-gallery-heading-actions">
              <Button variant="outline" onClick={() => projectPicker.current?.click()}>
                <FolderInput size={15} /> Abrir projeto
              </Button>
              <Button variant="outline" disabled={!source} onClick={saveProject}>
                <Save size={15} /> Salvar projeto
              </Button>
            </div>
          </div>
          <div className="im3-gallery-tabs" role="tablist" aria-label="Categorias da galeria">
            {[
              "Destaque",
              "Impressão 3D",
              "Personagem",
              "Veículo",
              "Animal",
              "Arquitetura",
              "Mobília",
              "Natureza",
              "Abstrato",
            ].map((category) => (
              <button
                role="tab"
                aria-selected={galleryFilter === category}
                className={galleryFilter === category ? "selected" : ""}
                key={category}
                onClick={() => setGalleryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="im3-gallery-promo">
            <div className="promo-glow" />
            <div>
              <span className="im3-eyebrow">DO CONCEITO À CRIAÇÃO</span>
              <h3>Seu próximo projeto começa aqui</h3>
              <p>Envie uma imagem para criar um relevo ou explore as ferramentas do Studio.</p>
              <Button onClick={() => picker.current?.click()}>
                <ImageUp size={15} /> Criar a partir de uma imagem
              </Button>
            </div>
            <div className="promo-art">
              <div className="promo-shape shape-a" />
              <div className="promo-shape shape-b" />
              <div className="promo-shape shape-c" />
            </div>
          </div>
          <div className="im3-gallery-tools">
            <div>
              <h2>{galleryFilter === "Destaque" ? "Modelos em destaque" : galleryFilter}</h2>
              <span>Seleção da comunidade Express’Arte</span>
            </div>
            <Button variant="outline" onClick={() => setGalleryFilter("Destaque")}>
              <SlidersHorizontal size={15} /> Filtros
            </Button>
          </div>
          <div className="im3-example-grid">
            {[
              {
                name: "Medalhão botânico",
                type: "Relevo · decoração",
                shape: "leaf",
                tone: "sage",
              },
              {
                name: "Emblema geométrico",
                type: "Silhueta · acessório",
                shape: "gem",
                tone: "rose",
              },
              {
                name: "Retrato em luz",
                type: "Litofania · lembrança",
                shape: "moon",
                tone: "blue",
              },
              { name: "Selo artesanal", type: "Relevo · presente", shape: "sun", tone: "sand" },
            ].map((item, index) => (
              <button
                className="im3-example-card"
                key={item.name}
                onClick={() => {
                  setLoaded(exampleImage());
                  setSettings((s) => ({
                    ...s,
                    mode: index === 2 ? "litofania" : index === 1 ? "silhueta" : "relevo",
                  }));
                  document
                    .querySelector(".im3-layout")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <div className={`example-art ${item.tone}`}>
                  <div className={`example-medallion ${item.shape}`}>
                    <span>{["❋", "✦", "☾", "✺"][index]}</span>
                  </div>
                  <span className="example-art-caption">EXPRESS’ARTE · STUDIO</span>
                </div>
                <div className="example-card-info">
                  <span>{item.type}</span>
                  <strong>{item.name}</strong>
                </div>
              </button>
            ))}
          </div>
          <div className="im3-gallery-more">
            <Button
              variant="outline"
              onClick={() =>
                document
                  .querySelector(".im3-layout")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Ver todas as ferramentas <ChevronRight size={15} />
            </Button>
          </div>
        </section>
        <section className="im3-create-workspace">
          <div className="im3-create-heading">
            <div>
              <span className="im3-eyebrow">ESTÚDIO DE CRIAÇÃO</span>
              <h2>{toolMode === "medal" ? "Personalize sua medalha" : "Crie seu modelo 3D"}</h2>
              <p>
                {toolMode === "medal"
                  ? "Importe um SVG ou PNG, ajuste o relevo e exporte em 3MF."
                  : "Envie uma imagem, escolha o tipo de conversão e ajuste a malha ao seu projeto."}
              </p>
            </div>
            <div className="im3-steps">
              <span>
                <strong>01</strong> Imagem
              </span>
              <span>
                <strong>02</strong> Conversão
              </span>
              <span>
                <strong>03</strong> Ajustes
              </span>
              <span>
                <strong>04</strong> Exportação
              </span>
            </div>
          </div>
          <div className="im3-layout">
            <section className="im3-card im3-upload">
              <div className="im3-card-head">
                <h2>
                  <ImageUp size={18} /> 1. Sua imagem
                </h2>
                <span>PNG · JPG · WebP · SVG</span>
              </div>
              <input
                className="hidden"
                ref={picker}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  void handleUpload(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
              <button
                className="im3-drop"
                onClick={() => picker.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleUpload(e.dataTransfer.files[0]);
                }}
              >
                {picture ? (
                  <img src={picture} alt="Pré-visualização da imagem carregada" />
                ) : (
                  <div className="im3-empty">
                    <ImageIcon size={38} />
                    <strong>Escolher uma imagem</strong>
                    <span>Ou arraste o arquivo até aqui</span>
                  </div>
                )}
                <span className="im3-file-label">
                  {source ? source.name : "Arquivo de até 12 MB"}
                </span>
              </button>
              <div className="im3-upload-actions">
                <Button
                  variant="outline"
                  onClick={() => picker.current?.click()}
                  disabled={uploading}
                >
                  <ImageUp size={15} />
                  {uploading ? "Abrindo..." : "Trocar imagem"}
                </Button>
                <Button variant="ghost" onClick={() => setLoaded(exampleImage())}>
                  Testar com coração
                </Button>
              </div>
              {toolMode === "image" && (
                <div className="im3-card-head im3-mode-title">
                  <h2>
                    <Layers size={18} /> 2. Modo de conversão
                  </h2>
                </div>
              )}
              {toolMode === "image" && (
                <>
                  <div className="im3-mode-list">
                    {cards.map((card) => (
                      <button
                        className={`im3-mode ${settings.mode === card.mode ? "chosen" : ""}`}
                        key={card.mode}
                        onClick={() => update("mode", card.mode)}
                      >
                        <span className="im3-radio" />
                        <span>
                          <strong>{card.title}</strong>
                          <small>{card.description}</small>
                        </span>
                        {settings.mode === card.mode && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                  </div>
                  <p className="im3-hint">
                    Em fotos únicas, o resultado é um relevo ou litofania. Um objeto 360° completo
                    requer reconstrução 3D especializada.
                  </p>
                </>
              )}
            </section>
            <section className="im3-card im3-visual">
              <div className="im3-card-head">
                <h2>
                  <Eye size={18} /> 3. Visualização 3D
                </h2>
                <div className="im3-view-controls">
                  <button className={!topDown ? "chosen" : ""} onClick={() => setTopDown(false)}>
                    3D
                  </button>
                  <button className={topDown ? "chosen" : ""} onClick={() => setTopDown(true)}>
                    Superior
                  </button>
                  <button
                    title="Redefinir vista"
                    aria-label="Redefinir vista"
                    onClick={() => {
                      setReset((r) => r + 1);
                      setTopDown(false);
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
              <div className="im3-preview">
                {mesh ? (
                  <ClientOnly
                    fallback={<div className="im3-preview-placeholder">Preparando 3D…</div>}
                  >
                    <Suspense
                      fallback={
                        <div className="im3-preview-placeholder">Carregando visualização…</div>
                      }
                    >
                      <Preview3D mesh={mesh} topDown={topDown} reset={reset} />
                    </Suspense>
                  </ClientOnly>
                ) : (
                  <div className="im3-preview-placeholder">
                    <Box size={54} />
                    <strong>Sua criação aparecerá aqui</strong>
                    <span>Envie uma imagem ou clique em “Testar com coração”</span>
                  </div>
                )}
                {mesh && (
                  <div className="im3-preview-legend">
                    <span className="status-dot" /> Malha gerada · arraste para girar
                  </div>
                )}
              </div>
              {mesh && (
                <>
                  <div className="im3-metrics">
                    <div>
                      <span>Largura</span>
                      <strong>{mesh.widthMm.toFixed(1)} mm</strong>
                    </div>
                    <div>
                      <span>Altura</span>
                      <strong>{mesh.heightMm.toFixed(1)} mm</strong>
                    </div>
                    <div>
                      <span>Espessura máxima</span>
                      <strong>{mesh.depthMm.toFixed(1)} mm</strong>
                    </div>
                    <div>
                      <span>Triângulos</span>
                      <strong>{mesh.triangles.toLocaleString("pt-BR")}</strong>
                    </div>
                  </div>
                  <div className="im3-mesh-check">
                    {checks?.closed ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
                    <span>
                      {checks?.closed
                        ? "Superfície fechada na verificação de arestas"
                        : `${checks?.nonManifoldEdges} arestas problemáticas detectadas`}
                    </span>
                  </div>
                  {mesh.warnings.map((warning, i) => (
                    <p key={i} className="im3-warning">
                      <AlertTriangle size={15} />
                      {warning}
                    </p>
                  ))}
                  <p className="im3-measure">
                    Volume aproximado: {(mesh.volumeMm3 / 1000).toFixed(2)} cm³ · Estimativa de
                    material sólido; o fatiamento depende dos preenchimentos.
                  </p>
                </>
              )}
              {current.error && (
                <p className="im3-warning">
                  <XCircle size={16} />
                  {current.error}
                </p>
              )}
              <div className="im3-export">
                <Button
                  disabled={!mesh || !checks?.closed || uploading}
                  variant="outline"
                  onClick={() => handleExport("stl")}
                >
                  <Download size={17} /> Baixar STL
                </Button>
                <Button
                  disabled={!mesh || !checks?.closed || uploading}
                  onClick={() => handleExport("3mf")}
                >
                  <FileArchive size={17} /> Baixar 3MF
                </Button>
              </div>
              <p className="im3-printed">
                Compatível com abertura em fatiadores como Bambu Studio. Sempre verifique escala,
                paredes, peças soltas e prévia das camadas antes de imprimir.
              </p>
            </section>
            <aside className="im3-card im3-settings">
              <div className="im3-card-head">
                <h2>
                  <SlidersHorizontal size={18} /> 4. Ajustes de impressão
                </h2>
              </div>
              <div className="im3-fields">
                {toolMode === "medal" ? (
                  <>
                    <NumberControl
                      label="Largura da medalha"
                      value={medal.widthMm}
                      min={35}
                      max={120}
                      unit="mm"
                      onChange={(widthMm) => setMedal((m) => ({ ...m, widthMm }))}
                    />
                    <NumberControl
                      label="Espessura da base"
                      value={medal.baseMm}
                      min={1.2}
                      max={6}
                      step={0.2}
                      unit="mm"
                      onChange={(baseMm) => setMedal((m) => ({ ...m, baseMm }))}
                    />
                    <NumberControl
                      label="Altura do relevo"
                      value={medal.reliefMm}
                      min={0.4}
                      max={3}
                      step={0.1}
                      unit="mm"
                      onChange={(reliefMm) => setMedal((m) => ({ ...m, reliefMm }))}
                    />
                    <NumberControl
                      label="Largura da borda"
                      value={medal.borderMm}
                      min={0}
                      max={5}
                      step={0.2}
                      unit="mm"
                      onChange={(borderMm) => setMedal((m) => ({ ...m, borderMm }))}
                    />
                    <NumberControl
                      label="Limite de detalhe"
                      value={medal.threshold}
                      min={1}
                      max={254}
                      unit="/255"
                      onChange={(threshold) => setMedal((m) => ({ ...m, threshold }))}
                    />
                    <div className="medal-palette">
                      <strong>Paleta do 3MF</strong>
                      {palette.map((color, i) => (
                        <label key={i}>
                          <span>Material {i + 1}</span>
                          <input
                            type="color"
                            value={color}
                            aria-label={`Material ${i + 1}`}
                            onChange={(e) =>
                              setPalette((old) => old.map((c, j) => (j === i ? e.target.value : c)))
                            }
                          />
                        </label>
                      ))}
                      <small>Defina a correspondência dos filamentos no fatiador.</small>
                    </div>
                  </>
                ) : (
                  <>
                    <NumberControl
                      label="Largura da peça"
                      value={settings.widthMm}
                      min={10}
                      max={240}
                      step={1}
                      unit="mm"
                      onChange={(n) => update("widthMm", n)}
                    />
                    <NumberControl
                      label="Resolução de amostragem"
                      value={settings.resolution}
                      min={24}
                      max={192}
                      step={8}
                      unit="px"
                      onChange={(n) => update("resolution", n)}
                    />
                    {settings.mode === "litofania" ? (
                      <>
                        <NumberControl
                          label="Espessura mínima"
                          value={settings.minMm}
                          min={0.6}
                          max={3}
                          step={0.2}
                          unit="mm"
                          onChange={(n) => update("minMm", n)}
                        />
                        <NumberControl
                          label="Espessura máxima"
                          value={settings.maxMm}
                          min={1.2}
                          max={8}
                          step={0.2}
                          unit="mm"
                          onChange={(n) => update("maxMm", n)}
                        />
                      </>
                    ) : (
                      <>
                        <NumberControl
                          label="Espessura da base"
                          value={settings.baseMm}
                          min={0.6}
                          max={6}
                          step={0.2}
                          unit="mm"
                          onChange={(n) => update("baseMm", n)}
                        />
                        <NumberControl
                          label={
                            settings.mode === "relevo" ? "Altura do relevo" : "Altura do recorte"
                          }
                          value={settings.heightMm}
                          min={0.2}
                          max={10}
                          step={0.2}
                          unit="mm"
                          onChange={(n) => update("heightMm", n)}
                        />
                      </>
                    )}
                    <NumberControl
                      label="Contraste da imagem"
                      value={settings.contrast}
                      min={0.25}
                      max={3}
                      step={0.05}
                      unit="×"
                      onChange={(n) => update("contrast", n)}
                    />
                    {settings.mode === "silhueta" && (
                      <NumberControl
                        label="Limiar de recorte"
                        value={settings.threshold}
                        min={1}
                        max={254}
                        step={1}
                        unit="/255"
                        onChange={(n) => update("threshold", n)}
                      />
                    )}
                    <label className="im3-check">
                      <input
                        type="checkbox"
                        checked={settings.invert}
                        onChange={(e) => update("invert", e.currentTarget.checked)}
                      />{" "}
                      Inverter claro / escuro
                    </label>
                    {settings.mode === "silhueta" && (
                      <label className="im3-check">
                        <input
                          type="checkbox"
                          checked={settings.silhouetteBase}
                          onChange={(e) => update("silhouetteBase", e.currentTarget.checked)}
                        />{" "}
                        Manter base para unir peças
                      </label>
                    )}
                    <Button
                      variant="ghost"
                      className="im3-reset"
                      onClick={() => setSettings({ ...imageDefaults, mode: settings.mode })}
                    >
                      <RotateCcw size={14} /> Restaurar valores
                    </Button>
                  </>
                )}
              </div>
              <div className="im3-tip">
                <strong>Para sua Bambu Lab A1</strong>
                <p>
                  Comece com 100 mm, base de 1,6 mm e relevo de 2,4 mm. Depois ajuste conforme a
                  prévia do fatiador e o tamanho real dos detalhes.
                </p>
              </div>
            </aside>
          </div>
        </section>
        {message && (
          <div role="status" className="im3-message">
            <span>{message}</span>
            <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
              <XCircle size={17} />
            </button>
          </div>
        )}
        <p className="im3-footer-note">
          Express’Arte Studio v7.5 · Conversão executada no navegador, sem enviar imagens para
          servidor. As outras áreas do projeto permanecem disponíveis no menu.
        </p>
      </main>
    </>
  );
}
