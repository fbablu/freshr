#!/usr/bin/env bash
set -euo pipefail

# Run tests, formatting, then linting from repo root.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pytest
black .
ruff check .
