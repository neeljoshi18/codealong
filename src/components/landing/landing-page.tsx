"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppearance } from "@/lib/hooks/use-appearance";
import { FEATURED_TUTORIALS } from "@/lib/seeds";
import { extractVideoId, thumbnailUrl } from "@/lib/youtube";

export function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { appearance, setAppearance } = useAppearance();

  const go = async (raw: string) => {
    const id = extractVideoId(raw);
    if (!id) {
      setError("Paste a full YouTube URL or an 11-character video ID.");
      return;
    }
    setError("");
    setPending(true);
    router.push(`/watch/${id}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void go(url);
  };

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,160,84,0.08),_transparent_50%)]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-brass/20 font-mono text-sm text-brass">
            C
          </span>
          <span className="text-lg tracking-tight">Code Along</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAppearance(appearance === "light" ? "dark" : "light")}
          >
            {appearance === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
            {appearance === "light" ? "Dark" : "Bright"}
          </Button>
          <span className="text-xs text-mute">Desktop · pointer-first</span>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-6 pb-24 pt-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-brass">
          YouTube tutorials, reconstructed
        </p>
        <h1 className="max-w-2xl text-4xl font-medium leading-[1.15] tracking-tight md:text-5xl">
          Watch the tutorial. Open the editor when you want the code.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-mute">
          The video is just YouTube. The bar at the bottom — or the E key — opens the
          file on screen beside the still-playing video. Edit it. Run JS or Python
          in this tab. Esc goes back. No API key. Featured demos are instant. Other
          links are read from the frame, which needs ffmpeg on this machine or the
          droplet — not the Vercel demo host.
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoFocus
            className="h-12 text-base"
          />
          <Button type="submit" size="lg" disabled={pending}>
            Open
            <ArrowRight className="size-4" />
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-rose">{error}</p>}

        <section className="mt-16">
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.18em] text-mute">
            Instant demos — no API key. Any other link needs a machine that can download the file.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURED_TUTORIALS.map((t) => (
              <button
                key={t.videoId}
                type="button"
                onClick={() => void go(t.videoId)}
                className="group overflow-hidden rounded-xl border border-white/8 bg-white/3 text-left hover:border-brass/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl(t.videoId)}
                  alt=""
                  className="h-36 w-full object-cover opacity-80 transition group-hover:opacity-100"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between text-[11px] text-mute">
                    <span>{t.language}</span>
                    <span>{t.durationLabel}</span>
                  </div>
                  <div className="mt-1 text-[15px] text-paper">{t.title}</div>
                  <div className="text-[12px] text-mute">{t.channel}</div>
                  <p className="mt-2 text-[12px] leading-5 text-mute">{t.blurb}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
