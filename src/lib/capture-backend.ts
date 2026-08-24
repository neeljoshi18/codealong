/**
 * Optional live-OCR host (DigitalOcean). Vercel has no ffmpeg, so a droplet
 * can take capture/prepare/status. The droplet is **off** unless
 * CAPTURE_BACKEND_URL is set. Do not default to status.neel.world — a dead
 * origin hangs every watch page for 90s.
 *
 * When the droplet is back: set CAPTURE_BACKEND_URL to
 * https://status.neel.world/codealong-ocr (or the new host) and re-run
 * `.github/workflows/deploy-droplet.yml` via workflow_dispatch.
 */
export function captureBackendOrigin(): string | null {
  const explicit = process.env.CAPTURE_BACKEND_URL?.replace(/\/$/, "");
  return explicit || null;
}

function proxyTimeoutMs(pathname: string): number {
  if (pathname.includes("/capture")) return 90_000;
  return 2_500;
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
      signal: AbortSignal.timeout(proxyTimeoutMs(pathname)),
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
