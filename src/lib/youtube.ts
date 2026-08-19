const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return raw;

  try {
    const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      const flagged = ["embed", "shorts", "live", "v"];
      if (parts.length >= 2 && flagged.includes(parts[0]) && ID_RE.test(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface YoutubeOEmbed {
  title: string;
  author_name: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
}

export async function fetchOEmbed(videoId: string): Promise<YoutubeOEmbed | null> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(videoId))}&format=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    return (await res.json()) as YoutubeOEmbed;
  } catch {
    return null;
  }
}

interface InnertubePlayer {
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
    shortDescription?: string;
    thumbnail?: { thumbnails?: { url: string }[] };
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        languageCode: string;
        kind?: string;
        name?: { simpleText?: string };
      }>;
    };
  };
}

export async function fetchInnertubePlayer(videoId: string): Promise<InnertubePlayer | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "20.10.38",
          },
        },
        videoId,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as InnertubePlayer;
  } catch {
    return null;
  }
}

export function parseDurationSeconds(player: InnertubePlayer | null): number {
  const raw = player?.videoDetails?.lengthSeconds;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}
