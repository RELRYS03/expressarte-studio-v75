import { describe, expect, it, vi } from "vitest";
import { Hunyuan3DClient } from "./hunyuan3d-client";

describe("Hunyuan3DClient", () => {
  it("checks a running service", async () => {
    const request = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    const client = new Hunyuan3DClient("http://localhost:8081", request);
    expect(await client.health()).toBe(true);
    expect(request).toHaveBeenCalledWith("http://localhost:8081/health");
  });
  it("submits image generation using the documented API", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ uid: "task-1" }), { status: 200 }),
    );
    const client = new Hunyuan3DClient("http://localhost:8081/", request);
    expect(await client.start({ image: "abc", texture: true })).toEqual({ uid: "task-1" });
    expect(request).toHaveBeenCalledWith(
      "http://localhost:8081/send",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ image: "abc", texture: true, type: "glb" }) }),
    );
  });
  it("rejects malformed task IDs before making a request", async () => {
    const request = vi.fn();
    const client = new Hunyuan3DClient("http://localhost:8081", request);
    await expect(client.status("../bad")).rejects.toThrow("Invalid Hunyuan task UID");
    expect(request).not.toHaveBeenCalled();
  });
  it("reports HTTP errors without exposing service response content", async () => {
    const request = vi.fn().mockResolvedValue(new Response("secret", { status: 500 }));
    const client = new Hunyuan3DClient("http://localhost:8081", request);
    await expect(client.start({ image: "abc" })).rejects.toThrow("HTTP 500");
  });
  it("returns binary GLB output", async () => {
    const request = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    const client = new Hunyuan3DClient("http://localhost:8081", request);
    expect(Array.from(await client.generate({ image: "abc" }))).toEqual([1, 2, 3]);
  });
});
