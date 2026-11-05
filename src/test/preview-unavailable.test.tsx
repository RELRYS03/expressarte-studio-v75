// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("three", async (original) => {
  const THREE = await original<typeof import("three")>();
  return {...THREE, WebGLRenderer: class { constructor() { throw new Error("WebGL unavailable"); } }};
});
vi.mock("../components/studio/SoftwareMeshPreview", () => ({default: () => <div role="status">Visualização compatível</div>}));
import ImagePreview3D from "../components/studio/ImagePreview3D";
afterEach(cleanup);
it("keeps the generated file flow usable when WebGL is unavailable", () => {
  render(<ImagePreview3D topDown={false} reset={0} mesh={{positions:new Float32Array(9),indices:new Uint32Array([0,1,2]),widthMm:20,heightMm:20,depthMm:3,triangles:1,volumeMm3:1,regions:1,warnings:[]}}/>);
  expect(screen.getByRole("status").textContent).toContain("Visualização compatível");
});
