"use client";

import { FormEvent, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mark } from "@/components/brand/logo";
import { useAppearance } from "@/lib/hooks/use-appearance";
import { extractVideoId } from "@/lib/youtube";

export function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 28 });
  const { appearance, setAppearance } = useAppearance();

  const go = (raw: string) => {
    const id = extractVideoId(raw);
    if (!id) {
      setError("Paste a YouTube URL.");
      return;
    }
    setError("");
    setPending(true);
    router.push(`/watch/${id}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    go(url);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSpot({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-ink text-paper"
      onPointerMove={onMove}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(520px circle at ${spot.x}% ${spot.y}%, color-mix(in srgb, var(--paper) 9%, transparent), transparent 55%)`,
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <Mark className="h-7 w-11" />
          <span className="text-[15px] tracking-tight">Code Along</span>
        </Link>
        <button
          type="button"
          onClick={() => setAppearance(appearance === "light" ? "dark" : "light")}
          className="text-[13px] text-mute transition-colors hover:text-paper"
        >
          {appearance === "light" ? "Dark" : "Light"}
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-88px)] max-w-3xl flex-col justify-center px-6 pb-24">
        <div className="ca-rise group mb-10">
          <Mark className="h-16 w-24 md:h-20 md:w-32" />
        </div>

        <h1 className="ca-rise-delay max-w-xl text-4xl leading-[1.05] tracking-tight md:text-6xl">
          Watch.
          <br />
          Open the code.
        </h1>

        <form onSubmit={onSubmit} className="ca-rise-late mt-12 flex max-w-xl items-end gap-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">YouTube URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube link"
              autoFocus
              className="h-12 w-full border-0 border-b border-paper/25 bg-transparent pb-2 text-[17px] font-bold tracking-tight text-paper outline-none placeholder:font-bold placeholder:text-mute/80 transition-[border-color] duration-200 focus:border-paper"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="group/btn relative h-12 overflow-hidden px-1 text-[17px] tracking-tight disabled:opacity-40"
          >
            <span className="relative z-10 inline-flex items-center gap-1">
              Open
              <span className="inline-block transition-transform duration-200 group-hover/btn:translate-x-0.5">
                →
              </span>
            </span>
            <span className="ca-caret ml-0.5 inline-block h-4 w-px bg-paper align-middle" />
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-mute">{error}</p> : null}

        <p className="ca-rise-late mt-16 text-[13px] text-mute">Press E while it plays.</p>
      </main>
    </div>
  );
}
