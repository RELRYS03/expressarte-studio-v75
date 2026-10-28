/** Conversor de imagem para malhas fechadas. Unidades geométricas: milímetros. */
export type ImageMode = "relevo" | "litofania" | "silhueta";
export type ImageSettings = {
  mode: ImageMode;
  widthMm: number;
  resolution: number;
  baseMm: number;
  heightMm: number;
  minMm: number;
  maxMm: number;
  threshold: number;
  contrast: number;
  invert: boolean;
  silhouetteBase: boolean;
};
export type RasterSource = { width: number; height: number; rgba: Uint8ClampedArray; name: string };
export type PrintableMesh = {
  positions: Float32Array;
  indices: Uint32Array;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  triangles: number;
  volumeMm3: number;
  regions: number;
  warnings: string[];
};
export type MedalSettings = { widthMm: number; baseMm: number; reliefMm: number; borderMm: number; resolution: number; threshold: number };
export const imageDefaults: ImageSettings = {
  mode: "relevo", widthMm: 100, resolution: 128, baseMm: 1.6,
  heightMm: 2.4, minMm: 0.8, maxMm: 3.2, threshold: 140,
  contrast: 1.2, invert: false, silhouetteBase: true,
};
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
function clampInt(v: number, min: number, max: number) { return Math.round(clamp(v, min, max)); }
function luminance(r: number, g: number, b: number) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }

/** Decode em navegador; pixels amostrados com controle de memória e sem requisições externas. */
export async function decodeImage(file: File): Promise<RasterSource> {
  if (file.size > 12 * 1024 * 1024) throw new Error("Imagem muito grande (máximo de 12 MB).");
  if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name)) throw new Error("Use PNG, JPG, WebP ou SVG.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Imagem sem dimensões válidas.");
    const max = 192;
    const scale = Math.min(max / image.naturalWidth, max / image.naturalHeight, 1);
    const width = Math.max(2, Math.round(image.naturalWidth * scale));
    const height = Math.max(2, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("O navegador não suporta Canvas 2D.");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    let rgba: Uint8ClampedArray;
    try { rgba = ctx.getImageData(0, 0, width, height).data.slice(); }
    catch { throw new Error("A imagem contém recursos externos e não pode ser lida com segurança."); }
    if (rgba.length !== width * height * 4) throw new Error("Imagem inválida.");
    return { width, height, rgba, name: file.name };
  } finally { URL.revokeObjectURL(url); }
}

/** Constrói medalha oval com relevo 2,5D a partir dos pixels opacos do SVG/PNG. */
export function makeMedalMesh(src: RasterSource, config: MedalSettings): PrintableMesh {
  const widthMm = clamp(config.widthMm, 35, 120);
  const resolution = clampInt(config.resolution, 48, 192);
  const aspect = Math.max(0.55, Math.min(1, src.height / src.width));
  const heightMm = widthMm * aspect;
  const w = resolution, h = Math.max(32, Math.round(resolution * aspect));
  const pitchX = widthMm / w, pitchY = heightMm / h;
  const base = clamp(config.baseMm, 1.2, 6), relief = clamp(config.reliefMm, 0.4, 3), border = clamp(config.borderMm, 0, 5);
  const threshold = clamp(config.threshold, 1, 254);
  const nx = w + 1, ny = h + 1, points = nx * ny;
  const occupied = new Uint8Array(w * h), tops = new Float32Array(points);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(src.width - 1, Math.floor((x + .5) * src.width / w));
    const sy = Math.min(src.height - 1, Math.floor((y + .5) * src.height / h));
    const at = 4 * (sy * src.width + sx), alpha = src.rgba[at + 3]!;
    const lumin = .2126 * src.rgba[at]! + .7152 * src.rgba[at + 1]! + .0722 * src.rgba[at + 2]!;
    occupied[y * w + x] = alpha > 32 && lumin < threshold ? 1 : 0;
  }
  const inside = (x: number,y: number) => { if (x < 0 || y < 0 || x >= w || y >= h) return false; const px=(x+.5)/w*2-1, py=(y+.5)/h*2-1; return px*px+py*py < 1; };
  for(let y=0;y<=h;y++) for(let x=0;x<=w;x++) { const px=x/w*2-1,py=y/h*2-1; tops[y*nx+x]=base+(px*px+py*py<=Math.max(0,1-border/Math.max(widthMm,heightMm)*2)?relief:0); }
  const positions=new Float32Array(points*2*3); for(let y=0;y<=h;y++)for(let x=0;x<=w;x++){const i=y*nx+x,px=x*pitchX-widthMm/2,py=heightMm/2-y*pitchY,o=i*3;positions[o]=px;positions[o+1]=py;positions[o+2]=tops[i]!;positions[o+points*3]=px;positions[o+points*3+1]=py;positions[o+points*3+2]=0;}
  const faces:number[]=[]; const side=(a:number,b:number)=>faces.push(a+points,b+points,b,a+points,b,a);
  let volume=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const circle=inside(x,y),art=occupied[y*w+x]===1, keep=circle; if(!keep)continue;
    const p=y*nx+x,q=p+1,r=p+nx,s=r+1; faces.push(p,q,s,p,s,r,p+points,s+points,q+points,p+points,r+points,s+points);
    if(!inside(x,y-1))side(p,q);if(!inside(x+1,y))side(q,s);if(!inside(x,y+1))side(s,r);if(!inside(x-1,y))side(r,p);
    if(art){const z=tops[p]!+base;tops[p]=Math.max(tops[p]!,z);tops[q]=Math.max(tops[q]!,z);tops[r]=Math.max(tops[r]!,z);tops[s]=Math.max(tops[s]!,z);}
    volume+=(base+(art?relief:0))*pitchX*pitchY;
  }
  return {positions,indices:new Uint32Array(faces),widthMm,heightMm,depthMm:base+relief,triangles:faces.length/3,volumeMm3:volume,regions:1,warnings:["Medalha 2,5D: as cores do SVG serão representadas como paleta/material no 3MF; confira a atribuição de filamentos no fatiador."]};
}

