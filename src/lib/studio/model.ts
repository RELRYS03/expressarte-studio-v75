import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontData from "@/assets/studio-font.json";
export type ShapeKind =
  | "circle"
  | "hexagon"
  | "shield"
  | "square"
  | "heart"
  | "star"
  | "oval"
  | "rectangle"
  | "triangle"
  | "pentagon"
  | "octagon"
  | "diamond"
  | "flower"
  | "cross"
  | "arch";
export type ModelConfig = {
  name: string;
  shape: ShapeKind;
  diameter: number;
  thickness: number;
  textHeight: number;
  material: string;
  ring: boolean;
  border: boolean;
};
export const defaultConfig: ModelConfig = {
  name: "EXPRESS ARTE",
  shape: "circle",
  diameter: 80,
  thickness: 3,
  textHeight: 1.2,
  material: "bronze",
  ring: true,
  border: true,
};
export const materials = [
  { id: "bronze", name: "Bronze acetinado" },
  { id: "gold", name: "Dourado" },
  { id: "silver", name: "Prata" },
  { id: "rose", name: "Cobre rosé" },
  { id: "jade", name: "Verde jade" },
  { id: "graphite", name: "Grafite" },
];
export const shapes: { name: string; kind: ShapeKind; category: string }[] = [
  ["Círculo", "circle", "Básicas"],
  ["Hexágono", "hexagon", "Básicas"],
  ["Escudo", "shield", "Especiais"],
  ["Quadrado", "square", "Básicas"],
  ["Coração", "heart", "Especiais"],
  ["Estrela", "star", "Especiais"],
  ["Oval", "oval", "Básicas"],
  ["Retângulo", "rectangle", "Básicas"],
  ["Triângulo", "triangle", "Básicas"],
  ["Pentágono", "pentagon", "Básicas"],
  ["Octógono", "octagon", "Básicas"],
  ["Losango", "diamond", "Básicas"],
  ["Flor", "flower", "Especiais"],
  ["Cruz", "cross", "Especiais"],
  ["Arco", "arch", "Especiais"],
].map(([name = "", kind = "circle", category = "Básicas"]) => ({
  name,
  kind: kind as ShapeKind,
  category,
}));
const font = new FontLoader().parse(fontData);
export function outline(kind: ShapeKind, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  if (kind === "circle" || kind === "oval") {
    shape.absellipse(
      0,
      0,
      radius,
      kind === "oval" ? radius * 0.75 : radius,
      0,
      Math.PI * 2,
      false,
      0,
    );
    return shape;
  }
  if (kind === "heart") {
    shape.moveTo(0, -radius);
    shape.bezierCurveTo(-radius * 1.7, 0, -radius, radius * 1.3, 0, radius * 0.5);
    shape.bezierCurveTo(radius, radius * 1.3, radius * 1.7, 0, 0, -radius);
    return shape;
  }
  if (kind === "shield") {
    shape.moveTo(-radius * 0.85, radius * 0.85);
    shape.lineTo(radius * 0.85, radius * 0.85);
    shape.lineTo(radius * 0.85, 0);
    shape.quadraticCurveTo(radius * 0.7, -radius * 0.65, 0, -radius);
    shape.quadraticCurveTo(-radius * 0.7, -radius * 0.65, -radius * 0.85, 0);
    shape.closePath();
    return shape;
  }
  if (kind === "arch") {
    shape.moveTo(-radius, -radius);
    shape.lineTo(radius, -radius);
    shape.lineTo(radius, 0);
    shape.absarc(0, 0, radius, 0, Math.PI, false);
    shape.closePath();
    return shape;
  }
  if (kind === "square" || kind === "rectangle") {
    const h = kind === "rectangle" ? radius * 0.65 : radius * 0.82;
    const w = radius * 0.82;
    shape.moveTo(-w, -h);
    shape.lineTo(w, -h);
    shape.lineTo(w, h);
    shape.lineTo(-w, h);
    shape.closePath();
    return shape;
  }
  if (kind === "cross") {
    const points: [number, number][] = [
      [-0.3, 1],
      [0.3, 1],
      [0.3, 0.3],
      [1, 0.3],
      [1, -0.3],
      [0.3, -0.3],
      [0.3, -1],
      [-0.3, -1],
      [-0.3, -0.3],
      [-1, -0.3],
      [-1, 0.3],
      [-0.3, 0.3],
    ];
    points.forEach(([x, y], i) =>
      i ? shape.lineTo(x * radius, y * radius) : shape.moveTo(x * radius, y * radius),
    );
    shape.closePath();
    return shape;
  }
  const n =
    kind === "triangle"
      ? 3
      : kind === "pentagon"
        ? 5
        : kind === "hexagon"
          ? 6
          : kind === "octagon"
            ? 8
            : kind === "diamond"
              ? 4
              : kind === "flower"
                ? 24
                : 10;
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r =
      kind === "star"
        ? i % 2
          ? radius * 0.48
          : radius
        : kind === "flower"
          ? radius * (0.86 + 0.14 * Math.cos((i * Math.PI) / 2))
          : radius;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    i ? shape.lineTo(x, y) : shape.moveTo(x, y);
  }
  shape.closePath();
  return shape;
}
function tokenColor(name: string) {
  if (typeof document === "undefined") return new THREE.Color(0.6, 0.4, 0.2);
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Color(0.6, 0.4, 0.2);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  ctx.fillRect(0, 0, 1, 1);
  const p = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(
    (p[0] ?? 0) / 255,
    (p[1] ?? 0) / 255,
    (p[2] ?? 0) / 255,
    THREE.SRGBColorSpace,
  );
}
export function sceneColor(name: string) {
  return tokenColor(name);
}
export function buildModel(config: ModelConfig) {
  const group = new THREE.Group();
  const radius = config.diameter / 2;
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: tokenColor("--model-" + config.material),
    metalness: 0.72,
    roughness: 0.3,
  });
  const geometry = new THREE.ExtrudeGeometry(outline(config.shape, radius), {
    depth: config.thickness,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.65,
    bevelThickness: 0.45,
    curveSegments: 64,
  });
  const base = new THREE.Mesh(geometry, baseMaterial);
  group.add(base);
  if (config.border) {
    const points = outline(config.shape, radius * 0.9).getPoints(128);
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p.x, p.y, config.thickness + 0.6)),
      true,
    );
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 256, 0.65, 8, true), baseMaterial));
  }
  if (config.ring) {
    // The top of a rectangle, heart, etc. is not necessarily at `radius`.
    // Place the connector against the actual outline instead of assuming a circle.
    const centerPoints = outline(config.shape, radius).getPoints(128).filter((p) => Math.abs(p.x) <= radius * 0.05);
    const topY = Math.max(...centerPoints.map((p) => p.y));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.13, 1.9, 12, 64), baseMaterial);
    ring.position.set(0, topY + radius * 0.09, config.thickness * 0.5);
    group.add(ring);
    const connector = new THREE.Mesh(new THREE.BoxGeometry(4, 7, config.thickness), baseMaterial);
    connector.position.set(0, topY, config.thickness * 0.5);
    group.add(connector);
  }
  const words = config.name.trim().split(/\s+/);
  const lines =
    words.length > 1
      ? [
          words.slice(0, Math.ceil(words.length / 2)).join(" "),
          words.slice(Math.ceil(words.length / 2)).join(" "),
        ]
      : words;
  lines.forEach((line, i) => {
    if (!line) return;
    const text = new TextGeometry(line.toUpperCase(), {
      font,
      size: radius * 0.19,
      depth: config.textHeight,
      curveSegments: 4,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.09,
      bevelSegments: 2,
    });
    text.computeBoundingBox();
    const box = text.boundingBox;
    if (!box) return;
    const width = box.max.x - box.min.x;
    const mesh = new THREE.Mesh(text, baseMaterial);
    const scale = Math.min(1, (radius * 1.35) / width);
    mesh.scale.setScalar(scale);
    mesh.position.set(
      (-width * scale) / 2,
      lines.length > 1 ? (i === 0 ? radius * 0.08 : -radius * 0.25) : -radius * 0.07,
      config.thickness + 0.2,
    );
    group.add(mesh);
  });
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}
export function disposeModel(group: THREE.Object3D) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
