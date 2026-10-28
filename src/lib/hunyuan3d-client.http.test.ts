// Real loopback HTTP transport; simulated inference only. No GPU or external service.
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Hunyuan3DClient } from "./hunyuan3d-client";
import { glb } from "../test/fixtures/hunyuan-glb";

type Mode =
  "success" | "failed" | "corrupt" | "unavailable" | "stall" | "stall-body";
const image =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const json = (res: ServerResponse, body: unknown, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

function simulatedService() {
  let mode: Mode = "success";
  let polls = 0;
  const requests: {
    method: string | undefined;
    path: string | undefined;
    body?: unknown;
    contentType?: string;
  }[] = [];
  const errors: unknown[] = [];
  let notifyReceived: () => void = () => {};
  let notifyClosed: () => void = () => {};
  const received = new Promise<void>((resolve) => {
    notifyReceived = resolve;
  });
  const disconnected = new Promise<void>((resolve) => {
    notifyClosed = resolve;
  });
  const server = createServer((req, res) => {
    res.on("close", notifyClosed);
    void handle(req, res).catch((error) => {
      errors.push(error);
      res.destroy();
    });
  });
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const entry: (typeof requests)[number] = {
      method: req.method,
      path: req.url,
    };
    requests.push(entry);
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      entry.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      entry.contentType = req.headers["content-type"] ?? "";
    }
    notifyReceived();
    if (mode === "stall") return;
    if (mode === "unavailable")
      return json(res, { message: "private upstream details" }, 503);
    if (req.method === "GET" && req.url === "/health")
      return json(res, { status: "healthy", worker_id: "simulated" });
    if (req.method === "POST" && req.url === "/send")
      return json(res, { uid: "http-task-1" });
    if (req.method === "GET" && req.url === "/status/http-task-1") {
      if (mode === "failed")
        return json(res, { status: "error", message: "/private/gpu-error" });
      const status = ["processing", "texturing", "completed"][
        Math.min(polls++, 2)
      ];
      return json(
        res,
        status === "completed"
          ? {
              status,
              model_base64: Buffer.from(
                mode === "corrupt" ? new Uint8Array([1, 2, 3]) : glb(),
              ).toString("base64"),
            }
          : { status },
      );
    }
    if (req.method === "POST" && req.url === "/generate") {
      res.writeHead(200, { "Content-Type": "model/gltf-binary" });
      if (mode === "stall-body") {
        res.write(glb().subarray(0, 20));
        return;
      }
      res.end(mode === "corrupt" ? Buffer.from("not a GLB") : glb());
      return;
    }
    json(res, { message: "unknown test route" }, 404);
  }
  return {
    server,
    requests,
    errors,
    received,
    disconnected,
    setMode(value: Mode) {
      mode = value;
    },
  };
}

describe("Hunyuan3DClient over HTTP", () => {
  let service: ReturnType<typeof simulatedService>;
  let url: string;
  let client: Hunyuan3DClient;
  beforeEach(async () => {
    service = simulatedService();
    service.server.listen(0, "127.0.0.1");
    await once(service.server, "listening");
    const address = service.server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing loopback port");
    url = `http://127.0.0.1:${address.port}`;
    client = new Hunyuan3DClient(url, fetch, {
      timeoutMs: 2000,
      generationTimeoutMs: 2000,
    });
  });
  afterEach(async () => {
    if (service.server.listening) {
      const closed = once(service.server, "close");
      service.server.close();
      service.server.closeAllConnections();
      await closed;
    }
    expect(service.errors).toEqual([]);
  });

  it("sends image/options, receives UID, observes progress and downloads the completed GLB", async () => {
    expect(await client.health()).toBe(true);
    const task = await client.start({
      image,
      texture: true,
      remove_background: false,
      seed: 42,
    });
    expect(task.uid).toBe("http-task-1");
    const statuses = [];
    // Bounded test driver, not a production polling implementation.
    for (let attempt = 0; attempt < 3; attempt++)
      statuses.push(await client.status(task.uid));
    expect(statuses.map((value) => value.status)).toEqual([
      "processing",
      "texturing",
      "completed",
    ]);
    const completed = statuses[2]!;
    expect(completed.status).toBe("completed");
    if (completed.status !== "completed") throw new Error("Missing result");
    expect(
      new Uint8Array(Buffer.from(completed.model_base64, "base64")),
    ).toEqual(glb());
    expect(service.requests[1]).toEqual({
      method: "POST",
      path: "/send",
      contentType: "application/json",
      body: {
        image,
        texture: true,
        remove_background: false,
        seed: 42,
        type: "glb",
      },
    });
    expect(service.requests.map((r) => r.path)).toEqual([
      "/health",
      "/send",
      ...Array(3).fill("/status/http-task-1"),
    ]);
  });
  it("receives binary output through synchronous generation", async () => {
    expect(await client.generate({ image })).toEqual(glb());
    expect(service.requests[0]?.body).toEqual({ image, type: "glb" });
  });
  it("reports a failed job without leaking upstream details", async () => {
    const task = await client.start({ image });
    service.setMode("failed");
    expect(await client.status(task.uid)).toEqual({
      status: "error",
      message: "Hunyuan generation failed",
    });
  });
  it("rejects corrupt binary output", async () => {
    service.setMode("corrupt");
    await expect(client.generate({ image })).rejects.toThrow("invalid GLB");
  });
  it("rejects corrupt output returned inside a completed status", async () => {
    service.setMode("corrupt");
    const task = await client.start({ image });
    await client.status(task.uid);
    await client.status(task.uid);
    await expect(client.status(task.uid)).rejects.toThrow("invalid GLB");
  });
  it("handles service unavailable without retrying the submission", async () => {
    service.setMode("unavailable");
    expect(await client.health()).toBe(false);
    await expect(client.start({ image })).rejects.toThrow("HTTP 503");
    expect(service.requests.filter((r) => r.path === "/send")).toHaveLength(1);
  });
  it.each(["stall", "stall-body"] as const)(
    "times out and closes the connection for %s",
    async (mode) => {
      service.setMode(mode);
      const short = new Hunyuan3DClient(url, fetch, {
        generationTimeoutMs: 250,
      });
      await expect(short.generate({ image })).rejects.toMatchObject({
        name: "TimeoutError",
      });
      await service.disconnected;
      expect(service.requests).toHaveLength(1);
    },
  );
  it("cancels an in-flight request after the server receives it", async () => {
    service.setMode("stall");
    const controller = new AbortController();
    const assertion = expect(
      client.generate({ image }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await service.received;
    controller.abort();
    await assertion;
    await service.disconnected;
    expect(service.requests).toHaveLength(1);
  });
  it("handles a stopped server", async () => {
    const closed = once(service.server, "close");
    service.server.close();
    await closed;
    expect(await client.health()).toBe(false);
    await expect(client.start({ image })).rejects.toThrow();
    expect(service.requests).toHaveLength(0);
  });
});
