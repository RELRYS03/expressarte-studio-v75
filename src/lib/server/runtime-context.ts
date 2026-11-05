type RuntimeRequest = Request & {
  runtime?: { cloudflare?: { env?: unknown; context?: unknown } };
};

// Nitro's SSR renderer forwards only Request. Cloudflare bindings remain on
// request.runtime.cloudflare rather than the fetch handler's second argument.
export function resolveRuntimeContext(request: Request, env?: unknown, ctx?: unknown) {
  const cloudflare = (request as RuntimeRequest).runtime?.cloudflare;
  return {
    env: env ?? cloudflare?.env,
    ctx: ctx ?? cloudflare?.context,
  };
}
