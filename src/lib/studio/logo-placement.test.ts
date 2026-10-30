// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BoxGeometry } from "three";
import { placeRaisedLogo } from "./logo-placement";
describe("logo placement", () => {
  it("centres the logo and overlaps the surface for union", () => {
    const base = new BoxGeometry(50, 30, 3).translate(20, 10, 1.5);
    const logo = new BoxGeometry(10, 5, 1.5).translate(0, 0, 0.75);
    placeRaisedLogo(base, logo);
    logo.computeBoundingBox();
    expect(logo.boundingBox!.min.z).toBeCloseTo(2.75);
    expect((logo.boundingBox!.min.x + logo.boundingBox!.max.x)/2).toBeCloseTo(20);
    expect((logo.boundingBox!.min.y + logo.boundingBox!.max.y)/2).toBeCloseTo(10);
    base.dispose(); logo.dispose();
  });
  it("rejects overlap larger than relief depth", () => {
    const base = new BoxGeometry(10, 10, 2);
    const logo = new BoxGeometry(3, 3, 0.1);
    expect(() => placeRaisedLogo(base, logo)).toThrow();
    base.dispose(); logo.dispose();
  });
});
