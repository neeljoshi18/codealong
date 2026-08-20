# Code Along — session handoff

**Do not start work.** Wait for the human’s next instruction. This file is context only.

**Local path:** `/Users/neelvaanjoshi/Downloads/interactive-youtube`  
**GitHub:** `https://github.com/neeljoshi18/codealong` (`main`, latest `df4dec8`)  
**Product name:** Code Along (repo `codealong`). Old names CodeChronos / Kronos are retired.  
**Date of this handoff:** 2026-08-20  
**Human Mac:** `/Users/neelvaanjoshi/Downloads/interactive-youtube` (this is **not** the droplet)

---

## 0. Wait

The human explicitly asked that the **next session must not start any work**. Load this file, be ready, **do nothing** until they give a task.

---

## 1. Product vision

Watching is a **normal YouTube video**. No HUD, no overlay, no transparent IDE on the iframe (tried and **rejected**).

When they want the code (bottom **zinc/white** “Open editor at MM:SS” or **E** after iframe key rescue): workbench = video LEFT always ≥52% (default 58%), Monaco + Run right, drag splitter, traffic lights (red close / yellow min / green expand), Bright/Dark, Esc back. **Do not remount `YoutubePlayer`** or the video restarts at 0.

Two tutorial kinds:
- **episodes** (Mosh JS `W6NZfCO5SIk`): fresh examples; `lesson.js` stitches completed ones.
- **evolving** (CodeBeauty C++ `wN0x9eZLix4`): **one** `main.cpp` that grows. `mergeEvolving` keeps scrolled-off prefix and weaves new rows. C++ does **not** Run in-browser.

API key (`XAI_API_KEY`) is **optional**. Featured demos + Run JS/Python work without it. Cheap model if a key appears: `grok-4-1-fast-non-reasoning`. Never full-video vision. Never persist dirty Tesseract as the source of truth.

---

## 2. Featured videos

| id | What | Kind | Local mp4 | Seed |
| --- | --- | --- | --- | --- |
| `W6NZfCO5SIk` | Mosh, JavaScript in 1 Hour | episodes | `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/W6NZfCO5SIk.mp4` | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-javascript.ts` |
| `wN0x9eZLix4` | freeCodeCamp / CodeBeauty, OOP in C++ (~90 min, 5425s) | evolving | `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/wN0x9eZLix4.mp4` | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/cpp-oop.ts` |
| `kqtD5dpn9C8` | Mosh, Python in 1 Hour | episodes (syllabus only) | **not downloaded** | `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-python.ts` **guessed, not frame-true** |

C++ verified beats (seed): 360 empty main → 420 Employee → 480 Name/Company → 600 Age → 720 private → **900 public fields** → **1140 IntroduceYourself + two employees** → 1500 constructor → 1860 two constructed → 2220 encapsulation → 2940 abstract → 3660 Developer → 4020 FixBug → 4380 Teacher → 5100 polymorphism.

At ~21:00 (1260s) the VS window has scrolled; `#include` / `class Employee` must still appear via `recoverCutoff` / `mergeEvolving`.

---

## 3. What was built this stretch (do not regress)

### Live C++ workbench
- 5s auto-read while editor open: `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-live-screen.ts` (`force: true`).
- Pause video → **immediate** reread (“Paused · completing MM:SS”).
- **Stack overflow fix:** pause handler used to re-enter itself via `setLiveStatus`. Now `subscribe((s, prev) => …)` only fires on `playing` edge. Verified: `?t=900` opens Monaco with `#include`, no “Maximum call stack size exceeded”.
- `setVideoTime` for evolving **merges** into `experimentFiles`; it must not replace the live buffer with seed-only `filesForMoment`.
- `filesForMoment` evolving = **latest snap ≤ time** (do not walk-merge complete seeds — that duplicated `#include`).
- Monaco: reuse `getModel` + dispose on unmount (`/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/monaco-stage.tsx`). Never `setValue` on live follow — `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/monaco-apply.ts` patches prefix/suffix, types small inserts, restores scroll unless new lines are **below** the viewport.
- Capture never returns `FRAME_NOT_CODE` to the client; fallback latest ≤ time (not nearest **future** seed).
- `previousSameFile` uses latest **≤ time** (same-timestamp seed), so 900 does not weave `private` from 720.
- OCR normalize: `eint main` → `int main`, keep `#` on `#include`, `employeel` → `employee1`. Never persist unbalanced/dirty OCR.

