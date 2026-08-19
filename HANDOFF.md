# Code Along — session handoff

**Local path:** `/Users/neelvaanjoshi/Downloads/interactive-youtube`  
**GitHub:** `https://github.com/neeljoshi18/codealong`  
**Product name:** Code Along (repo `codealong`). Old names CodeChronos / Kronos are retired.  
**Date of this handoff:** 2026-08-19  
**Demo URL:** `http://localhost:3000` (a `next dev` may already be listening)  
**UI default:** UI 2 workbench (`studio-v2.tsx`). UI 1 hatch: `/watch/[id]?ui=v1`.

No `XAI_API_KEY` has ever been set in this project. Featured demos and Run work without it. Query/Understand fall back to a local packed-context dump. Screen-clean LLM is skipped. Keep the key optional and cheap.

Git: `main...origin/main` with a large uncommitted working tree (UI 2 workbench, live read, evolving merge, C++ seed). Do **not** commit `data/videos/*.mp4`, `data/capture/**`, `data/cache/**` (gitignored).

---

## 1. Product vision (what the human actually wants)

Not a second IDE next to YouTube. Not a fake IDE painted on the video.

**Watching** is a normal YouTube video. No HUD, no overlay, no copy covering the frame.

**When the learner wants the code** (button or E), open a **workbench**: video keeps playing on the left; Monaco on the right loads the source that belongs at that timestamp. They can select, query, edit, run. They should never retype the lesson. Esc / red traffic-light closes the editor. **Same player instance** — do not remount YouTube or the video restarts from 0.

YouTube’s iframe is cross-origin. We cannot click lines in the iframe or OCR iframe pixels. The transparent-IDE-on-video overlay was tried and **rejected**. Do not resurrect it. Do not send the whole video to an LLM.

### Two kinds of coding tutorials (this is now first-class)

1. **Episodes** (`tutorialKind: "episodes"`) — instructor starts a fresh example (Mosh JS). Current file = what’s on screen. `lesson.js` stitches completed examples as tabs.
2. **Evolving** (`tutorialKind: "evolving"`) — one file grows for the whole video (CodeBeauty C++ OOP). The editor is **one document**. New rows are merged in. When the viewport scrolls, missing top-of-file lines are recovered from earlier frames. By the end the buffer should be the full program.

The human’s last explicit test request: leave the C++ editor open and watch it grow every ~5s without close/reopen; at scrolled times (e.g. 21:00) the `#include` / `class Employee` that left the frame must still be in Monaco.

---

## 2. Featured videos

| id | What | Kind | Local mp4 | Seed |
| --- | --- | --- | --- | --- |
| `W6NZfCO5SIk` | Mosh, JavaScript in 1 Hour | episodes | `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/W6NZfCO5SIk.mp4` (~55MB, 360p itag 18) | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-javascript.ts` **screen-true** |
| `wN0x9eZLix4` | freeCodeCamp / CodeBeauty, OOP in C++ (~90 min) | evolving | `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/wN0x9eZLix4.mp4` (~157MB, 360p itag 18) | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/cpp-oop.ts` **screen-true, one growing `main.cpp`** |
| `kqtD5dpn9C8` | Mosh, Python in 1 Hour | episodes (syllabus) | **not downloaded** | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-python.ts` **guessed, not frame-true** |

### Mosh JS on-screen layout (360p 640×360)

Left ~50% VS Code, right ~50% Chrome DevTools. Tabs + status bar (`TSH Resolver`, `Port: 5500`, `UTF-8 LF`) are **not** code.

Verified moments (also `1166` naming-rules alias so 19:26 hits):

| t (s) | File | On screen |
| --- | --- | --- |
| 450 | index.html | Empty HTML5 shell |
| 600 | index.html | Hello World + `console.log` |
| 1100 | index.js | `let name = 'Mosh'; console.log(name);` |
| 1166 / 1224 | index.js | Naming-rules comments + `let firstName;` |
| 1400 | index.js | `const interestRate` illegal reassignment |
| 1600 / 1800 | index.js | Primitive literals |
| 2000 | index.js | `person` object |
| 2200 | index.js | `selectedColors` array |
| 2600 | index.js | `function greet` |

### CodeBeauty C++ on-screen layout (360p 640×360)

Visual Studio, file `CodeBeauty.OOP.cpp` (we store `main.cpp`). Editor ~left 62%. Solution Explorer mid-right. Webcam bottom-right. Windows taskbar at the bottom. **The file scrolls.** Later frames start at line 8–50; `#include` / `class Employee {` are off-screen.

