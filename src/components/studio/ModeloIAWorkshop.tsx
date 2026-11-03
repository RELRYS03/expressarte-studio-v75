import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

type Stats = { meshes: number; triangles: number; width: number; height: number; depth: number; materials: number };
function inspect(object: THREE.Object3D): Stats {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const dimensions = bounds.isEmpty() ? new THREE.Vector3() : bounds.getSize(new THREE.Vector3());
  let meshes = 0, triangles = 0;
  const materials = new Set<THREE.Material>();
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    meshes++;
    const geometry = node.geometry;
    if (geometry instanceof THREE.BufferGeometry) {
      const position = geometry.getAttribute("position");
      triangles += geometry.index ? geometry.index.count / 3 : position ? position.count / 3 : 0;
    }
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  return { meshes, triangles, width: dimensions.x, height: dimensions.y, depth: dimensions.z, materials: materials.size };
}
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function disposeObject(object: THREE.Object3D) {
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.map?.dispose();
        material.normalMap?.dispose();
        material.roughnessMap?.dispose();
        material.metalnessMap?.dispose();
      }
      material.dispose();
    }
  });
}
export default function ModeloIAWorkshop() {
  const host = useRef<HTMLDivElement>(null);
  const viewport = useRef<{scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls} | null>(null);
  const objectRef = useRef<THREE.Group | null>(null);
  const [filename, setFilename] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [heightMm, setHeightMm] = useState(100);
  const [nativeHeight, setNativeHeight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Importe um GLB para examinar materiais, peças e medidas. Nenhuma chamada de IA é feita nesta página.");

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#201b19");
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20000);
    camera.position.set(135, 100, 145);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const key = new THREE.DirectionalLight(0xffebd2, 2.3);
    key.position.set(100, 180, 100);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.4);
    fill.position.set(-100, 80, -100);
    scene.add(fill);
    const grid = new THREE.GridHelper(300, 30, 0x977861, 0x574739);
    scene.add(grid);
    viewport.current = { scene, camera, controls };
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let id = 0;
    const animate = () => {
      id = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
      controls.dispose();
      const previous = objectRef.current;
      if (previous) { scene.remove(previous); disposeObject(previous); objectRef.current = null; }
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      viewport.current = null;
    };
  }, []);

  function focus(object: THREE.Object3D) {
    const view = viewport.current;
    if (!view) return;
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(30, size.length() * 1.7);
    view.controls.target.copy(center);
    view.camera.position.copy(center).add(new THREE.Vector3(distance * 0.75, distance * 0.5, distance));
    view.camera.near = Math.max(0.01, distance / 3000);
    view.camera.far = Math.max(1000, distance * 50);
    view.camera.updateProjectionMatrix();
    view.controls.update();
  }

  const importGLB = async (file: File) => {
    if (!/\.glb$/i.test(file.name)) { setMessage("Nesta etapa, importe um arquivo GLB binário."); return; }
    if (file.size > 120 * 1024 * 1024) { setMessage("Arquivo acima de 120 MB. Reduza a malha antes de importar."); return; }
    setBusy(true);
    try {
      const data = await file.arrayBuffer();
      const gltf = await new GLTFLoader().parseAsync(data, "");
      const model = gltf.scene;
      const raw = inspect(model);
      if (!raw.meshes || !raw.height || !Number.isFinite(raw.height) || !Number.isFinite(raw.width) || !Number.isFinite(raw.depth))
        throw new Error("O GLB não contém uma malha 3D mensurável.");
      const mmHeight = 100;
      // A unidade implícita de GLB é metro, mas modelos de IA nem sempre preservam escala real.
      // Nunca inferir uma altura física a partir do arquivo; o usuário fornece a altura desejada.
      model.scale.multiplyScalar(mmHeight / raw.height);
      model.updateMatrixWorld(true);
      const previous = objectRef.current;
      if (previous && viewport.current) {
        viewport.current.scene.remove(previous);
        disposeObject(previous);
      }
      objectRef.current = model;
      viewport.current?.scene.add(model);
      setNativeHeight(raw.height);
      setHeightMm(mmHeight);
      setStats(inspect(model));
      setFilename(file.name);
      focus(model);
      setMessage("GLB carregado localmente. Altura inicial de trabalho: 100 mm (não é uma medida real inferida do Tripo). Verifique o tamanho e os materiais antes de exportar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao importar o GLB.");
    } finally { setBusy(false); }
  };
  const resize = (next: number) => {
    const object = objectRef.current;
    if (!object || !nativeHeight || !Number.isFinite(next) || next < 20 || next > 300) return;
    object.scale.setScalar(next / nativeHeight);
    object.updateMatrixWorld(true);
    setHeightMm(next);
    setStats(inspect(object));
    focus(object);
  };
  const exportSTL = () => {
    const object = objectRef.current;
    if (!object) return;
    try {
      // STL não preserva cores, PBR, nem UV. Não corrigimos malha aberta automaticamente.
      const payload = new STLExporter().parse(object, { binary: true });
      save(new Blob([payload as BlobPart], { type: "model/stl" }), "ExpressArte-modelo-IA-" + Math.round(heightMm) + "mm.stl");
      setMessage("STL exportado em milímetros de trabalho, sem textura. Valide malha, escala e fatiamento antes de imprimir.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível exportar STL."); }
  };
  const exportGLB = async () => {
    const object = objectRef.current;
    if (!object) return;
    setBusy(true);
    try {
      const output = await new GLTFExporter().parseAsync(object, { binary: true });
      save(new Blob([output as BlobPart], { type: "model/gltf-binary" }), "ExpressArte-modelo-IA-editado.glb");
      setMessage("Cópia GLB exportada. Esta operação preserva materiais compatíveis com glTF, mas não garante impressão 3D.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível exportar GLB."); }
    finally { setBusy(false); }
  };
  return (
    <main style={{padding:"clamp(16px, 3vw, 40px)", maxWidth:1250, margin:"auto", display:"grid", gap:18}}>
      <p><Link to="/studio">← Voltar ao Studio</Link></p>
      <div>
        <h1 style={{fontSize:"clamp(25px, 4vw, 38px)",fontWeight:800}}>Oficina de Modelos IA · Express’Arte</h1>
        <p>Tripo → GLB → visualização com materiais → medidas → exportação. Sem custo de API nesta oficina.</p>
      </div>
      <label style={{display:"block",border:"1px dashed #aa8262",borderRadius:12,padding:18,cursor:"pointer"}}>
        <strong>Selecionar modelo GLB gerado no Tripo</strong>
        <input type="file" accept=".glb,model/gltf-binary" disabled={busy} onChange={(e) => {const file=e.currentTarget.files?.[0];if(file)void importGLB(file);e.currentTarget.value="";}} style={{display:"block",marginTop:10}} />
      </label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:20}}>
        <div ref={host} aria-label="Visualização interativa 3D" style={{height:480,minWidth:0,borderRadius:14,overflow:"hidden",background:"#201b19"}} />
        <section style={{display:"grid",alignContent:"start",gap:16}}>
          <div><strong>{filename || "Nenhum modelo importado"}</strong><p role="status">{message}</p></div>
          {stats && <div style={{display:"grid",gap:8}}>
            <strong>Diagnóstico geométrico básico</strong>
            <p>{stats.meshes.toLocaleString("pt-BR")} malhas · {Math.round(stats.triangles).toLocaleString("pt-BR")} triângulos · {stats.materials} materiais</p>
            <p>Dimensões de trabalho: {stats.width.toFixed(2)} × {stats.height.toFixed(2)} × {stats.depth.toFixed(2)} mm (X × Y × Z)</p>
            <p style={{fontSize:13}}>Este diagnóstico não verifica malha fechada, paredes finas nem colisões; a escala precisa ser validada.</p>
          </div>}
          <label style={{display:"grid",gap:8}}>
            <strong>Altura desejada (mm)</strong>
            <input aria-label="Altura do modelo em milímetros" type="number" min={20} max={300} step={1} disabled={!stats || busy} value={heightMm} onChange={(e)=>resize(Number(e.currentTarget.value))} style={{padding:10,border:"1px solid #977861",borderRadius:6,background:"transparent",color:"inherit"}} />
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            <Button disabled={!stats || busy} onClick={exportSTL}>Exportar STL (sem cor)</Button>
            <Button disabled={!stats || busy} variant="outline" onClick={()=>void exportGLB()}>Exportar GLB (materiais)</Button>
          </div>
          <p style={{fontSize:13}}>Ainda não é geração autônoma por IA nem certificação de impressão. O Expressinho aprovado será a referência da próxima geração, sem usar o rascunho de esferas.</p>
        </section>
      </div>
    </main>
  );
}
