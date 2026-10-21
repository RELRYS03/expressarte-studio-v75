import {BufferAttribute, BufferGeometry, Vector3, type Mesh} from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";

/** Abre GLB em malha única com objetos fisicamente ainda separados.
 * O editor de STL usa Z como vertical; GLB/Three usa Y-up.
 * As unidades do Tripo não são conhecidas, portanto a altura é normalizada.
 * Materiais e cores GLB permanecem no original, mas não no STL de edição.
 */
export async function convertGlbForStudio(buffer: ArrayBuffer, targetHeightMm = 100): Promise<BufferGeometry> {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || String.fromCharCode(...new Uint8Array(buffer,0,4)) !== "glTF" ||
      view.getUint32(8,true) !== buffer.byteLength)
    throw new Error("O arquivo recebido não é um GLB válido.");
  if (!Number.isFinite(targetHeightMm) || targetHeightMm < 10 || targetHeightMm > 1000)
    throw new Error("Altura de referência inválida.");
  const loader = new GLTFLoader();
  const gltf = await loader.parseAsync(buffer,"");
  gltf.scene.updateMatrixWorld(true);
  const pieces: BufferGeometry[] = [];
  let vertices = 0;
  try {
    gltf.scene.traverse(obj => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;
      if (!mesh.geometry?.getAttribute("position")) return;
      let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      geo.rotateX(Math.PI/2); // Y-up GLB -> Z-up Studio
      const points = geo.getAttribute("position");
      if (points.count % 3 !== 0) {geo.dispose(); throw new Error("Malha GLB inválida.");}
      vertices += points.count;
      if (vertices > 6_000_000) {
        geo.dispose();
        throw new Error("Modelo acima de 2 milhões de triângulos. Simplifique no Blender.");
      }
      pieces.push(geo);
    });
    if (!pieces.length) throw new Error("O GLB não contém malha triangular editável.");
    const positions = new Float32Array(vertices * 3);
    let offset = 0;
    for (const geo of pieces) {
      const position = geo.getAttribute("position");
      for (let i=0;i<position.count;i++) {
        positions[offset++] = position.getX(i);
        positions[offset++] = position.getY(i);
        positions[offset++] = position.getZ(i);
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position",new BufferAttribute(positions,3));
    result.computeBoundingBox();
    const bounds = result.boundingBox;
    if (!bounds) throw new Error("GLB sem dimensões válidas.");
    const size = bounds.getSize(new Vector3());
    const height = size.z > 0.00001 ? size.z : Math.max(size.x,size.y);
    if (!Number.isFinite(height) || height <= 0) throw new Error("Dimensões do GLB inválidas.");
    const scale = targetHeightMm / height;
    result.translate(-(bounds.max.x+bounds.min.x)/2,-(bounds.max.y+bounds.min.y)/2,-bounds.min.z);
    result.scale(scale,scale,scale);
    result.computeVertexNormals();
    result.computeBoundingBox();
    return result;
  } finally {
    pieces.forEach(geo=>geo.dispose());
  }
}
