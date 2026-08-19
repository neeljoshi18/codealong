#!/usr/bin/env bash
# Same helper as status.neel.world. Campus Wi-Fi usually blocks all of these.
set -euo pipefail
HOST="${STAGING_HOST:-206.189.129.31}"
USER="${STAGING_USER:-neel}"
KEY="${STAGING_SSH_KEY_FILE:-$HOME/.ssh/id_ed25519}"
echo "Trying $USER@$HOST (22 / 2222 / 443)…"
for port in 22 2222 443; do
  if ssh -o ConnectTimeout=6 -o BatchMode=yes -o StrictHostKeyChecking=accept-new \
    -i "$KEY" -p "$port" "${USER}@${HOST}" "echo OK_PORT_$port" 2>/dev/null; then
    exec ssh -i "$KEY" -p "$port" "${USER}@${HOST}" "$@"
  fi
  echo "  port $port: blocked"
done
echo "Campus Wi-Fi is blocking SSH (same as AI-Manager)."
echo "Use: git push origin main   →  GitHub Actions deploys the droplet"
echo "Or turn on a phone hotspot and retry this script."
exit 1
