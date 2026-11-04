import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { A1_BUILD_PLATE } from "@/lib/studio/build-plate";
import { Link } from "@tanstack/react-router";
import {
  Box, Circle, Cylinder, Cone, Torus, Move, RotateCw, Scaling, MousePointer2,
  Layers3, Grid3X3, Download, Upload, Undo2, Redo2, Trash2, Copy, Eye, EyeOff,
  Plus, Save, X, ChevronDown, Wrench, Settings2, HelpCircle, Maximize2,
  FolderOpen, Palette, Ruler, Scissors, Combine, Split, FlipHorizontal2, Lock,
  CheckCircle2, TriangleAlert, RotateCcw, PanelRight, Sparkles,
  CircleDot, Spline, Square, ArrowUpFromLine,
} from "lucide-react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { createPrimitive, type PrimitiveKind } from "@/lib/studio/workbench-primitives";
import { applyWorldDeltaToVertices, buildMeshTopology, createFaceGroupGeometry, extrudePlanarFace, weldGeometry, type MeshEdge, type VertexPositionSnapshot } from "@/lib/studio/mesh-topology";
import "./model-workbench.css";

type Tool = "select" | "translate" | "rotate" | "scale";
type EditSelectionMode = "vertex" | "edge" | "face";
type EditSelection = { vertexIds: number[]; edgeIds: MeshEdge[]; faceTriangleIndex: number | null };
type Inspector = {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: [number, number, number];
  color: string;
};
type SceneRow = { id: string; name: string; type: string; visible: boolean };
type EditDragSnapshot = { pivotMatrix: THREE.Matrix4; vertices: VertexPositionSnapshot[] };
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
  editMode: boolean;
  selectionMode: EditSelectionMode;
  editSelection: EditSelection;
  editPivot: THREE.Object3D;
  editDragStart: EditDragSnapshot | null;
  editOverlays: THREE.Object3D[];
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

function emptyEditSelection(): EditSelection {
  return { vertexIds: [], edgeIds: [], faceTriangleIndex: null };
}

function selectedEditVertexIds(mesh: THREE.Mesh, mode: EditSelectionMode, selection: EditSelection) {
  if (mode === "vertex") return selection.vertexIds;
  if (mode === "edge") return [...new Set(selection.edgeIds.flatMap(([a, b]) => [a, b]))];
  if (selection.faceTriangleIndex === null) return [];
  const topology = buildMeshTopology(mesh.geometry);
  const group = topology.faces[topology.faceByTriangle[selection.faceTriangleIndex] ?? -1];
  return group?.vertexIndices ?? [];
}

function clearEditOverlays(api: SceneApi) {
  api.editOverlays.forEach((overlay) => {
    api.scene.remove(overlay);
    const item = overlay as THREE.Mesh | THREE.LineSegments | THREE.Points;
    item.geometry.dispose();
    (Array.isArray(item.material) ? item.material : [item.material]).forEach((material) => material.dispose());
  });
  api.editOverlays = [];
}

function refreshEditOverlays(api: SceneApi) {
  clearEditOverlays(api);
  const mesh = api.selected;
  if (!api.editMode || !mesh) return;
  mesh.updateMatrixWorld(true);
  const addOverlay = (overlay: THREE.Object3D) => {
    overlay.position.copy(mesh.position);
    overlay.quaternion.copy(mesh.quaternion);
    overlay.scale.copy(mesh.scale);
    overlay.updateMatrixWorld(true);
    api.scene.add(overlay);
    api.editOverlays.push(overlay);
  };

  if (api.selectionMode === "face" && api.editSelection.faceTriangleIndex !== null) {
    try {
      const geometry = createFaceGroupGeometry(mesh.geometry, api.editSelection.faceTriangleIndex);
      const overlay = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xffb347, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false,
      }));
      overlay.renderOrder = 20;
      addOverlay(overlay);
    } catch { /* Selection is cleared when the topology changes. */ }
  } else if (api.selectionMode === "edge" && api.editSelection.edgeIds.length) {
    const position = mesh.geometry.getAttribute("position");
    const points: number[] = [];
    api.editSelection.edgeIds.forEach(([a, b]) => {
      points.push(position.getX(a), position.getY(a), position.getZ(a), position.getX(b), position.getY(b), position.getZ(b));
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const overlay = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xffb347, depthTest: false }));
    overlay.renderOrder = 21;
    addOverlay(overlay);
  } else if (api.selectionMode === "vertex" && api.editSelection.vertexIds.length) {
    const position = mesh.geometry.getAttribute("position");
    const points: number[] = [];
    api.editSelection.vertexIds.forEach((id) => points.push(position.getX(id), position.getY(id), position.getZ(id)));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const overlay = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffb347, size: 11, sizeAttenuation: false, depthTest: false }));
    overlay.renderOrder = 22;
    addOverlay(overlay);
  }
}


