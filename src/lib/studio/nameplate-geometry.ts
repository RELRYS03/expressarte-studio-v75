import { ExtrudeGeometry, Path, Shape, Vector3, type BufferGeometry } from "three";
import { createText3DGeometry } from "./text-geometry";

export type NameplateOptions = {
  text: string;
  widthMm?: number;
  heightMm?: number;
  baseThicknessMm?: number;
  reliefHeightMm?: number;
  mountingHoles?: boolean;
  holeDiameterMm?: number;
};

export type NameplateParts = {
  base: BufferGeometry;
  text: BufferGeometry;
};

/**
 * Builds a rounded plaque base and a raised text body with a deliberate
 * 0.2 mm overlap. The caller must boolean-union both bodies before export.
 */
export function createNameplateParts(options: NameplateOptions): NameplateParts {
  const text = options.text.trim();
  const width = options.widthMm ?? 80;
  const height = options.heightMm ?? 30;
  const baseThickness = options.baseThicknessMm ?? 3;
  const reliefHeight = options.reliefHeightMm ?? 1.2;
  const mountingHoles = options.mountingHoles ?? true;
  const holeDiameter = options.holeDiameterMm ?? 4;

  if (!text) throw new Error("Digite o nome ou a frase da placa.");
  if (text.length > 32) throw new Error("Use no máximo 32 caracteres.");
  if (![width, height, baseThickness, reliefHeight, holeDiameter].every(Number.isFinite)) {
    throw new Error("Informe somente dimensões numéricas válidas.");
  }
  if (width < 40 || width > 250 || height < 20 || height > 120) {
    throw new Error("A placa deve ter largura de 40–250 mm e altura de 20–120 mm.");
  }
  if (baseThickness < 1.2 || baseThickness > 8 || reliefHeight < 0.4 || reliefHeight > 4) {
    throw new Error("A base deve ter 1,2–8 mm e o relevo 0,4–4 mm.");
  }
  if (mountingHoles && (holeDiameter < 2 || holeDiameter > 8)) {
    throw new Error("Os furos de fixação devem ter diâmetro de 2–8 mm.");
  }
  if (!mountingHoles && (holeDiameter < 0 || holeDiameter > 8)) {
    throw new Error("O diâmetro do furo deve ficar entre 0 e 8 mm.");
  }

  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = Math.min(3, width / 10, height / 8);
  const shape = new Shape();
  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

  if (mountingHoles) {
    const holeRadius = holeDiameter / 2;
    const edgeOffset = Math.max(holeRadius + 3, 8);
    const holeX = halfWidth - edgeOffset;
    const holeY = halfHeight - edgeOffset;
    for (const x of [-holeX, holeX]) {
      const hole = new Path();
      hole.absarc(x, holeY, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }

  const base = new ExtrudeGeometry(shape, {
    depth: baseThickness,
    bevelEnabled: false,
    curveSegments: 24,
    steps: 1,
  });
  base.computeBoundingBox();
  base.computeVertexNormals();

  let raisedText: BufferGeometry | undefined;
  try {
    const overlap = 0.2;
    const availableWidth = width - 2 * (mountingHoles ? Math.max(8, holeDiameter / 2 + 7) + holeDiameter / 2 + 2 : 8);
    const availableHeight = height * (mountingHoles ? 0.46 : 0.62);
    raisedText = createText3DGeometry({
      text,
      widthMm: availableWidth,
      depthMm: reliefHeight + overlap,
    });

    raisedText.computeBoundingBox();
    const textBounds = raisedText.boundingBox;
    if (!textBounds) throw new Error("Não foi possível medir o texto da placa.");
    const textSize = textBounds.getSize(new Vector3());
    const fitScale = Math.min(1, availableHeight / textSize.y);
    if (fitScale < 1) {
      raisedText.scale(fitScale, fitScale, 1);
      raisedText.computeBoundingBox();
    }

    const finalBounds = raisedText.boundingBox;
    if (!finalBounds) throw new Error("Não foi possível ajustar o texto à placa.");
    const finalSize = finalBounds.getSize(new Vector3());
    if (finalSize.x > availableWidth + 0.02 || finalSize.y > availableHeight + 0.02) {
      throw new Error("O texto não coube na área útil da placa. Reduza o texto.");
    }

    const center = finalBounds.getCenter(new Vector3());
    const verticalOffset = mountingHoles ? -height * 0.035 : 0;
    raisedText.translate(-center.x, -center.y + verticalOffset, baseThickness - overlap);
    raisedText.computeBoundingBox();

    return { base, text: raisedText };
  } catch (error) {
    base.dispose();
    raisedText?.dispose();
    throw error;
  }
}
