# Code Along

Watch a coding tutorial. Open the editor when you want the file that is on screen.

The video stays YouTube. A bar at the bottom (or the E key) opens a workbench at that timestamp — select, edit, run. Esc goes back. You do not retype the lesson.

## What you need to provide

| Item | Required? | Used for |
| --- | --- | --- |
| `XAI_API_KEY` | For AI + uncached videos | Grok explanations and transcript/vision reconstruction |
| `E2B_API_KEY` | Optional | Isolated multi-language execution |
| `yt-dlp` + `ffmpeg` | Optional | Frame sampling / vision OCR refinement |

**Featured demos work with no keys.** Open the two cards on the home page (Mosh’s Python and JavaScript hour-long courses). Video, scrollable history, selection, experiment, in-browser run, and download all function offline. AI answers fall back to a packed-context grounding view until `XAI_API_KEY` is set.

## Setup

```bash
cd codealong
cp .env.example .env.local   # then add keys if you have them
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional toolchain for the full extraction pipeline:

```bash
# macOS
brew install ffmpeg
pip3 install yt-dlp
```

## Instant demo

1. Click **Python for Beginners** (or paste `https://www.youtube.com/watch?v=kqtD5dpn9C8`).
2. The YouTube player starts. The editor on the right is already populated.
3. Scroll the editor with a trackpad or mouse wheel — code history updates instantly; the video keeps playing.
4. Drag-select any lines. Use **Query this**, **Understand in context**, or **Experiment**.
5. In Experiment, edit, set stdin if the snippet uses `input()`, click **Run**, then **Explain vs original**.
6. **This state** / **Final ZIP** download the reconstructed files.

Second demo: `https://www.youtube.com/watch?v=W6NZfCO5SIk` (JavaScript).

## How it works

Two clocks: `videoTime` (the explainer) and `codeTime` (where you are in the video document). Scroll the left artefact to browse the whole tutorial; the explainer keeps playing. Double-click a beat to jump the player there. Uncached videos only reconstruct **~3 minutes ahead** of the playhead on `grok-4-1-fast-non-reasoning`.

Reconstructions are an ordered array:

```ts
{ timestamp, code/files, language, label }[]
```

Seeded videos ship a dense, hand-stitched history. Any other URL:

1. Play immediately via the IFrame API.
2. Fetch metadata (oEmbed + Innertube) and captions (`youtube-transcript`, then Innertube timedtext).
3. Reconstruct snapshots from transcript windows with Grok (`grok-4.6`).
4. Optionally download + `ffmpeg` sample frames and refine with Grok vision.
5. Cache JSON under `data/cache/<videoId>.json`. Subsequent loads are instant.

## Project map

```
src/app/page.tsx                  Landing — paste URL
src/app/watch/[videoId]/page.tsx  Studio
src/app/api/videos/**             Ingest, status, ZIP download
src/app/api/ai/**                 Query / understand / explain (packed context)
src/app/api/execute/route.ts      E2B sandbox (browser fallback)
src/components/studio/**          Player, Monaco, rail, selection, experiment, AI
src/lib/pipeline/**               Job runner, reconstruct, vision, consolidate
src/lib/seeds/**                  Instant demo reconstructions
src/lib/store.ts                  Zustand: videoTime, codeTime, branches
```

## AI context pack

Every model call receives:

```json
{
  "videoId": "...",
  "currentTimestamp": 142.5,
  "transcriptWindow": "...",
  "originalCodeAtTime": "...",
  "userCode": "...",
  "diff": "...",
  "language": "python",
  "inferredProjectStructure": {},
  "tutorialGoalSummary": "..."
}
```

## Keyboard / pointer

- Wheel on the editor: scrub code history (Shift+wheel / scrollbar: scroll the file)
- Drag the right-hand rail: scrub code history
- `F`: re-attach code time to the video
- Click-drag in Monaco: native selection + action toolbar
- Right-click: same actions
- Cmd/Ctrl+F: Monaco find

## Security

User code never runs on the Next.js process. Execution is E2B (if configured) or an in-browser worker / Pyodide. Do not add a local `eval` on the server.

## Scripts

```bash
npm run dev      # Next.js dev server (Turbopack)
npm run build
npm run start
npm run lint
```