### “Any video / no API key” (architecture truth)
A **website cannot** `fetch` YouTube mp4 bytes (CORS on `googlevideo.com`). Iframe can **play**; it cannot give pixels or a file. So:
- **Local `next dev`:** ffmpeg + tesseract + yt-dlp on the **machine running Next** (`data/videos/`). This is what the Mac demo uses. First Open-editor downloads a **12s window** (no re-encode) then OCRs. yt-dlp must use `--extractor-args youtube:player_client=android,ios,web` (default ANDROID_VR 403s). Do **not** auto `--cookies-from-browser chrome` — that hangs while Chrome is open.
- **Visitor’s laptop only:** OPFS + `<video>` seek + tesseract.js **only if the file is already in this tab**. Do **not** wait on youtubei.js (CORS hang, looked like “Loading…” for minutes).
- **Vercel:** UI + **seeded** demos. No ffmpeg. Writes go to `/tmp/codealong-data` (used to 500 on `mkdir /var/task/data/cache`). Pasted links will **not** live-OCR here.
- **DigitalOcean droplet:** the correct place for public live OCR (disk + ffmpeg + yt-dlp + pillow). Cache is **on the droplet**, not in each visitor’s tab. `captureToolchain` must look in **`/usr/bin`** (Docker), not only Homebrew paths.

**2026-08-20 incident:** human pasted `K5KVEU3aaeQ` on the public site. `GET /api/videos/K5KVEU3aaeQ` **500** (`ENOENT mkdir /var/task/data/cache`). Button stayed **Loading…**. E still opened EmptyEditor (“Reconstructing…”). Client youtubei.js hung, then capture **404**. Took ~3 minutes, never a real download.

### Deploy (as of 2026-08-20)

| Surface | Status |
| --- | --- |
| GitHub | `https://github.com/neeljoshi18/codealong` `main` |
| Vercel | Project `codealong` `prj_BU7FzoYl4TQftmTGo4jvH1NErvOA`, team `neeljoshi18` / `team_H3JV0aAVhBBfXAgZ7X3BiTiM`. **Live:** https://codealong-six.vercel.app and https://codealong-neeljoshi18.vercel.app Auth off. Auto-deploys on push to `main`. Dashboard: https://vercel.com/neeljoshi18/codealong |
| Custom domain | **`codealong.neel.world` is a CNAME to `cname.vercel-dns.com`** (Vercel). Live OCR is proxied from Vercel → `https://status.neel.world/codealong-ocr` (droplet Caddy) until GoDaddy A record `codealong` → `206.189.129.31`. |
| Droplet | `206.189.129.31` (same as `status.neel.world`). User **`neel`** not `root`. Caddy in AI-Manager compose (`~/ai-manager/deploy/Caddyfile`) has the `codealong.neel.world` snippet → `172.17.0.1:3001`. Container on host `:3001` (campus cannot reach 3001; Caddy 443 would, **if DNS pointed here**). |
| SSH from campus | **Blocked** (port 22 timeout, 2222 timeout, 443 is Caddy). Same as AI-Manager: **do not SSH from campus**. Deploy via GitHub Actions. Hotspot if a shell is required: `ssh -i ~/.ssh/id_ed25519 neel@206.189.129.31` |

**Human mistake this session:** ran droplet `apt-get` commands **on the Mac** inside `interactive-youtube`. Broke local `node_modules`; restored with `rm -rf node_modules && npm ci`. Deno got installed on the Mac (`~/.deno/bin/deno`) as a side effect. **Never run apt-get / `/opt/codealong` on the Mac.**

**Remaining human step for any-video on the pretty URL:** GoDaddy DNS **A** record: name `codealong`, value `206.189.129.31`. **Do not CNAME to Vercel.** Today the CNAME/A is on Vercel, so Caddy never sees the host and live OCR cannot run in public.

---

## 4. Prior bugs (already fixed — do not regress)

- Monaco URI collision on second open → crash → reload → video at 0.
- 5s reader skipped times within 8s of a seed.
- `filesForMoment` walk-merge duplicated `#include` / `class Employee`.
- Player poll at t≈0 wiped a mid-video open.
- Pause `setLiveStatus` infinite recursion (stack overflow overlay).
- `setValue` jumped Monaco to line 1 on every live update.
- Capture fallback `nearestSnapshot` jumped to a **future** seed.
- `#include` stripped to `include` because KEYWORD `include` sits at index 1.
- Vercel `GET /api/videos/:id` 500 on `mkdir /var/task/data/cache` → Open editor stuck on Loading.
- Capture 404 unless a prior request had written cache (serverless has no shared disk).
- Unseeded `readScreen` waited on youtubei.js CORS download (minutes) before server capture.
- Droplet OCR skipped: toolchain only looked for Homebrew ffmpeg/tesseract, not `/usr/bin`.
- Docker image missing **pillow** (ocr_frame.py) and **deno** (yt-dlp nsig).
- yt-dlp `--force-keyframes-at-cuts` re-encoded a 30s window (very slow). Now 12s stream copy.

