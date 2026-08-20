"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mark } from "@/components/brand/logo";
import { FEATURED_TUTORIALS } from "@/lib/seeds";
import { thumbnailUrl } from "@/lib/youtube";

/** Unlisted. For recording demos. Not linked from the landing page. */
export default function DemosPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-ink text-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <Mark className="h-7 w-11" />
          <span className="text-[15px] tracking-tight">Code Along</span>
        </Link>
        <Link href="/" className="text-[13px] text-mute hover:text-paper">
          Back
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-6">
        <h1 className="text-3xl tracking-tight">Demos</h1>
        <p className="mt-2 text-sm text-mute">Seeded tutorials. Not on the home page.</p>

        <ul className="mt-10 space-y-3">
          {FEATURED_TUTORIALS.map((t) => (
            <li key={t.videoId}>
              <button
                type="button"
                onClick={() => router.push(`/watch/${t.videoId}`)}
                className="group flex w-full items-center gap-4 border border-line p-3 text-left transition-colors hover:bg-paper hover:text-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl(t.videoId)}
                  alt=""
                  className="h-16 w-28 object-cover grayscale"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{t.title}</span>
                  <span className="block text-[12px] text-mute group-hover:text-ink/60">
                    {t.language} · {t.videoId}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
