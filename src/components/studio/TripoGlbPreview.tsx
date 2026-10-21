import { useEffect, useRef } from "react";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

/** Visualização colorida do GLB original, sem alterar arquivo fonte. */
export default function TripoGlbPreview({file}:{file: Blob}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let active = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#292b30");
    const camera = new THREE.PerspectiveCamera(45,1,.01,500);
    camera.position.set(3,2.5,4);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    const ambient = new THREE.HemisphereLight(0xffffff,0x5f6c85,2.5);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff4df,3);
    key.position.set(3,6,5);
    scene.add(key);
    let object: THREE.Object3D | null = null;
    const loader = new GLTFLoader();
    file.arrayBuffer().then(async buffer => {
      const result = await loader.parseAsync(buffer,"");
      if (!active) return;
      object = result.scene;
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const max = Math.max(size.x,size.y,size.z);
      if (!Number.isFinite(max) || max <= 0) return;
      object.position.sub(bounds.getCenter(new THREE.Vector3()));
      object.scale.multiplyScalar(2.7/max);
      scene.add(object);
      controls.target.set(0,0,0);
      controls.update();
    }).catch(()=>{/* arquivo pode ter texturas externas; o download continua disponível */});
    const resize=()=>{
      if (!active) return;
      const w=element.clientWidth,h=element.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w,h);
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame=0;
    const draw=()=>{frame=requestAnimationFrame(draw);controls.update();renderer.render(scene,camera);};
    draw();
    return ()=>{
      active=false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if(object) {
        object.traverse(child=>{
          if(!(child instanceof THREE.Mesh))return;
          child.geometry?.dispose();
          const mats = Array.isArray(child.material)?child.material:[child.material];
          for(const mat of mats) {
            // Libera texturas embutidas no preview sem afetar o GLB original.
            if(mat instanceof THREE.MeshStandardMaterial) {
              mat.map?.dispose();mat.normalMap?.dispose();mat.roughnessMap?.dispose();mat.metalnessMap?.dispose();
            }
            mat?.dispose();
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  },[file]);
  return <div ref={host} className="expressinho-glb-preview"
    role="img" aria-label="Prévia interativa do modelo 3D; arraste para girar"/>;
}
