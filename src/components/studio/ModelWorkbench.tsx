import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Link } from "@tanstack/react-router";
import {
  Box, Circle, Cylinder, Cone, Torus, Move, RotateCw, Scaling, MousePointer2,
  Layers3, Grid3X3, Download, Upload, Undo2, Redo2, Trash2, Copy, Eye, EyeOff,
  Plus, Save, X, ChevronDown, Wrench, Settings2, HelpCircle, Maximize2,
  FolderOpen, Palette, Ruler, Scissors, Combine, Split, Mirror, Lock,
  CheckCircle2, TriangleAlert, RotateCcw, PanelRight, Sparkles,
} from "lucide-react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { createPrimitive, type PrimitiveKind } from "@/lib/studio/workbench-primitives";
import "./model-workbench.css";

type Tool = "select" | "translate" | "rotate" | "scale";
type Inspector = {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: [number, number, number];
  color: string;
};
type SceneRow = { id: string; name: string; type: string; visible: boolean };
type SceneApi = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbit: OrbitControls;
  transform: TransformControls;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  objects: THREE.Mesh[];
  selected: THREE.Mesh | null;
};
type HistoryState = { entries: string[]; index: number };

const primitiveButtons: { kind: PrimitiveKind; label: string; icon: typeof Box }[] = [
  { kind: "cube", label: "Cubo", icon: Box },
  { kind: "cylinder", label: "Cilindro", icon: Cylinder },
  { kind: "sphere", label: "Esfera", icon: Circle },
  { kind: "cone", label: "Cone", icon: Cone },
  { kind: "torus", label: "Toro", icon: Torus },
  { kind: "plane", label: "Plano", icon: Grid3X3 },
];

function materialColor(mesh: THREE.Mesh) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return material instanceof THREE.MeshStandardMaterial ? `#${material.color.getHexString()}` : "#b47b43";
}

function inspectorFrom(mesh: THREE.Mesh): Inspector {
  mesh.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(mesh);
  const size = bounds.getSize(new THREE.Vector3());
  return {
    name: mesh.name,
    position: [mesh.position.x, mesh.position.y, mesh.position.z],
    rotation: [THREE.MathUtils.radToDeg(mesh.rotation.x), THREE.MathUtils.radToDeg(mesh.rotation.y), THREE.MathUtils.radToDeg(mesh.rotation.z)],
    scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
    dimensions: [size.x, size.y, size.z],
    color: materialColor(mesh),
  };
}

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => material.dispose());
}