function positionEditPivot(api: SceneApi, tool: Tool) {
  const mesh = api.selected;
  const pivot = api.editPivot;
  if (!api.editMode || !mesh || tool === "select") {
    api.transform.detach();
    return;
  }
  const ids = selectedEditVertexIds(mesh, api.selectionMode, api.editSelection);
  if (!ids.length) {
    api.transform.detach();
    return;
  }
  const position = mesh.geometry.getAttribute("position");
  const center = new THREE.Vector3();
  ids.forEach((id) => center.add(new THREE.Vector3().fromBufferAttribute(position, id)));
  center.multiplyScalar(1 / ids.length);
  mesh.updateMatrixWorld(true);
  mesh.localToWorld(center);
  pivot.position.copy(center);
  pivot.quaternion.identity();
  pivot.scale.set(1, 1, 1);
  pivot.updateMatrixWorld(true);
  api.transform.setMode(tool);
  api.transform.setSpace("world");
  api.transform.attach(pivot);
}

function distanceToSegment(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  const t = lengthSquared === 0 ? 0 : THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
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
  const [editMode, setEditMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState<EditSelectionMode>("face");
  const [editSelectionCount, setEditSelectionCount] = useState(0);
  const [extrudeDistance, setExtrudeDistance] = useState("5");
  const selectionModeRef = useRef<EditSelectionMode>("face");
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
      type: String(mesh.userData["primitive"] ?? "malha"),
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
    if (api.editMode) {
      api.editSelection = emptyEditSelection();
      setEditSelectionCount(0);
      api.transform.detach();
      refreshEditOverlays(api);
      positionEditPivot(api, tool);
    } else if (mesh && tool !== "select") api.transform.attach(mesh);
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

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(A1_BUILD_PLATE.widthMm, A1_BUILD_PLATE.depthMm),
      new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 1, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = A1_BUILD_PLATE.floorY;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(
      A1_BUILD_PLATE.widthMm,
      A1_BUILD_PLATE.gridDivisions,
      0x66615a,
      0x444a53,
    );
    grid.position.y = A1_BUILD_PLATE.gridY;
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
      editMode: false,
      selectionMode: "face",
      editSelection: emptyEditSelection(),
      editPivot: new THREE.Object3D(),
      editDragStart: null,
      editOverlays: [],
    };
    scene.add(api.editPivot);
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
      if (api.editMode) {
        api.editSelection = emptyEditSelection();
        setEditSelectionCount(0);
        transform.detach();
        refreshEditOverlays(api);
        positionEditPivot(api, toolRef.current);
      } else if (mesh && toolRef.current !== "select") transform.attach(mesh);
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
      const hit = api.raycaster.intersectObjects(api.objects.filter((item) => item.visible), false)[0];
      if (!(hit?.object instanceof THREE.Mesh)) {
        if (!api.editMode) choose(null);
        return;
      }
      if (!api.editMode) {
        choose(hit.object);
        return;
      }
      if (hit.object !== api.selected) choose(hit.object);
      const mesh = hit.object;
      if (hit.faceIndex === undefined || hit.faceIndex === null) return;
      const triangle = hit.faceIndex;
      const topology = buildMeshTopology(mesh.geometry);
      const groupId = topology.faceByTriangle[triangle];
      if (groupId === undefined || groupId < 0) return;
      const localPoint = mesh.worldToLocal(hit.point.clone());
      const position = mesh.geometry.getAttribute("position");
      const vertices = [
        mesh.geometry.index?.getX(triangle * 3) ?? triangle * 3,
        mesh.geometry.index?.getX(triangle * 3 + 1) ?? triangle * 3 + 1,
        mesh.geometry.index?.getX(triangle * 3 + 2) ?? triangle * 3 + 2,
      ];
      api.selectionMode = selectionModeRef.current;
      if (!event.shiftKey) api.editSelection = emptyEditSelection();
      if (api.selectionMode === "vertex") {
        const nearest = vertices.map((id) => ({ id, distance: localPoint.distanceTo(new THREE.Vector3().fromBufferAttribute(position, id)) }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearest) {
          const selected = api.editSelection.vertexIds;
          if (event.shiftKey && selected.includes(nearest.id)) {
            api.editSelection.vertexIds = selected.filter((id) => id !== nearest.id);
          } else if (!selected.includes(nearest.id)) {
            api.editSelection.vertexIds = [...selected, nearest.id];
          }
        }
      } else if (api.selectionMode === "edge") {
        const candidates: MeshEdge[] = [[vertices[0]!, vertices[1]!], [vertices[1]!, vertices[2]!], [vertices[2]!, vertices[0]!]];
        const nearest = candidates.map((edge) => ({
          edge,
          distance: distanceToSegment(localPoint, new THREE.Vector3().fromBufferAttribute(position, edge[0]), new THREE.Vector3().fromBufferAttribute(position, edge[1])),
        })).sort((a, b) => a.distance - b.distance)[0];
        if (nearest) {
          const selected = api.editSelection.edgeIds;
          const exists = selected.some(([a, b]) => a === nearest.edge[0] && b === nearest.edge[1]);
          api.editSelection.edgeIds = event.shiftKey && exists
            ? selected.filter(([a, b]) => a !== nearest.edge[0] || b !== nearest.edge[1])
            : exists ? selected : [...selected, nearest.edge];
        }
      } else {
        api.editSelection.faceTriangleIndex = triangle;
      }
      setEditSelectionCount(selectedEditVertexIds(mesh, api.selectionMode, api.editSelection).length);
      refreshEditOverlays(api);
      positionEditPivot(api, toolRef.current);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);

    transform.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });
    transform.addEventListener("mouseDown", () => {
      const mesh = api.selected;
      if (!api.editMode || !mesh || !api.transform.object) return;
      const ids = selectedEditVertexIds(mesh, api.selectionMode, api.editSelection);
      if (!ids.length) return;
      const position = mesh.geometry.getAttribute("position");
      api.editPivot.updateMatrixWorld(true);
      api.editDragStart = {
        pivotMatrix: api.editPivot.matrixWorld.clone(),
        vertices: ids.map((id) => ({
          id,
          local: [position.getX(id), position.getY(id), position.getZ(id)] as const,
        })),
      };
    });
    transform.addEventListener("objectChange", () => {
      const mesh = api.selected;
      const drag = api.editDragStart;
      if (api.editMode && mesh && drag) {
        api.scene.updateMatrixWorld(true);
        api.editPivot.updateMatrixWorld(true);
        const worldDelta = api.editPivot.matrixWorld.clone().multiply(drag.pivotMatrix.clone().invert());
        applyWorldDeltaToVertices(mesh.geometry, drag.vertices, mesh.matrixWorld, worldDelta);
        refreshEditOverlays(api);
        syncInspector(mesh);
      } else if (mesh) {
        syncInspector(mesh);
      }
    });
    transform.addEventListener("mouseUp", () => {
      if (api.editMode && api.editDragStart && api.selected) {
        api.editDragStart = null;
        positionEditPivot(api, toolRef.current);
        refreshEditOverlays(api);
      }
      recordHistory();
    });

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
      clearEditOverlays(api);
      transform.detach();
      transform.dispose();
      orbit.dispose();
      api.objects.forEach(disposeMesh);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
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
    if (api.editMode) positionEditPivot(api, tool);
    else if (tool === "select") api.transform.detach();
    else {
      api.transform.setMode(tool);
      if (api.selected) api.transform.attach(api.selected);
    }
  }, [tool, editMode]);

  useEffect(() => {
    const api = sceneRef.current;
    if (!api) return;
    const grid = api.scene.children.find((child) => child instanceof THREE.GridHelper);
    if (grid) grid.visible = showGrid;
  }, [showGrid]);

  const changeSelectionMode = (mode: EditSelectionMode) => {
    const api = sceneRef.current;
    selectionModeRef.current = mode;
    setSelectionMode(mode);
    if (!api) return;
    api.selectionMode = mode;
    api.editSelection = emptyEditSelection();
    setEditSelectionCount(0);
    refreshEditOverlays(api);
    positionEditPivot(api, toolRef.current);
  };

  const toggleEditMode = () => {
    const api = sceneRef.current;
    if (!api?.selected) {
      notify("Adicione ou selecione um objeto antes de entrar no Edit Mode.");
      return;
    }
    if (!api.editMode) {
      recordHistoryRef.current();
      try {
        const welded = weldGeometry(api.selected.geometry);
        api.selected.geometry.dispose();
        api.selected.geometry = welded;
        const materials = Array.isArray(api.selected.material) ? api.selected.material : [api.selected.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.flatShading = true;
            material.needsUpdate = true;
          }
        });
        api.editMode = true;
        api.selectionMode = selectionModeRef.current;
        api.editSelection = emptyEditSelection();
        api.transform.detach();
        setEditMode(true);
        setEditSelectionCount(0);
        refreshEditOverlays(api);
        recordHistoryRef.current();
        notify("Edit Mode ativo: selecione vértices, arestas ou faces.");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Não foi possível entrar no Edit Mode.");
      }
    } else {
      api.editMode = false;
      api.editSelection = emptyEditSelection();
      api.editDragStart = null;
      clearEditOverlays(api);
      api.transform.detach();
      setEditMode(false);
      setEditSelectionCount(0);
      if (toolRef.current !== "select") api.transform.attach(api.selected);
      recordHistoryRef.current();
      notify("Object Mode ativo.");
    }
  };

  const extrudeSelectedFace = (distance = Number(extrudeDistance)) => {
    const api = sceneRef.current;
    const mesh = api?.selected;
    if (!api || !mesh || !api.editMode || api.selectionMode !== "face" || api.editSelection.faceTriangleIndex === null) {
      notify("Selecione uma face no Edit Mode para extrudar.");
      return;
    }
    try {
      const result = extrudePlanarFace(mesh.geometry, api.editSelection.faceTriangleIndex, distance);
      mesh.geometry.dispose();
      mesh.geometry = result.geometry;
      api.editSelection = { vertexIds: [], edgeIds: [], faceTriangleIndex: result.capTriangleIndex };
      setEditSelectionCount(selectedEditVertexIds(mesh, "face", api.editSelection).length);
      refreshEditOverlays(api);
      syncInspector(mesh);
      recordHistoryRef.current();
      notify(`Face extrudada em ${distance.toFixed(2)} mm.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível extrudar esta face.");
    }
  };

  const addPrimitive = (kind: PrimitiveKind) => {
    const api = sceneRef.current;
    if (!api) return;
    const mesh = createPrimitive(kind);
    const sameKindCount = api.objects.filter((item) => item.userData["primitive"] === kind).length;
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
    const serialized = history.entries[nextIndex];
    if (!serialized) return;
    const state = JSON.parse(serialized) as { objects: object[]; selected: string | null };
    clearEditOverlays(api);
    api.editSelection = emptyEditSelection();
    setEditSelectionCount(0);
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
    if (api.editMode || tool === "select") api.transform.detach();
    else if (selected) api.transform.attach(selected);
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
      if (api.editMode) {
        api.editMode = false;
        setEditMode(false);
        clearEditOverlays(api);
      }
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
      api.objects.filter((mesh) => mesh.visible).forEach((mesh) => {
        const exported = new THREE.Mesh(mesh.geometry.clone(), mesh.material);
        exported.position.copy(mesh.position);
        exported.quaternion.copy(mesh.quaternion);
        exported.scale.copy(mesh.scale);
        group.add(exported);
      });
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

  const apiEditMode = () => sceneRef.current?.editMode ?? false;

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
      } else if (event.key === "Tab") {
        event.preventDefault();
        toggleEditMode();
      } else if (apiEditMode() && key === "1") changeSelectionMode("vertex");
      else if (apiEditMode() && key === "2") changeSelectionMode("edge");
      else if (apiEditMode() && key === "3") changeSelectionMode("face");
      else if (apiEditMode() && key === "e") { event.preventDefault(); extrudeSelectedFace(5); }
      else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (key === "g") setTool("translate");
      else if (key === "r") setTool("rotate");
      else if (key === "s") setTool("scale");
      else if (event.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, restoreHistory, toggleEditMode, changeSelectionMode]);

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
          <Link to="/studio">Criação guiada</Link>
          <Link to="/">Imagem para 3D</Link>
          <Link to="/mesh-doctor">Mesh Doctor</Link>
          <Link to="/catalogo">Catálogo</Link>
        </nav>
        <div className="mw-header-actions">
          <button title="Abrir STL" aria-label="Abrir arquivo STL" onClick={() => fileRef.current?.click()}><FolderOpen size={17} /></button>
          <button title="Atalhos do editor" aria-label="Ajuda e atalhos" onClick={() => notify("Atalhos: G mover · R girar · S escalar · Shift+D duplicar · Delete excluir · Tab Edit Mode.")}><HelpCircle size={17} /></button>
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
        <button onClick={toggleEditMode}>Malha</button>
        <button disabled title="Booleanos e divisão ainda não estão implementados no Workbench">Geometria</button>
        <button onClick={() => setShowGrid((value) => !value)}>Utilidades</button>
        <button onClick={() => notify("Atalhos: G mover · R girar · S escalar · Shift+D duplicar · Delete excluir.")}>Ajuda</button>
      </div>

      <div className="mw-toolbar">
        <button className={editMode ? "mw-mode active" : "mw-mode"} title="Alternar Object/Edit Mode (Tab)" onClick={toggleEditMode}><Box size={16} /> Modo: {editMode ? "Edição" : "Objeto"} <ChevronDown size={14} /></button>
        {editMode && <>
          <span className="mw-toolbar-divider" />
          <button className={selectionMode === "vertex" ? "active" : ""} onClick={() => changeSelectionMode("vertex")} title="Vértices (1)"><CircleDot size={16}/> Vértice</button>
          <button className={selectionMode === "edge" ? "active" : ""} onClick={() => changeSelectionMode("edge")} title="Arestas (2)"><Spline size={16}/> Aresta</button>
          <button className={selectionMode === "face" ? "active" : ""} onClick={() => changeSelectionMode("face")} title="Faces (3)"><Square size={16}/> Face</button>
          <span className="mw-toolbar-divider" />
          <input className="mw-extrude-input" aria-label="Distância da extrusão em milímetros" type="number" min="0.01" max="1000" step="0.5" value={extrudeDistance} onChange={(event) => setExtrudeDistance(event.target.value)} />
          <button className="mw-extrude-button" disabled={selectionMode !== "face" || editSelectionCount === 0} onClick={() => extrudeSelectedFace()} title="Extrudar face (E)"><ArrowUpFromLine size={15}/> Extrudar</button>
        </>}
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
          <div className="mw-panel-title">{editMode ? "Seleção de malha" : "Próxima etapa"}</div>
          {editMode ? <>
            <button className={selectionMode === "vertex" ? "selected" : ""} onClick={() => changeSelectionMode("vertex")}><CircleDot /><span>Vértices (1)</span></button>
            <button className={selectionMode === "edge" ? "selected" : ""} onClick={() => changeSelectionMode("edge")}><Spline /><span>Arestas (2)</span></button>
            <button className={selectionMode === "face" ? "selected" : ""} onClick={() => changeSelectionMode("face")}><Square /><span>Faces (3)</span></button>
            <button disabled={selectionMode !== "face" || editSelectionCount === 0} onClick={() => extrudeSelectedFace()}><ArrowUpFromLine /><span>Extrudar (E)</span></button>
          </> : <>
            <button className="future" disabled title="Entre no Edit Mode para extrudar faces"><Scissors /><span>Extrusão</span><Lock size={12}/></button>
            <button className="future" disabled title="Próxima implementação"><Layers3 /><span>Inset / Bevel</span><Lock size={12}/></button>
          </>}
          <button className="future" disabled title="Ainda não implementado"><Combine /><span>Booleano</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Split /><span>Dividir</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><FlipHorizontal2 /><span>Espelhar</span><Lock size={12}/></button>
          <button className="future" disabled title="Ainda não implementado"><Wrench /><span>Reparar malha</span><Lock size={12}/></button>
          <div className="mw-rail-footer"><CheckCircle2 size={14}/> {editMode ? `Edit Mode · ${editSelectionCount} vértice(s)` : "Object Mode ativo"}</div>
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
            <span>{editMode ? `Edit Mode · ${selectionMode === "vertex" ? "Vértices" : selectionMode === "edge" ? "Arestas" : "Faces"}` : "Object Mode"} · {rows.length} objeto(s) · mm</span>
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
                      selectMesh(mesh);
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
