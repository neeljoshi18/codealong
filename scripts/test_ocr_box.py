#!/usr/bin/env python3
"""Editor crop must read the code pane, not the browser console."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from ocr_frame import find_editor_box  # noqa: E402


def check(path: Path, *, right_lt: float, left_lt: float, top_lt: float, name: str) -> None:
    if not path.exists():
        print(f"skip {name} (no frame)")
        return
    im = Image.open(path).convert("RGB")
    w, h = im.size
    left, top, right, bottom = find_editor_box(im)
    if right / w >= right_lt:
        raise SystemExit(f"{name}: crop too far right {right}/{w} (console?)")
    if left / w >= left_lt:
        raise SystemExit(f"{name}: crop starts too far right {left}/{w}")
    if top / h > top_lt:
        raise SystemExit(f"{name}: crop eats the first lines top={top}/{h}")
    if bottom <= top + 8 or right <= left + 8:
        raise SystemExit(f"{name}: empty box {(left, top, right, bottom)}")
    print(f"ok {name} box={(left, top, right, bottom)} of {(w, h)}")


def main() -> int:
    cap = ROOT / "data" / "capture"
    check(
        cap / "W6NZfCO5SIk" / "frame_1720.png",
        right_lt=0.72,
        left_lt=0.12,
        top_lt=0.10,
        name="mosh-1720",
    )
    check(
        cap / "W6NZfCO5SIk" / "frame_1989.png",
        right_lt=0.72,
        left_lt=0.12,
        top_lt=0.10,
        name="mosh-1989",
    )
    check(
        cap / "wN0x9eZLix4" / "frame_900_87577_1787134983595.png",
        right_lt=0.85,
        left_lt=0.22,
        top_lt=0.14,
        name="cpp-900",
    )
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
