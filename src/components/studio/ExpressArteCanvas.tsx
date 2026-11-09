import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Boxes,
  Check,
  CircleAlert,
  Copy,
  ImagePlus,
  Layers3,
  Link2,
  Move,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Workflow,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NodeKind = "image" | "generate" | "texture" | "repair" | "print";
type CanvasNode = { id: string; kind: NodeKind; x: number; y: number; title: string };
type CanvasEdge = { id: string; from: string; to: string };
type CanvasProject = { nodes: CanvasNode[]; edges: CanvasEdge[]; selectedId: string | null };

const STORAGE_KEY = "expressarte.canvas.project.v1";
const NODE_WIDTH = 220;
const NODE_HEIGHT = 132;

const catalog: Record<NodeKind, { title: string; description: string; icon: typeof ImagePlus; color: string; stage: string }> = {
  image: { title: "Entrada de imagem", description: "Imagem de referência para iniciar o fluxo.", icon: ImagePlus, color: "text-sky-600", stage: "Entrada" },
  generate: { title: "Geração 3D", description: "Motor de geometria local ou conectado.", icon: Sparkles, color: "text-violet-600", stage: "Geração" },
  texture: { title: "Textura e cores", description: "Materiais, paleta e preparação de cores.", icon: Layers3, color: "text-amber-600", stage: "Materiais" },
  repair: { title: "Reparo de malha", description: "Diagnóstico e correção de geometria.", icon: Wrench, color: "text-emerald-600", stage: "Geometria" },
  print: { title: "Preparação para impressão", description: "Escala, orientação e exportação.", icon: ArrowDownToLine, color: "text-rose-600", stage: "Saída" },
};

const starter: CanvasNode[] = [
  { id: "image-1", kind: "image", x: 60, y: 120, title: "Imagem do Expressinho" },
  { id: "generate-1", kind: "generate", x: 350, y: 120, title: "Gerar geometria" },
  { id: "texture-1", kind: "texture", x: 640, y: 120, title: "Aplicar materiais" },
  { id: "repair-1", kind: "repair", x: 930, y: 120, title: "Verificar malha" },
  { id: "print-1", kind: "print", x: 1220, y: 120, title: "Preparar impressão" },
];
const starterEdges: CanvasEdge[] = starter.slice(0, -1).map((node, index) => ({
  id: `edge-${index + 1}`,
  from: node.id,
  to: starter[index + 1].id,
}));

function initialProject(): CanvasProject {
  return { nodes: starter, edges: starterEdges, selectedId: "generate-1" };
}

