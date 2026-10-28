/**
 * Adapter for the self-hosted Tencent Hunyuan3D-2.1 FastAPI service.
 * Server-side use only: do not expose a private inference endpoint from the browser.
 * Reference: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/API_DOCUMENTATION.md
 */
export interface HunyuanGenerationOptions {
  image: string; // Base64 or data URL of a PNG/JPEG
  texture?: boolean;
  remove_background?: boolean;
  seed?: number;
  type?: "glb";
}
export interface HunyuanTask {
  uid: string;
}
export interface HunyuanStatus {
  status: string;
  model_base64?: string;
  error?: string;
}
export class Hunyuan3DClient {
  constructor(
    private readonly baseUrl: string,
    private readonly request: typeof fetch = fetch,
  ) {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid Hunyuan endpoint protocol");
  }
  private endpoint(path: string): string {
    return new URL(path.replace(/^\//, ""), this.baseUrl.replace(/\/$/, "") + "/").toString();
  }
  async health(): Promise<boolean> {
    try {
      const result = await this.request(this.endpoint("health"));
      return result.ok;
    } catch {
      return false;
    }
  }
  async generate(options: HunyuanGenerationOptions): Promise<Uint8Array> {
    const response = await this.request(this.endpoint("generate"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, type: "glb" }),
    });
    if (!response.ok) throw new Error(`Hunyuan generation failed (HTTP ${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async start(options: HunyuanGenerationOptions): Promise<HunyuanTask> {
    const response = await this.request(this.endpoint("send"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, type: "glb" }),
    });
    if (!response.ok) throw new Error(`Hunyuan submission failed (HTTP ${response.status})`);
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || typeof (payload as HunyuanTask).uid !== "string")
      throw new Error("Hunyuan returned no task UID");
    return payload as HunyuanTask;
  }
  async status(uid: string): Promise<HunyuanStatus> {
    if (!/^[a-zA-Z0-9_-]+$/.test(uid)) throw new Error("Invalid Hunyuan task UID");
    const response = await this.request(this.endpoint(`status/${uid}`));
    if (!response.ok) throw new Error(`Hunyuan status failed (HTTP ${response.status})`);
    return (await response.json()) as HunyuanStatus;
  }
}
