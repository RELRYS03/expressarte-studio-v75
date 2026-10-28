/**
 * Server-side adapter for a trusted, operator-configured Hunyuan3D endpoint.
 * Never accept the endpoint from user input or expose it to the browser.
 * Timeouts abort HTTP only; they do not cancel GPU work. Do not retry POSTs blindly.
 */
export interface HunyuanGenerationOptions {
  image: string;
  texture?: boolean;
  remove_background?: boolean;
  seed?: number;
  type?: "glb";
}
export interface HunyuanTask {
  uid: string;
}
export type HunyuanStatus =
  | { status: "processing" | "texturing" }
  | { status: "completed"; model_base64: string }
  | { status: "error"; message: string };
export interface HunyuanClientOptions {
  timeoutMs?: number;
  generationTimeoutMs?: number;
  maxModelBytes?: number;
}
export interface HunyuanRequestOptions {
  signal?: AbortSignal;
}

const validUid = (uid: unknown): uid is string =>
  typeof uid === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(uid);
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Checks the GLB 2 container and JSON asset, not mesh topology/printability. */
function validateGlb(bytes: Uint8Array): void {
  const invalid = () => new Error("Hunyuan returned invalid GLB");
  if (bytes.length < 20) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length
  )
    throw invalid();
  let offset = 12;
  let chunks = 0;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw invalid();
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    if (length % 4 !== 0 || offset + 8 + length > bytes.length) throw invalid();
    if (chunks === 0) {
      if (type !== 0x4e4f534a || length === 0) throw invalid();
      let json: unknown;
      try {
        json = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            bytes.subarray(offset + 8, offset + 8 + length),
          ),
        );
      } catch {
        throw invalid();
      }
      if (
        !record(json) ||
        !record(json["asset"]) ||
        json["asset"]["version"] !== "2.0"
      )
        throw invalid();
    } else if (type === 0x4e4f534a || (type === 0x004e4942 && chunks !== 1)) {
      throw invalid();
    }
    chunks++;
    offset += 8 + length;
  }
}

export class Hunyuan3DClient {
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly generationTimeoutMs: number;
  private readonly maxModelBytes: number;

