import { afterEach, describe, expect, it, vi } from "vitest";
import { Hunyuan3DClient } from "./hunyuan3d-client";

import { glb } from "../test/fixtures/hunyuan-glb";

const base64 = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
const jsonResponse = (value: unknown) => new Response(JSON.stringify(value));
const setup = (response: Response, config = {}) => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(response);
  return {
    request,
    client: new Hunyuan3DClient("http://localhost:8081/api/", request, config),
  };
};
afterEach(() => vi.useRealTimers());

describe("Hunyuan3DClient", () => {
  it("checks the health contract and preserves a base path", async () => {
    const { request, client } = setup(
      jsonResponse({ status: "healthy", worker_id: "worker-1" }),
    );
    expect(await client.health()).toBe(true);
    expect(String(request.mock.calls[0]![0])).toBe(
      "http://localhost:8081/api/health",
    );
  });
  it.each([
    "ok",
    { status: "healthy" },
    { status: "unhealthy", worker_id: "x" },
    null,
  ])("rejects misleading health: %j", async (payload) => {
    expect(await setup(jsonResponse(payload)).client.health()).toBe(false);
  });
  it("returns false for network failure", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("offline"));
    expect(
      await new Hunyuan3DClient("http://localhost", request).health(),
    ).toBe(false);
  });
  it("submits options as JSON and prevents redirects", async () => {
    const { client, request } = setup(jsonResponse({ uid: "task-1" }));
    expect(
      await client.start({ image: "abc", texture: true, seed: 42 }),
    ).toEqual({ uid: "task-1" });
    expect(String(request.mock.calls[0]![0])).toBe(
      "http://localhost:8081/api/send",
    );
    expect(request.mock.calls[0]![1]).toEqual(
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "abc",
          texture: true,
          seed: 42,
          type: "glb",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it.each(["", "../bad", "a/b", "x".repeat(129)])(
    "rejects UID %s without a request",
    async (uid) => {
      const { client, request } = setup(jsonResponse({}));
      await expect(client.status(uid)).rejects.toThrow(
        "Invalid Hunyuan task UID",
      );
      expect(request).not.toHaveBeenCalled();
    },
  );
  it.each([{}, null, [], { uid: "" }, { uid: "../bad" }, { uid: 1 }])(
    "rejects malformed task response %j",
    async (payload) => {
      await expect(
        setup(jsonResponse(payload)).client.start({ image: "abc" }),
      ).rejects.toThrow("invalid task UID");
    },
  );
  it("normalizes malformed JSON without leaking response content", async () => {
    await expect(
      setup(new Response("secret invalid JSON")).client.start({ image: "abc" }),
    ).rejects.toThrow("Hunyuan returned invalid JSON");
  });
  it.each([401, 403, 404, 422, 429, 500, 503])(
    "rejects HTTP %s",
    async (status) => {
      await expect(
        setup(new Response("secret", { status })).client.start({
          image: "abc",
        }),
      ).rejects.toThrow(`HTTP ${status}`);
    },
  );
  it("handles HTTP failure in generate and status too", async () => {
    await expect(
      setup(new Response("secret", { status: 500 })).client.generate({
        image: "abc",
      }),
    ).rejects.toThrow("HTTP 500");
    await expect(
      setup(new Response("secret", { status: 404 })).client.status("task-1"),
    ).rejects.toThrow("HTTP 404");
    expect(
      await setup(new Response("secret", { status: 503 })).client.health(),
    ).toBe(false);
  });
  it("returns a structurally valid GLB", async () => {
    const bytes = glb();
    expect(
      await setup(new Response(bytes)).client.generate({ image: "abc" }),
    ).toEqual(bytes);
  });
  it.each([
    new Uint8Array(),
    new Uint8Array([1, 2, 3]),
    new TextEncoder().encode("<html>error</html>"),
    new TextEncoder().encode('{"error":"bad"}'),
  ])("rejects non-GLB output", async (bytes) => {
    await expect(
      setup(new Response(bytes)).client.generate({ image: "abc" }),
    ).rejects.toThrow("invalid GLB");
  });
  it.each([
    "magic",
    "version",
    "length",
    "chunk",
    "type",
    "json",
    "asset",
    "truncated",
  ])("rejects broken GLB %s", async (kind) => {
    let bytes = glb();
    const view = new DataView(bytes.buffer);
    if (kind === "magic") view.setUint32(0, 0, true);
    if (kind === "version") view.setUint32(4, 1, true);
    if (kind === "length") view.setUint32(8, bytes.length + 4, true);
    if (kind === "chunk") view.setUint32(12, bytes.length, true);
    if (kind === "type") view.setUint32(16, 0, true);
    if (kind === "json") bytes[20] = 0;
    if (kind === "asset") {
      const pos = new TextDecoder().decode(bytes).indexOf("2.0");
      bytes[pos] = 49;
    }
    if (kind === "truncated") bytes = bytes.slice(0, -4);
    await expect(
      setup(new Response(bytes)).client.generate({ image: "abc" }),
    ).rejects.toThrow("invalid GLB");
  });
  it.each(["processing", "texturing"])("accepts %s status", async (status) => {
    expect(
      await setup(jsonResponse({ status })).client.status("task-1"),
    ).toEqual({ status });
  });
  it("validates the completed model", async () => {
    const payload = { status: "completed", model_base64: base64(glb()) };
    expect(await setup(jsonResponse(payload)).client.status("task-1")).toEqual(
      payload,
    );
  });
  it.each([
    null,
    [],
    {},
    { status: "unknown" },
    { status: "completed" },
    { status: "completed", model_base64: "!!!" },
    { status: "completed", model_base64: "AQID" },
    { status: "error" },
  ])("rejects invalid status payload %j", async (payload) => {
    await expect(
      setup(jsonResponse(payload)).client.status("task-1"),
    ).rejects.toThrow();
  });
  it("sanitizes upstream error messages", async () => {
    expect(
      await setup(
        jsonResponse({ status: "error", message: "/private/secret" }),
      ).client.status("task-1"),
    ).toEqual({ status: "error", message: "Hunyuan generation failed" });
  });
  it("enforces streamed and declared body size limits", async () => {
    await expect(
      setup(new Response(glb()), { maxModelBytes: 32 }).client.generate({
        image: "abc",
      }),
    ).rejects.toThrow("size limit");
    await expect(
      setup(new Response(glb(), { headers: { "Content-Length": "9999" } }), {
        maxModelBytes: 32,
      }).client.generate({ image: "abc" }),
    ).rejects.toThrow("size limit");
    await expect(
      setup(
        jsonResponse({ status: "completed", model_base64: base64(glb()) }),
        { maxModelBytes: 32 },
      ).client.status("task-1"),
    ).rejects.toThrow("invalid model base64");
  });
  it.each(["health", "start", "status", "generate"])(
    "bounds a stalled %s request and aborts transport",
    async (method) => {
      vi.useFakeTimers();
      const request = vi
        .fn<typeof fetch>()
        .mockImplementation(() => new Promise(() => {}));
      const client = new Hunyuan3DClient("http://localhost", request, {
        timeoutMs: 20,
        generationTimeoutMs: 40,
      });
      const result =
        method === "health"
          ? client.health()
          : method === "start"
            ? client.start({ image: "abc" })
            : method === "status"
              ? client.status("task-1")
              : client.generate({ image: "abc" });
      const assertion =
        method === "health"
          ? expect(result).resolves.toBe(false)
          : expect(result).rejects.toMatchObject({ name: "TimeoutError" });
      await vi.advanceTimersByTimeAsync(method === "generate" ? 40 : 20);
      await assertion;
      expect(request.mock.calls[0]![1]!.signal!.aborted).toBe(true);
      expect(request).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("keeps timeout active during body download", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel });
    const { client } = setup(new Response(body), { generationTimeoutMs: 20 });
    const assertion = expect(
      client.generate({ image: "abc" }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    expect(cancel).toHaveBeenCalled();
  });
  it("honors cancellation before dispatch", async () => {
    const { client, request } = setup(jsonResponse({ uid: "task-1" }));
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.start({ image: "abc" }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(request).not.toHaveBeenCalled();
  });
  it("honors in-flight cancellation and cleans timer/listener", async () => {
    vi.useFakeTimers();
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const client = new Hunyuan3DClient("http://localhost", request);
    const assertion = expect(
      client.health({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await assertion;
    expect(request.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });
  it.each([0, -1, NaN, Infinity, 0.5, 2 ** 32])(
    "rejects invalid limits %s",
    (value) => {
      for (const key of ["timeoutMs", "generationTimeoutMs", "maxModelBytes"]) {
        expect(
          () =>
            new Hunyuan3DClient("http://localhost", fetch, { [key]: value }),
        ).toThrow("client limit");
      }
    },
  );
  it.each([
    "file:///tmp/model",
    "https://user:secret@host",
    "https://host?url=x",
    "https://host#x",
  ])("rejects ambiguous endpoint %s", (url) => {
    expect(() => new Hunyuan3DClient(url)).toThrow();
  });
});
