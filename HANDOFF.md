# Code Along — session handoff

**Local path:** `/Users/neelvaanjoshi/Downloads/interactive-youtube`  
**Product name (current):** Code Along (repo: `codealong`). Old name “CodeChronos / Kronos” is retired; user disliked it.  
**Date of handoff:** 2026-08-18  
**Demo URL:** `http://localhost:3000` (dev server may already be running)  
**Primary demo video:** `W6NZfCO5SIk` — Mosh, JavaScript in 1 Hour  
**Secondary demo:** `kqtD5dpn9C8` — Mosh, Python in 1 Hour (still a *syllabus seed*, not screen-accurate)  
**UI default:** UI 2. UI 1 kept at `/watch/[id]?ui=v1`.

No `XAI_API_KEY` was ever set in this project. Featured demos and Run work without it. AI Query/Understand fall back to a local packed-context dump. Screen-clean LLM is skipped.

---

## 1. Product vision (what the human actually wants)

Not a second IDE next to YouTube. Not a fake IDE painted on the video.

**Watching** must be a normal YouTube video. No HUD, no overlay, no “scroll the editor” copy covering the frame. The instructor and the real VS Code in the video stay untouched.

**When the learner wants the code** (hotkey or a button that always works), open a **workbench**: video keeps playing on the left; a real editor on the right is loaded with **exactly the source that is on screen at that timestamp**. They can select, query, edit, run. They should never retype the lesson. Esc goes back to the video. Same player instance — do not remount YouTube or the video restarts.

The original “magical” idea was: interact with the code *in* the video (click the text, scroll it) as if the video itself were a document. **YouTube’s iframe is cross-origin.** We cannot see clicks on a specific line, and we cannot OCR the iframe pixels. Overlays that sit on the editor region either steal YouTube clicks or look fake and drift. That path was tried (UI 2 overlay) and rejected.

**Settled UX for now (UI 2 workbench):**
- Idle = YouTube + a **bottom bar we own** (not an overlay on the picture).
- **Open editor at MM:SS** button, or **E** (after we steal focus back from the iframe).
- Workbench = 34% video / 66% Monaco + Run dock.
- Esc / Back returns to watch.

Long-term still desired if someone solves iframe interaction without wrecking the watch experience. Until then, do not resurrect the transparent-IDE-on-video overlay.

---

## 2. What is true vs what we invented

### Why the editor used to show a `switch` while the video showed `let name = 'Mosh'`

Early “seeds” were **hand-written syllabi with guessed timestamps**, not frame reads. `loadOrStart` treated seeds as `ready` and always won. Later we fetched the real YouTube transcript (captions). Captions are what Mosh *says*, not the buffer. They were never the code source.

At ~19:26–20:24 the video is naming-rules in `index.js`. The fake seed had “control flow” around minute 18.

### What “cache” meant

`data/cache/<videoId>.json` is a reconstruction document (snapshots + transcript + job fields). It is **not** automatically a screen extract. A Tesseract harvest of the 360p file produced tab-title garbage (`Bindexjs`, status bar) and once overwrote good data. That harvest must not be trusted.

### Screen-accurate JS moments (verified by reading frames from the local 360p file)

These live in `src/lib/seeds/mosh-javascript.ts`, `origin: "ocr"`:

| t (s) | File | What’s on screen |
| --- | --- | --- |
| 450 | index.html | Empty HTML5 shell |
| 600 | index.html | Hello World + `console.log` in a script tag |
| 1100 | index.js | `let name = 'Mosh'; console.log(name);` |
| 1224 | index.js | Naming-rules comments + `let firstName;` |
| 1400 | index.js | `const interestRate = 0.3;` then illegal reassignment |
| 1600 | index.js | Primitive literals with type comments |
| 1800 | index.js | Same primitives, `typeof` in the console |
| 2000 | index.js | `person` object + dot notation |
| 2200 | index.js | `selectedColors = ['red', 'blue']` |
| 2600 | index.js | `function greet(name)` + two calls |