function pixel(src: RasterSource, x: number, y: number, contrast: number, invert: boolean) {
  const index = 4 * (clampInt(y, 0, src.height - 1) * src.width + clampInt(x, 0, src.width - 1));
  const alpha = src.rgba[index + 3]! / 255;
  const light = luminance(src.rgba[index]!, src.rgba[index + 1]!, src.rgba[index + 2]!);
  // Fundo transparente se comporta como branco; preserva logos PNG recortados.
  const whiteBackground = light * alpha + (1 - alpha);
  const adjusted = clamp((whiteBackground - 0.5) * contrast + 0.5, 0, 1);
  return { darkness: invert ? adjusted : 1 - adjusted, alpha };
}
function components(mask: Uint8Array, w: number, h: number): number {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let components = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    components++;
    let first = 0, end = 1;
    queue[0] = start; visited[start] = 1;
    while (first < end) {
      const point = queue[first++]!, x = point % w, y = (point / w) | 0;
      const neighbors = [x > 0 ? point - 1 : -1, x + 1 < w ? point + 1 : -1,
        y > 0 ? point - w : -1, y + 1 < h ? point + w : -1];
      for (const next of neighbors) if (next >= 0 && mask[next] && !visited[next]) {
        visited[next] = 1; queue[end++] = next;
      }
    }
  }
  return components;
}

/**
 * Constrói malha triangulada indexada com topo, fundo e paredes laterais.
 * Grade da base é cartesiana (XY); altura = Z, com fundo em Z=0.
 * No modo silhueta sem base, cada célula preenchida participa de uma extrusão
 * e seus limites externos recebem paredes próprias.
 */
