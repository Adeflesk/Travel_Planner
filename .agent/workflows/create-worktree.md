---
description: how to create a git worktree safely (outside iCloud Drive sync scope)
---

# Create a Git Worktree

## ⚠️ iCloud Drive Warning

This project lives in `~/Documents/`, which is **synced by iCloud Drive**. Placing
worktrees inside the repo (e.g. `.worktrees/`) causes macOS Finder/iCloud to generate
duplicate files with ` 2`, ` 3`, ` 4` suffixes, which then get accidentally committed.

**Always create worktrees outside `~/Documents/`.**

## Safe Worktree Base Directory

```
~/worktrees/Travel_Planner/
```

Create it once if it doesn't exist:

```bash
mkdir -p ~/worktrees/Travel_Planner
```

This directory is:
- Outside iCloud Drive's sync scope (iCloud only syncs `~/Documents`, `~/Desktop`, `~/Library`)
- Consistent and easy to remember
- Never accidentally committed (not inside the repo)

## Creating a Worktree

```bash
# From an existing branch:
git worktree add ~/worktrees/Travel_Planner/<name> <branch>

# Create a new branch at the same time (branching from current HEAD):
git worktree add -b feature/<name> ~/worktrees/Travel_Planner/<name> master
```

Example:
```bash
mkdir -p ~/worktrees/Travel_Planner
git worktree add -b feature/my-feature ~/worktrees/Travel_Planner/my-feature master
```

## Working in the Worktree

```bash
cd ~/worktrees/Travel_Planner/<name>
# run dev server, make commits, etc.
```

## Removing a Worktree

```bash
git worktree remove ~/worktrees/Travel_Planner/<name>
# The branch is NOT deleted — commits are preserved
```

## Listing All Worktrees

```bash
git worktree list
```

## Full Lifecycle Example

```bash
# 1. Create
mkdir -p ~/worktrees/Travel_Planner
git worktree add -b feature/road-trip ~/worktrees/Travel_Planner/road-trip master

# 2. Implement (agent works here)
cd ~/worktrees/Travel_Planner/road-trip
# ... make changes, commit ...

# 3. Done — remove worktree, switch main workspace to branch
git worktree remove ~/worktrees/Travel_Planner/road-trip
git checkout feature/road-trip

# 4. Eventually merge / open PR
git checkout master
git merge feature/road-trip
```

## Why NOT `.worktrees/` Inside the Repo

The old convention was `.worktrees/<name>` inside the repo root. **Do not use this.**

| Location | iCloud synced? | Safe? |
|---|---|---|
| `~/Documents/playground/Travel_Planner/.worktrees/` | ✅ Yes | ❌ No |
| `~/worktrees/Travel_Planner/` | ❌ No | ✅ Yes |
| `/tmp/worktrees/Travel_Planner/` | ❌ No | ✅ Yes (lost on reboot) |
