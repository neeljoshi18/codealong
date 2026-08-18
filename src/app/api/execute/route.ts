import { hasE2B, runInE2B } from "@/lib/sandbox/e2b";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    language?: string;
    files?: Record<string, string>;
    entrypoint?: string;
    stdin?: string;
  };
  if (!body.files || !body.entrypoint) {
    return Response.json({ error: "files and entrypoint required" }, { status: 400 });
  }

  if (!hasE2B()) {
    return Response.json({
      fallback: "browser",
      error: "E2B_API_KEY not set. Use the in-browser runner.",
    }, { status: 200 });
  }

  try {
    const result = await runInE2B({
      language: body.language ?? "python",
      files: body.files,
      entrypoint: body.entrypoint,
      stdin: body.stdin ?? "",
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({
      ok: false,
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      runtime: "e2b",
      durationMs: 0,
    });
  }
}
