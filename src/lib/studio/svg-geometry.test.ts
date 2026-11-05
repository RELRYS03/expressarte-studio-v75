// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateSvgSource } from "./svg-geometry";
describe("SVG import safety", () => {
  it("allows simple path SVG", () => expect(() => validateSvgSource('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 0 L10 10 Z"/></svg>')).not.toThrow());
  it("rejects external references", () => expect(() => validateSvgSource('<svg><use href="https://example.com/x"/></svg>')).toThrow());
  it("rejects script and event handlers", () => {
    expect(() => validateSvgSource('<svg><script>alert(1)</script></svg>')).toThrow();
    expect(() => validateSvgSource('<svg onload="evil()"></svg>')).toThrow();
  });
  it("rejects non-SVG input and oversized sources", () => {
    expect(() => validateSvgSource('not a vector')).toThrow();
    expect(() => validateSvgSource('<svg>'+'a'.repeat(2_000_000)+'</svg>')).toThrow();
  });
});
