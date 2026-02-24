#!/bin/bash
# Headless Claude: autonomously find and fix failing tests + lint errors
# Usage: ./scripts/fix-bugs.sh
#
# Pre-authorizes read-only + edit tools to reduce permission prompts.
# Claude will iterate until all checks pass, then print a summary.

set -e

cd "$(dirname "$0")/.."

claude -p "Find and fix all failing tests and lint errors in this project.

Validation suite to run after every change:
  Frontend:
    cd frontend && npx tsc --noEmit
    cd frontend && npm run lint

  Backend:
    source .venv/bin/activate && pytest -q --cov=app tests/
    source .venv/bin/activate && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics

Workflow:
1. Run the full validation suite to find all current failures.
2. For each failure, read the relevant code and diagnose the ROOT CAUSE before changing anything.
3. Fix the root cause (not just the symptom).
4. Re-run the validation suite.
5. Repeat until every check passes with zero errors.
6. Print a summary of every file changed and why.

Do not mark the task complete until all four commands exit cleanly." \
  --allowedTools "Edit,Read,Bash,Glob,Grep"