Python seed (`kqtD5dpn9C8`) is still a **guessed syllabus**. Do not claim it matches the frame.

Local file already downloaded: `data/videos/W6NZfCO5SIk.mp4` (~55MB, itag 18, 360p). Gitignored.

---

## 3. UI history (do not confuse these)

**UI 1** — `src/components/studio/studio-v1.tsx`  
Split: YouTube + scrollable “video as document” beat list + extracted Monaco. Hidden hatch: `?ui=v1`.

**UI 2 overlay (rejected)** — full-bleed YouTube, fake PyCharm/VS Code chrome on the right 60%, transparent until scroll. Disturbed framing, iframe ate keys, crop didn’t match. Code leftover in `overlay-ide.tsx` is now only `ReachCatcher` (Alt+click). UI 2 **studio** no longer mounts it.

**UI 2 workbench (current default)** — `studio-v2.tsx` exported as `Studio`. Watch + bottom bar + workbench. This is what the human said “the UI seems good now.”

---

## 4. Technical judgments (keep these)

1. **Never send the whole video to an LLM.** Unique code screens in a talking tutorial are ~40–80/hour. Extract only when the user opens the editor, or from a local seek.

2. **Tesseract on 360p cannot read this IDE.** It picks up tabs, status bar (`TSH Resolver`, `Port: 5500`, `UTF-8`), line numbers, console. Crop must be **buffer only**. Even then, 360p OCR is messy (`let name` → garbage). **Do not insert dirty OCR into cache.**

3. **Quality gate > bad extract.** If OCR fails `isCleanCode`, use the nearest clean snapshot within ~70s (same exercise). Never show status-bar text in Monaco.

4. **YouTube iframe eats keyboard.** `E` does not reach `window` while the iframe is focused. Fixes in place: `disablekb: 1`, `tabindex=-1`, `useIframeKeyRescue` (blur iframe / `window.focus` on interval + pointerup), and a **real button** that does not live in the iframe. In the workbench, `E` must not close the editor while typing (ignore keys inside `.monaco-editor`). **Esc** closes.

5. **Do not remount `<YoutubePlayer>`** when opening the workbench or the video restarts. One instance, CSS from full-bleed to left 34%.

6. **`openWorkbench(snapshot?)`** must load **that** snapshot’s files, not `snapshotAt(videoTime)` which can pick a stale seed if timestamps interleave.

7. **`loadOrStart` must not let a fake seed overwrite a real OCR cache.** Prefer cache when `source === "ocr"` or any snapshot `origin` is `ocr`/`cleaned`. Exception: the JS featured seed is now itself `source: "ocr"` (hand-verified frames). If a garbage harvest cache exists, delete `data/cache/W6NZfCO5SIk.json` so the seed reloads.

8. **YouTube media download is hostile.** Without Deno + `--remote-components ejs:github` + Chrome cookies, yt-dlp gets 403 / “page needs to be reloaded”. Deno is at `~/.deno/bin/deno`. Cookies: `YTDLP_COOKIES_FROM_BROWSER=chrome`.

9. **YouTube Gemini / Ask has no public API.** Do not design around it.

10. **Cheap model default:** `grok-4-1-fast-non-reasoning` (`src/lib/ai/client.ts`). Use it only to (a) clean one cropped frame + 20s of transcript, (b) Query / Understand / Explain. **~$0.003–0.01 per clean or question.** $3 ≈ hundreds of opens + questions, not one full-video vision pass.

11. **Sandbox:** never `eval` on the Next server. JS = worker. Python = Pyodide in the browser. E2B only if `E2B_API_KEY` is set.

12. **Zustand `useSyncExternalStore`:** selectors must not return a new `[]` or `Object.keys(...)` every time. Use `EMPTY_TRANSCRIPT`, `EMPTY_SNAPSHOTS`, `EMPTY_FILES` in `store.ts`. This caused “Maximum update depth exceeded” on `TranscriptTicker`.

13. **Human preference:** less that works > more that doesn’t. Do not add overlays, filmstrips, or Alt+click catchers unless they are reliable.

