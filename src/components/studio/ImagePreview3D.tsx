import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PrintableMesh } from "@/lib/studio/image3d";

export default function ImagePreview3D({ mesh, topDown, reset }: { mesh: PrintableMesh; topDown: boolean; reset: number }) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; view: THREE.Group } | null>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xede0d1);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    node.append(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 10; controls.maxDistance = 1600;
    controls.target.set(0, 0, 0);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8b6956, 2.5);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(-70, 145, 90);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd5a0, 1.1);
    fill.position.set(80, 75, -65); scene.add(fill);
    const grid = new THREE.GridHelper(400, 40, 0xc0a488, 0xd6bd9e);
    grid.position.y = -0.5; scene.add(grid);
    const view = new THREE.Group(); scene.add(view);
    sceneRef.current = { scene, camera, controls, view };
    const resize = () => {
      if (!node.clientWidth || !node.clientHeight) return;
      renderer.setSize(node.clientWidth, node.clientHeight, false);
      camera.aspect = node.clientWidth / node.clientHeight;
      camera.updateProjectionMatrix();
    };
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(node); resize();
    let animation = 0;
    const animate = () => { animation = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    return () => {
      cancelAnimationFrame(animation); resizeObs.disconnect(); controls.dispose();
      view.traverse((o) => { if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }});
      grid.geometry.dispose(); (grid.material as THREE.Material).dispose();
      renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null;
    };
  }, []);
  useEffect(() => {
    const current = sceneRef.current;
    if (!current) return;
    current.view.children.forEach((object) => {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); }
    });
    current.view.clear();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0xb7834b, roughness: 0.58, metalness: 0.08, side: THREE.DoubleSide });
    const object = new THREE.Mesh(geometry, material);
    object.rotation.x = -Math.PI / 2;
    current.view.add(object);
  }, [mesh]);
  useEffect(() => {
    const current = sceneRef.current;
    if (!current) return;
    const reach = Math.max(mesh.widthMm, mesh.heightMm) * 1.35;
    current.controls.target.set(0, mesh.depthMm / 2, 0);
    current.camera.position.set(topDown ? 0 : reach * 0.7, topDown ? reach * 1.8 : reach * 1.2, topDown ? 0.01 : reach * 1.1);
    current.camera.near = 0.1; current.camera.far = Math.max(5000, reach * 12);
    current.camera.updateProjectionMatrix();
    current.controls.update();
  }, [mesh.widthMm, mesh.heightMm, mesh.depthMm, topDown, reset]);
  return <div className="im3-render" ref={host} aria-label="Pré-visualização 3D interativa. Arraste para girar e role para aproximar." />;
}
