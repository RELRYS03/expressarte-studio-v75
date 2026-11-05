import { describe, expect, it } from "vitest";
import { resolveRuntimeContext } from "../lib/server/runtime-context";
import { handleTeamAuth } from "../lib/server/team-auth";

describe("Cloudflare bindings through Nitro SSR", () => {
  function runtimeRequest(env: unknown) {
    return Object.assign(new Request("https://studio.example/"), {
      runtime: { cloudflare: { env, context: { waitUntil() {} } } },
    });
  }

  it("reads bindings forwarded on Request by Nitro", async () => {
    const request = runtimeRequest({ PUBLIC_ACCESS: "true" });
    const runtime = resolveRuntimeContext(request);
    expect(runtime.ctx).toBe(request.runtime.cloudflare.context);
    expect(await handleTeamAuth(request, runtime.env)).toBeNull();
  });

  it("uses the private team login when secrets are configured", async () => {
    const request = runtimeRequest({
      TEAM_PASSWORD: "team-password-at-least-24-bytes",
      SESSION_SECRET: "session-secret-at-least-32-bytes-long",
    });
    const response = await handleTeamAuth(request, resolveRuntimeContext(request).env);
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/__auth/login");
  });

  it("keeps explicit handler arguments authoritative", () => {
    const request = runtimeRequest({ PUBLIC_ACCESS: "true" });
    const env = {};
    const ctx = {};
    expect(resolveRuntimeContext(request, env, ctx)).toEqual({ env, ctx });
  });

  it("fails closed without bindings", async () => {
    const request = new Request("https://studio.example/");
    expect((await handleTeamAuth(request, resolveRuntimeContext(request).env))?.status).toBe(503);
  });
});
