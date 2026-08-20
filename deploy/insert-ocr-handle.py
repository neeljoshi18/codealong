#!/usr/bin/env python3
"""Insert /codealong-ocr reverse_proxy into the AI-Manager Caddyfile."""

from pathlib import Path
import sys

p = Path.home() / "ai-manager/deploy/Caddyfile"
if not p.exists():
    print("no Caddyfile at", p)
    sys.exit(1)

text = p.read_text()
if "codealong-ocr" in text:
    print("Caddy already has /codealong-ocr")
    sys.exit(0)

marker = "reverse_proxy twin-api:18083"
idx = text.find(marker)
if idx < 0:
    print("twin-api handle not found in Caddyfile")
    sys.exit(1)

handle_idx = text.rfind("handle {", 0, idx)
if handle_idx < 0:
    handle_idx = text.rfind("handle{", 0, idx)
if handle_idx < 0:
    print("catch-all handle not found")
    sys.exit(1)

insert = "handle_path /codealong-ocr/* {\n\treverse_proxy 172.17.0.1:3001\n}\n\n"
p.write_text(text[:handle_idx] + insert + text[handle_idx:])
print("inserted /codealong-ocr handle into", p)
