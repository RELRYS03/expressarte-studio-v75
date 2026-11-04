import { Vector3, type BufferGeometry } from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontData from "@/assets/studio-font.json";

const font = new FontLoader().parse(fontData);

export type Text3DOptions = {
  text: string;
  widthMm?: number;
  depthMm?: number;
};

/**
 * Creates real extruded text geometry in millimetres.
 * The geometry is centered on X/Y and rests on Z=0 for the Studio's print-bed view.
 */
export function createText3DGeometry(options: Text3DOptions): BufferGeometry {
  const text = options.text.trim();
  const widthMm = options.widthMm ?? 80;
  const depthMm = options.depthMm ?? 3;

  if (!text) throw new Error("Digite um texto para gerar o modelo 3D.");
  if (text.length > 32) throw new Error("Use no máximo 32 caracteres.");
  if (/[\\r\\n\\t]/.test(text)) throw new Error("Use apenas uma linha de texto.");
  if (!Number.isFinite(widthMm) || widthMm < 10 || widthMm > 250) {
    throw new Error("A largura deve ficar entre 10 e 250 mm.");
  }
  if (!Number.isFinite(depthMm) || depthMm < 0.8 || depthMm > 20) {
    throw new Error("A espessura deve ficar entre 0,8 e 20 mm.");
  }

  const unsupported = [...new Set(Array.from(text).filter(
    (character) => !Object.prototype.hasOwnProperty.call(font.data.glyphs, character),
  ))];
  if (unsupported.length) {
    throw new Error(
      `A fonte atual não possui estes caracteres: ${unsupported.join(" ")}. Remova acentos ou símbolos não suportados.`,
    );
  }

  const geometry = new TextGeometry(text, {
    font,
    size: 100,
    depth: depthMm,
    curveSegments: 8,
    bevelEnabled: false,
  });

  geometry.computeBoundingBox();
  const initialBounds = geometry.boundingBox;
  if (!initialBounds) {
    geometry.dispose();
    throw new Error("Não foi possível calcular os limites do texto.");
  }

  const initialSize = initialBounds.getSize(new Vector3());
  const positions = geometry.getAttribute("position");
  if (
    positions.count === 0 ||
    ![initialSize.x, initialSize.y, initialSize.z].every(Number.isFinite) ||
    initialSize.x <= 0 ||
    initialSize.y <= 0 ||
    positions.count > 600_000
  ) {
    geometry.dispose();
    throw new Error("O texto gerou uma geometria vazia ou acima do limite.");
  }

  // Scale only X/Y so the requested extrusion depth remains exact in millimetres.
  const scale = widthMm / initialSize.x;
  geometry.scale(scale, scale, 1);
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    throw new Error("Não foi possível normalizar a geometria do texto.");
  }
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  geometry.translate(-centerX, -centerY, -bounds.min.z);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const finalBounds = geometry.boundingBox;
  if (!finalBounds) {
    geometry.dispose();
    throw new Error("Falha ao finalizar a geometria do texto.");
  }
  const finalSize = finalBounds.getSize(new Vector3());
  if (
    Math.abs(finalSize.x - widthMm) > 0.02 ||
    Math.abs(finalSize.z - depthMm) > 0.02 ||
    ![...positions.array].every(Number.isFinite)
  ) {
    geometry.dispose();
    throw new Error("As dimensões calculadas do texto não passaram na validação.");
  }

  return geometry;
}
