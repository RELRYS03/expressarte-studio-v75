import { describe, expect, it } from "vitest";
import { generatedGlbToFile } from "./generated-glb";

function fixture() {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"}} ');
  const bytes = new Uint8Array(20 + json.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, json.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(json, 20);
  return bytes;
}
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

describe("generated GLB handoff", () => {
  it("returns a GLB File for the workshop", () => {
    const bytes = fixture();
    const file = generatedGlbToFile(encode(bytes));
    expect(file.type).toBe("model/gltf-binary");
    expect(file.name).toMatch(/\.glb$/);
    expect(file.size).toBe(bytes.length);
  });
  it("rejects malformed base64 and empty results", () => {
    expect(() => generatedGlbToFile("%%%invalid")).toThrow();
    expect(() => generatedGlbToFile("")).toThrow();
  });
  it("rejects a truncated response before opening the workshop", () => {
    expect(() => generatedGlbToFile(encode(fixture().subarray(0, 24)))).toThrow();
  });
  it("rejects a different format or GLB version", () => {
    const bytes = fixture();
    bytes[0] = 0;
    expect(() => generatedGlbToFile(encode(bytes))).toThrow();
    const version = fixture();
    new DataView(version.buffer).setUint32(4, 1, true);
    expect(() => generatedGlbToFile(encode(version))).toThrow();
  });
});
