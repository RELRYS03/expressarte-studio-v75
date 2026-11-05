import assert from "node:assert/strict";
import worker from "../.output/server/index.mjs";

const origin = "https://studio.example";
const context = { waitUntil() {} };
// Test fixtures only; these values are never deployed.
const env = {
  TEAM_PASSWORD: "smoke-test-team-password-at-least-24-bytes",
  SESSION_SECRET: "smoke-test-session-signing-secret-at-least-32-bytes",
};
const fetchPage = (path, bindings, init) =>
  worker.fetch(new Request(`${origin}${path}`, init), bindings, context);

assert.equal((await fetchPage("/", {})).status, 503);
const gate = await fetchPage("/", env);
assert.equal(gate.status, 303);
assert.equal(gate.headers.get("location"), "/__auth/login");
assert.equal((await fetchPage("/__auth/login", env)).status, 200);

const login = await fetchPage("/__auth/login", env, {
  method: "POST",
  headers: { origin },
  body: new URLSearchParams({ password: env.TEAM_PASSWORD }),
});
assert.equal(login.status, 303);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);

const pages = ["/", "/studio", "/formas", "/projetos", "/catalogo", "/comunidade", "/calculadora", "/mesh-doctor", "/expressinho", "/modelo-ia", "/workbench", "/qa-studio", "/color-studio"];
for (const path of pages) {
  const response = await fetchPage(path, env, { headers: { cookie } });
  assert.equal(response.status, 200, `${path} must render after login`);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /Express/i);
}
assert.equal((await fetchPage("/", { PUBLIC_ACCESS: "true" })).status, 200);
console.log(`Production smoke passed: missing bindings, private login, ${pages.length} pages and explicit public mode.`);
