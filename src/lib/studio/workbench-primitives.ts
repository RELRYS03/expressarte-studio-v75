import * as THREE from "three";

export type PrimitiveKind = "cube" | "sphere" | "cylinder" | "cone" | "torus" | "plane";

const labels: Record<PrimitiveKind, string> = {
  cube: "Cubo",
  sphere: "Esfera",
  cylinder: "Cilindro",
  cone: "Cone",
  torus: "Toro",
  plane: "Plano",
};

export function createPrimitive(kind: PrimitiveKind): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  switch (kind) {
    case "cube":
      geometry = new THREE.BoxGeometry(20, 20, 20);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(10, 32, 20);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(10, 10, 20, 32);
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(10, 20, 32);
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(8, 2, 12, 48);
      break;
    case "plane":
      geometry = new THREE.PlaneGeometry(20, 20);
      break;
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0xb47b43,
    metalness: 0.18,
    roughness: 0.48,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = labels[kind];
  mesh.userData["primitive"] = kind;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (kind === "plane") mesh.rotation.x = -Math.PI / 2;
  else mesh.position.y = 10;
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  return mesh;
}