---

## 5. Architecture as it exists

```
Watch page → StudioV2
  useReconstruction  GET /api/videos/:id  (seed or cache)
  useHorizon         POST /api/videos/:id/horizon  (lookahead LLM reconstruct; skipped for seeds)
  useIframeKeyRescue keep hotkeys alive
  YoutubePlayer      IFrame API, disablekb, 50ms time poll
  Bottom bar         Open editor → POST /api/videos/:id/capture → openWorkbench(snapshot)
  Workbench          CodePane + ExperimentDock (Run / explain / stdin)
  AiDrawer           Query / Understand (needs key for real answers)
```

**Capture path (`screen-capture.ts`):**
1. Reuse `data/videos/<id>.mp4` if present.
2. Else yt-dlp itag `18` (360p progressive) with Deno + ejs + Chrome cookies.
3. `ffmpeg -ss <time> -frames:v 1`.
4. `scripts/ocr_frame.py` — crop ~7–50% x, 11–90% y (buffer only), invert if dark, 3× upscale, tesseract `--psm 6`.
5. `extractCodeOnly` / `isCleanCode` — drop chrome lines, require real keywords.
6. If dirty → throw `FRAME_NOT_CODE` → route returns nearest clean snapshot (70s, then 90s fallback).
7. If `XAI_API_KEY` → cheap model cleans OCR only (no whole-frame dump of UI).

**Two clocks:** `videoTime` (player), `codeTime` (editor). Follow is off in the workbench.

**Context pack** (`context-pack.ts`) for every LLM call: videoId, timestamp, transcript window, original code, user code, diff, language, project structure, tutorial summary, selection. This is correct; it was just fed fake code.

---

## 6. Featured IDs and layout of that JS video

`W6NZfCO5SIk` on-screen layout (360p 640×360): **left ~50% VS Code, right ~50% Chrome DevTools**. Activity bar + tabs + status bar are *not* code. Crop must exclude them or Tesseract will paste `UTF-8 LF JavaScript` into Monaco (this is the last bug the human screenshot).

Python video was never frame-verified.

---

## 7. What works vs what does not

**Works**
- Landing + paste URL + featured cards
- UI 2 watch (plain YouTube + bottom bar)
- Open editor button; workbench split; Esc back; player not remounted
- Run JS in a worker / Python via Pyodide
- Selection toolbar (copy / query / understand / experiment)
- ZIP download
- UI 1 via `?ui=v1`
- Local 360p of the JS demo on disk
- Verified JS extracts at the times in §2

**Does not work well / unfinished**
- Live Tesseract at arbitrary times is still noisy at 360p; quality gate + 70s reuse is what saves 19:26
- No 720p local file (sharper OCR) — itag 136 download not completed
- Python featured seed is still invented
- Query/Understand without `XAI_API_KEY` is a local dump, not an explanation
- Transcript-LLM horizon reconstruct invents code (do not use as screen truth)
- Vision pipeline (`vision.ts`) unused by default; do not turn on full-video vision
- `ReachCatcher` unused
- Branding still has a few leftover “Chronos” comments in old files

**Next work (in order)**
1. Confirm 19:26–20:24 opens the clean `let name = 'Mosh'` extract (hard-refresh after cache delete).
2. If live capture still injects chrome, tighten crop / never insert failed OCR (already attempted; verify).
3. Optional: download 720p (`-f 136`) with the same Deno+cookie flags for better OCR.
4. Frame-verify the Python demo the same way as JS (local file + read keyframes + replace `mosh-python.ts`).
5. Only then add `XAI_API_KEY` for OCR cleanup + grounded Query. Keep `grok-4-1-fast-non-reasoning`. One cropped image + 20s transcript per clean.
6. Do not rebuild overlays unless the human asks.

---

## 8. Env / tools on this machine

