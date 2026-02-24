---
name: pr
description: Use when preparing to create a pull request, before pushing or opening a PR — runs validation checks and summarizes changes.
---

# Pre-PR Checklist

Run these steps in order before creating any pull request.

## Checklist

1. Run `cd frontend && npx tsc --noEmit` — fix all TypeScript errors before continuing
2. Run `cd frontend && npm run lint` — fix all lint errors before continuing
3. Run backend linting: `source .venv/bin/activate && flake8 . --count --exit-zero --max-complexity=10 --max-line-length=100 --statistics`
4. Confirm current branch is correct (not `main` or `master`)
5. Summarize all changes for a PR description — include what changed, why, and any migration or restart steps needed
