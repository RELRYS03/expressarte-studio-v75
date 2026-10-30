// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createLedChannelPart } from "./led-channel";
const opts = { width: 80, height: 45, depth: 20, wall: 2, lidThickness: 1.6 };
describe("LED enclosure prototype", () => {
  for (const part of ["frame", "lid"] as const) {
    it("creates " + part + " with correct dimensions", () => {
      const geometry = createLedChannelPart(part, opts);
      const size = geometry.boundingBox!.getSize(new Vector3());
      expect(size.x).toBeCloseTo(part === "frame" ? 80 : 79.4);
      expect(size.y).toBeCloseTo(part === "frame" ? 45 : 44.4);
      expect(size.z).toBeCloseTo(part === "frame" ? 20 : 1.6);
      expect(Array.from(geometry.getAttribute("position").array).every(Number.isFinite)).toBe(true);
      geometry.dispose();
    });
  }
  it("rejects missing cable-cut support rather than silently creating a solid wall", () => {
    expect(() => createLedChannelPart("frame", { ...opts, wall: 3, cableDiameter: 3 })).toThrow(/corte sólido/);
  });
  it("rejects invalid geometry and thin walls", () => {
    expect(() => createLedChannelPart("frame", { ...opts, wall: 0.5 })).toThrow();
    expect(() => createLedChannelPart("frame", { ...opts, depth: Number.NaN })).toThrow();
  });
});
