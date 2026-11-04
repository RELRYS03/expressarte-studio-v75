import { useState } from "react";
import type { BufferGeometry } from "three";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createText3DGeometry } from "@/lib/studio/text-geometry";

type Text3DPanelProps = {
  disabled?: boolean;
  onCreate: (geometry: BufferGeometry, filename: string) => void;
};

function safeFilename(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "texto"}-3d.stl`;
}

export default function Text3DPanel({ disabled = false, onCreate }: Text3DPanelProps) {
  const [text, setText] = useState("EXPRESS ARTE");
  const [widthMm, setWidthMm] = useState(80);
  const [depthMm, setDepthMm] = useState(3);
  const [error, setError] = useState("");

  const create = () => {
    let geometry: BufferGeometry | null = null;
    try {
      geometry = createText3DGeometry({ text, widthMm, depthMm });
      onCreate(geometry, safeFilename(text));
      geometry = null;
      setError("");
    } catch (cause) {
      geometry?.dispose();
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o texto 3D.");
    }
  };

  return (
    <section
      className="px-3 py-3 border-t space-y-2"
      aria-label="Gerador de texto 3D"
      style={{ flexShrink: 0 }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Type size={15} />
        Criar texto 3D
      </div>
      <label className="block text-xs">
        Nome ou frase
        <input
          className="text-input mt-1 w-full"
          aria-label="Texto para extrusão 3D"
          value={text}
          maxLength={32}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          placeholder="Digite seu texto"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          Largura (mm)
          <input
            className="text-input mt-1 w-full"
            aria-label="Largura do texto em milímetros"
            type="number"
            min={10}
            max={250}
            step={1}
            value={widthMm}
            onChange={(event) => setWidthMm(Number(event.target.value))}
          />
        </label>
        <label className="block text-xs">
          Espessura (mm)
          <input
            className="text-input mt-1 w-full"
            aria-label="Espessura do texto em milímetros"
            type="number"
            min={0.8}
            max={20}
            step={0.2}
            value={depthMm}
            onChange={(event) => setDepthMm(Number(event.target.value))}
          />
        </label>
      </div>
      <Button className="w-full" size="sm" disabled={disabled || !text.trim()} onClick={create}>
        <Type size={14} />
        Gerar texto no editor
      </Button>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Geometria extrudada localmente, sem créditos. STL não guarda cores. A fonte atual ainda não inclui acentos.
      </p>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </section>
  );
}