Verified / reconstructed full-file beats in `cpp-oop.ts`:

| t (s) | Label |
| --- | --- |
| 360 | Empty `main` |
| 420 | Empty `Employee` class |
| 480 | Name + Company |
| 600 | Age + `employee1` |
| 720 | `private` |
| 900 | `public` fields assigned (`Saldina`, `YT-CodeBeauty`) |
| 1140 | `IntroduceYourself` + two employees |
| 1500 / 1860 | Constructor |
| 2220 | Encapsulation getters/setters |
| 2940 | `AbstractEmployee` + `AskForPromotion` |
| 3660 | `Developer` subclass |
| 4020 | `FixBug` + public inheritance |
| 4380 | `Teacher` |
| 5100 | `virtual Work()` polymorphism |

C++ does **not** Run in the browser (no compiler). Do not pretend it does.

---

## 3. UI as it exists now (UI 2)

Idle = full-bleed YouTube + **bottom bar we own**.

- **Open editor** button is **zinc/white**, not brass.
- **Bright** / **Dark** theme toggle (`data-theme` on `<html>`, persisted `localStorage["codealong-theme"]`).
- `?t=1166` / `?t=19:26` seeks on load. Player applies a pending seek in `onReady`.
- Workbench: **video always larger than the editor**. Default video share **58%**, min **52%**, max **78%**. Drag the 1.5px splitter.
- Traffic lights in the editor chrome **work**:
  - Red = close editor (same as Esc). Do not remount the player.
  - Yellow = minimize editor (video → 78%).
  - Green = expand editor (video → 52%, still ≥ half).
- Header shows `Code at MM:SS · following video` and live status: `Reading screen…` / `Updated MM:SS · next read in 5s`.
- If the user types, follow pauses until **Resume follow**.

Do not remount `<YoutubePlayer>` when opening/closing the workbench or the video restarts at 0.

---

## 4. Live read + reopen (bugs we already hit)

### Reopen used to crash

Monaco reused URI `inmemory://codechronos/index.js`. Second open called `createModel` on the same URI → throw → looked broken → human reloaded → YouTube started at 0.

**Fix:** `monaco-stage.tsx` reuses `monaco.editor.getModel(uri)` and **disposes models on unmount**. Open is **instant** (`nearestSnapshot` then background `force` capture). The Open button is **never stuck on busy**.

### `FRAME_NOT_CODE` used to surface as “something is wrong”

Gaps between seeds are often >70s. OCR of a talking-head frame failed and the API returned raw `FRAME_NOT_CODE`.

**Fix:** capture **never** returns that string to the client. Always a snapshot: OCR if clean, else nearest known extract + a human note.

### 5s auto-read used to no-op

`use-live-screen.ts` skipped any time within 8s of a seed, which is most of Mosh JS.

**Fix:** every **5 seconds** while the workbench is open, `readScreen(..., { live: true, force: true })`. First live tick waits 5s because open already forced a read. `inFlight` + AbortController; close aborts. Unique ffmpeg frame filenames so two reads don’t clobber.

### Player time 0 used to wipe a mid-video open

IFrame starts at 0. Poll overwrote `videoTime` and follow replaced the buffer with the first snapshot.

**Fix:** `youtube-player.tsx` ignores t≈0 while a pending seek has not landed. `setVideoTime` ignores t<1.5s if `experimentSourceTime > 8`.

---

## 5. Evolving merge + cutoff (C++ test)

`/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/code-story.ts`

- `classifyTutorial` → `episodes` | `evolving` (C++ seed is **forced** `tutorialKind: "evolving"` in composeSeed: `seed.tutorialKind ?? classify(...)`).
- **Episodes:** `filesForMoment` keeps current screen file + last versions of other files + `lesson.js` / `lesson.html` stitch.
- **Evolving:** `filesForMoment` uses the **latest full snapshot ≤ time** (do **not** walk-merge complete seeds — that duplicated `#include` / `class Employee`). Live OCR viewports are merged with `mergeEvolving(previousBuffer, incoming)`.
- `mergeEvolving`: keep scrolled-away prefix; append incoming window; expand VS `{ ... }` stubs from the previous full function; **never shrink** the document if overlap is high.
- `recoverCutoff` is `mergeEvolving`. Capture applies it whenever a prior same-file snapshot exists.
- `applyLiveSnapshot` for evolving merges into `experimentFiles[active]`, so 5s reads **add rows**.

