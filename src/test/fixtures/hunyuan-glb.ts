// Small GLB 2 fixture containing one triangle, generated from the specification.
export function glb(): Uint8Array<ArrayBuffer> {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
  });
  const jsonBytes = new TextEncoder().encode(
    json.padEnd(Math.ceil(json.length / 4) * 4),
  );
  const bytes = new Uint8Array(12 + 8 + jsonBytes.length + 8 + 36);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(jsonBytes, 20);
  const bin = 20 + jsonBytes.length;
  view.setUint32(bin, 36, true);
  view.setUint32(bin + 4, 0x004e4942, true);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((n, i) =>
    view.setFloat32(bin + 8 + i * 4, n, true),
  );
  return bytes;
}
