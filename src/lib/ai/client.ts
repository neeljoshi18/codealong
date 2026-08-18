import OpenAI from "openai";

/** Cheap default: ~10× less than grok-4.6. Override with XAI_MODEL. */
export const TEXT_MODEL = process.env.XAI_MODEL ?? "grok-4-1-fast-non-reasoning";

export function getXai(): OpenAI | null {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
    timeout: 360_000,
  });
}

export function hasXaiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

export async function completeText(opts: {
  system: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const client = getXai();
  if (!client) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const input: OpenAI.Responses.ResponseInput = [
    { role: "system", content: opts.system },
    ...(opts.history ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: opts.user },
  ];

  const response = await client.responses.create({
    model: TEXT_MODEL,
    input,
  });

  const text = response.output_text?.trim();
  if (text) return text;
  throw new Error("Empty model response");
}

export async function completeVision(opts: {
  prompt: string;
  imageDataUrl: string;
}): Promise<string> {
  const client = getXai();
  if (!client) throw new Error("XAI_API_KEY is not configured");

  const response = await client.responses.create({
    model: TEXT_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: opts.imageDataUrl, detail: "high" },
          { type: "input_text", text: opts.prompt },
        ],
      },
    ],
  });

  return response.output_text?.trim() ?? "";
}

export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{") >= 0 && (raw.indexOf("[") < 0 || raw.indexOf("{") < raw.indexOf("["))
    ? raw.indexOf("{")
    : raw.indexOf("[");
  const end = raw.lastIndexOf(start >= 0 && raw[start] === "[" ? "]" : "}");
  const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
  return JSON.parse(slice) as T;
}
