import type { PrintableMesh } from "./image3d";

/** STL binário com escala 1 unidade = 1 mm. Não precisa de dependências externas. */
export function stlBinary(mesh: PrintableMesh): Blob {
  const count = mesh.indices.length / 3;
  if (count > 2_000_000) throw new Error("Malha excede o limite de exportação.");
  const buffer = new ArrayBuffer(84 + count * 50);
  const view = new DataView(buffer);
  const label = new TextEncoder().encode("ExpressArte Studio v7.5 | unidades: mm");
  new Uint8Array(buffer, 0, label.length).set(label);
  view.setUint32(80, count, true);
  const pos = mesh.positions,
    tri = mesh.indices;
  for (let i = 0; i < count; i++) {
    const a = tri[3 * i]!,
      b = tri[3 * i + 1]!,
      c = tri[3 * i + 2]!;
    const ai = a * 3,
      bi = b * 3,
      ci = c * 3;
    const ax = pos[ai]!,
      ay = pos[ai + 1]!,
      az = pos[ai + 2]!;
    const bx = pos[bi]!,
      by = pos[bi + 1]!,
      bz = pos[bi + 2]!;
    const cx = pos[ci]!,
      cy = pos[ci + 1]!,
      cz = pos[ci + 2]!;
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const offset = 84 + i * 50;
    for (const [j, n] of [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz].entries())
      view.setFloat32(offset + j * 4, n, true);
    view.setUint16(offset + 48, 0, true);
  }
  return new Blob([buffer], { type: "model/stl" });
}

/** 3MF OPC padrão; monta ZIP STORE sem dependências (abre em Bambu Studio). */
const utf8 = (str: string) => new TextEncoder().encode(str);
const crcTable = new Uint32Array(256).map((_, n) => {
  let v = n;
  for (let j = 0; j < 8; j++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
  return v >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zipEntries(files: { name: string; data: Uint8Array }[]): Blob {
  const parts: ArrayBuffer[] = [];
  const directory: Uint8Array[] = [];
  let cursor = 0;
  for (const file of files) {
    const name = utf8(file.name),
      size = file.data.length,
      crc = crc32(file.data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true); // UTF-8
    view.setUint16(8, 0, true); // STORE
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    const entry = new Uint8Array(46 + name.length);
    const central = new DataView(entry.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(12, 0, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, name.length, true);
    central.setUint32(42, cursor, true);
    entry.set(name, 46);
    parts.push(header.buffer as ArrayBuffer, new Uint8Array(file.data).buffer as ArrayBuffer);
    directory.push(entry);
    cursor += header.length + size;
  }
  const centralBytes = directory.reduce((n, part) => n + part.length, 0);
  const end = new Uint8Array(22),
    endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralBytes, true);
  endView.setUint32(16, cursor, true);
  return new Blob(
    [...parts, ...directory.map((entry) => entry.buffer as ArrayBuffer), end.buffer as ArrayBuffer],
    { type: "model/3mf" },
  );
}
export function threeMfFile(mesh: PrintableMesh): Blob {
  const v: string[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i]!.toFixed(5);
    const y = mesh.positions[i + 1]!.toFixed(5);
    const z = mesh.positions[i + 2]!.toFixed(5);
    v.push(`<vertex x="${x}" y="${y}" z="${z}"/>`);
  }
  const t: string[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3)
    t.push(
      `<triangle v1="${mesh.indices[i]}" v2="${mesh.indices[i + 1]}" v3="${mesh.indices[i + 2]}"/>`,
    );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${v.join("")}</vertices><triangles>${t.join("")}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
  return zipEntries([
    {
      name: "[Content_Types].xml",
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
      ),
    },
    {
      name: "_rels/.rels",
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
      ),
    },
    { name: "3D/3dmodel.model", data: utf8(xml) },
  ]);
}

/** 3MF com paleta base materials e peças separadas para impressão por cor. */
export function threeMfColoredFile(mesh: PrintableMesh, colors: string[]): Blob {
  const palette = colors
    .slice(0, 8)
    .map((color) => (/^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : "#C58A56"));
  if (palette.length === 0) return threeMfFile(mesh);
  const vertices = Array.from({ length: mesh.positions.length / 3 }, (_, i) => {
    const x = mesh.positions[i * 3]!.toFixed(5),
      y = mesh.positions[i * 3 + 1]!.toFixed(5),
      z = mesh.positions[i * 3 + 2]!.toFixed(5);
    return `<vertex x="${x}" y="${y}" z="${z}"/>`;
  }).join("");
  const baseZ = Math.min(...Array.from(mesh.positions).filter((_, i) => i % 3 === 2));
  const maxZ = Math.max(...Array.from(mesh.positions).filter((_, i) => i % 3 === 2));
  const triangles = Array.from({ length: mesh.indices.length / 3 }, (_, i) => {
    const a = mesh.indices[i * 3]! * 3 + 2,
      b = mesh.indices[i * 3 + 1]! * 3 + 2,
      c = mesh.indices[i * 3 + 2]! * 3 + 2;
    const z = (mesh.positions[a]! + mesh.positions[b]! + mesh.positions[c]!) / 3;
    const layer =
      maxZ <= baseZ
        ? 0
        : Math.min(palette.length - 1, Math.floor(((z - baseZ) / (maxZ - baseZ)) * palette.length));
    return `<triangle v1="${mesh.indices[i * 3]}" v2="${mesh.indices[i * 3 + 1]}" v3="${mesh.indices[i * 3 + 2]}" pid="2" p1="${layer}"/>`;
  }).join("");
  const materials = palette
    .map((color, i) => `<base name="ExpressArte ${i + 1}" displaycolor="${color}FF"/>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:b="http://schemas.microsoft.com/3dmanufacturing/material/2015/02"><resources><basematerials id="2">${materials}</basematerials><object id="1" type="model" name="Medalha ExpressArte"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
  return zipEntries([
    {
      name: "[Content_Types].xml",
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>',
      ),
    },
    {
      name: "_rels/.rels",
      data: utf8(
        '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>',
      ),
    },
    { name: "3D/3dmodel.model", data: utf8(xml) },
  ]);
}
export function saveModel(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20_000);
}