---

## 5. Env / commands

**Mac (local demo):**
```
ffmpeg          /usr/local/bin/ffmpeg
tesseract       /usr/local/bin/tesseract
python3         /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
yt-dlp          python3 -m yt_dlp
deno            ~/.deno/bin/deno
Node            22.x  /  Next 16.3.1
```

yt-dlp (if ever downloading on the Mac):
```
python3 -m yt_dlp --js-runtimes deno:$HOME/.deno/bin/deno --remote-components ejs:github --cookies-from-browser chrome
```

**Droplet deploy (GitHub Actions, not laptop SSH):**
- Workflow: `/Users/neelvaanjoshi/Downloads/interactive-youtube/.github/workflows/deploy-droplet.yml`
- Secrets on `neeljoshi18/codealong`: `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY` (same pattern as `neeljoshi18/AI-Manager`)
- Trigger: `git push origin main` or `gh workflow run deploy-droplet.yml -R neeljoshi18/codealong`

---

## 6. Absolute paths (read in this order if work is assigned)

### Product / UI
1. `/Users/neelvaanjoshi/Downloads/interactive-youtube/HANDOFF.md` — this file  
2. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/studio-v2.tsx` — UI 2, instant open, splitter, Bright, live status, cache bar  
3. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/watch/[videoId]/page.tsx` — `?ui=v1` hatch  
4. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/code-pane.tsx` — traffic lights  
5. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/monaco-stage.tsx` — URI reuse, live apply  
6. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/monaco-apply.ts` — no jump-to-top, typing inserts  
7. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/youtube-player.tsx` — disablekb, pending-seek, ignore t=0  
8. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/file-tabs.tsx`  
9. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/experiment-dock.tsx` — JS worker / Pyodide; C++ does not run  
10. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/landing/landing-page.tsx`  
11. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/globals.css`  
12. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/layout.tsx`  
13. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/components/studio/studio-v1.tsx` — only if asked to revert UI  

### State / live read
14. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/store.ts` — `openWorkbench`, `applyLiveSnapshot`, evolving merge, t=0 guard  
15. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-live-screen.ts` — 5s force + pause-edge (no recursion)  
16. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/read-screen.ts` — OPFS only if already cached, else server  
17. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-media-cache.ts` — `/prepare` + poll; no youtubei hang  
17a. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/paths.ts` — `/tmp` on Vercel, `./data` locally  
17b. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/binaries.ts` — ffmpeg/tesseract in `/usr/bin` too  
17c. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/reconstruction-stub.ts` — instant ready stub  
17d. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/media-window.ts` — 12s window
18. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-appearance.ts`  
19. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-iframe-keys.ts`  
20. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-reconstruction.ts`  
21. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/hooks/use-horizon.ts` — **no-op** (LLM horizon invented code)  

### Pipeline / OCR / merge
22. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/capture/route.ts`  
23. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/screen-capture.ts`  
24. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/media.ts` — server yt-dlp window + full file (local/droplet)  
25. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/code-from-ocr.ts` — chrome gate, C++ keywords, normalize  
26. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/code-story.ts` — episodes vs evolving, `mergeEvolving`, `filesForMoment`  
27. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/run.ts` — `loadOrStart` / `composeSeed` / no-key ready stub  
28. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/ingest.ts`  
29. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/pipeline/consolidate.ts`  
30. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/snapshots.ts`  
31. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/status/route.ts`  
32. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/prepare/route.ts`  
33. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/forget/route.ts`  
34. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/route.ts`  
35. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/app/api/videos/[videoId]/route.ts`  
36. `/Users/neelvaanjoshi/Downloads/interactive-youtube/scripts/ocr_frame.py` — VS+webcam crop  
37. `/Users/neelvaanjoshi/Downloads/interactive-youtube/scripts/harvest_screens.py`  
38. `/Users/neelvaanjoshi/Downloads/interactive-youtube/scripts/test_merge_evolving.ts`  

### Client engine (browser OPFS; CORS often blocks YouTube bytes)
39. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/capture.ts`  
40. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/download.ts` — youtubei.js/web  
41. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/frame.ts` — `<video>` blob seek + canvas (no ffmpeg.wasm; wasm broke Next)  
42. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/ocr.ts` — tesseract.js + crop  
43. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/opfs.ts`  
44. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/client-engine/status.ts`  

