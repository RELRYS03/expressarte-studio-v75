import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PrintableMesh } from "@/lib/studio/image3d";

/** Render the same exported triangles when the device cannot create WebGL. */
export default function SoftwareMeshPreview({mesh, topDown, reset}: {mesh: PrintableMesh; topDown:boolean;reset:number}) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let dispose = () => {};
    try {
      const renderer = new SVGRenderer();
      renderer.setClearColor(new THREE.Color("#ede0d1"),1);
      renderer.setQuality("high");
      renderer.domElement.style.display = "block";
      renderer.domElement.setAttribute("aria-label","Modelo 3D em visualização compatível. Arraste para girar.");
      element.append(renderer.domElement);
      const scene = new THREE.Scene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.BufferAttribute(mesh.positions,3));
      geometry.setIndex(new THREE.BufferAttribute(mesh.indices,1));
      geometry.computeVertexNormals();
      const material = new THREE.MeshLambertMaterial({color:0xb7834b,side:THREE.DoubleSide});
      const object = new THREE.Mesh(geometry,material);
      object.rotation.x = -Math.PI/2;
      scene.add(object);
      scene.add(new THREE.AmbientLight(0xffffff,1.5));
      const light = new THREE.DirectionalLight(0xffffff,2);
      light.position.set(-100,200,120); scene.add(light);
      const camera = new THREE.PerspectiveCamera(40,1,.1,5000);
      const reach = Math.max(mesh.widthMm,mesh.heightMm,mesh.depthMm) * 1.7;
      camera.position.set(topDown ? 0 : reach*.7, topDown ? reach*1.8 : reach*.85, topDown ? .01 : reach);
      const controls = new OrbitControls(camera,renderer.domElement);
      controls.target.set(0,mesh.depthMm/2,0);
      controls.minDistance = 5; controls.maxDistance = reach*6;
      controls.update();
      const render = () => renderer.render(scene,camera);
      const resize = () => {
        if (!element.clientWidth || !element.clientHeight) return;
        renderer.setSize(element.clientWidth,element.clientHeight);
        camera.aspect = element.clientWidth/element.clientHeight;
        camera.updateProjectionMatrix(); render();
      };
      controls.addEventListener("change",render);
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      dispose = () => { observer.disconnect(); controls.removeEventListener("change",render);controls.dispose();geometry.dispose();material.dispose();renderer.domElement.remove(); };
    } catch { setFailed(true); }
    return () => dispose();
  },[mesh,topDown,reset]);
  return <div style={{height:"100%",width:"100%",position:"relative"}} ref={host}>
    <span role="status" style={{position:"absolute",bottom:10,left:14,fontSize:10,color:"#82684f",pointerEvents:"none"}}>{failed ? "Modelo gerado. Abra o STL ou 3MF no Bambu Studio para visualizar." : "Visualização compatível · arraste para girar"}</span>
  </div>;
}
