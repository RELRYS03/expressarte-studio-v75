import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleTeamAuth } from "../lib/server/team-auth";

const password = "a-strong-team-password-with-32-chars";
const secret = "session-secret-for-hmac-signing-at-least-32-bytes";
const env = { TEAM_PASSWORD: password, SESSION_SECRET: secret };

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://studio.example${path}`, init);
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("team access gate", () => {
  it("allows public access when explicitly enabled", async () => {
    const response = await handleTeamAuth(request("/"), { PUBLIC_ACCESS: "true" });
    expect(response).toBeNull();
  });

  it("redirects unauthenticated requests to the login page", async () => {
    const response = await handleTeamAuth(request("/"), env);
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/__auth/login");
  });

  it("fails closed when the required server secrets are missing", async () => {
    const response = await handleTeamAuth(request("/"), {});
    expect(response?.status).toBe(503);
  });

  it("refuses login requests from another origin", async () => {
    const response = await handleTeamAuth(
      request("/__auth/login", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
        body: new URLSearchParams({ password }),
      }),
      env,
    );
    expect(response?.status).toBe(403);
  });

  it("accepts the team password and grants access with a signed secure cookie", async () => {
    const login = await handleTeamAuth(
      request("/__auth/login", {
        method: "POST",
        headers: { origin: "https://studio.example" },
        body: new URLSearchParams({ password }),
      }),
      env,
    );
    const cookie = login?.headers.get("set-cookie");
    expect(login?.status).toBe(303);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");

    const authenticated = await handleTeamAuth(
      request("/", { headers: { cookie: cookie!.split(";")[0]! } }),
      env,
    );
    expect(authenticated).toBeNull();
  });

  it("rejects incorrect passwords and forged session cookies", async () => {
    const login = await handleTeamAuth(
      request("/__auth/login", {
        method: "POST",
        headers: { origin: "https://studio.example" },
        body: new URLSearchParams({ password: "incorrect password" }),
      }),
      env,
    );
    expect(login?.status).toBe(401);

    const forged = await handleTeamAuth(
      request("/", { headers: { cookie: "expressarte_session=9999999999.forged" } }),
      env,
    );
    expect(forged?.headers.get("location")).toBe("/__auth/login");
  });
});