### Seeds / types
45. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/index.ts`  
46. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-javascript.ts`  
47. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/cpp-oop.ts`  
48. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/seeds/mosh-python.ts`  
49. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/types.ts`  
50. `/Users/neelvaanjoshi/Downloads/interactive-youtube/src/lib/utils.ts`  

### Deploy
51. `/Users/neelvaanjoshi/Downloads/interactive-youtube/.github/workflows/deploy-droplet.yml`  
52. `/Users/neelvaanjoshi/Downloads/interactive-youtube/deploy/Dockerfile`  
53. `/Users/neelvaanjoshi/Downloads/interactive-youtube/deploy/docker-compose.yml`  
54. `/Users/neelvaanjoshi/Downloads/interactive-youtube/deploy/Caddyfile.snippet`  
55. `/Users/neelvaanjoshi/Downloads/interactive-youtube/deploy/ssh.sh` — campus will fail; use Actions  
56. `/Users/neelvaanjoshi/Downloads/interactive-youtube/next.config.ts` — `transpilePackages: youtubei.js, tesseract.js` (**do not** also put youtubei.js in `serverExternalPackages` — that 500’d the whole app)  
57. `/Users/neelvaanjoshi/Downloads/interactive-youtube/package.json`  
58. `/Users/neelvaanjoshi/Downloads/interactive-youtube/.env.example`  

### Related (other repo, droplet Caddy)
59. GitHub `https://github.com/neeljoshi18/AI-Manager` — `deploy/Caddyfile` on droplet at `~/ai-manager/deploy/Caddyfile` (Actions **appended** `codealong.neel.world` site). SSH helper: `deploy/scripts/ssh_staging.sh`. Docs: `deploy/scripts/setup_ssh_via_https_port.md`.

### Local media (gitignored)
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/W6NZfCO5SIk.mp4`  
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/videos/wN0x9eZLix4.mp4`  
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/cache/`  
- `/Users/neelvaanjoshi/Downloads/interactive-youtube/data/capture/`  

Useful local URLs:
- http://localhost:3000/watch/W6NZfCO5SIk?t=19:26  
- http://localhost:3000/watch/wN0x9eZLix4?t=900  
- http://localhost:3000/watch/wN0x9eZLix4?t=1260  

---

## 7. Copy-paste prompt for the next session

```
You are continuing Code Along. Do NOT start any work until I give you a task. Read HANDOFF.md first and treat it as source of truth.

Local: /Users/neelvaanjoshi/Downloads/interactive-youtube
GitHub: https://github.com/neeljoshi18/codealong  main @ df4dec8 (pushed)
Product: Code Along. Not CodeChronos. Default UI is studio-v2.tsx: plain YouTube + zinc/white “Open editor at MM:SS” and E. Workbench = video LEFT ≥52% (default 58%), Monaco+Run right, splitter, traffic lights, Bright/Dark, Esc, never remount YoutubePlayer.

Kinds: episodes (Mosh JS W6NZfCO5SIk + lesson.js) vs evolving (C++ wN0x9eZLix4 one growing main.cpp, mergeEvolving, no in-browser C++ run). Python kqtD5dpn9C8 is syllabus-only.

Live follow: use-live-screen.ts every 5s force:true; pause = immediate catch-up; subscribe must use prev.playing vs s.playing or you get Maximum call stack size exceeded. Monaco live updates via monaco-apply.ts (no setValue jump to top). filesForMoment evolving = latest ≤ time, not walk-merge. Capture never returns FRAME_NOT_CODE; fallback latest ≤ time not future seed.

No XAI_API_KEY required. Never full-video vision, never dirty Tesseract as truth, never transparent IDE overlay.

Deploy: Vercel project codealong is LIVE at https://codealong-six.vercel.app (seeds only; no ffmpeg). codealong.neel.world currently points at Vercel — wrong for live OCR. Droplet 206.189.129.31 user neel (same as status.neel.world). Actions deploy-droplet.yml already built docker on :3001, appended Caddy snippet, restarted caddy. Pretty URL needs GoDaddy A record codealong → 206.189.129.31 (NOT a Vercel CNAME). Campus Wi-Fi blocks SSH 22; never apt-get on the Mac; never ssh root@; deploy with git push. AI-Manager Caddyfile is ~/ai-manager/deploy/Caddyfile on the droplet.

Wait for my instruction. Do not deploy, do not SSH, do not edit, do not run the app unless I ask.
```