export default function ModelWorkbench() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneApi | null>(null);
  const historyRef = useRef<HistoryState>({ entries: [], index: -1 });
  const recordHistoryRef = useRef<() => void>(() => undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SceneRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspector, setInspector] = useState<Inspector | null>(null);
  const [tool, setTool] = useState<Tool>("translate");
  const toolRef = useRef<Tool>("translate");
  toolRef.current = tool;
  const [notice, setNotice] = useState("");
  const [historyPosition, setHistoryPosition] = useState({ index: -1, length: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [busy, setBusy] = useState(false);

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }, []);

  const refreshRows = useCallback((api: SceneApi) => {
    setRows(api.objects.map((mesh) => ({
      id: mesh.uuid,
      name: mesh.name,
      type: String(mesh.userData.primitive ?? "malha"),
      visible: mesh.visible,
    })));
  }, []);

  const syncInspector = useCallback((mesh: THREE.Mesh | null) => {
    setInspector(mesh ? inspectorFrom(mesh) : null);
  }, []);

  const selectMesh = useCallback((mesh: THREE.Mesh | null) => {
    const api = sceneRef.current;
    if (!api) return;
    api.selected = mesh;
    if (mesh && tool !== "select") api.transform.attach(mesh);
    else api.transform.detach();
    setSelectedId(mesh?.uuid ?? null);
    syncInspector(mesh);
    refreshRows(api);
  }, [refreshRows, syncInspector, tool]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171a1f);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10000);
    camera.position.set(125, 105, 145);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf5eee4, 0x343941, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff1dd, 3.1);
    keyLight.position.set(-80, 150, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xd5e0ff, 1.25);
    fillLight.position.set(100, 45, -80);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(1000, 100, 0x444a53, 0x30353d);
    grid.position.y = 0;
    scene.add(grid);
    const axes = new THREE.AxesHelper(38);
    axes.position.set(-0.01, 0.02, -0.01);
    scene.add(axes);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.075;
    orbit.target.set(0, 10, 0);
    orbit.minDistance = 25;
    orbit.maxDistance = 2500;
    orbit.maxPolarAngle = Math.PI * 0.495;

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate");
    transform.setSpace("world");
    transform.setSize(0.9);
    scene.add(transform.getHelper());

    const api: SceneApi = {
      scene, camera, renderer, orbit, transform,
      raycaster: new THREE.Raycaster(),
      pointer: new THREE.Vector2(),
      objects: [],
      selected: null,
    };
    sceneRef.current = api;

    const snapshot = () => JSON.stringify({
      objects: api.objects.map((mesh) => mesh.toJSON()),
      selected: api.selected?.uuid ?? null,
    });
    const recordHistory = () => {
      const next = snapshot();
      const history = historyRef.current;
      if (history.entries[history.index] === next) return;
      history.entries = history.entries.slice(0, history.index + 1);
      history.entries.push(next);
      if (history.entries.length > 80) history.entries.shift();
      history.index = history.entries.length - 1;
      setHistoryPosition({ index: history.index, length: history.entries.length });
    };
    recordHistoryRef.current = recordHistory;

    const choose = (mesh: THREE.Mesh | null) => {
      api.selected = mesh;
      if (mesh && toolRef.current !== "select") transform.attach(mesh);
      else transform.detach();
      setSelectedId(mesh?.uuid ?? null);
      syncInspector(mesh);
      refreshRows(api);
    };

    const pointerDown = (event: PointerEvent) => {
      if (transform.dragging || event.button !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      api.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      api.raycaster.setFromCamera(api.pointer, camera);
      const hit = api.raycaster.intersectObjects(api.objects, false)[0];
      choose(hit?.object instanceof THREE.Mesh ? hit.object : null);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);

    transform.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });
    transform.addEventListener("objectChange", () => {
      if (api.selected) syncInspector(api.selected);
    });
    transform.addEventListener("mouseUp", recordHistory);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const first = createPrimitive("cube");
    api.objects.push(first);
    scene.add(first);
    choose(first);
    recordHistory();

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      orbit.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      transform.detach();
      transform.dispose();
      orbit.dispose();
      api.objects.forEach(disposeMesh);
      grid.geometry.dispose();
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      gridMaterials.forEach((material) => material.dispose());
      axes.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      recordHistoryRef.current = () => undefined;
    };
  // The scene is deliberately initialized once; UI state is synchronized through refs and events.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const api = sceneRef.current;
    if (!api) return;
    if (tool === "select") api.transform.detach();
    else {
      api.transform.setMode(tool);
      if (api.selected) api.transform.attach(api.selected);
    }
  }, [tool]);

  useEffect(() => {
    const api = sceneRef.current;
    if (!api) return;
    const grid = api.scene.children.find((child) => child instanceof THREE.GridHelper);
    if (grid) grid.visible = showGrid;
  }, [showGrid]);

  const addPrimitive = (kind: PrimitiveKind) => {
    const api = sceneRef.current;
    if (!api) return;
    const mesh = createPrimitive(kind);
    const sameKindCount = api.objects.filter((item) => item.userData.primitive === kind).length;
    if (sameKindCount > 0) mesh.name = `${mesh.name}.${String(sameKindCount + 1).padStart(3, "0")}`;
    mesh.position.x = api.objects.length * 7;
    api.objects.push(mesh);
    api.scene.add(mesh);
    selectMesh(mesh);
    recordHistoryRef.current();
    notify(`${mesh.name} adicionado à cena.`);
  };

  const duplicateSelected = () => {
    const api = sceneRef.current;
    const source = api?.selected;
    if (!api || !source) return;
    const clone = source.clone();
    clone.geometry = source.geometry.clone();
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    clone.material = materials.length === 1 ? materials[0]!.clone() : materials.map((item) => item.clone());
    clone.name = `${source.name} cópia`;
    clone.position.x += 25;
    api.objects.push(clone);
    api.scene.add(clone);
    selectMesh(clone);
    recordHistoryRef.current();
  };

  const deleteSelected = () => {
    const api = sceneRef.current;
    const selected = api?.selected;
    if (!api || !selected) return;
    api.transform.detach();
    api.scene.remove(selected);
    api.objects = api.objects.filter((mesh) => mesh !== selected);
    disposeMesh(selected);
    const next = api.objects.at(-1) ?? null;
    selectMesh(next);
    recordHistoryRef.current();
    notify("Objeto removido da cena.");
  };

  const toggleVisibility = (uuid: string) => {
    const api = sceneRef.current;
    const mesh = api?.objects.find((item) => item.uuid === uuid);
    if (!api || !mesh) return;
    mesh.visible = !mesh.visible;
    refreshRows(api);
    recordHistoryRef.current();
  };

  const changeTransform = (field: "position" | "rotation" | "scale", axis: 0 | 1 | 2, value: number) => {
    const api = sceneRef.current;
    const mesh = api?.selected;
    if (!api || !mesh || !Number.isFinite(value)) return;
    if (field === "rotation") mesh.rotation.set(
      axis === 0 ? THREE.MathUtils.degToRad(value) : mesh.rotation.x,
      axis === 1 ? THREE.MathUtils.degToRad(value) : mesh.rotation.y,
      axis === 2 ? THREE.MathUtils.degToRad(value) : mesh.rotation.z,
    );
    else mesh[field].setComponent(axis, field === "scale" ? Math.max(0.01, value) : value);
    mesh.updateMatrixWorld(true);
    syncInspector(mesh);
  };

  const renameSelected = (name: string) => {
    const api = sceneRef.current;
    if (!api?.selected) return;
    api.selected.name = name;
    refreshRows(api);
    setInspector((current) => current ? { ...current, name } : current);
  };

  const changeColor = (color: string) => {
    const api = sceneRef.current;
    const mesh = api?.selected;
    if (!mesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) material.color.set(color);
    });
    setInspector((current) => current ? { ...current, color } : current);
  };

  const restoreHistory = (direction: -1 | 1) => {
    const api = sceneRef.current;
    const history = historyRef.current;
    const nextIndex = history.index + direction;
    if (!api || nextIndex < 0 || nextIndex >= history.entries.length) return;
    const state = JSON.parse(history.entries[nextIndex]) as { objects: object[]; selected: string | null };
    api.transform.detach();
    api.objects.forEach((mesh) => {
      api.scene.remove(mesh);
      disposeMesh(mesh);
    });
    const loader = new THREE.ObjectLoader();
    api.objects = state.objects.map((data) => loader.parse(data as never) as THREE.Mesh);
    api.objects.forEach((mesh) => api.scene.add(mesh));
    const selected = api.objects.find((mesh) => mesh.uuid === state.selected) ?? api.objects.at(-1) ?? null;
    api.selected = selected;
    if (selected && tool !== "select") api.transform.attach(selected);
    setSelectedId(selected?.uuid ?? null);
    syncInspector(selected);
    refreshRows(api);
    history.index = nextIndex;
    setHistoryPosition({ index: history.index, length: history.entries.length });
  };

  const importStl = async (file: File) => {
    const api = sceneRef.current;
    if (!api) return;
    setBusy(true);
    try {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      if (!geometry.boundingBox || geometry.getAttribute("position").count === 0) {
        geometry.dispose();
        throw new Error("O STL não contém uma malha válida.");
      }
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb47b43, metalness: 0.15, roughness: 0.5 }));
      mesh.name = file.name.replace(/\.stl$/i, "");
      mesh.position.y = -geometry.boundingBox.min.y;
      api.objects.push(mesh);
      api.scene.add(mesh);
      selectMesh(mesh);
      recordHistoryRef.current();
      notify("STL importado. Selecione, transforme e confira a geometria.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível importar o STL.");
    } finally {
      setBusy(false);
    }
  };

  const exportStl = async () => {
    const api = sceneRef.current;
    if (!api || api.objects.length === 0) {
      notify("Adicione ou importe um objeto antes de exportar.");
      return;
    }
    setBusy(true);
    try {
      const { STLExporter } = await import("three/examples/jsm/exporters/STLExporter.js");
      const group = new THREE.Group();
      api.objects.filter((mesh) => mesh.visible).forEach((mesh) => group.add(mesh.clone()));
      group.updateMatrixWorld(true);
      const result = new STLExporter().parse(group, { binary: true });
      const blob = result instanceof DataView
        ? new Blob([new Uint8Array(result.buffer, result.byteOffset, result.byteLength)], { type: "model/stl" })
        : new Blob([result], { type: "model/stl" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ExpressArte-ModelWorkbench.stl";
      anchor.click();
      URL.revokeObjectURL(url);
      notify("STL exportado. Abra no Bambu Studio e confira o fatiamento.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Falha ao exportar STL.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const key = event.key.toLowerCase();
      if (event.ctrlKey && key === "z") {
        event.preventDefault();
        restoreHistory(event.shiftKey ? 1 : -1);
      } else if (event.ctrlKey && key === "y") {
        event.preventDefault();
        restoreHistory(1);
      } else if (event.shiftKey && key === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (key === "g") setTool("translate");
      else if (key === "r") setTool("rotate");
      else if (key === "s") setTool("scale");
      else if (event.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, restoreHistory]);

  const selectedRow = rows.find((row) => row.id === selectedId);
  const canUndo = historyPosition.index > 0;
  const canRedo = historyPosition.index >= 0 && historyPosition.index < historyPosition.length - 1;

  return (
    <div className="mw-shell">
      <header className="mw-header">
        <Link to="/studio" className="mw-brand">
          <span className="mw-brand-mark"><Box size={26} /></span>
          <span>Express'Arte<small>STUDIO v7.5</small></span>
        </Link>
        <nav className="mw-modules" aria-label="Módulos do Studio">
          <span className="mw-module active"><Box size={16} /> Modelagem</span>
          <button onClick={() => notify("O módulo Organizadores será conectado ao Workbench na próxima etapa.")}>Organizadores</button>
          <button onClick={() => notify("O módulo Chaveiros continuará disponível no fluxo de criação atual.")}>Chaveiros</button>
          <button onClick={() => notify("O módulo Relevo continuará disponível no fluxo Imagem para 3D.")}>Relevo</button>
          <Link to="/mesh-doctor">Reparo</Link>
          <button onClick={() => notify("O Color Studio será integrado como painel de materiais.")}>Color Studio</button>
          <Link to="/catalogo">Catálogo</Link>
        </nav>
        <div className="mw-header-actions">
          <button title="Abrir STL" onClick={() => fileRef.current?.click()}><FolderOpen size={17} /></button>
          <button title="Configurações" onClick={() => notify("Configurações do Workbench em preparação.")}><Settings2 size={17} /></button>
          <button title="Ajuda" onClick={() => notify("Atalhos: G mover · R girar · S escalar · Shift+D duplicar · Delete excluir.")}><HelpCircle size={17} /></button>
          <span className="mw-avatar">EA</span>
        </div>
      </header>

      <div className="mw-menubar">
        <button onClick={() => fileRef.current?.click()}>Arquivo</button>
        <button onClick={() => restoreHistory(-1)}>Editar</button>
        <button onClick={() => setTool("select")}>Selecionar</button>
        <button onClick={() => addPrimitive("cube")}>Adicionar</button>
        <button onClick={duplicateSelected}>Objeto</button>
        <button onClick={() => setTool("translate")}>Modificar</button>
        <button onClick={() => notify("Ferramentas de edição de malha entram na próxima etapa.")}>Malha</button>
        <button onClick={() => notify("Operações geométricas serão habilitadas sobre o núcleo de objetos.")}>Geometria</button>
        <button onClick={() => setShowGrid((value) => !value)}>Utilidades</button>
        <button onClick={() => notify("Atalhos: G mover · R girar · S escalar · Shift+D duplicar · Delete excluir.")}>Ajuda</button>
      </div>

      <div className="mw-toolbar">
        <button className="mw-mode" title="Modo Objeto"><Box size={16} /> Modo: Objeto <ChevronDown size={14} /></button>
        <span className="mw-toolbar-divider" />
        <button className={tool === "select" ? "active" : ""} onClick={() => setTool("select")} title="Selecionar"><MousePointer2 size={17} /></button>
        <button className={tool === "translate" ? "active" : ""} onClick={() => setTool("translate")} title="Mover (G)"><Move size={17} /></button>
        <button className={tool === "rotate" ? "active" : ""} onClick={() => setTool("rotate")} title="Rotacionar (R)"><RotateCw size={17} /></button>
        <button className={tool === "scale" ? "active" : ""} onClick={() => setTool("scale")} title="Escalar (S)"><Scaling size={17} /></button>
        <span className="mw-toolbar-divider" />
        <span className="mw-toolbar-hint">Transformação global · milímetros</span>
        <span className="mw-toolbar-spacer" />
        <button className={showGrid ? "active" : ""} onClick={() => setShowGrid((value) => !value)} title="Mostrar grade"><Grid3X3 size={17} /></button>
        <button onClick={() => { const api = sceneRef.current; if (api) { api.camera.position.set(125,105,145); api.orbit.target.set(0,10,0); api.orbit.update(); } }} title="Redefinir vista"><RotateCcw size={17} /></button>
      </div>

      <main className="mw-workspace">
        <aside className="mw-tool-rail">
          <div className="mw-panel-title">Ferramentas</div>
          <button className={tool === "select" ? "selected" : ""} onClick={() => setTool("select")}><MousePointer2 /> <span>Selecionar</span></button>
          <button className={tool === "translate" ? "selected" : ""} onClick={() => setTool("translate")}><Move /> <span>Mover (G)</span></button>
          <button className={tool === "rotate" ? "selected" : ""} onClick={() => setTool("rotate")}><RotateCw /> <span>Rotacionar (R)</span></button>
          <button className={tool === "scale" ? "selected" : ""} onClick={() => setTool("scale")}><Scaling /> <span>Escalar (S)</span></button>
          <div className="mw-tool-separator" />
          <div className="mw-panel-title">Próxima etapa</div>
          <button className="future" disabled title="Ainda não implementado"><Scissors /><span>Extrusão</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Layers3 /><span>Inset / Bevel</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Combine /><span>Booleano</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Split /><span>Dividir</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Mirror /><span>Espelhar</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Wrench /><span>Reparar malha</span><Lock size={12}/></button>
          <div className="mw-rail-footer"><CheckCircle2 size={14}/> Object Mode ativo</div>
        </aside>

        <section className="mw-viewport-panel">
          <div className="mw-viewport-heading">
            <strong><Box size={16}/> Visualização 3D</strong>
            <span>Perspectiva · Global</span>
          </div>
          <div className="mw-viewport" ref={hostRef}>
            <div className="mw-axis-cube"><span>Z</span><b>3D</b><i>X</i><em>Y</em></div>
            {!selectedId && <div className="mw-empty-hint">Clique em um objeto para selecioná-lo</div>}
            <div className="mw-viewport-caption">Arraste para orbitar · roda para zoom · botão do meio para deslocar</div>
          </div>
          <div className="mw-primitive-tray">
            <strong>Adicionar primitiva:</strong>
            {primitiveButtons.map(({ kind, label, icon: Icon }) => (
              <button key={kind} onClick={() => addPrimitive(kind)}><Icon size={16}/>{label}</button>
            ))}
            <button onClick={() => fileRef.current?.click()}><Upload size={16}/> Importar STL</button>
          </div>
          <div className="mw-statusbar">
            <span><span className="mw-status-dot"/> {busy ? "Processando…" : "Pronto"}</span>
            <span>{rows.length} objeto(s) · Unidade: mm</span>
            <span>{inspector ? `${inspector.dimensions.map((n) => n.toFixed(1)).join(" × ")} mm` : "Nenhum objeto selecionado"}</span>
          </div>
        </section>

        <aside className="mw-inspector">
          <section className="mw-inspector-card">
            <div className="mw-inspector-title"><strong>Transformação</strong><span>Global</span></div>
            {inspector ? (
              <>
                {(["position", "rotation", "scale"] as const).map((field) => (
                  <div className="mw-transform-group" key={field}>
                    <label>{field === "position" ? "Posição (mm)" : field === "rotation" ? "Rotação (°)" : "Escala"}</label>
                    <div className="mw-axis-fields">
                      {(["X", "Y", "Z"] as const).map((axis, index) => (
                        <label key={axis}><span>{axis}</span><input type="number" step={field === "rotation" ? 1 : 0.1} value={Number((inspector[field] as number[])[index] ?? 0).toFixed(2)} onChange={(event) => changeTransform(field, index as 0|1|2, Number(event.target.value))} onBlur={() => recordHistoryRef.current()}/></label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mw-dimensions">
                  <label>Dimensões aproximadas (mm)</label>
                  <strong>{inspector.dimensions.map((n) => n.toFixed(2)).join(" × ")}</strong>
                </div>
              </>
            ) : <p className="mw-muted">Selecione um objeto na cena ou na hierarquia.</p>}
          </section>

          <section className="mw-inspector-card">
            <div className="mw-inspector-title"><strong>Hierarquia (Cena)</strong><span>{rows.length} itens</span></div>
            <div className="mw-object-list">
              {rows.map((row) => (
                <div key={row.id} className={row.id === selectedId ? "mw-object-row selected" : "mw-object-row"}>
                  <button className="mw-object-name" onClick={() => {
                    const api = sceneRef.current;
                    const mesh = api?.objects.find((item) => item.uuid === row.id) ?? null;
                    if (api && mesh) {
                      api.selected = mesh;
                      if (tool === "select") api.transform.detach(); else api.transform.attach(mesh);
                      setSelectedId(mesh.uuid); syncInspector(mesh);
                    }
                  }}><Box size={15}/><span>{row.name}</span></button>
                  <button className="mw-visibility" title={row.visible ? "Ocultar" : "Mostrar"} onClick={() => toggleVisibility(row.id)}>{row.visible ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
                </div>
              ))}
              {rows.length === 0 && <p className="mw-muted">A cena está vazia. Adicione uma primitiva.</p>}
            </div>
            <div className="mw-object-actions">
              <button disabled={!selectedId} onClick={duplicateSelected}><Copy size={14}/> Duplicar</button>
              <button disabled={!selectedId} onClick={deleteSelected}><Trash2 size={14}/> Excluir</button>
            </div>
          </section>

          <section className="mw-inspector-card">
            <div className="mw-inspector-title"><strong>Propriedades do objeto</strong><Settings2 size={15}/></div>
            {inspector ? (
              <>
                <label className="mw-property-label">Nome</label>
                <input className="mw-name-input" value={inspector.name} onChange={(event) => renameSelected(event.target.value)} onBlur={() => recordHistoryRef.current()}/>
                <label className="mw-property-label">Cor de visualização</label>
                <div className="mw-color-field"><input type="color" value={inspector.color} onChange={(event) => changeColor(event.target.value)} onBlur={() => recordHistoryRef.current()}/><span>{inspector.color.toUpperCase()}</span></div>
                <div className="mw-mesh-info">
                  <strong>Informações da malha</strong>
                  <span>Vértices: {sceneRef.current?.selected?.geometry.getAttribute("position").count.toLocaleString("pt-BR") ?? 0}</span>
                  <span>Triângulos: {sceneRef.current?.selected?.geometry.index ? (sceneRef.current.selected.geometry.index.count / 3).toLocaleString("pt-BR") : Math.floor((sceneRef.current?.selected?.geometry.getAttribute("position").count ?? 0) / 3).toLocaleString("pt-BR")}</span>
                  <small><TriangleAlert size={13}/> Verifique a malha no fatiador antes de imprimir.</small>
                </div>
              </>
            ) : <p className="mw-muted">Sem objeto ativo.</p>}
          </section>
        </aside>
      </main>

      <footer className="mw-footer">
        <div className="mw-history-actions">
          <button disabled={!canUndo} onClick={() => restoreHistory(-1)}><Undo2 size={16}/> Desfazer</button>
          <button disabled={!canRedo} onClick={() => restoreHistory(1)}><Redo2 size={16}/> Refazer</button>
        </div>
        <div className="mw-footer-actions">
          <button className="mw-export" disabled={busy || rows.length === 0} onClick={() => void exportStl()}><Download size={16}/>{busy ? "Exportando…" : "Exportar STL"}</button>
        </div>
      </footer>

      <input ref={fileRef} type="file" accept=".stl" hidden onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) void importStl(file);
      }}/>
      {notice && <div className="mw-notice" role="status">{notice}</div>}
    </div>
  );
}