export function makePrintableMesh(src: RasterSource, settings: ImageSettings): PrintableMesh {
  if (src.width < 2 || src.height < 2 || src.rgba.length !== src.width * src.height * 4) throw new Error("Pixels inválidos.");
  const widthMm = clamp(settings.widthMm, 10, 240);
  const longest = clampInt(settings.resolution, 24, 192);
  const w = src.width >= src.height ? longest : Math.max(2, Math.round(longest * src.width / src.height));
  const h = src.height >= src.width ? longest : Math.max(2, Math.round(longest * src.height / src.width));
  const heightMm = widthMm * h / w;
  const pitchX = widthMm / w, pitchY = heightMm / h;
  const minMm = clamp(settings.minMm, 0.6, 9);
  const maxMm = clamp(settings.maxMm, minMm + 0.2, 12);
  const baseMm = clamp(settings.baseMm, 0.6, 8);
  const raiseMm = clamp(settings.heightMm, 0.2, 15);
  const threshold = clamp(settings.threshold, 1, 254) / 255;
  const contrast = clamp(settings.contrast, 0.25, 3);
  const solidSilhouette = settings.mode === "silhueta" && !settings.silhouetteBase;
  const nx = w + 1, ny = h + 1;
  const hasAlpha = src.rgba.some((value, i) => i % 4 === 3 && value < 240);
  const dark = new Float32Array(w * h);
  const mask = new Uint8Array(w * h);
  let selected = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = ((x + 0.5) * src.width / w) - 0.5;
    const sy = ((h - y - 0.5) * src.height / h) - 0.5;
    const sample = pixel(src, sx, sy, contrast, settings.invert);
    const at = y * w + x;
    dark[at] = hasAlpha && !settings.invert ? sample.darkness * sample.alpha : sample.darkness;
    // Para imagens recortadas, a transparência define o contorno.
    mask[at] = (hasAlpha && !settings.invert ? sample.alpha > 0.5 : sample.darkness >= (1 - threshold)) ? 1 : 0;
    selected += mask[at]!;
  }
  if (solidSilhouette && !selected) throw new Error("Nenhum contorno encontrado. Ajuste o limiar ou inverta a imagem.");
  const regions = settings.mode === "silhueta" ? components(mask, w, h) : 1;
  const topo = new Float32Array(nx * ny);
  let totalHeight = 0;
  const cellHeight = (i: number) => {
    if (settings.mode === "litofania") return minMm + dark[i]! * (maxMm - minMm);
    if (settings.mode === "silhueta") return baseMm + (mask[i] ? raiseMm : 0);
    return baseMm + dark[i]! * raiseMm;
  };
  let maxHeight = 0;
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    let sum = 0, count = 0;
    for (let yy = y - 1; yy <= y; yy++) for (let xx = x - 1; xx <= x; xx++) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      sum += cellHeight(yy * w + xx); count++;
    }
    const height = solidSilhouette ? raiseMm : sum / count;
    topo[y * nx + x] = height;
    if (height > maxHeight) maxHeight = height;
  }
  const points = nx * ny;
  const positions = new Float32Array(points * 2 * 3);
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) {
    const i = y * nx + x, px = x * pitchX - widthMm / 2, py = y * pitchY - heightMm / 2;
    const o = i * 3;
    positions[o] = px; positions[o + 1] = py; positions[o + 2] = topo[i]!;
    const ob = (i + points) * 3;
    positions[ob] = px; positions[ob + 1] = py; positions[ob + 2] = 0;
  }
  const faces: number[] = [];
  const active = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && Boolean(mask[y * w + x]);
  const side = (a: number, b: number) => { faces.push(a + points, b + points, b, a + points, b, a); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const used = !solidSilhouette || active(x,y);
    if (!used) continue;
    const p = y * nx + x, q = p + 1, r = p + nx, s = r + 1;
    faces.push(p, q, s, p, s, r, p + points, s + points, q + points, p + points, r + points, s + points);
    if (y === 0 || (solidSilhouette && !active(x, y - 1))) side(p, q);
    if (x === w - 1 || (solidSilhouette && !active(x + 1, y))) side(q, s);
    if (y === h - 1 || (solidSilhouette && !active(x, y + 1))) side(s, r);
    if (x === 0 || (solidSilhouette && !active(x - 1, y))) side(r, p);
    totalHeight += solidSilhouette ? raiseMm : (
      topo[p]! + topo[q]! + topo[r]! + topo[s]!
    ) / 4;
  }
  const warnings: string[] = [];
  if (settings.mode === "silhueta" && regions > 1) warnings.push(
    `${regions} regiões separadas na silhueta. Use a base para manter os detalhes unidos.`,
  );
  if (solidSilhouette) warnings.push("Silhueta sem base: partes desconectadas podem sair separadas no fatiador.");
  if (settings.mode === "litofania") warnings.push("Litofania: imprima preferencialmente na vertical e ilumine por trás.");
  if (widthMm > 256 || heightMm > 256 || maxHeight > 256) warnings.push("Dimensão excede o volume nominal de 256 × 256 × 256 mm da Bambu Lab A1; reduza a escala.");
  if (pitchX < 0.4 || pitchY < 0.4) warnings.push("Detalhes inferiores a 0,4 mm podem não ser reproduzidos pelo bico padrão.");
  return {
    positions, indices: new Uint32Array(faces), widthMm, heightMm, depthMm: maxHeight,
    triangles: faces.length / 3, volumeMm3: totalHeight * pitchX * pitchY,
    regions, warnings,
  };
}

/** Contagem de arestas triangulares para detectar superfícies abertas; para diagnóstico leve. */
export function verifyClosed(mesh: PrintableMesh) {
  const edges = new Map<string, number>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = mesh.indices[i + j]!, b = mesh.indices[i + ((j + 1) % 3)]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return { closed: [...edges.values()].every((v) => v === 2), nonManifoldEdges: [...edges.values()].filter((v) => v !== 2).length };
}
