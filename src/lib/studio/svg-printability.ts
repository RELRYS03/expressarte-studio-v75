/**
 * SVG/image printability diagnostics for FDM. Runs on a caller-supplied raster
 * preview at physical scale; does not perform OCR or change the source SVG.
 * White/transparent background, dark foreground. Values are estimates only.
 */
export type PrintabilityIssue = 'thin-stroke' | 'small-island';
export interface SvgPrintSettings {
  mmPerPixel: number;
  minStrokeMm?: number;
  minIslandAreaMm2?: number;
  alphaThreshold?: number;
  luminanceThreshold?: number;
}
export interface SvgComponentDiagnostic {
  id: number;
  boundsPx: { x: number; y: number; width: number; height: number };
  widthMm: number;
  heightMm: number;
  areaMm2: number;
  estimatedMinStrokeMm: number;
  suggestedStrokeIncreaseMm: number;
  issues: PrintabilityIssue[];
}
export interface SvgPrintabilityReport {
  nozzleMm: 0.4;
  targetStrokeMm: number;
  components: SvgComponentDiagnostic[];
  warnings: string[];
}

export function diagnoseRasterFor04Nozzle(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  settings: SvgPrintSettings,
): SvgPrintabilityReport {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 16_000_000)
    throw new RangeError('Invalid raster dimensions');
  if (rgba.length !== width * height * 4) throw new RangeError('RGBA length mismatch');
  const scale = settings.mmPerPixel;
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError('mmPerPixel must be positive');
  const target = settings.minStrokeMm ?? 0.45;
  const islandArea = settings.minIslandAreaMm2 ?? 0.36;
  const alpha = settings.alphaThreshold ?? 32;
  const lum = settings.luminanceThreshold ?? 225;
  if (!(target > 0) || !(islandArea >= 0)) throw new RangeError('Invalid thresholds');
  const n = width * height;
  const mask = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const k = p * 4;
    const luminosity = (rgba[k] * 299 + rgba[k+1] * 587 + rgba[k+2] * 114) / 1000;
    mask[p] = rgba[k+3] >= alpha && luminosity < lum ? 1 : 0;
  }
  const visited = new Uint8Array(n);
  const components: SvgComponentDiagnostic[] = [];
  const neighbors = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  for (let start = 0; start < n; start++) {
    if (!mask[start] || visited[start]) continue;
    const queue: number[] = [start];
    visited[start] = 1;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], x = p % width, y = Math.floor(p / width);
      minX = Math.min(minX,x); maxX = Math.max(maxX,x);
      minY = Math.min(minY,y); maxY = Math.max(maxY,y);
      for (const [dx,dy] of neighbors) {
        const xx=x+dx, yy=y+dy;
        if (xx<0 || yy<0 || xx>=width || yy>=height) continue;
        const q=yy*width+xx;
        if (mask[q] && !visited[q]) { visited[q]=1; queue.push(q); }
      }
    }
    const boxW = maxX-minX+1, boxH = maxY-minY+1;
    const area = queue.length * scale * scale;
    // Conservative estimate: narrowest occupied row/column *physical* span,
    // measured only within the component bounding box. This is a heuristic,
    // not a true medial-axis minimum stroke width.
    let narrow = Infinity;
    const componentMask = new Set(queue);
    for (let y=minY; y<=maxY; y++) {
      let run=0;
      for (let x=minX; x<=maxX+1; x++) {
        if (x<=maxX && componentMask.has(y*width+x)) run++;
        else { if (run>0) narrow=Math.min(narrow,run); run=0; }
      }
    }
    for (let x=minX; x<=maxX; x++) {
      let run=0;
      for (let y=minY; y<=maxY+1; y++) {
        if (y<=maxY && componentMask.has(y*width+x)) run++;
        else { if (run>0) narrow=Math.min(narrow,run); run=0; }
      }
    }
    const stroke = Number.isFinite(narrow) ? narrow*scale : 0;
    const issues: PrintabilityIssue[] = [];
    if (stroke < target) issues.push('thin-stroke');
    if (area < islandArea) issues.push('small-island');
    components.push({
      id: components.length + 1,
      boundsPx: { x:minX, y:minY, width:boxW, height:boxH },
      widthMm: boxW*scale, heightMm: boxH*scale, areaMm2:area,
      estimatedMinStrokeMm:stroke,
      suggestedStrokeIncreaseMm:Math.max(0,target-stroke), issues,
    });
  }
  return {
    nozzleMm: 0.4,
    targetStrokeMm: target,
    components,
    warnings: [
      'Raster heuristic: antialiasing, curves and diagonal contours can produce false thin-stroke warnings.',
      'Connected components are not letters; OCR and negative-space checks are not implemented.',
      'Passing these thresholds does not guarantee successful printing. Validate with a slicer and actual print.',
    ],
  };
}
