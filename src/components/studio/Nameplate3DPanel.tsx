import { useState } from "react";
import type { BufferGeometry } from "three";
import { BadgeCheck, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNameplateParts } from "@/lib/studio/nameplate-geometry";

type Nameplate3DPanelProps = {
  disabled?: boolean;
  onCreate: (base: BufferGeometry, text: BufferGeometry, filename: string) => Promise<void>;
};

function safeFilename(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `placa-${slug || "personalizada"}.stl`;
}

export default function Nameplate3DPanel({ disabled = false, onCreate }: Nameplate3DPanelProps) {
  const [text, setText] = useState("EXPRESS ARTE");
  const [widthMm, setWidthMm] = useState(80);
  const [heightMm, setHeightMm] = useState(30);
  const [baseThicknessMm, setBaseThicknessMm] = useState(3);
  const [reliefHeightMm, setReliefHeightMm] = useState(1.2);
  const [mountingHoles, setMountingHoles] = useState(true);
  const [holeDiameterMm, setHoleDiameterMm] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    let parts: ReturnType<typeof createNameplateParts> | undefined;
    try {
      parts = createNameplateParts({
        text,
        widthMm,
        heightMm,
        baseThicknessMm,
        reliefHeightMm,
        mountingHoles,
        holeDiameterMm,
      });
      setLoading(true);
      setError("");
      await onCreate(parts.base, parts.text, safeFilename(text));
      parts = undefined;
    } catch (cause) {
      parts?.base.dispose();
      parts?.text.dispose();
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a placa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-3 py-3 border-t space-y-2" aria-label="Criador de placa 3D">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Layers3 size={15} />
        Criar placa 3D
      </div>
      <label className="block text-xs">
        Nome ou frase
        <input
          className="text-input mt-1 w-full"
          aria-label="Texto da placa"
          value={text}
          maxLength={32}
          onChange={(event) => { setText(event.target.value); setError(""); }}
          placeholder="Digite o texto"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          Largura (mm)
          <input className="text-input mt-1 w-full" type="number" min={40} max={250} step={1}
            value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} />
        </label>
        <label className="block text-xs">
          Altura (mm)
          <input className="text-input mt-1 w-full" type="number" min={20} max={120} step={1}
            value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value))} />
        </label>
        <label className="block text-xs">
          Base (mm)
          <input className="text-input mt-1 w-full" type="number" min={1.2} max={8} step={0.2}
            value={baseThicknessMm} onChange={(event) => setBaseThicknessMm(Number(event.target.value))} />
        </label>
        <label className="block text-xs">
          Relevo (mm)
          <input className="text-input mt-1 w-full" type="number" min={0.4} max={4} step={0.2}
            value={reliefHeightMm} onChange={(event) => setReliefHeightMm(Number(event.target.value))} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={mountingHoles} onChange={(event) => setMountingHoles(event.target.checked)} />
        Dois furos de fixação
      </label>
      {mountingHoles && (
        <label className="block text-xs">
          Diâmetro dos furos (mm)
          <input className="text-input mt-1 w-full" type="number" min={2} max={8} step={0.5}
            value={holeDiameterMm} onChange={(event) => setHoleDiameterMm(Number(event.target.value))} />
        </label>
      )}
      <Button className="w-full" size="sm" disabled={disabled || loading || !text.trim()} onClick={() => void create()}>
        <BadgeCheck size={14} />
        {loading ? "Unindo base e letras…" : "Gerar placa sólida"}
      </Button>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Letras em alto-relevo unidas à base pelo Manifold. A fonte atual não possui acentos. Confira a malha e o fatiamento antes de imprimir.
      </p>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </section>
  );
}
