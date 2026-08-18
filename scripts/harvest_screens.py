#!/usr/bin/env python3
"""Sample a local mp4 every N seconds, OCR frames that look like code, merge into cache."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = "/usr/local/bin/ffmpeg"


def looks_like_code(text: str) -> bool:
    t = text.lower()
    hits = 0
    for token in (
        "let ",
        "const ",
        "function ",
        "console.",
        "def ",
        "import ",
        "print(",
        "return ",
        "if ",
        "class ",
        "var ",
        "=>",
        "===",
        "</",
        "public ",
    ):
        if token in t:
            hits += 1
    return hits >= 2 and len(text.strip()) > 20


def ocr(frame: Path) -> str:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "ocr_frame.py"), str(frame)],
        capture_output=True,
        text=True,
    )
    return (proc.stdout or "").strip()


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: harvest_screens.py <videoId> <mp4> [step_seconds]", file=sys.stderr)
        return 2
    video_id, mp4 = sys.argv[1], Path(sys.argv[2])
    step = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    cache_path = ROOT / "data" / "cache" / f"{video_id}.json"
    out_dir = ROOT / "data" / "capture" / video_id
    out_dir.mkdir(parents=True, exist_ok=True)

    probe = subprocess.run(
        ["/usr/local/bin/ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)],
        capture_output=True,
        text=True,
    )
    duration = float(probe.stdout.strip() or "0")
    print(f"duration {duration:.0f}s step {step}s")

    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {"snapshots": []}
    extracted: list[dict] = [s for s in cache.get("snapshots", []) if s.get("origin") in ("ocr", "cleaned")]

    t = 15.0
    while t < duration:
        frame = out_dir / f"frame_{int(t)}.png"
        if not frame.exists():
            subprocess.run(
                [FFMPEG, "-y", "-ss", str(t), "-i", str(mp4), "-frames:v", "1", "-q:v", "2", str(frame)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        if not frame.exists():
            t += step
            continue
        text = ocr(frame)
        if looks_like_code(text):
            lang = "python" if "def " in text or "print(" in text else "javascript"
            if "</" in text and "<" in text:
                lang = "html"
            fname = "app.py" if lang == "python" else "index.html" if lang == "html" else "index.js"
            extracted.append(
                {
                    "id": f"ocr{int(t):06d}",
                    "timestamp": t,
                    "language": lang,
                    "activeFile": fname,
                    "files": {fname: text + ("\n" if not text.endswith("\n") else "")},
                    "label": "Extracted from screen",
                    "origin": "ocr",
                }
            )
            print(f"  keep {t:.0f}s  {text.splitlines()[0][:60]!r}")
        else:
            print(f"  skip {t:.0f}s")
        t += step

    extracted.sort(key=lambda s: s["timestamp"])
    # drop near-duplicates
    deduped: list[dict] = []
    for s in extracted:
        if deduped and abs(s["timestamp"] - deduped[-1]["timestamp"]) < 8:
            if len(s["files"][s["activeFile"]]) > len(deduped[-1]["files"][deduped[-1]["activeFile"]]):
                deduped[-1] = s
            continue
        deduped.append(s)

    cache["snapshots"] = deduped
    cache["source"] = "ocr"
    cache["message"] = f"Harvested {len(deduped)} screen extracts"
    cache_path.write_text(json.dumps(cache, indent=2))
    print(f"wrote {len(deduped)} snapshots → {cache_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
