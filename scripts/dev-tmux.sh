#!/usr/bin/env bash

set -euo pipefail

SESSION="moving-dev"
ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required but was not found in PATH." >&2
  exit 1
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" -n dev -c "$ROOT_DIR" \
    "pnpm dev:backend"
  tmux split-window -h -t "$SESSION:dev" -c "$ROOT_DIR" \
    "pnpm dev:frontend"
  tmux select-layout -t "$SESSION:dev" even-horizontal
  tmux select-pane -t "$SESSION:dev.1"
fi

if [[ -n "${TMUX:-}" ]]; then
  tmux switch-client -t "$SESSION"
else
  tmux attach-session -t "$SESSION"
fi
