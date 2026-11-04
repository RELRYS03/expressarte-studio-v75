import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { generate3D } from "@/lib/ai-creator/client";

type Mode = "text" | "image" | "both";
const modes: { value: Mode; label: string }[] = [
  { value: "text", label: "Texto para 3D" },
  { value: "image", label: "Imagem para 3D" },
  { value: "both", label: "Imagem + texto para 3D" },
];

function AICreator() {
  const [mode, setMode] = useState<Mode>("both");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [height, setHeight] = useState(150);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ modelUrl: string; format: string } | null>(null);
  const submit = async () => {
    if (!valid || loading || !Number.isFinite(height) || height <= 0 || height > 1000) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const generated = await generate3D({ mode, prompt, image, heightMm: height });
      setResult(generated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o modelo.");
    } finally { setLoading(false); }
  };
  const needsImage = mode !== "text";
  const needsText = mode !== "image";
  const valid = (!needsImage || image !== null) && (!needsText || prompt.trim().length > 0);
  const onImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setError("Selecione uma imagem válida de até 10 MB.");
      setImage(null);
      return;
    }
    setError("");
    setImage(file);
  };
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Link to="/studio" className="text-sm underline">Voltar ao Studio 3D</Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Express'Arte AI Creator</h1>
        <p className="text-muted-foreground">Criação universal de objetos 3D: personagens, esculturas, acessórios e peças funcionais.</p>
      </header>
      <section className="space-y-5 rounded-xl border p-5">
        <fieldset className="space-y-2">
          <legend className="font-semibold">Como deseja criar?</legend>
          <div className="flex flex-wrap gap-3">
            {modes.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 rounded-lg border p-3">
                <input type="radio" name="mode" checked={mode === value} onChange={() => { setMode(value); setError(""); }} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {needsImage && (
          <label className="block space-y-2">
            <span className="font-semibold">Imagem de referência</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onImage} className="block w-full" />
            {image && <span className="block text-sm text-muted-foreground">{image.name}</span>}
          </label>
        )}
        {needsText && (
          <label className="block space-y-2">
            <span className="font-semibold">Descreva o objeto</span>
            <textarea className="min-h-32 w-full rounded-lg border bg-background p-3" value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="Ex.: boneco colecionável com cabeça grande, roupa personalizada e base redonda" />
          </label>
        )}
        <label className="block space-y-2">
          <span className="font-semibold">Altura desejada (mm)</span>
          <input className="block w-32 rounded-lg border bg-background p-2" type="number" min={1} max={1000} value={height}
            onChange={e => setHeight(Number(e.target.value))} />
        </label>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <p className="text-sm text-muted-foreground">O formulário enviará os dados ao servidor ao solicitar a geração. O motor 3D ainda precisa ser configurado; nenhuma chave de API deve ser colocada no navegador.</p>
        <button type="button" disabled={loading || !valid || !Number.isFinite(height) || height <= 0 || height > 1000}
          className="rounded-lg bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50"
          onClick={submit}>
          {loading ? "Enviando para geração..." : "Gerar modelo 3D"}
        </button>
        {result && <p role="status" className="text-sm">Modelo recebido ({result.format.toUpperCase()}): <a className="underline" href={result.modelUrl} download>Baixar arquivo gerado</a>. Verifique a malha antes de imprimir.</p>}
      </section>
    </main>
  );
}
export const Route = createFileRoute("/ai-creator")({ component: AICreator });
