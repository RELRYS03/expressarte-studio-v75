import { editSolid, solidPositions } from "@/lib/studio/solid-mesh-client";
import { createStarterGeometry, type StarterPreset } from "@/lib/studio/starter-presets";
import { geometryFromSvg } from "@/lib/studio/svg-geometry";
import { placeRaisedLogo } from "@/lib/studio/logo-placement";
import { createLedChannelPart } from "@/lib/studio/led-channel";
import type { SolidOperation } from "@/lib/studio/solid-mesh";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { BufferGeometry } from "three";
import { Link, ClientOnly } from "@tanstack/react-router";
import {
  Box,
  Shapes,
  FolderOpen,
  Calculator,
  Users,
  Stethoscope,
  Plus,
  Download,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Maximize,
  Move,
  Minus,
  Check,
  ChevronRight,
  Layers,
  Type,
  Palette,
  Settings2,
  Monitor,
  FileBox,
  Upload,
  X,
  Save,
  Trash2,
  CircleHelp,
  Store,
  ImageUp,
  RotateCw,
  FlipHorizontal2,
  Scissors,
  Scaling,
  Combine,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  defaultConfig,
  shapes,
  materials,
  buildModel,
  disposeModel,
  downloadBlob,
  type ModelConfig,
} from "@/lib/studio/model";
import { ShapeIcon } from "./ShapeIcon";
import { useStudio } from "./StudioProvider";
import { coerceConfig } from "@/lib/studio/persistence";
import { defaultPricing, calculatePricing } from "@/lib/studio/pricing";
import {
  combineGeometries,
  cutGeometry,
  geometryDimensions,
  transformGeometry,
  resizeGeometry,
  type MeshAxis,
} from "@/lib/studio/mesh-editing";
import CatalogPage from "./CatalogPage";
import CommunityPage from "./CommunityPage";
const ModelScene = lazy(() => import("./ModelScene"));
export type StudioPage =
  "imagem" | "studio" | "formas" | "projetos" | "calculadora" | "mesh" | "comunidade" | "catalogo";
const nav = [
  { to: "/", label: "Imagem para 3D", icon: ImageUp, page: "imagem" },
  { to: "/studio", label: "Studio 3D", icon: Box, page: "studio" },
  { to: "/formas", label: "Formas", icon: Shapes, page: "formas" },
  { to: "/catalogo", label: "Catálogo", icon: Store, page: "catalogo" },
  { to: "/projetos", label: "Meus projetos", icon: FolderOpen, page: "projetos" },
  { to: "/calculadora", label: "Calculadora", icon: Calculator, page: "calculadora" },
  { to: "/mesh-doctor", label: "Mesh Doctor", icon: Stethoscope, page: "mesh" },
  { to: "/comunidade", label: "Comunidade", icon: Users, page: "comunidade" },
] as const;
const titles: Record<StudioPage, [string, string]> = {
  imagem: ["Imagem para 3D", "Converta imagens em relevo, silhueta ou litofania."],
  studio: ["Studio 3D", "Sua ideia ganha forma. Crie, personalize e prepare para imprimir."],
  formas: ["Biblioteca de formas", "Escolha o ponto de partida da sua próxima criação."],
  projetos: ["Meus projetos", "Criações guardadas neste navegador, com backup JSON."],
  catalogo: [
    "Catálogo Express’Arte",
    "Cadastre produtos personalizados e organize pedidos por WhatsApp.",
  ],
  calculadora: ["Calculadora de impressão", "Materiais, energia e tempo de produção."],
  mesh: ["Mesh Doctor", "Inspeção de arquivos STL para impressão 3D."],
  comunidade: ["Comunidade", "Seu mural local de ideias, projetos e publicações."],
};
function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-field">
      <label className="field-label">
        <span>{label}</span>
        <output>{value.toLocaleString("pt-BR")} mm</output>
      </label>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="range-limits">
        <span>{min} mm</span>
        <span>{max} mm</span>
      </div>
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <Button
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={onChange}
        className={`switch-control ${checked ? "enabled" : ""}`}
        variant="ghost"
      >
        <span className="switch-thumb" />
      </Button>
    </div>
  );
}

function encodeBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function MeshEditPanel({
  name,
  geometry,
  onCommit,
  onMerge,
  onBooleanUnion,
  onBlenderCut,
  onDiagnose,
  diagnostic,
  diagnoseBusy,
  onSolidCut,
  onSolidUnion,
  notify,
}: {
  name: string;
  geometry: BufferGeometry;
  onCommit: (next: BufferGeometry, message: string) => void;
  onSolidUnion: () => void;
  onSolidCut: (axis: MeshAxis, offset: number, keepPositive: boolean) => void;
  onMerge: () => void;
  onBooleanUnion: () => void;
  onBlenderCut: (axis: MeshAxis, offset: number, keepPositive: boolean) => void;
  onDiagnose: () => void;
  diagnostic: { vertices: number; edges: number; faces: number; boundary_edges: number; nonmanifold_edges: number; finite: boolean; } | null;
  diagnoseBusy: boolean;
  notify: (message: string) => void;
}) {
  const [dimensions, setDimensions] = useState({ x: "", y: "", z: "" });
  const [locked, setLocked] = useState(true);
  const [axis, setAxis] = useState<MeshAxis>("x");
  const [cutPosition, setCutPosition] = useState(0);
  const [keepPositive, setKeepPositive] = useState(true);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);
  const checkBridge = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:8766/v1/health", {
        signal: AbortSignal.timeout(2500),
      });
      const status = (await response.json()) as { available?: boolean };
      setBridgeAvailable(response.ok && status.available === true);
    } catch {
      setBridgeAvailable(false);
    }
  }, []);
  useEffect(() => {
    // Atualiza o estado da ponte quando ela inicia depois do Studio.
    void checkBridge();
    const refresh = () => { void checkBridge(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 10000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [checkBridge]);
  const current = geometryDimensions(geometry);
  const box = geometry.boundingBox;
  const min = box ? box.min[axis] : 0;
  const max = box ? box.max[axis] : 0;
  const triangles = Math.floor((geometry.getAttribute("position")?.count ?? 0) / 3);
  useEffect(() => {
    const next = geometryDimensions(geometry);
    setDimensions({ x: next.x.toFixed(1), y: next.y.toFixed(1), z: next.z.toFixed(1) });
    geometry.computeBoundingBox();
    if (geometry.boundingBox)
      setCutPosition((geometry.boundingBox.min[axis] + geometry.boundingBox.max[axis]) / 2);
  }, [geometry, axis]);
  const run = (make: () => BufferGeometry, message: string) => {
    try {
      onCommit(make(), message);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível editar a malha.");
    }
  };
  const changeDimension = (key: MeshAxis, value: string) => {
    setDimensions((old) => {
      const next = { ...old, [key]: value };
      const requested = Number(value);
      if (locked && Number.isFinite(requested) && current[key] > 0) {
        const ratio = requested / current[key];
        for (const other of ["x", "y", "z"] as const)
          if (other !== key) next[other] = (current[other] * ratio).toFixed(1);
      }
      return next;
    });
  };
  return (
    <div className="mesh-tools-panel">
      <p className="mesh-file-name" title={name}>
        {name}
      </p>
      <div className="mesh-stats-mini">
        <span>
          Faces<strong>{triangles.toLocaleString("pt-BR")}</strong>
        </span>
        <span>
          Tamanho
          <strong>
            {current.x.toFixed(1)} × {current.y.toFixed(1)} × {current.z.toFixed(1)} mm
          </strong>
        </span>
      </div>
      <section className="mesh-tool-section">
        <h3><Stethoscope size={15} /> Diagnóstico Mesh Workbench</h3>
        <p className="mesh-caution">Análise local avançada da topologia pelo Blender. Não modifica a peça.</p>
        <Button className="w-full" size="sm" variant="outline" disabled={!bridgeAvailable || diagnoseBusy} onClick={onDiagnose}>
          {diagnoseBusy ? "Analisando malha…" : "Diagnosticar malha com Mesh Workbench"}
        </Button>
        {diagnostic && <div className="mesh-stats-mini" role="status">
          <span>Vértices<strong>{diagnostic.vertices.toLocaleString("pt-BR")}</strong></span>
          <span>Arestas abertas<strong>{diagnostic.boundary_edges.toLocaleString("pt-BR")}</strong></span>
          <span>Arestas não manifold<strong>{diagnostic.nonmanifold_edges.toLocaleString("pt-BR")}</strong></span>
          <span>Faces<strong>{diagnostic.faces.toLocaleString("pt-BR")}</strong></span>
          <span>Geometria finita<strong>{diagnostic.finite ? "Sim" : "Não"}</strong></span>
        </div>}
      </section>
      <section className="mesh-tool-section">
        <h3>
          <Scaling size={15} /> Redimensionar
        </h3>
        <label className="mesh-lock">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />{" "}
          Manter proporção
        </label>
        <div className="mesh-dimensions">
          {(["x", "y", "z"] as const).map((key) => (
            <label key={key}>
              {key.toUpperCase()} mm
              <input
                className="text-input"
                type="number"
                min="0.1"
                max="2000"
                step="0.1"
                value={dimensions[key]}
                onChange={(e) => changeDimension(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={() =>
            run(
              () =>
                resizeGeometry(geometry, {
                  x: Number(dimensions.x),
                  y: Number(dimensions.y),
                  z: Number(dimensions.z),
                }),
              "Dimensões da malha atualizadas.",
            )
          }
        >
          Aplicar dimensões
        </Button>
        <Button
          className="w-full mesh-secondary-button"
          variant="outline"
          size="sm"
          onClick={() =>
            run(() => transformGeometry(geometry, "center"), "Peça centralizada na mesa (Z = 0).")
          }
        >
          Centralizar na mesa
        </Button>
      </section>
      <section className="mesh-tool-section">
        <h3>
          <RotateCw size={15} /> Rotacionar 90°
        </h3>
        <div className="mesh-tool-row">
          {(["x", "y", "z"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => transformGeometry(geometry, `rotate-${a}`),
                  `Rotacionado 90° no eixo ${a.toUpperCase()}.`,
                )
              }
            >
              Eixo {a.toUpperCase()}
            </Button>
          ))}
        </div>
        <h3 className="mesh-subheading">
          <FlipHorizontal2 size={15} /> Espelhar
        </h3>
        <div className="mesh-tool-row">
          {(["x", "y", "z"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => transformGeometry(geometry, `mirror-${a}`),
                  `Espelhado no eixo ${a.toUpperCase()}.`,
                )
              }
            >
              Eixo {a.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>
      <section className="mesh-tool-section">
        <h3>
          <Scissors size={15} /> Corte plano
        </h3>
        <div className={`mesh-bridge-status ${bridgeAvailable ? "is-online" : "is-offline"}`}>
          <span>
            {bridgeAvailable ? "Blender 5.2 conectado" : "Ponte local Blender desconectada"}
          </span>
          <Button size="sm" variant="ghost" onClick={() => void checkBridge()}>
            Verificar
          </Button>
        </div>
        {!bridgeAvailable && (
          <p className="mesh-caution">
            Execute INICIAR_BLENDER_BRIDGE_WINDOWS.bat para habilitar cortes fechados e união
            booleana.
          </p>
        )}
        <label className="mesh-field">
          Eixo
          <select
            className="text-input"
            value={axis}
            onChange={(e) => {
              const next = e.target.value as MeshAxis;
              setAxis(next);
              const b = geometry.boundingBox;
              if (b) setCutPosition((b.min[next] + b.max[next]) / 2);
            }}
          >
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="z">Z</option>
          </select>
        </label>
        <label className="mesh-field">
          Posição do corte: {cutPosition.toFixed(1)} mm
          <input
            aria-label="Posição do corte"
            type="range"
            min={min}
            max={max}
            step="0.1"
            value={Math.min(max, Math.max(min, cutPosition))}
            onChange={(e) => setCutPosition(Number(e.target.value))}
          />
        </label>
        <label className="mesh-field">
          Manter
          <select
            className="text-input"
            value={keepPositive ? "positivo" : "negativo"}
            onChange={(e) => setKeepPositive(e.target.value === "positivo")}
          >
            <option value="positivo">Lado positivo (+)</option>
            <option value="negativo">Lado negativo (−)</option>
          </select>
        </label>
        <Button
          className="w-full"
          size="sm"
          variant="outline"
          onClick={() =>
            run(
              () => cutGeometry(geometry, axis, cutPosition, keepPositive),
              "Corte aplicado. A face de corte fica aberta.",
            )
          }
        >
          <Scissors size={14} /> Aplicar corte
        </Button>
        <Button
          className="w-full"
          size="sm"
          disabled={!bridgeAvailable}
          onClick={() => onBlenderCut(axis, cutPosition, keepPositive)}
        >
          <Scissors size={14} /> Corte fechado com Blender
        </Button>
        <Button className="w-full" size="sm" onClick={() => onSolidCut(axis, cutPosition, keepPositive)}>
          Corte fechado no navegador
        </Button>
        <p className="mesh-caution">Operações locais com Manifold; exigem sólidos fechados. Não reparam furos.</p>
        <p className="mesh-caution">
          Aplicar corte remove a outra metade e deixa a borda aberta. Confira e repare no fatiador antes
          de imprimir.
        </p>
      </section>
      <section className="mesh-tool-section">
        <h3>
          <Combine size={15} /> Combinar malhas
        </h3>
        <Button className="w-full" variant="outline" size="sm" onClick={onMerge}>
          Adicionar outro STL como corpo
        </Button>
        <Button className="w-full" size="sm" onClick={onSolidUnion}>
          União sólida no navegador
        </Button>
        <Button className="w-full" size="sm" disabled={!bridgeAvailable} onClick={onBooleanUnion}>
          União booleana com Blender
        </Button>
        <p className="mesh-caution">
          Adicionar como corpo apenas agrupa. A união sólida funde sobreposições, usa a posição original do segundo STL e exige peças fechadas.
        </p>
      </section>
    </div>
  );
}

export default function StudioApp({ page = "studio" }: { page?: StudioPage }) {
  const { config, setConfig, projects, setProjects } = useStudio();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [view, setView] = useState("3d");
  const [zoom, setZoom] = useState(100);
  const [reset, setReset] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [dialog, setDialog] = useState<"export" | "blender" | "help" | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [solidBusy, setSolidBusy] = useState(false);
  const [meshWorkbenchBusy, setMeshWorkbenchBusy] = useState(false);
  const [meshWorkbenchDiagnostic, setMeshWorkbenchDiagnostic] = useState<{ vertices: number; edges: number; faces: number; boundary_edges: number; nonmanifold_edges: number; finite: boolean; } | null>(null);
  const solidLock = useRef(false);
  const [starterWidth, setStarterWidth] = useState(50);
  const [starterHeight, setStarterHeight] = useState(32);
  const [starterThickness, setStarterThickness] = useState(3);
  const [starterHole, setStarterHole] = useState(5);
  const [mesh, setMesh] = useState<{
    name: string;
    triangles: number;
    size: number;
    dimensions: string;
    closed: boolean;
  } | null>(null);
  const [cost, setCost] = useState(defaultPricing);
  const [imported, setImported] = useState<{ name: string; geometry: BufferGeometry } | null>(null);
  const [undoGeometry, setUndoGeometry] = useState<BufferGeometry | null>(null);
  const importStlRef = useRef<HTMLInputElement>(null);
  const mergeStlRef = useRef<HTMLInputElement>(null);
  const solidStlRef = useRef<HTMLInputElement>(null);
  const svgImportRef = useRef<HTMLInputElement>(null);
  const logoOverlayRef = useRef<HTMLInputElement>(null);
  const booleanStlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const update = <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));
  const notify = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };
  const filtered = shapes.filter(
    (s) =>
      (category === "Todas" || s.category === category) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const save = () => {
    if (imported) {
      notify(
        "O STL importado é temporário. Exporte a malha para guardá-la; projetos JSON salvam apenas as formas criadas no Studio.",
      );
      return;
    }
    setProjects((p) => [...p, { id: Date.now(), config: { ...config } }]);
    downloadBlob(
      new Blob(
        [JSON.stringify({ format: "ExpressArte Studio", version: "7.4", config }, null, 2)],
        { type: "application/json" },
      ),
      "ExpressArte-projeto.json",
    );
    notify("Projeto salvo e baixado no seu computador.");
  };
  const exportModel = async (format: "stl" | "glb" | "obj") => {
    setBusy(true);
    try {
      const model = imported ? new (await import("three")).Group() : buildModel(config);
      if (imported) {
        const THREE = await import("three");
        model.add(
          new THREE.Mesh(
            imported.geometry.clone(),
            new THREE.MeshStandardMaterial({ color: 0xb58453 }),
          ),
        );
      }
      try {
        if (format === "stl") {
          const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
          const data = new STLExporter().parse(model, { binary: true });
          downloadBlob(
            new Blob([new Uint8Array(data.buffer)], { type: "application/sla" }),
            imported
              ? `ExpressArte-${imported.name.replace(/\.stl$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "-")}.stl`
              : "ExpressArte-medalha.stl",
          );
        } else if (format === "obj") {
          const { OBJExporter } = await import("three/examples/jsm/exporters/OBJExporter.js");
          downloadBlob(
            new Blob([new OBJExporter().parse(model)], { type: "text/plain" }),
            `${imported ? "ExpressArte-importado" : "ExpressArte-modelo"}.obj`,
          );
        } else {
          const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
          const result = await new GLTFExporter().parseAsync(model, { binary: true });
          if (result instanceof ArrayBuffer)
            downloadBlob(
              new Blob([result], { type: "model/gltf-binary" }),
              "ExpressArte-medalha.glb",
            );
        }
        notify("Modelo exportado. Revise no fatiador antes de imprimir.");
        setDialog(null);
      } finally {
        disposeModel(model);
      }
    } catch {
      notify("Não foi possível exportar o modelo. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  const createLedPrototype = (part: "frame" | "lid") => {
    if (busy || solidLock.current) return;
    try {
      const geometry = createLedChannelPart(part, {
        width: starterWidth,
        height: starterHeight,
        depth: Math.max(5, starterThickness * 5),
        wall: 2,
      });
      setUndoGeometry(old => { old?.dispose(); return null; });
      setImported(old => {
        old?.geometry.dispose();
        return { name: `led-channel-${part}.stl`, geometry };
      });
      setView("3d"); setZoom(100); setReset(v => v + 1);
      notify("Protótipo de canal LED criado. Exporte peça e tampa separadamente; confira encaixes e fatiamento.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Dimensões de canal LED inválidas.");
    }
  };
  const createStarter = (preset: StarterPreset) => {
    if (busy || solidLock.current) return;
    let geometry: BufferGeometry;
    try {
      geometry = createStarterGeometry(preset, {
        width: starterWidth, height: starterHeight,
        thickness: starterThickness, holeDiameter: starterHole,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Parâmetros inválidos.");
      return;
    }
    setUndoGeometry((old) => { old?.dispose(); return null; });
    setImported((old) => {
      old?.geometry.dispose();
      return { name: preset + ".stl", geometry };
    });
    setView("3d");
    setZoom(100);
    setReset((v) => v + 1);
    notify("Modelo inicial criado. Personalize, corte ou exporte como STL.");
  };
  const applySvgLogo = async (file: File) => {
    if (!imported || busy || solidLock.current) return;
    if (!file.name.toLowerCase().endsWith(".svg") || file.size > 2_000_000) {
      notify("Escolha um SVG de até 2 MB."); return;
    }
    solidLock.current = true;
    setBusy(true); setSolidBusy(true);
    let logo: BufferGeometry | undefined;
    try {
      logo = geometryFromSvg(await file.text(), starterWidth, starterThickness);
      placeRaisedLogo(imported.geometry, logo);
      const union = await editSolid(solidPositions(imported.geometry), {
        kind: "union", second: solidPositions(logo),
      });
      commitMesh(union, "Logo aplicado com união sólida. Confira no Bambu Studio.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível aplicar o logo.");
    } finally {
      logo?.dispose(); solidLock.current = false; setBusy(false); setSolidBusy(false);
    }
  };
  const importSvg = async (file: File) => {
    if (busy || solidLock.current) return;
    if (!file.name.toLowerCase().endsWith(".svg") || file.size > 2_000_000) {
      notify("Escolha um SVG de até 2 MB."); return;
    }
    setBusy(true);
    try {
      const geometry = geometryFromSvg(await file.text(), starterWidth, starterThickness);
      setUndoGeometry(old => { old?.dispose(); return null; });
      setImported(old => {
        old?.geometry.dispose();
        return { name: file.name.replace(/\.svg$/i, "") + ".stl", geometry };
      });
      setView("3d"); setZoom(100); setReset(v => v + 1);
      notify("Logo SVG extrudado em 3D. Confira furos, contorno e fatiamento.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao converter SVG.");
    } finally { setBusy(false); }
  };
  const importStl = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".stl") || file.size > 20 * 1024 * 1024) {
      notify("Selecione um STL de até 20 MB.");
      return;
    }
    try {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (
        !box ||
        geometry.getAttribute("position").count === 0 ||
        ![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)
      ) {
        geometry.dispose();
        throw new Error("Arquivo sem geometria válida");
      }
      setUndoGeometry((old) => {
        old?.dispose();
        return null;
      });
      setImported((old) => {
        old?.geometry.dispose();
        return { name: file.name, geometry };
      });
      setView("3d");
      setZoom(100);
      setReset((r) => r + 1);
      notify("STL carregado. Agora você pode transformar, cortar e montar malhas.");
    } catch {
      notify("Não foi possível abrir este STL. Confira o arquivo.");
    }
  };
  const commitMesh = (geometry: BufferGeometry, message: string) => {
    if (!imported) {
      geometry.dispose();
      return;
    }
    setUndoGeometry((old) => {
      old?.dispose();
      return imported.geometry.clone();
    });
    const previous = imported.geometry;
    setImported({ ...imported, geometry });
    previous.dispose();
    notify(message);
  };
  const addMeshPart = async (file: File) => {
    if (!imported || !file.name.toLowerCase().endsWith(".stl") || file.size > 20 * 1024 * 1024) {
      notify("Escolha uma segunda malha STL de até 20 MB.");
      return;
    }
    try {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const part = new STLLoader().parse(await file.arrayBuffer());
      const combined = combineGeometries(imported.geometry, part);
      part.dispose();
      commitMesh(combined, "Corpos combinados como uma montagem. A união não é booleana.");
    } catch {
      notify("Não foi possível combinar esse STL. Confira se a malha é válida.");
    }
  };
  const runSolidEdit = async (operation: SolidOperation | { kind: "union-file"; file: File }) => {
    if (!imported || busy || solidLock.current) return;
    solidLock.current = true;
    setSolidBusy(true);
    setBusy(true);
    let part: BufferGeometry | undefined;
    try {
      let request: SolidOperation;
      if (operation.kind === "union-file") {
        if (!operation.file.name.toLowerCase().endsWith(".stl") || operation.file.size > 20 * 1024 * 1024)
          throw new Error("Escolha um STL de até 20 MB.");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        part = new STLLoader().parse(await operation.file.arrayBuffer());
        request = { kind: "union", second: solidPositions(part) };
      } else request = operation;
      const result = await editSolid(solidPositions(imported.geometry), request);
      commitMesh(result, request.kind === "cut" ? "Corte fechado aplicado. Confira antes de imprimir." : "União sólida aplicada. Confira antes de imprimir.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível processar a malha.");
    } finally { part?.dispose(); solidLock.current = false; setSolidBusy(false); setBusy(false); }
  };
  const undoMesh = () => {
    if (!imported || !undoGeometry) return;
    const restored = undoGeometry.clone();
    undoGeometry.dispose();
    setUndoGeometry(null);
    const previous = imported.geometry;
    setImported({ ...imported, geometry: restored });
    previous.dispose();
    notify("Última edição desfeita.");
  };
  const runBlenderEdit = async (
    operation: "cut" | "union",
    params: { file?: File; axis?: MeshAxis; offset?: number; keepPositive?: boolean } = {},
  ) => {
    if (!imported || busy) return;
    if (
      params.file &&
      (params.file.size > 20 * 1024 * 1024 || !params.file.name.toLowerCase().endsWith(".stl"))
    ) {
      notify("Selecione um segundo STL válido de até 20 MB.");
      return;
    }
    let model: import("three").Group | null = null;
    setBusy(true);
    try {
      const THREE = await import("three");
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      const exporter = new STLExporter();
      model = new THREE.Group();
      model.add(new THREE.Mesh(imported.geometry.clone(), new THREE.MeshStandardMaterial()));
      const binary = exporter.parse(model, { binary: true });
      const payload: Record<string, string | boolean> = {
        operation,
        modelBase64: encodeBase64(
          new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength),
        ),
        axis: params.axis ?? "x",
        offset: String(params.offset ?? 0),
        keepPositive: params.keepPositive ?? true,
      };
      if (params.file)
        payload["otherStlBase64"] = encodeBase64(new Uint8Array(await params.file.arrayBuffer()));
      const response = await fetch("http://127.0.0.1:8766/v1/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { stlBase64?: string; error?: string };
      if (!response.ok || !result.stlBase64)
        throw new Error(result.error || "O Blender não respondeu com um STL válido.");
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const edited = new STLLoader().parse(decodeBase64(result.stlBase64));
      edited.computeBoundingBox();
      if (!edited.boundingBox || edited.getAttribute("position").count === 0) {
        edited.dispose();
        throw new Error("O Blender retornou uma malha vazia.");
      }
      commitMesh(
        edited,
        operation === "cut"
          ? "Corte concluído pelo Blender com face fechada."
          : "Volumes unidos pelo Blender.",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao conectar com o Blender local.");
    } finally {
      if (model) disposeModel(model);
      setBusy(false);
    }
  };
  const runMeshWorkbenchInspect = async () => {
    if (!imported || busy || meshWorkbenchBusy) return;
    setMeshWorkbenchBusy(true);
    try {
      const THREE = await import("three");
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      const group = new THREE.Group();
      group.add(new THREE.Mesh(imported.geometry.clone(), new THREE.MeshStandardMaterial()));
      const binary = new STLExporter().parse(group, { binary: true });
      disposeModel(group);
      const response = await fetch("http://127.0.0.1:8767/v1/inspect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(190000),
        body: JSON.stringify({ stlBase64: encodeBase64(new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength)) }),
      });
      const result = await response.json() as { error?: string; detail?: string; inspection?: { vertices: number; edges: number; faces: number; boundary_edges: number; nonmanifold_edges: number; finite: boolean; } };
      if (!response.ok || !result.inspection) throw new Error(result.error || result.detail || "Falha no diagnóstico Mesh Workbench.");
      setMeshWorkbenchDiagnostic(result.inspection);
      notify("Diagnóstico Mesh Workbench concluído. A malha original não foi alterada.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível executar o diagnóstico Mesh Workbench.");
    } finally { setMeshWorkbenchBusy(false); }
  };
  const inspectFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      notify("O limite é de 20 MB por arquivo.");
      return;
    }
    try {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      geometry.computeBoundingBox();
      const position = geometry.getAttribute("position"),
        box = geometry.boundingBox;
      if (!box || position.count === 0) throw new Error("empty");
      const edges = new Map<string, number>();
      for (let i = 0; i < position.count; i += 3) {
        const vertices = [0, 1, 2].map((j) =>
          [position.getX(i + j), position.getY(i + j), position.getZ(i + j)]
            .map((n) => n.toFixed(4))
            .join(","),
        );
        for (let j = 0; j < 3; j++) {
          const key = [vertices[j], vertices[(j + 1) % 3]].sort().join("|");
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      setMesh({
        name: file.name,
        triangles: position.count / 3,
        size: file.size,
        dimensions: `${(box.max.x - box.min.x).toFixed(1)} × ${(box.max.y - box.min.y).toFixed(1)} × ${(box.max.z - box.min.z).toFixed(1)} mm`,
        closed: [...edges.values()].every((n) => n === 2),
      });
      geometry.dispose();
    } catch {
      notify("Arquivo STL inválido ou vazio.");
    }
  };
  const library = (
    <>
      <div className="library-controls">
        <div className="search-field">
          <Search />
          <input
            placeholder="Buscar forma..."
            aria-label="Buscar forma"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="category-tabs">
          {["Todas", "Básicas", "Especiais"].map((c) => (
            <Button
              key={c}
              variant="ghost"
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
      <div className={page === "formas" ? "full-library" : "shape-grid"}>
        {filtered.map((s) => (
          <Button
            key={s.kind}
            variant="ghost"
            className={`shape-card ${config.shape === s.kind ? "selected" : ""}`}
            onClick={() => {
              setImported((old) => {
                old?.geometry.dispose();
                return null;
              });
              setUndoGeometry((old) => {
                old?.dispose();
                return null;
              });
              update("shape", s.kind);
              if (page === "formas")
                notify(`${s.name} selecionado. Abra o Studio 3D para personalizar.`);
            }}
          >
            <ShapeIcon kind={s.kind} />
            <span>{s.name}</span>
          </Button>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-xs">Nenhuma forma encontrada.</p>
        )}
      </div>
    </>
  );
  const pricing = calculatePricing(cost);
  return (
    <>
    <div inert={solidBusy} style={{ display: "contents" }}>
      <header className="app-header">
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
          {nav.map((n) => (
            <Link key={n.page} to={n.to} className={`nav-link ${page === n.page ? "active" : ""}`}>
              <n.icon />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-end">
          <span className="version">STUDIO v7.5</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ajuda"
            title="Ajuda"
            onClick={() => setDialog("help")}
          >
            <CircleHelp />
          </Button>
          <span className="avatar">EA</span>
        </div>
      </header>
      <main>
        <section className="page-intro">
          <div>
            <h1>{titles[page][0]}</h1>
            <p>{titles[page][1]}</p>
          </div>
          {page === "studio" && (
            <div className="intro-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setImported((old) => {
                    old?.geometry.dispose();
                    return null;
                  });
                  setUndoGeometry((old) => {
                    old?.dispose();
                    return null;
                  });
                  setConfig({ ...defaultConfig });
                  setZoom(100);
                  setReset((r) => r + 1);
                  notify("Novo projeto criado.");
                }}
              >
                <Plus />
                Novo projeto
              </Button>
              <input
                type="file"
                accept=".stl"
                className="hidden"
                ref={importStlRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importStl(file);
                  e.currentTarget.value = "";
                }}
              />
              <input
                type="file"
                accept=".stl"
                className="hidden"
                ref={mergeStlRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void addMeshPart(file);
                  e.currentTarget.value = "";
                }}
              />
              <input
                type="file"
                accept=".stl"
                className="hidden"
                ref={booleanStlRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void runBlenderEdit("union", { file });
                  e.currentTarget.value = "";
                }}
              />
              <input type="file" accept=".stl" className="hidden" ref={solidStlRef} onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (file) void runSolidEdit({ kind: "union-file", file });
              }} />
              <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}} aria-label="Dimensões para novos modelos">
                <label>Largura / diâmetro (mm) <input type="number" min="15" max="300" step="1" value={starterWidth} onChange={e=>setStarterWidth(Number(e.target.value))} style={{width:72}} /></label>
                <label>Altura (mm) <input type="number" min="15" max="300" step="1" value={starterHeight} onChange={e=>setStarterHeight(Number(e.target.value))} style={{width:72}} /></label>
                <label>Espessura (mm) <input type="number" min="0.8" max="30" step="0.5" value={starterThickness} onChange={e=>setStarterThickness(Number(e.target.value))} style={{width:72}} /></label>
                <label>Furo (mm) <input type="number" min="0" max="50" step="0.5" value={starterHole} onChange={e=>setStarterHole(Number(e.target.value))} style={{width:72}} /></label>
              </div>
              <Button variant="outline" disabled={busy} onClick={() => createStarter("round-keychain")}>
                Criar chaveiro redondo
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createStarter("rectangle-keychain")}>
                Criar chaveiro retangular
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createStarter("hex-keychain")}>
                Criar chaveiro hexagonal
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createStarter("round-tag")}>
                Criar medalha redonda
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createLedPrototype("frame")}>
                Criar canal LED (moldura oca)
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createLedPrototype("lid")}>
                Criar tampa LED separada
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => createStarter("nameplate")}>
                Criar placa 3D
              </Button>
              <input type="file" accept=".svg,image/svg+xml" ref={svgImportRef} className="hidden" onChange={e => {
                const file = e.target.files?.[0]; e.currentTarget.value = "";
                if (file) void importSvg(file);
              }} />
              <Button variant="outline" disabled={busy} onClick={() => svgImportRef.current?.click()}>
                <Upload /> Criar logo 3D de SVG
              </Button>
              <input type="file" accept=".svg,image/svg+xml" ref={logoOverlayRef} className="hidden" onChange={e => {
                const file = e.target.files?.[0]; e.currentTarget.value = "";
                if (file) void applySvgLogo(file);
              }} />
              <Button variant="outline" disabled={!imported || busy} onClick={() => logoOverlayRef.current?.click()}>
                <Layers /> Aplicar logo SVG sobre STL
              </Button>
              <Button variant="outline" onClick={() => importStlRef.current?.click()}>
                <Upload /> Abrir STL
              </Button>
              <Button
                variant="outline"
                onClick={save}
                title="Salvar projeto"
                aria-label="Salvar projeto"
              >
                <Save />
              </Button>
              <Button className="primary-action" onClick={() => setDialog("export")}>
                <Download />
                Exportar
              </Button>
            </div>
          )}
        </section>
        {page === "studio" && (
          <>
            <div className={`workspace editor-expanded ${imported ? "mesh-workspace" : ""}`} ref={workspaceRef}>
              <aside className="library-panel">
                <div className="panel-heading">
                  <span>Biblioteca de formas</span>
                  <span className="count">{shapes.length} formas</span>
                </div>
                {library}
                <div className="library-footer">
                  <Layers size={12} />
                  Feitas para dar vida às suas ideias
                </div>
              </aside>
              <section className="viewport" aria-label="Área de modelagem">
                <ClientOnly fallback={<div className="empty-view">Carregando modelo…</div>}>
                  <Suspense fallback={<div className="empty-view">Carregando modelo…</div>}>
                    <ModelScene
                      config={config}
                      importedGeometry={imported?.geometry ?? null}
                      view={view}
                      zoom={zoom}
                      reset={reset}
                      wireframe={wireframe}
                    />
                  </Suspense>
                </ClientOnly>
                <div className="viewport-top">
                  <div className="view-tabs">
                    <Button
                      variant="ghost"
                      className={view === "3d" ? "selected" : ""}
                      onClick={() => setView("3d")}
                    >
                      <Box size={12} />
                      3D
                    </Button>
                    <Button
                      variant="ghost"
                      className={view === "2d" ? "selected" : ""}
                      onClick={() => setView("2d")}
                    >
                      Vista superior
                    </Button>
                  </div>
                  <div className="viewport-tools">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Exibir malha"
                      aria-label="Exibir malha"
                      onClick={() => setWireframe((v) => !v)}
                    >
                      <Move />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Redefinir vista"
                      aria-label="Redefinir vista"
                      onClick={() => {
                        setReset((r) => r + 1);
                        setZoom(100);
                        setView("3d");
                      }}
                    >
                      <RotateCcw />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Tela cheia"
                      aria-label="Tela cheia"
                      onClick={() => {
                        if (document.fullscreenElement) document.exitFullscreen();
                        else
                          workspaceRef.current
                            ?.requestFullscreen()
                            .catch(() => notify("Tela cheia não disponível neste navegador."));
                      }}
                    >
                      <Maximize />
                    </Button>
                  </div>
                </div>
                <div className="editor-quicktools" role="toolbar" aria-label="Ferramentas rápidas de edição 3D">
                  <Button size="sm" variant="outline" title="Importar STL" onClick={() => importStlRef.current?.click()}>
                    <Upload size={15} /> <span>Importar</span>
                  </Button>
                  {imported && (
                    <Button size="sm" variant="outline" title="Desfazer edição" disabled={!undoGeometry || busy} onClick={undoMesh}>
                      <Undo2 size={15} /> <span>Desfazer</span>
                    </Button>
                  )}
                  <Button size="sm" variant={wireframe ? "default" : "outline"} title="Alternar visualização de malha" aria-pressed={wireframe} onClick={() => setWireframe((v) => !v)}>
                    <Layers size={15} /> <span>Malha</span>
                  </Button>
                  <Button size="sm" variant="outline" title="Vista 3D" onClick={() => setView("3d")}>
                    <Box size={15} /> <span>3D</span>
                  </Button>
                  <Button size="sm" variant="outline" title="Vista superior" onClick={() => setView("2d")}>
                    <Monitor size={15} /> <span>Topo</span>
                  </Button>
                  <Button size="sm" variant="outline" title="Enquadrar objeto" onClick={() => { setReset((v) => v + 1); setZoom(100); }}>
                    <RotateCcw size={15} /> <span>Enquadrar</span>
                  </Button>
                  <Button size="sm" variant="outline" title="Exportar modelo" onClick={() => setDialog("export")}>
                    <Download size={15} /> <span>Exportar</span>
                  </Button>
                </div>
                <div className="model-badge">
                  <span className="status-dot" />
                  {imported
                    ? `STL: ${imported.name}`
                    : `${shapes.find((s) => s.kind === config.shape)?.name} · ${config.diameter} × ${config.thickness} mm`}
                </div>
                <div className="orientation">
                  <span className="axis-z">Z</span>
                  <span className="axis-x">X</span>
                  <span className="axis-y">Y</span>
                </div>
                <div className="viewport-bottom">
                  <span>
                    <Monitor />
                    Visualização em tempo real
                  </span>
                  <div className="zoom-tools">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Diminuir zoom"
                      onClick={() => setZoom((z) => Math.max(50, z - 10))}
                    >
                      <Minus />
                    </Button>
                    <span>{zoom}%</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Aumentar zoom"
                      onClick={() => setZoom((z) => Math.min(180, z + 10))}
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
              </section>
              <aside className="properties-panel">
                <div className="panel-heading">
                  <span>{imported ? "Editar malha STL" : "Personalizar modelo"}</span>
                  {imported ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Desfazer última edição"
                      title="Desfazer última edição"
                      disabled={!undoGeometry}
                      onClick={undoMesh}
                    >
                      <Undo2 size={16} />
                    </Button>
                  ) : (
                    <SlidersHorizontal size={15} />
                  )}
                </div>
                {imported ? (
                  <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                  <MeshEditPanel
                    name={imported.name}
                    geometry={imported.geometry}
                    onCommit={commitMesh}
                    onSolidUnion={() => solidStlRef.current?.click()}
                    onSolidCut={(axis, offset, keepPositive) => void runSolidEdit({ kind: "cut", axis, offset, keepPositive })}
                    onMerge={() => mergeStlRef.current?.click()}
                    onBooleanUnion={() => booleanStlRef.current?.click()}
                    onBlenderCut={(axis, offset, keepPositive) =>
                      void runBlenderEdit("cut", { axis, offset, keepPositive })
                    }
                    onDiagnose={() => void runMeshWorkbenchInspect()}
                    diagnostic={meshWorkbenchDiagnostic}
                    diagnoseBusy={meshWorkbenchBusy}
                    notify={notify}
                  />
                  </fieldset>
                ) : (
                  <>
                    <div className="property-section">
                      <div className="section-label">
                        <Type />
                        Texto em relevo
                      </div>
                      <label className="field-label" htmlFor="model-text">
                        Texto da medalha
                      </label>
                      <input
                        id="model-text"
                        className="text-input"
                        maxLength={22}
                        value={config.name}
                        onChange={(e) => update("name", e.target.value)}
                      />
                      <div className="field-note">
                        <span>Até 22 caracteres</span>
                        <span>{config.name.length}/22</span>
                      </div>
                    </div>
                    <div className="property-section">
                      <div className="section-label">
                        <Settings2 />
                        Dimensões
                      </div>
                      <RangeField
                        label="Diâmetro"
                        value={config.diameter}
                        min={35}
                        max={180}
                        onChange={(v) => update("diameter", v)}
                      />
                      <RangeField
                        label="Espessura da base"
                        value={config.thickness}
                        min={2}
                        max={12}
                        step={0.5}
                        onChange={(v) =>
                          setConfig((c) => ({
                            ...c,
                            thickness: v,
                            textHeight: Math.min(c.textHeight, v * 1.5),
                          }))
                        }
                      />
                      <RangeField
                        label="Altura do relevo"
                        value={config.textHeight}
                        min={0.4}
                        max={Math.min(5, config.thickness * 1.5)}
                        step={0.1}
                        onChange={(v) => update("textHeight", v)}
                      />
                    </div>
                    <div className="property-section">
                      <div className="section-label">
                        <Palette />
                        Material e cor
                      </div>
                      <div className="swatches">
                        {materials.map((m) => (
                          <Button
                            key={m.id}
                            variant="ghost"
                            aria-label={m.name}
                            title={m.name}
                            className={`swatch swatch-${m.id} ${config.material === m.id ? "selected" : ""}`}
                            onClick={() => update("material", m.id)}
                          />
                        ))}
                      </div>
                      <p className="material-name">
                        {materials.find((m) => m.id === config.material)?.name}
                      </p>
                    </div>
                    <div className="property-section">
                      <div className="section-label">
                        <Layers />
                        Acabamento
                      </div>
                      <Toggle
                        label="Argola de fixação"
                        checked={config.ring}
                        onChange={() => update("ring", !config.ring)}
                      />
                      <Toggle
                        label="Borda decorativa"
                        checked={config.border}
                        onChange={() => update("border", !config.border)}
                      />
                    </div>
                    <div className="ready">
                      <Check />
                      {imported
                        ? "Malha STL carregada — confira no fatiador"
                        : "Modelo gerado — confira no fatiador"}
                    </div>
                  </>
                )}
              </aside>
            </div>
            <div className="quick-strip">
              <div className="quick-item">
                <div className="quick-icon">
                  <Box />
                </div>
                <div>
                  <strong>Studio Blender</strong>
                  <p>Continue sua criação no Blender.</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Abrir opções Blender"
                  onClick={() => setDialog("blender")}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="quick-item">
                <div className="quick-icon">
                  <Stethoscope />
                </div>
                <div>
                  <strong>Mesh Doctor</strong>
                  <p>Uma malha saudável. Uma impressão melhor.</p>
                </div>
                <Button asChild size="icon" variant="ghost">
                  <Link to="/mesh-doctor" aria-label="Abrir Mesh Doctor">
                    <ChevronRight />
                  </Link>
                </Button>
              </div>
              <div className="quick-item">
                <div className="quick-icon">
                  <FolderOpen />
                </div>
                <div>
                  <strong>Seu próximo projeto começa aqui</strong>
                  <p>Salve sua criação e leve suas ideias com você.</p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Salvar criação" onClick={save}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
        {page === "formas" && (
          <section className="content-view">
            {library}
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link to="/">
                  Abrir Studio 3D
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </section>
        )}
        {page === "projetos" && (
          <section className="content-view">
            <div className="content-toolbar">
              <input
                type="file"
                accept=".json"
                className="hidden"
                ref={fileRef}
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 1024 * 1024) throw new Error("Arquivo muito grande");
                    const data: unknown = JSON.parse(await file.text());
                    const importedConfig = coerceConfig(data);
                    if (!importedConfig) throw new Error("Projeto inválido");
                    setProjects((p) => [...p, { id: Date.now(), config: importedConfig }]);
                    notify("Projeto importado e guardado localmente.");
                  } catch {
                    notify("Este arquivo não contém um projeto ExpressArte válido.");
                  } finally {
                    input.value = "";
                  }
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload />
                Importar projeto
              </Button>
              <Button asChild>
                <Link to="/">
                  <Plus />
                  Novo projeto
                </Link>
              </Button>
            </div>
            {projects.length === 0 ? (
              <div className="empty-view">
                <FolderOpen />
                <h2>Uma nova coleção de ideias</h2>
                <p>
                  Salve uma criação no Studio ou importe um projeto JSON. Eles permanecerão neste
                  navegador enquanto os dados locais forem mantidos.
                </p>
              </div>
            ) : (
              projects.map((p) => (
                <div className="project-row" key={p.id}>
                  <div>
                    <h3>{p.config.name}</h3>
                    <p>
                      {p.config.diameter} mm · {shapes.find((s) => s.kind === p.config.shape)?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      onClick={() => {
                        setImported((old) => {
                          old?.geometry.dispose();
                          return null;
                        });
                        setUndoGeometry((old) => {
                          old?.dispose();
                          return null;
                        });
                        setConfig({ ...p.config });
                      }}
                    >
                      <Link to="/studio">Abrir</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir projeto"
                      onClick={() => setProjects((all) => all.filter((item) => item.id !== p.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}
        {page === "catalogo" && <CatalogPage />}
        {page === "calculadora" && (
          <section className="content-view tool-layout">
            <div className="tool-form">
              {(
                [
                  { key: "weight", label: "Peso do modelo (g)", step: 1 },
                  { key: "price", label: "Preço do filamento (R$/kg)", step: 1 },
                  { key: "hours", label: "Tempo de impressão (horas)", step: 0.5 },
                  { key: "power", label: "Potência da impressora (W)", step: 1 },
                  { key: "kwh", label: "Tarifa de energia (R$/kWh)", step: 0.01 },
                  { key: "labor", label: "Mão de obra (R$)", step: 0.5 },
                  { key: "supplies", label: "Embalagem e insumos (R$)", step: 0.5 },
                  { key: "maintenance", label: "Reserva para manutenção (R$)", step: 0.5 },
                  { key: "fee", label: "Taxas sobre a venda (%)", step: 0.5 },
                  { key: "margin", label: "Margem de lucro desejada (%)", step: 1 },
                ] as const
              ).map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input
                    className="text-input"
                    type="number"
                    min={0}
                    step={f.step}
                    value={cost[f.key]}
                    onChange={(e) =>
                      setCost((c) => ({ ...c, [f.key]: Math.max(0, Number(e.target.value)) }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="cost-result">
              <span>CUSTO ESTIMADO</span>
              <strong>
                {pricing.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>
              <p>
                Material:{" "}
                {pricing.material.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <p>
                Energia:{" "}
                {pricing.energy.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <hr className="my-6 border-border" />
              <p>
                Mão de obra, insumos e manutenção:{" "}
                {(cost.labor + cost.supplies + cost.maintenance).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
              <span>PREÇO SUGERIDO DE VENDA</span>
              <strong>
                {pricing.salePrice === null
                  ? "Margem + taxas inválidas"
                  : pricing.salePrice.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
              </strong>
              <p>
                A margem de lucro é calculada sobre o preço de venda, não sobre o custo. Taxas são
                percentuais do preço de venda. Informe a tributação aplicável em taxas.
              </p>
              {!pricing.valid && (
                <p role="alert">A soma de taxas e margem deve ser menor que 100%.</p>
              )}
            </div>
          </section>
        )}
        {page === "mesh" && (
          <section className="content-view">
            <div className="upload-zone">
              <Stethoscope />
              <h2>Inspecionar uma malha</h2>
              <p>Arquivo STL · até 20 MB</p>
              <input
                type="file"
                accept=".stl"
                className="hidden"
                ref={fileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) inspectFile(file);
                }}
              />
              <Button onClick={() => fileRef.current?.click()}>
                <Upload />
                Selecionar arquivo STL
              </Button>
            </div>
            {mesh && (
              <>
                <div className="project-row">
                  <h3>{mesh.name}</h3>
                  <span className="text-muted-foreground">{(mesh.size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="mesh-stats">
                  <div>
                    Triângulos<strong>{mesh.triangles.toLocaleString("pt-BR")}</strong>
                  </div>
                  <div>
                    Dimensões<strong className="text-base">{mesh.dimensions}</strong>
                  </div>
                  <div>
                    Conectividade das arestas
                    <strong className="text-base">
                      {mesh.closed ? "Malha fechada" : "Arestas abertas ou sobrepostas"}
                    </strong>
                  </div>
                </div>
                <p className="text-muted-foreground mt-5">
                  Inspeção geométrica básica; não verifica interseções ou orientação das faces.
                  Revise no fatiador antes de imprimir.
                </p>
              </>
            )}
          </section>
        )}
        {page === "comunidade" && <CommunityPage />}
      </main>
      <footer className="app-footer">
        <span>
          © 2026 Express'Arte Studio<span>·</span>Feito para transformar ideias em realidade.
        </span>
        <span>
          <span className="status-dot" />
          Studio no navegador<span>·</span>mm
        </span>
      </footer>
      {dialog && (
        <div className="dialog-backdrop" onClick={() => !busy && setDialog(null)}>
          <section
            className="dialog-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <h2 id="dialog-title">
                {dialog === "export"
                  ? "Exportar criação"
                  : dialog === "blender"
                    ? "Continuar no Blender"
                    : "Sobre o ExpressArte"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                <X />
              </Button>
            </div>
            {dialog === "export" ? (
              <>
                <p>
                  Escolha um formato de exportação. A exportação não une automaticamente corpos
                  sobrepostos; revise no fatiador antes de imprimir.
                </p>
                <div className="dialog-actions">
                  <Button variant="outline" disabled={busy} onClick={() => exportModel("obj")}>
                    <FileBox /> Modelo OBJ
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => exportModel("glb")}>
                    <FileBox />
                    {busy ? "Exportando…" : "Modelo GLB"}
                  </Button>
                  <Button disabled={busy} onClick={() => exportModel("stl")}>
                    <Download />
                    {busy ? "Exportando…" : "Impressão STL"}
                  </Button>
                </div>
              </>
            ) : dialog === "blender" ? (
              <>
                <p>
                  Baixe o modelo GLB e importe no Blender instalado no seu computador. A conexão
                  automática dos scripts Windows não está disponível neste site.
                </p>
                <div className="dialog-actions">
                  <Button disabled={busy} onClick={() => exportModel("glb")}>
                    <Download />
                    Baixar GLB
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Versão local v7.5. Projetos e catálogo são armazenados neste navegador, e podem
                  ser perdidos ao limpar os dados. Exporte arquivos e faça backups. STL importados
                  são visualizados e exportados, mas não salvos como projetos editáveis.
                </p>
                <p>
                  A comunidade compartilhada, autenticação, pedidos automáticos, IA RK10, reparo
                  avançado de malhas e integração com marketplaces exigem infraestrutura adicional.
                </p>
                <div className="dialog-actions">
                  <Button onClick={() => setDialog(null)}>
                    Continuar criando
                    <ChevronRight />
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {notice && (
        <div className="notification" role="status">
          {notice}
        </div>
      )}
    </div>
    {solidBusy && <div className="dialog-backdrop" role="status" style={{ zIndex: 9999 }}><div className="dialog-card">Processando sólido… prazo máximo de 60 segundos.</div></div>}
    </>
  );
}
