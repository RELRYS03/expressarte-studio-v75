import { useEffect, useMemo, useState } from "react";
import { Download, ImagePlus, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Kind = "chaveiro" | "placa" | "relevo" | "suporte" | "figure";
const KINDS: { id: Kind; label: string }[] = [
  { id: "chaveiro", label: "Chaveiro" },
  { id: "placa", label: "Placa" },
  { id: "relevo", label: "Relevo" },
  { id: "suporte", label: "Suporte" },
  { id: "figure", label: "Figure" },
];
function makePlan(prompt: string, kind: Kind, width: number, hasImage: boolean) {
  const textMatch = prompt.match(/(?:nome|escrito|texto)\s*[:=-]?\s*["“']?([^\n,.!;"”']{2,35})/i);
  const name = textMatch?.[1]?.trim() ?? "";
  const height = kind === "figure" ? width * 1.5 : kind === "suporte" ? width : width * 0.65;
  return {
    version: 1,
    generator: "expressinho-local-planejador-inicial",
    status: "rascunho_para_revisao",
    kind,
    prompt,
    referenceImage: hasImage ? "imagem anexada localmente; análise visual ainda não implementada" : null,
    dimensionsMm: { width, height: Math.round(height * 10) / 10, depth: kind === "figure" ? width * 0.65 : 4 },
    components: kind === "chaveiro"
      ? [{ id: "base", editable: true }, { id: "argola", editable: true, note: "fixar ao contorno" }, ...(name ? [{ id: "texto", editable: true, value: name }] : [])]
      : [{ id: "corpo_principal", editable: true }, ...(name ? [{ id: "texto", editable: true, value: name }] : [])],
    validation: ["confirmar medidas", "revisar geometria no Blender", "validar STL no Bambu Studio"],
    note: "Este plano inicial não executa Blender, não interpreta pixels e não garante a geometria final.",
  };
}
export default function ExpressinhoCreation() {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<Kind>("chaveiro");
  const [width, setWidth] = useState(80);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plan, setPlan] = useState<ReturnType<typeof makePlan> | null>(null);
  useEffect(() => {
    if (!imageFile) { setPreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);
  const valid = useMemo(() => prompt.trim().length >= 5 && Number.isFinite(width) && width >= 10 && width <= 300, [prompt, width]);
  const download = () => {
    if (!plan) return;
    const file = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expressinho-plano-3d.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="expressinho-creation" aria-label="Criar com Expressinho">
      <header className="expressinho-creation-heading">
        <div><strong><WandSparkles size={16}/> Criar com Expressinho</strong><p>Etapa 1 — descrição + referência + plano editável. Sem API paga.</p></div>
        <span>Rascunho local</span>
      </header>
      <div className="expressinho-creation-fields">
        <label className="expressinho-prompt">O que você quer criar?
          <textarea rows={3} maxLength={1500} value={prompt} onChange={e => { setPrompt(e.target.value); setPlan(null); }}
            placeholder='Ex.: chaveiro de coração com o nome EXPRESSARTE, argola integrada e 80 mm de largura' />
        </label>
        <label>Tipo de peça
          <select value={kind} onChange={e => { setKind(e.target.value as Kind); setPlan(null); }}>
            {KINDS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
        <label>Largura (mm)
          <input type="number" min={10} max={300} value={width} onChange={e => { setWidth(Number(e.target.value)); setPlan(null); }}/>
        </label>
        <label className="expressinho-image"><ImagePlus size={16}/> Imagem de referência
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
            const file = e.target.files?.[0] ?? null;
            if (file && file.size > 5 * 1024 * 1024) { e.currentTarget.value = ""; setImageFile(null); setPlan(null); return; }
            setImageFile(file); setPlan(null);
          }} />
          <small>PNG, JPG ou WebP, até 5 MB; fica neste navegador.</small>
        </label>
      </div>
      {preview && <div className="expressinho-image-preview"><img src={preview} alt="Imagem de referência selecionada" /><Button variant="outline" size="sm" onClick={() => { setImageFile(null); setPlan(null); }}><X size={14}/> Remover imagem</Button></div>}
      <div className="expressinho-creation-actions">
        <Button disabled={!valid} onClick={() => setPlan(makePlan(prompt.trim(), kind, width, !!imageFile))}><WandSparkles size={15}/> Preparar plano 3D</Button>
        {plan && <Button variant="outline" onClick={download}><Download size={15}/> Baixar plano JSON</Button>}
      </div>
      {plan && <div className="expressinho-plan" role="status">
        <strong>Plano inicial pronto para revisar</strong>
        <p>{plan.kind} · {plan.dimensionsMm.width} × {plan.dimensionsMm.height} × {plan.dimensionsMm.depth} mm</p>
        <p>Componentes: {plan.components.map(c => c.id).join(", ")}</p>
        <p>Próxima etapa: conectar este plano a um executor seguro no Blender e devolver peças editáveis.</p>
        <details><summary>Ver instruções estruturadas</summary><pre>{JSON.stringify(plan, null, 2)}</pre></details>
      </div>}
    </section>
  );
}