Verified: force capture at **1260s** (scrolled; `#include` off screen) returned the full file, label `filled from earlier frame`. Browser: `?t=900` = public fields only; `?t=21:00` = `#include` + `IntroduceYourself`.

Tesseract on this VS + talking-head 360p is still messy. Seeds + merge are what make 21:00 look complete. Do not insert raw OCR that fails `isCleanCode`.

---

## 6. Technical judgments (keep these)

1. Never send the whole video to an LLM. Extract on open + 5s live while the editor is open, from a **local** mp4 seek.
2. Tesseract 360p cannot read IDE chrome. Crop buffer-only. **Never persist dirty OCR.**
3. Quality gate: `isCleanCode` / `hasIdeChrome` / `looksGarbledOcr` on the **stored** text, not only the filtered check. `isCleanCode` now accepts C++ (`#include`, `class`, `public`, `std::`).
4. YouTube iframe eats keys. `disablekb: 1`, `tabindex=-1`, `useIframeKeyRescue`, real button. Ignore E inside `.monaco-editor`. Esc closes.
5. Do not remount `YoutubePlayer`.
6. `openWorkbench(snap)` must load **that** snap (plus `filesForMoment` / merge), not a stale `snapshotAt`.
7. `loadOrStart`: featured seeds win; cache extras only if clean and not within 8s of a seed. Fake harvest of `wN0x9eZLix4` (Python/JS placeholders) was deleted so the C++ seed could load.
8. yt-dlp needs Deno + ejs + Chrome cookies (command below).
9. Cheap model if a key appears: `grok-4-1-fast-non-reasoning`. One cropped frame + short transcript per clean, plus Query.
10. Sandbox: no `eval` on the Next server. JS worker, Python Pyodide, E2B only if keyed. **No in-browser C++.**
11. Zustand selectors: `EMPTY_TRANSCRIPT` / `EMPTY_SNAPSHOTS` / `EMPTY_FILES`.
12. Less that works > more that doesn’t. No overlays.

---

## 7. Architecture

```
Watch page → StudioV2
  useReconstruction     GET /api/videos/:id
  useHorizon            skipped for seeds
  useIframeKeyRescue
  useLiveScreen         every 5s force capture while workbench open
  useAppearance         Bright/Dark
  YoutubePlayer         disablekb, pending-seek onReady, 50ms poll
  Bottom bar            Open editor → instant nearestSnapshot + background force capture
  Workbench             resizable video|editor, CodePane + ExperimentDock
```

**Capture** (`POST /api/videos/:id/capture` `{ time, live?, force? }`):

1. Local `data/videos/<id>.mp4` or yt-dlp 18.
2. `ffmpeg -ss` unique `frame_<sec>_<pid>_<ms>.png`.
3. `scripts/ocr_frame.py` — Mosh split: left ~48% if right pane is bright. **VS + webcam:** bottom-right mean > 90 → crop x 8–62%, y 12–78%.
4. `extractCodeOnly` / `isCleanCode`. Fail → nearest snapshot, **no** `FRAME_NOT_CODE` to client.
5. If prior same-file exists → `recoverCutoff` / `mergeEvolving`.
6. `force: true` skips the 4–12s nearby cache so live actually re-reads.

`loadOrStart` / `reconstructionForVideo` / `composeSeed` live in `run.ts`. Status route uses `reconstructionForVideo` so dirty cache cannot leak.

---

## 8. What works vs what does not

**Works**
- Landing + Bright toggle + three featured cards
- UI 2 watch / workbench / Esc / traffic lights / drag split (video ≥ 52%)
- Instant open + reopen without remounting YouTube
- 5s auto-read while editor is open
- Mosh JS 19:26 naming-rules, no status bar; `lesson.js` stitch
- C++ evolving `main.cpp` from empty main through polymorphism
- Cutoff fill at 21:00 on the C++ video
- Run JS worker / Python Pyodide
- `?t=` seek