```
ffmpeg          /usr/local/bin/ffmpeg
tesseract       /usr/local/bin/tesseract 5.5.1
python3         /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
yt-dlp          python3 -m yt_dlp   (2026.07.04)
deno            ~/.deno/bin/deno
Chrome cookies  work with --cookies-from-browser chrome
Node            22.x (create-next-app installed Next 16.3.1, React 19, Tailwind 4)
```

`.env.example` documents `XAI_API_KEY`, `XAI_MODEL`, `E2B_API_KEY`, `YTDLP_COOKIES_FROM_BROWSER`.

---

## 9. Files to attach or @-mention in the next session

Read these first (in this order):

1. `HANDOFF.md` — this file  
2. `src/components/studio/studio-v2.tsx` — current UX  
3. `src/app/watch/[videoId]/page.tsx` — UI 1 vs 2 switch  
4. `src/lib/store.ts` — `openWorkbench`, empty-array constants, experiment clone  
5. `src/lib/pipeline/screen-capture.ts` — download + frame + OCR  
6. `src/lib/pipeline/code-from-ocr.ts` — chrome filter + `isCleanCode`  
7. `src/app/api/videos/[videoId]/capture/route.ts` — reuse / capture / fallback  
8. `src/lib/seeds/mosh-javascript.ts` — **screen-true** JS extracts  
9. `src/lib/seeds/mosh-python.ts` — **not** screen-true  
10. `src/lib/pipeline/run.ts` — seed vs OCR cache vs lookahead  
11. `src/lib/hooks/use-iframe-keys.ts` — why E failed  
12. `src/components/studio/youtube-player.tsx`  
13. `src/lib/ai/client.ts` — cheap model  
14. `src/lib/context-pack.ts` + `src/lib/ai/prompts.ts`  
15. `scripts/ocr_frame.py`  
16. `.env.example`  
17. `src/components/studio/studio-v1.tsx` — only if they ask to revert UI  

Also useful: `src/components/studio/code-pane.tsx`, `experiment-dock.tsx`, `monaco-stage.tsx`, `src/lib/sandbox/browser.ts`.

Do **not** commit: `data/videos/*.mp4`, `data/capture/**`, `data/cache/**` (gitignored).

---

## 10. Copy-paste prompt for the next session

```
Continue Code Along (repo codealong, local /Users/neelvaanjoshi/Downloads/interactive-youtube). Read HANDOFF.md first, then the files listed in section 9.

We are NOT building CodeChronos overlays anymore. Default UX is UI 2 workbench in studio-v2.tsx: plain YouTube + bottom “Open editor at MM:SS” (and E after iframe focus rescue). Workbench = video left, Monaco+Run right, Esc back, do not remount the player.

The human’s last complaint: live OCR dumped VS Code chrome (tabs, TSH Resolver, Port:5500, UTF-8) into the editor at 19:26 while the video showed clean naming-rules JS. We tightened crop + chrome filter + 70s reuse of clean extracts, deleted data/cache/W6NZfCO5SIk.json, and replaced mosh-javascript.ts with frame-verified snapshots (450 html, 600 hello world, 1100 variables, 1224 naming rules, 1400 const, 1600/1800 primitives, 2000 object, 2200 array, 2600 greet).

Your job:
1. Hard-verify Open editor at ~19:26–20:24 shows the clean let name = 'Mosh' / naming comments — no status bar. If cache/hydration still serves dirty OCR, fix loadOrStart/capture and flush cache.
2. Never insert failed/noisy Tesseract into the reconstruction.
3. Do not resurrect full-video LLM vision or the transparent IDE overlay.
4. Python seed is still fake; only improve it by reading real frames from a local download, same method as JS.
5. API key is optional and must stay cheap (grok-4-1-fast-non-reasoning, one cropped frame + short transcript per clean, plus Query).
6. Prefer less that works. Test in the browser.

Featured JS id W6NZfCO5SIk. Local mp4 already at data/videos/W6NZfCO5SIk.mp4. yt-dlp needs: python3 -m yt_dlp --js-runtimes deno:$HOME/.deno/bin/deno --remote-components ejs:github --cookies-from-browser chrome
```
