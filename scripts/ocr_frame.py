#!/usr/bin/env python3
"""Crop to the editor buffer (not file tree, tabs, or console) and OCR."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def _mean(im: Image.Image) -> float:
    gray = im.convert("L").resize((32, 32))
    hist = gray.histogram()
    return sum(i * hist[i] for i in range(256)) / max(1, sum(hist))


def _profile(im: Image.Image, axis: str, bins: int) -> list[float]:
    g = im.convert("L")
    w, h = g.size
    out: list[float] = []
    for i in range(bins):
        if axis == "x":
            x0 = int(i * w / bins)
            x1 = max(x0 + 1, int((i + 1) * w / bins))
            strip = g.crop((x0, 0, x1, h))
        else:
            y0 = int(i * h / bins)
            y1 = max(y0 + 1, int((i + 1) * h / bins))
            strip = g.crop((0, y0, w, y1))
        out.append(_mean(strip))
    return out


def _longest_run(vals: list[float], pred) -> tuple[int, int]:
    best = (0, 0)
    i = 0
    n = len(vals)
    while i < n:
        if pred(vals[i]):
            j = i + 1
            while j < n and pred(vals[j]):
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    return best


def _box_from_run(run: tuple[int, int], total: int, bins: int, pad: float = 0.0) -> tuple[int, int]:
    a, b = run
    if b <= a:
        return 0, total
    lo = max(0, int((a / bins - pad) * total))
    hi = min(total, int((b / bins + pad) * total))
    if hi - lo < 8:
        return 0, total
    return lo, hi


def find_editor_box(im: Image.Image) -> tuple[int, int, int, int]:
    """Return (left, top, right, bottom) of the code buffer."""
    w, h = im.size
    mid = im.crop((0, int(h * 0.12), w, int(h * 0.78)))
    cols = _profile(mid, "x", 64)
    avg = sum(cols) / max(1, len(cols))
    left_mean = sum(cols[:16]) / 16
    right_mean = sum(cols[48:]) / 16
    cam = _mean(im.crop((int(w * 0.70), int(h * 0.52), w, h)))

    # Light-theme editor (PyCharm, VS Code light): the buffer is a bright island
    # next to a darker file tree / console.
    bright_cut = max(155.0, avg + 18)
    run = _longest_run(cols, lambda v: v >= bright_cut)
    if run[1] - run[0] >= 18:
        left, right = _box_from_run(run, w, 64, pad=0.03)
        slice_im = im.crop((left, 0, right, h))
        rows = _profile(slice_im, "y", 40)
        ravg = sum(rows) / max(1, len(rows))
        rcut = max(150.0, ravg + 10)
        rrun = _longest_run(rows, lambda v: v >= rcut)
        if rrun[1] - rrun[0] >= 10:
            top, bottom = _box_from_run(rrun, h, 40, pad=0.04)
        else:
            top, bottom = int(h * 0.14), int(h * 0.78)
        # Drop the line-number gutter inside the bright pane.
        left = left + max(8, int((right - left) * 0.04))
        return left, top, right, bottom

    # Dark IDE + talking head (CodeBeauty / VS).
    if cam > 90:
        return int(w * 0.10), int(h * 0.12), int(w * 0.62), int(h * 0.78)

    # Dark IDE, editor on the darker or left side, browser/cam on the right.
    if right_mean > left_mean + 18:
        return int(w * 0.08), int(h * 0.15), int(w * 0.48), int(h * 0.82)

    return int(w * 0.08), int(h * 0.14), int(w * 0.92), int(h * 0.80)


def prepare(path: Path) -> Path:
    im = Image.open(path).convert("RGB")
    left, top, right, bottom = find_editor_box(im)
    if right <= left + 4:
        right = min(im.size[0], left + 8)
    if bottom <= top + 4:
        bottom = min(im.size[1], top + 8)
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
        print("usage: ocr_frame.py <image> [tesseract]", file=sys.stderr)
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
