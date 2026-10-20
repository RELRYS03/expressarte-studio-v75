import { useCallback, useEffect, useRef, useState } from "react";
import { Box, CheckCircle2, ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMeshyImageTask, getMeshyImageTask } from "@/lib/studio/meshy-api";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_LOCAL_IMAGE_BYTES = 12 * 1024 * 1024;
const MODEL_LINKS = [
  ["glb", "GLB"],
  ["3mf", "3MF"],
  ["stl", "STL"],
  ["obj", "OBJ"],
  ["fbx", "FBX"],
  ["usdz", "USDZ"],
  ["gltf", "glTF"],
] as const;

type GenerationState = "idle" | "uploading" | "processing" | "success" | "failed";
type MeshyResult = {
  modelUrls: Partial<Record<(typeof MODEL_LINKS)[number][0], string>>;
  thumbnailUrl: string | null;
  expiresAt: number | null;
  consumedCredits: number | null;
};

async function fileDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler uma imagem para envio."));
    reader.onload = () => {
      const value = String(reader.result);
      if (!value.startsWith("data:image/")) {
        reject(new Error("O navegador não conseguiu preparar uma imagem válida."));
        return;
      }
      resolve(value);
    };
    reader.readAsDataURL(file);
  });
}

async function meshCompatibleImage(file: File | null, fallbackDataUrl: string): Promise<File> {
  let source = file;
  if (!source) {
    if (!fallbackDataUrl) throw new Error("Escolha uma imagem antes de gerar o modelo.");
    const blob = await (await fetch(fallbackDataUrl)).blob();
    source = new File([blob], "imagem-exemplo.png", { type: blob.type || "image/png" });
  }

  if (["image/png", "image/jpeg", "image/webp"].includes(source.type)) return source;
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem para a Meshy.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Não foi possível converter a imagem para PNG.")),
        "image/png",
      ),
    );
    return new File([blob], `${source.name.replace(/\.[^.]+$/, "") || "imagem"}.png`, {
      type: "image/png",
    });
  } finally {
    bitmap.close();
  }
}

function validateSelectedImages(images: File[]) {
  let totalBytes = 0;
  for (const image of images) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type))
      throw new Error("Use imagens PNG, JPEG ou WebP nas vistas adicionais.");
    if (image.size > MAX_LOCAL_IMAGE_BYTES)
      throw new Error("Cada imagem pode ter até 12 MB nesta versão.");
    totalBytes += image.size;
  }
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES)
    throw new Error("O conjunto de imagens pode ter até 40 MB.");
}

