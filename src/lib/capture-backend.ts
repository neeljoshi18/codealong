/**
 * Vercel has no ffmpeg. Live OCR runs on the droplet.
 * Until codealong.neel.world DNS is an A record to 206.189.129.31,
 * Vercel proxies capture/prepare/status through the already-live
 * TLS host status.neel.world/codealong-ocr (Caddy → :3001).
 */
export function captureBackendOrigin(): string | null {
  const explicit = process.env.CAPTURE_BACKEND_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL) return "https://status.neel.world/codealong-ocr";
  return null;
}

export async function proxyCaptureIfNeeded(
  request: Request,
  pathname: string,
): Promise<Response | null> {
  const base = captureBackendOrigin();
  if (!base) return null;

  const dest = `${base}${pathname}${new URL(request.url).search}`;
  const headers = new Headers();
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await request.clone().arrayBuffer();

  try {
    const res = await fetch(dest, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      signal: AbortSignal.timeout(90_000),
    });
    const text = await res.text();
    const looksJson = /^\s*[{[]/.test(text);
    if (!looksJson) return null;
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    console.error("capture backend proxy failed", dest, err);
    return null;
  }
}
