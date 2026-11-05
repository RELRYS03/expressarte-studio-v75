import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Stats = { meshes: number; triangles: number; vertices: number; materials: number; width: number; height: number; depth: number };
const MAX_BYTES = 100 * 1024 * 1024;

export default function GlbInspector() {
  const host = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101216");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 10, 7);
    scene.add(light);
    const grid = new THREE.GridHelper(10, 20, 0x50545c, 0x292c33);
    scene.add(grid);
    let object: THREE.Group | null = null;
    let disposed = false;
    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    if (file) {
      file.arrayBuffer().then(buffer => {
        if (disposed) return;
        new GLTFLoader().parse(buffer, "", gltf => {
          if (disposed) {
            gltf.scene.traverse(node => {
              if (node instanceof THREE.Mesh) {
                node.geometry.dispose();
                for (const material of (Array.isArray(node.material) ? node.material : [node.material])) material.dispose();
              }
            });
            return;
          }
          object = gltf.scene;
          scene.add(object);
          const bounds = new THREE.Box3().setFromObject(object);
          if (bounds.isEmpty()) { setError("O arquivo não contém geometria visível."); return; }
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const longest = Math.max(size.x, size.y, size.z, 0.001);
          object.position.sub(center);
          const scale = 4 / longest;
          object.scale.setScalar(scale);
          grid.scale.setScalar(0.4);
          camera.position.set(5, 3, 6);
          controls.target.set(0, 0, 0);
          controls.minDistance = 0.5;
          controls.maxDistance = 50;
          controls.update();
          let meshes = 0, triangles = 0, vertices = 0;
          const materials = new Set<THREE.Material>();
          object.traverse(node => {
            if (!(node instanceof THREE.Mesh)) return;
            meshes++;
            const geometry = node.geometry as THREE.BufferGeometry;
            vertices += geometry.getAttribute("position")?.count ?? 0;
            triangles += geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor((geometry.getAttribute("position")?.count ?? 0) / 3);
            for (const material of (Array.isArray(node.material) ? node.material : [node.material])) materials.add(material);
          });
          setStats({ meshes, triangles, vertices, materials: materials.size, width: size.x, height: size.y, depth: size.z });
        }, e => { if (!disposed) setError(e instanceof Error ? e.message : "Não foi possível ler o GLB."); });
      }).catch(() => { if (!disposed) setError("Falha ao abrir o arquivo."); });
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (object) {
        object.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
            material.dispose();
          }
        });
        scene.remove(object);
      }
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [file]);

  const choose = (candidate?: File) => {
    if (!candidate) return;
    setStats(null);
    setError("");
    if (!/\.glb$/i.test(candidate.name)) { setError("Selecione um arquivo .glb."); return; }
    if (candidate.size > MAX_BYTES) { setError("O arquivo excede 100 MB."); return; }
    setFile(candidate);
  };
  return <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", color: "#f7f8fa" }}>
    <h1>Inspetor GLB local</h1>
    <p>Abra um modelo 3D sem API, créditos ou envio do arquivo ao servidor. As dimensões são exibidas em unidades do arquivo, não necessariamente milímetros.</p>
    <label style={{ display: "block", padding: 20, border: "1px dashed #777", cursor: "pointer", marginBottom: 16 }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files[0]); }}>
      Selecionar ou arrastar arquivo GLB
      <input type="file" accept=".glb,model/gltf-binary" style={{ display: "block", marginTop: 12 }} onChange={event => choose(event.target.files?.[0])} />
    </label>
    {file && <p>Arquivo: {file.name}</p>}
    {error && <p role="alert" style={{ color: "#ff9588" }}>{error}</p>}
    <div ref={host} style={{ height: "min(65vh, 620px)", minHeight: 320, border: "1px solid #333", borderRadius: 8 }} />
    {stats && <section aria-label="Estatísticas do modelo" style={{ marginTop: 16 }}>
      <h2>Geometria importada</h2>
      <p>Malhas: {stats.meshes} | Triângulos: {stats.triangles.toLocaleString("pt-BR")} | Vértices: {stats.vertices.toLocaleString("pt-BR")} | Materiais: {stats.materials}</p>
      <p>Dimensões (unidades do arquivo): {stats.width.toFixed(3)} × {stats.height.toFixed(3)} × {stats.depth.toFixed(3)}</p>
      <p>Esta inspeção não certifica que a malha é fechada ou imprimível. Confira escala, espessura e reparos antes de fatiar.</p>
    </section>}
  </main>;
}