export default function ExpressArteCanvas() {
  const [nodes, setNodes] = useState<CanvasNode[]>(starter);
  const [edges, setEdges] = useState<CanvasEdge[]>(starterEdges);
  const [selectedId, setSelectedId] = useState<string | null>("generate-1");
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [notice, setNotice] = useState("Fluxo inicial carregado. Arraste os nós para organizar seu processo.");
  const [saved, setSaved] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 760 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<CanvasProject>;
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges) && parsed.nodes.length) {
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setSelectedId(parsed.selectedId ?? parsed.nodes[0]?.id ?? null);
        setNotice("Seu último fluxo salvo foi restaurado neste navegador.");
      }
    } catch {
      setNotice("Não foi possível restaurar o último fluxo. Um novo fluxo foi carregado.");
    }
  }, []);

  useEffect(() => {
    const maxX = Math.max(1600, ...nodes.map((node) => node.x + NODE_WIDTH + 100));
    const maxY = Math.max(760, ...nodes.map((node) => node.y + NODE_HEIGHT + 100));
    setCanvasSize({ width: maxX, height: maxY });
  }, [nodes]);

  const connectedCount = useMemo(() => edges.length, [edges]);
  const updateNode = (id: string, changes: Partial<CanvasNode>) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, ...changes } : node));
  };

  const addNode = (kind: NodeKind) => {
    const id = `${kind}-${Date.now()}`;
    const index = nodes.length;
    const next: CanvasNode = {
      id,
      kind,
      x: 90 + (index % 4) * 270,
      y: 340 + Math.floor(index / 4) * 190,
      title: catalog[kind].title,
    };
    setNodes((current) => [...current, next]);
    setSelectedId(id);
    setNotice(`Bloco "${catalog[kind].title}" adicionado ao Canvas.`);
  };

  const connect = (targetId: string) => {
    if (!connectingFrom) {
      setNotice("Escolha primeiro o bloco de origem.");
      return;
    }
    if (connectingFrom === targetId) {
      setNotice("Um bloco não pode conectar a si mesmo.");
      return;
    }
    if (edges.some((edge) => edge.from === connectingFrom && edge.to === targetId)) {
      setNotice("Essa conexão já existe.");
      setConnectingFrom(null);
      return;
    }
    setEdges((current) => [...current, { id: `edge-${Date.now()}`, from: connectingFrom, to: targetId }]);
    setConnectingFrom(null);
    setNotice("Conexão adicionada.");
  };

  const validateFlow = () => {
    const hasImage = nodes.some((node) => node.kind === "image");
    const hasGeneration = nodes.some((node) => node.kind === "generate");
    const hasOutput = nodes.some((node) => node.kind === "print");
    if (!hasImage || !hasGeneration || !hasOutput) {
      setNotice("O fluxo precisa de Entrada de imagem, Geração 3D e Preparação para impressão.");
      return;
    }
    if (edges.length === 0) {
      setNotice("Os blocos existem, mas ainda não estão conectados.");
      return;
    }
    setNotice("Estrutura do fluxo válida. A execução dos motores será ligada nas próximas etapas; nenhuma geração foi iniciada.");
  };

  const saveProject = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, selectedId }));
      setSaved(true);
      setNotice("Fluxo salvo neste navegador.");
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setNotice("Não foi possível salvar. O armazenamento do navegador pode estar cheio.");
    }
  };

  const resetProject = () => {
    setNodes(starter);
    setEdges(starterEdges);
    setSelectedId("generate-1");
    setConnectingFrom(null);
    setNotice("Fluxo inicial restaurado.");
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.from !== selectedId && edge.to !== selectedId));
    setSelectedId(null);
    setNotice("Bloco removido.");
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds) return;
    const x = Math.max(12, event.clientX - bounds.left - drag.offsetX);
    const y = Math.max(12, event.clientY - bounds.top - drag.offsetY);
    updateNode(drag.id, { x, y });
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      id: node.id,
      offsetX: event.clientX - bounds.left - node.x,
      offsetY: event.clientY - bounds.top - node.y,
    };
    setSelectedId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <section className="px-5 pb-8 md:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Workflow className="h-5 w-5 text-primary" /> Canvas de criação
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">MVP local</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Monte e salve fluxos de trabalho 3D. Nenhuma geração externa é chamada pelo Canvas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resetProject}><RotateCcw /> Restaurar fluxo</Button>
          <Button variant="outline" size="sm" onClick={saveProject}>{saved ? <Check /> : <Copy />} {saved ? "Salvo" : "Salvar fluxo"}</Button>
          <Button size="sm" onClick={validateFlow}><Check /> Validar fluxo</Button>
        </div>
      </div>

      <div className="grid min-h-[690px] overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:grid-cols-[190px_minmax(0,1fr)_250px]">
        <aside className="border-b border-border bg-background p-3 xl:border-b-0 xl:border-r">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Adicionar blocos</h2>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
            {(Object.keys(catalog) as NodeKind[]).map((kind) => {
              const item = catalog[kind];
              const Icon = item.icon;
              return (
                <button key={kind} type="button" onClick={() => addNode(kind)} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left text-xs transition hover:border-primary hover:bg-accent">
                  <Icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  <span className="min-w-0 flex-1">{item.title}</span>
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            Arraste os blocos pelo cabeçalho. Use "Definir origem" e "Conectar aqui" para criar ligações.
          </div>
        </aside>

        <div className="relative min-h-[560px] overflow-auto bg-[#f4efe8]">
          <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(#b9aa98 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div
            ref={canvasRef}
            className="relative"
            style={{ width: canvasSize.width, height: canvasSize.height, touchAction: "pan-x pan-y" }}
            onPointerMove={onPointerMove}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width={canvasSize.width} height={canvasSize.height}>
              {edges.map((edge) => {
                const from = nodes.find((node) => node.id === edge.from);
                const to = nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.x + NODE_WIDTH;
                const y1 = from.y + NODE_HEIGHT / 2;
                const x2 = to.x;
                const y2 = to.y + NODE_HEIGHT / 2;
                const curve = Math.max(55, Math.abs(x2 - x1) / 2);
                return <g key={edge.id}><path d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`} fill="none" stroke="#98694a" strokeWidth="2.5" /><circle cx={x2} cy={y2} r="4" fill="#98694a" /></g>;
              })}
            </svg>
            {nodes.map((node) => {
              const item = catalog[node.kind];
              const Icon = item.icon;
              const isSelected = selectedId === node.id;
              return (
                <article key={node.id} onPointerDown={(event) => beginDrag(event, node)} onClick={() => setSelectedId(node.id)} className={`absolute z-10 w-[220px] select-none rounded-xl border bg-card shadow-md ${isSelected ? "border-primary ring-2 ring-primary/15" : "border-border"}`} style={{ left: node.x, top: node.y, touchAction: "none" }}>
                  <div className="flex cursor-grab items-center gap-2 border-b border-border px-3 py-2 active:cursor-grabbing">
                    <Move className="h-3 w-3 text-muted-foreground" />
                    <Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="flex-1 truncate text-[11px] font-semibold">{node.title}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground">{item.stage}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="min-h-8 text-[10px] leading-relaxed text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" className="rounded border border-border px-2 py-1 text-[10px] hover:bg-accent" onClick={(event) => { event.stopPropagation(); setConnectingFrom(node.id); setNotice(`Origem definida: ${node.title}. Escolha o bloco de destino.`); }}>Definir origem</button>
                      <button type="button" className="rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground hover:bg-primary/90" onClick={(event) => { event.stopPropagation(); connect(node.id); }}>Conectar aqui</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-border bg-background p-4 xl:border-l xl:border-t-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Propriedades</h2>
            <span className="text-[10px] text-muted-foreground">{nodes.length} blocos · {connectedCount} conexões</span>
          </div>
          {selected ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4 text-primary" /> {catalog[selected.kind].title}</div>
                <label className="block text-[11px] text-muted-foreground">Nome do bloco</label>
                <input className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-xs text-foreground" value={selected.title} onChange={(event) => updateNode(selected.id, { title: event.target.value })} />
                <p className="mt-2 text-[10px] text-muted-foreground">ID: {selected.id}</p>
              </div>
              <div className="rounded-lg border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                <CircleAlert className="mb-2 h-4 w-4 text-amber-600" />
                Este bloco está no editor de fluxo. O processamento real será conectado ao motor correspondente nas próximas fases.
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={removeSelected}><Trash2 /> Remover bloco</Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Selecione um bloco para editar suas propriedades.</p>
          )}
          {connectingFrom && <div className="mt-4 rounded-lg bg-accent p-3 text-[11px] text-foreground">Conectando a partir de <strong>{nodes.find((node) => node.id === connectingFrom)?.title}</strong>. Clique em "Conectar aqui" no destino.</div>}
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-xs font-semibold">Estado do projeto</h3>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-600" /> Editor local disponível</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><Scissors className="h-3.5 w-3.5 text-amber-600" /> Motores ainda não executados</div>
          </div>
        </aside>
      </div>
      <p role="status" className="mt-3 text-xs text-muted-foreground">{notice}</p>
    </section>
  );
}
