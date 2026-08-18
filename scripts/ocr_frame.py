#!/usr/bin/env python3
"""Crop to the editor buffer only (no tabs, gutter, status bar, console) and OCR."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def prepare(path: Path) -> Path:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # Mosh / typical split: editor left, browser console right.
    # Drop activity bar, tab strip, status bar, line-gutter, console.
    left = int(w * 0.07)
    right = int(w * 0.50)
    top = int(h * 0.11)
    bottom = int(h * 0.90)
    if right <= left:
        right = max(left + 1, int(w * 0.55))
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
    proc = subprocess.run(
        ["tesseract", str(prepared), "stdout", "--psm", "6", "-c", "preserve_interword_spaces=1"],
        check=False,
        capture_output=True,
        text=True,
    )
    sys.stdout.write(proc.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