  constructor(
    baseUrl: string,
    private readonly request: typeof fetch = fetch,
    config: HunyuanClientOptions = {},
  ) {
    this.baseUrl = new URL(baseUrl);
    if (!["http:", "https:"].includes(this.baseUrl.protocol))
      throw new Error("Invalid Hunyuan endpoint protocol");
    if (
      this.baseUrl.username ||
      this.baseUrl.password ||
      this.baseUrl.search ||
      this.baseUrl.hash
    )
      throw new Error("Invalid Hunyuan endpoint URL");
    this.baseUrl.pathname = this.baseUrl.pathname.replace(/\/$/, "") + "/";
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.generationTimeoutMs = config.generationTimeoutMs ?? 300_000;
    this.maxModelBytes = config.maxModelBytes ?? 64 * 1024 * 1024;
    for (const value of [
      this.timeoutMs,
      this.generationTimeoutMs,
      this.maxModelBytes,
    ]) {
      if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647)
        throw new Error("Invalid Hunyuan client limit");
    }
  }

  private async call<T>(
    path: string,
    init: RequestInit,
    timeoutMs: number,
    signal: AbortSignal | undefined,
    consume: (response: Response, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort = () => {};
    const aborted = new Promise<never>((_, reject) => {
      const stop = (error: Error) => {
        controller.abort(error);
        reject(error);
      };
      onAbort = () =>
        stop(new DOMException("Hunyuan request cancelled", "AbortError"));
      if (signal?.aborted) onAbort();
      else {
        signal?.addEventListener("abort", onAbort, { once: true });
        timer = setTimeout(
          () =>
            stop(new DOMException("Hunyuan request timed out", "TimeoutError")),
          timeoutMs,
        );
      }
    });
    try {
      return await Promise.race([
        aborted,
        (async () => {
          if (controller.signal.aborted) throw controller.signal.reason;
          const response = await this.request(new URL(path, this.baseUrl), {
            ...init,
            signal: controller.signal,
            redirect: "error",
          });
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`Hunyuan request failed (HTTP ${response.status})`);
          }
          return consume(response, controller.signal);
        })(),
      ]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      controller.abort();
    }
  }

  private async read(
    response: Response,
    limit: number,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    if (Number(response.headers.get("content-length")) > limit) {
      await response.body?.cancel();
      throw new Error("Hunyuan response exceeds size limit");
    }
    const reader = response.body?.getReader();
    if (!reader) return new Uint8Array();
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit)
          throw new Error("Hunyuan response exceeds size limit");
        chunks.push(value);
      }
    } finally {
      signal.removeEventListener("abort", cancel);
      await reader.cancel();
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  private async json(
    response: Response,
    signal: AbortSignal,
    limit = 16_384,
  ): Promise<unknown> {
    const bytes = await this.read(response, limit, signal);
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      throw new Error("Hunyuan returned invalid JSON");
    }
  }

  private post(options: HunyuanGenerationOptions): RequestInit {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, type: "glb" }),
    };
  }

  /** HTTP health only: does not establish GPU readiness. Explicit cancellation propagates. */
  async health({ signal }: HunyuanRequestOptions = {}): Promise<boolean> {
    try {
      return await this.call(
        "health",
        {},
        this.timeoutMs,
        signal,
        async (response, requestSignal) => {
          const payload = await this.json(response, requestSignal);
          return (
            record(payload) &&
            payload["status"] === "healthy" &&
            typeof payload["worker_id"] === "string" &&
            payload["worker_id"].length > 0
          );
        },
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      return false;
    }
  }

  async generate(
    options: HunyuanGenerationOptions,
    { signal }: HunyuanRequestOptions = {},
  ): Promise<Uint8Array> {
    return this.call(
      "generate",
      this.post(options),
      this.generationTimeoutMs,
      signal,
      async (response, requestSignal) => {
        const bytes = await this.read(
          response,
          this.maxModelBytes,
          requestSignal,
        );
        validateGlb(bytes);
        return bytes;
      },
    );
  }

  async start(
    options: HunyuanGenerationOptions,
    { signal }: HunyuanRequestOptions = {},
  ): Promise<HunyuanTask> {
    return this.call(
      "send",
      this.post(options),
      this.timeoutMs,
      signal,
      async (response, requestSignal) => {
        const payload = await this.json(response, requestSignal);
        if (!record(payload) || !validUid(payload["uid"]))
          throw new Error("Hunyuan returned invalid task UID");
        return { uid: payload["uid"] };
      },
    );
  }

  async status(
    uid: string,
    { signal }: HunyuanRequestOptions = {},
  ): Promise<HunyuanStatus> {
    if (!validUid(uid)) throw new Error("Invalid Hunyuan task UID");
    return this.call(
      `status/${uid}`,
      {},
      this.timeoutMs,
      signal,
      async (response, requestSignal) => {
        const payload = await this.json(
          response,
          requestSignal,
          4 * Math.ceil(this.maxModelBytes / 3) + 16_384,
        );
        if (!record(payload))
          throw new Error("Hunyuan returned invalid status");
        switch (payload["status"]) {
          case "processing":
          case "texturing":
            return { status: payload["status"] };
          case "error":
            if (typeof payload["message"] !== "string")
              throw new Error("Hunyuan returned invalid error status");
            // Do not relay upstream paths, stack traces or credentials.
            return { status: "error", message: "Hunyuan generation failed" };
          case "completed": {
            const encoded = payload["model_base64"];
            if (
              typeof encoded !== "string" ||
              encoded.length === 0 ||
              encoded.length > 4 * Math.ceil(this.maxModelBytes / 3) ||
              encoded.length % 4 !== 0 ||
              !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
            )
              throw new Error("Hunyuan returned invalid model base64");
            const decoded = atob(encoded);
            if (decoded.length > this.maxModelBytes)
              throw new Error("Hunyuan response exceeds size limit");
            validateGlb(Uint8Array.from(decoded, (char) => char.charCodeAt(0)));
            return { status: "completed", model_base64: encoded };
          }
          default:
            throw new Error("Hunyuan returned invalid status");
        }
      },
    );
  }
}