**Does not / unfinished**
- Live Tesseract still noisy; seeds + merge save the demo
- C++ will not Run
- Python seed still invented; no local `kqtD5dpn9C8.mp4`
- No 720p files
- Query/Understand without `XAI_API_KEY` is a dump
- Horizon LLM invents code — do not use as screen truth
- Vision pipeline unused; do not turn on full-video vision
- Leftover “Chronos” strings in old files

**Next work (human’s current intent)**
1. Sit in the C++ workbench and watch 5s growth without close/reopen (15:00 → 19:00 → 21:00 → constructors → inheritance).
2. Improve live OCR / merge if new rows don’t appear until a seed hop.
3. Only then: frame-verify Python the same way, or add a cheap key for OCR cleanup + Query.
4. Do not rebuild overlays.

---

## 9. Env / download

```
ffmpeg          /usr/local/bin/ffmpeg
tesseract       /usr/local/bin/tesseract 5.5.1
python3         /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
yt-dlp          python3 -m yt_dlp
deno            ~/.deno/bin/deno
Chrome cookies  --cookies-from-browser chrome
Node            22.x  /  Next 16.3.1  /  React 19  /  Tailwind 4
```

```bash
python3 -m yt_dlp \
  -f "18/136/best[height<=720]" \
  --no-playlist \
  --remote-components ejs:github \
  --js-runtimes "deno:$HOME/.deno/bin/deno" \
  --cookies-from-browser chrome \
  -o "/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/<id>.mp4" \
  -- \
  <videoId>
```

`.env.example`: `XAI_API_KEY`, `XAI_MODEL=grok-4-1-fast-non-reasoning`, `E2B_API_KEY`, `YTDLP_COOKIES_FROM_BROWSER=chrome`.

---

## 10. Absolute paths to attach / @-mention (read in this order)

1. `/Users/neelvaanjoshi/Downloads/interactive-youtube/HANDOFF.md` — this file  
2. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/studio-v2.tsx` — UI 2, instant open, splitter, Bright, live status  
3. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/watch/[videoId]/page.tsx` — `?ui=v1`  
4. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/store.ts` — `openWorkbench`, `applyLiveSnapshot`, `mergeEvolving` for evolving, follow  
5. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-live-screen.ts` — 5s `force` read  
6. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/read-screen.ts` — client capture helper  
7. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/capture/route.ts` — force / fallback / merge  
8. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/screen-capture.ts` — ffmpeg + unique frames + C++ filename  
9. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/code-from-ocr.ts` — chrome gate, C++ keywords  
10. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/code-story.ts` — episodes vs evolving, `mergeEvolving`, `filesForMoment`  
11. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/run.ts` — `loadOrStart` / `composeSeed` / `reconstructionForVideo`  
12. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/ingest.ts` — refuse dirty inserts  
13. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/consolidate.ts`  
14. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/snapshots.ts` — `nearestSnapshot`  
15. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/index.ts` — featured registry  
16. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-javascript.ts` — episodes, screen-true  
17. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/cpp-oop.ts` — evolving C++, screen-true  
18. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-python.ts` — **not** screen-true  
19. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-iframe-keys.ts`  
20. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-appearance.ts`  
21. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-reconstruction.ts`  
22. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/youtube-player.tsx`  
23. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/code-pane.tsx` — traffic lights  
24. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/monaco-stage.tsx` — URI reuse + dispose  
25. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/file-tabs.tsx`  
26. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/experiment-dock.tsx`  
27. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/landing/landing-page.tsx`  
28. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/globals.css`  
29. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/layout.tsx` — theme boot script  
30. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/types.ts`  
31. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/ai/client.ts`  
32. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/context-pack.ts`  
33. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/ai/prompts.ts`  
34. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/sandbox/browser.ts`  
35. `/Users/neelvaanjoshi/Downloads/interactive-youtube/scripts/ocr_frame.py`  
36. `/Users/neelvaanjoshi/Downloads/interactive-youtube/scripts/harvest_screens.py` — do not let harvest wipe seeds  
37. `/Users/neelvaanjoshi/Downloads/interactive-youtube/.env.example`  
38. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/status/route.ts`  
39. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/studio-v1.tsx` — only if asked to revert UI  

Local media (gitignored, already on disk):

- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/W6NZfCO5SIk.mp4`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/wN0x9eZLix4.mp4`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/cache/W6NZfCO5SIk.json`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/cache/wN0x9eZLix4.json`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/cache/kqtD5dpn9C8.json`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/capture/W6NZfCO5SIk/`
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/capture/wN0x9eZLix4/`

