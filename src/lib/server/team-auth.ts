const LOGIN_PATH = "/__auth/login";
const LOGOUT_PATH = "/__auth/logout";
const SESSION_COOKIE = "expressarte_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const MIN_PASSWORD_BYTES = 24;
const MIN_SESSION_SECRET_BYTES = 32;
const encoder = new TextEncoder();

type AuthEnvironment = {
  TEAM_PASSWORD: string;
  SESSION_SECRET: string;
};

function isAuthEnvironment(value: unknown): value is AuthEnvironment {
  if (value === null || typeof value !== "object") return false;
  const env = value as Record<string, unknown>;
  const password = env["TEAM_PASSWORD"];
  const secret = env["SESSION_SECRET"];
  return (
    typeof password === "string" &&
    encoder.encode(password).length >= MIN_PASSWORD_BYTES &&
    encoder.encode(password).length <= 256 &&
    typeof secret === "string" &&
    encoder.encode(secret).length >= MIN_SESSION_SECRET_BYTES
  );
}

function secureHeaders(contentType: string) {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  };
}

function loginPage(status: number, error = "") {
  const errorMessage = error ? `<p class="error" role="alert">${error}</p>` : "";
  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acesso · Express'Arte Studio</title>
<style>
  :root{font-family:system-ui,sans-serif;color:#36251d;background:#f4eee6}
  body{min-height:100vh;margin:0;display:grid;place-items:center}
  main{width:min(90vw,380px);padding:2rem;border:1px solid #dfd2c4;border-radius:18px;background:#fffaf4;box-shadow:0 16px 48px #36251d18}
  h1{margin-top:0;font-size:1.5rem}p{line-height:1.5;color:#66564d}
  label{display:block;margin:1.25rem 0 .4rem;font-weight:600}
  input,button{box-sizing:border-box;width:100%;padding:.8rem;border-radius:9px;font:inherit}
  input{border:1px solid #b9a99a;background:white}
  button{margin-top:1rem;border:0;background:#8b5739;color:white;font-weight:700;cursor:pointer}
  .error{color:#9a2f22}
</style>
<main>
  <h1>Express'Arte Studio</h1>
  <p>Área privada. Entre com a senha compartilhada da equipe.</p>
  ${errorMessage}
  <form method="post" action="${LOGIN_PATH}">
    <label for="password">Senha da equipe</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
    <button type="submit">Entrar</button>
  </form>
</main>
</html>`,
    { status, headers: secureHeaders("text/html; charset=utf-8") },
  );
}

function logoutPage() {
  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sair · Express'Arte Studio</title>
<style>
  body{font-family:system-ui,sans-serif;min-height:100vh;margin:0;display:grid;place-items:center;background:#f4eee6;color:#36251d}
  main{width:min(90vw,380px);padding:2rem;border:1px solid #dfd2c4;border-radius:18px;background:#fffaf4}
  button{width:100%;padding:.8rem;border:0;border-radius:9px;background:#8b5739;color:white;font:inherit;font-weight:700;cursor:pointer}
</style>
<main><h1>Sair do Express'Arte Studio</h1><p>Isso encerrará esta sessão neste navegador.</p>
<form method="post" action="${LOGOUT_PATH}"><button type="submit">Encerrar sessão</button></form></main>
</html>`,
    { headers: secureHeaders("text/html; charset=utf-8") },
  );
}

function redirect(path: string, cookie?: string) {
  const headers = new Headers({ Location: path, "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1)
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  return difference === 0;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const prefix = `${name}=`;
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return cookie?.slice(prefix.length) ?? null;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function signSession(secret: string, expiresAt: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`expressarte-session-v1:${expiresAt}`),
  );
  return `${expiresAt}.${base64Url(new Uint8Array(signature))}`;
}

async function hasValidSession(request: Request, secret: string) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiryText = token.slice(0, separator);
  if (!/^\d{10}$/.test(expiryText)) return false;
  const expiresAt = Number(expiryText);
  const now = Math.floor(Date.now() / 1_000);
  if (expiresAt <= now || expiresAt > now + SESSION_DURATION_SECONDS) return false;
  const expected = await signSession(secret, expiresAt);
  return constantTimeEqual(token, expected);
}

function sessionCookie(request: Request, value: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_DURATION_SECONDS}; HttpOnly; SameSite=Strict${secure}`;
}

function expiredSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`;
}

function isSameOriginPost(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function handleTeamAuth(request: Request, env: unknown): Promise<Response | null> {
  if (
    env !== null &&
    typeof env === "object" &&
    "PUBLIC_ACCESS" in env &&
    env.PUBLIC_ACCESS === "true"
  )
    return null;

  const { pathname } = new URL(request.url);
  const isLoginPath = pathname === LOGIN_PATH;
  const isLogoutPath = pathname === LOGOUT_PATH;
  const authEnvValid = isAuthEnvironment(env);

  if (isLoginPath && request.method === "GET") {
    if (!authEnvValid)
      return new Response("A autenticação da equipe não está configurada no servidor.", {
        status: 503,
        headers: secureHeaders("text/plain; charset=utf-8"),
      });
    return loginPage(200);
  }

  if (isLoginPath && request.method === "POST") {
    if (!authEnvValid)
      return new Response("A autenticação da equipe não está configurada no servidor.", {
        status: 503,
        headers: secureHeaders("text/plain; charset=utf-8"),
      });
    if (!isSameOriginPost(request))
      return new Response("Solicitação de login inválida.", {
        status: 403,
        headers: secureHeaders("text/plain; charset=utf-8"),
      });

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return loginPage(400, "Não foi possível processar o formulário. Tente novamente.");
    }
    const password = form.get("password");
    if (typeof password !== "string" || password.length > 256)
      return loginPage(401, "Senha incorreta.");
    if (!constantTimeEqual(password, env.TEAM_PASSWORD)) return loginPage(401, "Senha incorreta.");

    const expiresAt = Math.floor(Date.now() / 1_000) + SESSION_DURATION_SECONDS;
    const token = await signSession(env.SESSION_SECRET, expiresAt);
    return redirect("/", sessionCookie(request, token));
  }

  if (isLogoutPath && request.method === "GET") {
    if (!authEnvValid || !(await hasValidSession(request, env.SESSION_SECRET)))
      return redirect(LOGIN_PATH);
    return logoutPage();
  }

  if (isLogoutPath && request.method === "POST") {
    if (!authEnvValid || !(await hasValidSession(request, env.SESSION_SECRET)))
      return redirect(LOGIN_PATH);
    if (!isSameOriginPost(request))
      return new Response("Solicitação de saída inválida.", {
        status: 403,
        headers: secureHeaders("text/plain; charset=utf-8"),
      });
    return redirect(LOGIN_PATH, expiredSessionCookie(request));
  }

  if (!authEnvValid)
    return new Response("A autenticação da equipe não está configurada no servidor.", {
      status: 503,
      headers: secureHeaders("text/plain; charset=utf-8"),
    });

  if (!(await hasValidSession(request, env.SESSION_SECRET))) return redirect(LOGIN_PATH);
  return null;
}
