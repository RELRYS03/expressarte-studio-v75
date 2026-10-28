import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { buildModel, disposeModel, sceneColor, type ModelConfig } from "@/lib/studio/model";
export default function ModelScene({
  config,
  importedGeometry,
  view,
  zoom,
  reset,
  wireframe,
}: {
  config: ModelConfig;
  importedGeometry: THREE.BufferGeometry | null;
  view: string;
  zoom: number;
  reset: number;
  wireframe: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    transform: TransformControls;
    model: THREE.Group | null;
  }>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    scene.background = sceneColor("--viewport");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 10000);
    camera.position.set(110, 135, 165);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // Blender-like navigation: middle drag orbits, Shift+middle drag pans,
    // right drag pans, and the wheel zooms. Left click stays free for selection.
    controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.enableZoom = true;
    controls.target.set(0, 5, 0);
    controls.minDistance = 80;
    controls.maxDistance = 5000;
    controls.maxPolarAngle = Math.PI * 0.51;
    const transform = new TransformControls(camera, renderer.domElement);
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);
    transform.addEventListener("dragging-changed", (event) => {
      controls.enabled = !event.value;
    });
    scene.add(
      new THREE.HemisphereLight(0xfff7e9, 0x79604a, 2.4),
    );
    const key = new THREE.DirectionalLight(0xfff5e7, 4);
    key.position.set(-70, 150, 75);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -100;
    key.shadow.camera.right = 100;
    key.shadow.camera.top = 100;
    key.shadow.camera.bottom = -100;
    key.shadow.bias = -0.001;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd59d, 1.7);
    fill.position.set(80, 30, -60);
    scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 1500),
      new THREE.MeshStandardMaterial({ color: sceneColor("--viewport"), roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.8;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(1000, 100, sceneColor("--grid"), sceneColor("--grid"));
    grid.position.y = -0.7;
    scene.add(grid);
    sceneRef.current = { scene, camera, controls, transform, model: null };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const setMiddleMouseMode = (event: PointerEvent) => {
      if (event.button === 1) {
        controls.mouseButtons.MIDDLE = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      }
    };
    // Run before OrbitControls sees the event, including when Shift is held.
    renderer.domElement.addEventListener("pointerdown", setMiddleMouseMode, true);
    const selectModel = (event: PointerEvent) => {
      if (event.button !== 0 || transform.axis !== null) return;
      const current = sceneRef.current;
      if (!current?.model || !controls.enabled) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(current.model, true).length > 0) {
        transform.attach(current.model);
      } else {
        transform.detach();
      }
    };
    const changeTransformMode = (event: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement ||
          (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)) return;
      if (!transform.object) return;
      if (event.key.toLowerCase() === "g") transform.setMode("translate");
      if (event.key.toLowerCase() === "r") transform.setMode("rotate");
      if (event.key.toLowerCase() === "s") transform.setMode("scale");
      if (event.key === "Escape") transform.detach();
    };
    renderer.domElement.addEventListener("pointerdown", selectModel);
    window.addEventListener("keydown", changeTransformMode);
    const resize = () => {
      const w = element.clientWidth,
        h = element.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", setMiddleMouseMode, true);
      renderer.domElement.removeEventListener("pointerdown", selectModel);
      window.removeEventListener("keydown", changeTransformMode);
      transform.detach();
      scene.remove(transformHelper);
      transform.dispose();
      controls.dispose();
      const current = sceneRef.current;
      if (current?.model) disposeModel(current.model);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
    };
  }, []);
  useEffect(() => {
    const current = sceneRef.current;
    if (!current) return;
    if (current.model) {
      current.transform.detach();
      current.scene.remove(current.model);
      disposeModel(current.model);
    }
    const model = importedGeometry ? new THREE.Group() : buildModel(config);
    if (importedGeometry) {
      const geo = importedGeometry.clone();
      geo.computeBoundingBox();
      const box = geo.boundingBox;
      if (box) geo.translate(-(box.max.x + box.min.x) / 2, -(box.max.y + box.min.y) / 2, -box.min.z);
      const material = new THREE.MeshStandardMaterial({ color: sceneColor("--model-bronze"), metalness: 0.2, roughness: 0.65, side: THREE.DoubleSide });
      model.add(new THREE.Mesh(geo, material));
    }
    model.rotation.x = -Math.PI / 2;
    model.rotation.z = importedGeometry ? 0 : -0.1;
    model.position.y = 1;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) m.wireframe = wireframe;
        });
      }
    });
    current.scene.add(model);
    current.model = model;
  }, [config, wireframe, importedGeometry]);
  useEffect(() => {
    const current = sceneRef.current;
    if (!current) return;
    const { camera, controls } = current;
    let distance = 240;
    let height = 0;
    if (importedGeometry) {
      importedGeometry.computeBoundingBox();
      const bounds = importedGeometry.boundingBox;
      if (bounds) {
        const size = bounds.getSize(new THREE.Vector3());
        distance = Math.max(180, size.length() * 2);
        height = size.z / 2;
      }
    }
    if (view === "2d") camera.position.set(0, height + distance, 1);
    else camera.position.set(distance * 0.45, height + distance * 0.56, distance * 0.7);
    camera.zoom = zoom / 100;
    camera.updateProjectionMatrix();
    controls.target.set(0, height, 0);
    controls.update();
  }, [view, zoom, reset, importedGeometry]);
  return (
    <div className="scene-container" ref={host} aria-label="Cena 3D: clique esquerdo seleciona; botão do meio gira; Shift e botão do meio deslocam; roda aproxima; G move, R gira, S escala" />
  );
}
