#!/usr/bin/env python3
"""Crop to the editor buffer only (no tabs, gutter, status bar, console) and OCR."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def _mean(im: Image.Image) -> float:
    gray = im.convert("L").resize((32, 32))
    hist = gray.histogram()
    return sum(i * hist[i] for i in range(256)) / max(1, sum(hist))


def prepare(path: Path) -> Path:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # Drop activity bar, tab strip, status bar, line-gutter.
    # If the right half is a bright browser pane, keep the left editor only.
    left_mean = _mean(im.crop((0, 0, w // 2, h)))
    right_mean = _mean(im.crop((w // 2, 0, w, h)))
    cam = _mean(im.crop((int(w * 0.70), int(h * 0.52), w, h)))
    left = int(w * 0.08)
    if cam > 90:
        # Visual Studio + talking head (CodeBeauty-style).
        right = int(w * 0.62)
        top = int(h * 0.12)
        bottom = int(h * 0.78)
    elif right_mean > left_mean + 18:
        right = int(w * 0.48)
        top = int(h * 0.15)
        bottom = int(h * 0.82)
    else:
        right = int(w * 0.92)
        top = int(h * 0.15)
        bottom = int(h * 0.82)
    if right <= left:
        right = max(left + 1, int(w * 0.55))
    if bottom <= top:
        bottom = min(h, top + 8)
    im = im.crop((left, top, right, bottom)).convert("L")
    hist = im.resize((32, 32)).histogram()
    mean = sum(i * hist[i] for i in range(256)) / max(1, sum(hist))
    if mean < 140:
        im = ImageOps.invert(im)
    im = ImageOps.autocontrast(im, cutoff=2)
    im = im.resize((im.size[0] * 3, im.size[1] * 3), Image.Resampling.LANCZOS)
    im = im.filter(ImageFilter.SHARPEN)
    out = path.with_suffix(".prep.png")
    im.save(out)
    return out


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: ocr_frame.py <image>", file=sys.stderr)
        return 2
    prepared = prepare(Path(sys.argv[1]))
    tess = sys.argv[2] if len(sys.argv) > 2 else "tesseract"
    proc = subprocess.run(
        [tess, str(prepared), "stdout", "--psm", "6", "-c", "preserve_interword_spaces=1"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    sys.stdout.write(proc.stdout.decode("utf-8", errors="replace"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
