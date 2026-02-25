#!/bin/bash
# Headless Claude: auto-fix all TypeScript and lint errors until clean
# Usage: ./scripts/fix-lint.sh

set -e

cd "$(dirname "$0")/.."

claude -p "Fix all TypeScript and ESLint errors in the project.
1. Run 'cd frontend && npx tsc --noEmit' and fix every TypeScript error.
2. Run 'cd frontend && npm run lint' and fix every ESLint error.
3. Repeat both checks until both pass with zero errors.
Do not move on until both commands exit cleanly." \
  --allowedTools "Edit,Read,Bash,Glob"
