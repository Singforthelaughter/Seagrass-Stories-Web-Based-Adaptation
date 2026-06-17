#!/usr/bin/env bash
# Launch Concept Studio. Loads the token from a .env if needed, then starts the
# stdlib server (which auto-picks a free port and opens the browser).
#
# Usage:  ./launch.sh            # normal
#         NO_BROWSER=1 ./launch.sh   # don't auto-open a browser (e.g. headless)
set -euo pipefail
cd "$(dirname "$0")"

# Load REPLICATE_API_TOKEN from a .env (this dir, then repo root) if not already set.
if [ -z "${REPLICATE_API_TOKEN:-}" ]; then
  for f in .env ../../.env; do
    if [ -f "$f" ]; then set -a; . "$f"; set +a; fi
  done
fi

if [ -z "${REPLICATE_API_TOKEN:-}" ]; then
  echo "Note: REPLICATE_API_TOKEN is not set. The studio will open, but generation"
  echo "will fail until you export it or add it to a .env file. Not printing any key."
fi

exec python3 server.py