Useful seek URLs:

- http://localhost:3000/watch/W6NZfCO5SIk?t=19:26
- http://localhost:3000/watch/wN0x9eZLix4?t=900
- http://localhost:3000/watch/wN0x9eZLix4?t=1140
- http://localhost:3000/watch/wN0x9eZLix4?t=1260
- http://localhost:3000/watch/wN0x9eZLix4?t=5100

---

## 11. Copy-paste prompt for the next session

```
Continue Code Along (repo https://github.com/neeljoshi18/codealong, local /Users/neelvaanjoshi/Downloads/interactive-youtube). Today's date is 2026-08-19. Read HANDOFF.md first, then the files listed in section 10 (absolute paths).

We are NOT building CodeChronos overlays. Default UX is UI 2 in studio-v2.tsx: plain YouTube + bottom “Open editor at MM:SS” (zinc/white button, not brass) and E after iframe focus rescue. Workbench = video LEFT always ≥52% (default 58%), Monaco+Run right, drag splitter, traffic lights work (red close / yellow min / green expand), Bright/Dark theme, Esc back, do not remount YoutubePlayer.

Two tutorial kinds:
- episodes (Mosh JS W6NZfCO5SIk): fresh examples; lesson.js stitches completed ones.
- evolving (CodeBeauty C++ wN0x9eZLix4): ONE main.cpp that grows for the whole 90min video. mergeEvolving keeps scrolled-off prefix and adds new rows. By the end the buffer is the full Employee/Developer/Teacher/Work program. C++ does not Run in-browser.

Human’s last request we implemented and started testing: download+cache https://www.youtube.com/watch?v=wN0x9eZLix4 (already at data/videos/wN0x9eZLix4.mp4, 157MB, 5425s). Seed is src/lib/seeds/cpp-oop.ts. Fake transcript-placeholder cache was deleted. Live editor must auto-read every 5s (use-live-screen.ts force:true) WITHOUT close/reopen. At 21:00 the VS window has scrolled; #include / class Employee must still appear (recoverCutoff / mergeEvolving). Force capture at 1260s already returned the full file labeled “filled from earlier frame”.

Prior bugs already fixed this session (do not regress):
- Monaco URI collision on second open crashed the editor → human reloaded → video at 0. Reuse getModel + dispose on unmount. Instant open via nearestSnapshot; never leave Open disabled on busy; never show FRAME_NOT_CODE.
- 5s reader used to skip any time within 8s of a seed. It must force-read.
- filesForMoment must NOT walk-merge complete evolving seeds (that duplicated #include / class Employee). Latest snap ≤ time; live OCR viewports merge into experimentFiles.
- Player poll at t=0 must not wipe a mid-video open.

API key still optional and must stay cheap (grok-4-1-fast-non-reasoning, one cropped frame + short transcript). Never insert dirty Tesseract. Never full-video vision. Never the transparent IDE overlay. Python seed kqtD5dpn9C8 is still fake; only improve by reading a local download the same way as JS/C++.

yt-dlp: python3 -m yt_dlp --js-runtimes deno:$HOME/.deno/bin/deno --remote-components ejs:github --cookies-from-browser chrome

Your job now:
1. Sit in the C++ workbench (start ?t=900) and prove 5s auto-read grows the file as the video plays toward 1140/1260/1500 without close/reopen.
2. At scrolled times, confirm cutoff recovery still keeps the top of main.cpp.
3. If live OCR does not add rows until the next seed hop, fix mergeEvolving / applyLiveSnapshot / crop (VS+webcam profile in ocr_frame.py) — still never persist chrome/garbage.
4. Prefer less that works. Test in the browser. Do not remount the player.

Featured: JS W6NZfCO5SIk, C++ wN0x9eZLix4, Python kqtD5dpn9C8 (syllabus only).
```