export default function MeshyImageTo3D({
  sourceFile,
  picture,
}: {
  sourceFile: File | null;
  picture: string;
}) {
  const [viewFiles, setViewFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [taskId, setTaskId] = useState("");
  const [multiView, setMultiView] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<MeshyResult | null>(null);
  const [message, setMessage] = useState("");
  const viewPicker = useRef<HTMLInputElement>(null);
  const busy = generationState === "uploading" || generationState === "processing";

  const resetGeneration = useCallback(() => {
    setConsent(false);
    setGenerationState("idle");
    setTaskId("");
    setProgress(0);
    setResult(null);
    setMessage("");
  }, []);

  useEffect(() => {
    setViewFiles([]);
    resetGeneration();
  }, [picture, resetGeneration, sourceFile]);

  useEffect(() => {
    if (!taskId || generationState !== "processing") return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const task = await getMeshyImageTask({ data: { taskId, multiView } });
        if (cancelled) return;
        setProgress(task.progress);
        if (task.status === "SUCCEEDED") {
          if (!Object.keys(task.modelUrls).length) {
            setGenerationState("failed");
            setMessage("A Meshy concluiu a tarefa, mas não retornou links de download.");
            return;
          }
          setResult({
            modelUrls: task.modelUrls,
            thumbnailUrl: task.thumbnailUrl,
            expiresAt: task.expiresAt,
            consumedCredits: task.consumedCredits,
          });
          setGenerationState("success");
          setMessage("Modelo concluído. Baixe os arquivos em breve; os links são temporários.");
          return;
        }
        if (task.status === "FAILED" || task.status === "CANCELED") {
          setGenerationState("failed");
          setMessage(task.errorMessage || `A tarefa Meshy terminou com status ${task.status}.`);
          return;
        }
        if (++attempts >= 150) {
          setGenerationState("failed");
          setMessage(
            `O tempo de espera desta página terminou. Guarde o ID da tarefa ${taskId} para consultar depois.`,
          );
          return;
        }
        timer = window.setTimeout(poll, task.retryAfterMs);
      } catch (error) {
        if (!cancelled) {
          setGenerationState("failed");
          setMessage(error instanceof Error ? error.message : "Falha ao consultar a Meshy.");
        }
      }
    };

    timer = window.setTimeout(poll, 1_500);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [generationState, multiView, taskId]);

  const addViews = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.length > 3) {
      setMessage("Adicione no máximo três vistas extras além da imagem principal.");
      return;
    }
    try {
      const next = [...viewFiles, ...selected];
      if (next.length > 3) throw new Error("A Meshy aceita até quatro vistas no total.");
      validateSelectedImages(next);
      setViewFiles(next);
      resetGeneration();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível adicionar as vistas.");
    }
  };

  const generate = async () => {
    if (!consent) {
      setMessage("Confirme o envio das imagens e o possível consumo de créditos para continuar.");
      return;
    }
    setGenerationState("uploading");
    setTaskId("");
    setResult(null);
    setProgress(0);
    setMessage("");

    try {
      const primary = await meshCompatibleImage(sourceFile, picture);
      const images = [primary, ...viewFiles];
      validateSelectedImages(images);
      const dataUrls = await Promise.all(images.map(fileDataUrl));
      const { taskId: createdTaskId, multiView: createdMultiView } = await createMeshyImageTask({
        data: { images: dataUrls },
      });
      setTaskId(createdTaskId);
      setMultiView(createdMultiView);
      setGenerationState("processing");
      setMessage(
        `Tarefa Meshy ${createdMultiView ? "multi-view" : "imagem"} iniciada. A geração pode levar alguns minutos.`,
      );
    } catch (error) {
      setGenerationState("failed");
      setMessage(
        error instanceof Error ? error.message : "Não foi possível iniciar a geração na Meshy.",
      );
    }
  };

  return (
    <section className="im3-tripo im3-meshy" aria-labelledby="meshy-title">
      <div className="im3-tripo-copy">
        <span className="im3-eyebrow">
          <Sparkles size={13} /> GERAÇÃO 3D COM IA · MESHY
        </span>
        <h2 id="meshy-title">Crie um modelo 3D a partir de 1 a 4 vistas</h2>
        <p>
          Use a imagem principal ou adicione outras vistas do mesmo objeto para reconstrução 3D. A
          Meshy processa a tarefa na nuvem e pode consumir créditos da sua conta.
        </p>
        <input
          ref={viewPicker}
          className="hidden"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => {
            addViews(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <div className="im3-tripo-controls">
          <Button
            variant="outline"
            onClick={() => viewPicker.current?.click()}
            disabled={!picture || busy || viewFiles.length >= 3}
          >
            <ImagePlus size={16} />
            Adicionar vistas ({viewFiles.length}/3)
          </Button>
          <Button onClick={() => void generate()} disabled={!picture || busy || !consent}>
            {busy ? (
              <LoaderCircle className="im3-meshy-spinner" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {generationState === "uploading"
              ? "Enviando imagens…"
              : generationState === "processing"
                ? `Gerando ${progress}%…`
                : generationState === "success"
                  ? "Gerar outro modelo"
                  : "Gerar com Meshy IA"}
          </Button>
          <span>Meshy latest · malha triangular · textura</span>
        </div>
        {viewFiles.length > 0 && (
          <ul className="im3-meshy-views" aria-label="Vistas adicionais selecionadas">
            {viewFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remover ${file.name}`}
                  disabled={busy}
                  onClick={() => {
                    setViewFiles((current) => current.filter((_, i) => i !== index));
                    resetGeneration();
                  }}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="im3-meshy-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(event) => setConsent(event.currentTarget.checked)}
          />
          Confirmo que as imagens serão enviadas à Meshy e que a geração pode consumir créditos.
        </label>
        {busy && (
          <div
            className="im3-tripo-progress"
            role="progressbar"
            aria-label="Progresso da geração Meshy"
            aria-valuenow={generationState === "uploading" ? 5 : progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              style={{
                width: `${generationState === "uploading" ? 8 : Math.max(5, progress)}%`,
              }}
            />
          </div>
        )}
        <small>
          A chave fica no servidor. Imagens: PNG, JPEG ou WebP, até 12 MB cada nesta interface.
          Configure MESHY_API_KEY localmente; nunca coloque a chave no navegador.
        </small>
        {message && (
          <p className="im3-meshy-message" role="status">
            {message}
          </p>
        )}
        {taskId && <small>ID da tarefa: {taskId}</small>}
      </div>
      {result ? (
        <div className="im3-tripo-result">
          {result.thumbnailUrl ? (
            <img src={result.thumbnailUrl} alt="Prévia do modelo 3D gerado pela Meshy" />
          ) : (
            <Box size={42} aria-hidden="true" />
          )}
          <div>
            <strong>
              <CheckCircle2 size={16} /> Modelo Meshy concluído
            </strong>
            <span>
              Links temporários. Confira a malha e as dimensões no Blender ou no fatiador antes de
              imprimir.
              {result.consumedCredits !== null &&
                ` Créditos consumidos: ${result.consumedCredits}.`}
            </span>
            <div className="im3-meshy-links">
              {MODEL_LINKS.map(([format, label]) => {
                const url = result.modelUrls[format];
                return url ? (
                  <a key={format} href={url} target="_blank" rel="noreferrer">
                    Abrir/baixar {label}
                  </a>
                ) : null;
              })}
            </div>
            {result.expiresAt !== null && (
              <small>
                Links disponíveis até {new Date(result.expiresAt).toLocaleString("pt-BR")}.
              </small>
            )}
          </div>
        </div>
      ) : (
        <div className="im3-tripo-idle">
          <Box size={42} />
          <span>
            {generationState === "failed"
              ? "Verifique a configuração ou tente novamente"
              : taskId
                ? `Tarefa ${taskId}`
                : "A prévia e os formatos aparecerão aqui"}
          </span>
        </div>
      )}
    </section>
  );
}
