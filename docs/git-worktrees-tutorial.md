# Git Worktrees — A Practical Tutorial

## The Core Problem Worktrees Solve

Normally, a git repo has **one working directory**. If you're on `master` and want to work on a feature, you `checkout` a branch — but that completely swaps out every file. You can only be on one branch at a time.

This creates friction when you want to:
- Test `feature/road-trip-builder` while keeping `master` runnable
- Review another branch without losing your current uncommitted work
- Run two branches side-by-side to compare behavior
- Let an AI agent implement a feature in isolation without touching your active workspace

**A worktree is a second (or third, fourth…) checkout of the same repo, in a different directory, each on its own branch.**

Your repo's `.git/` database is shared — commits, history, refs — but each worktree has its own files on disk and its own `HEAD`.

---

## ⚠️ iCloud Drive Warning

This project lives in `~/Documents/`, which **iCloud Drive syncs automatically**. Placing worktrees inside the repo (e.g. `.worktrees/`) causes iCloud/Finder to create ` 2`, ` 3`, ` 4` duplicate file suffixes that get accidentally committed.

**Always create worktrees at `~/worktrees/Travel_Planner/`** — outside iCloud's sync scope.

```bash
mkdir -p ~/worktrees/Travel_Planner
git worktree add -b feature/<name> ~/worktrees/Travel_Planner/<name> master
```

---

## How It Fits Together Visually

```
~/Documents/playground/Travel_Planner/   ← main worktree (master, iCloud synced)
├── .git/                                ← shared git database
│   ├── worktrees/
│   │   └── road-trip-builder/           ← worktree metadata only
│   └── ...
├── frontend/
└── app/

~/worktrees/Travel_Planner/              ← safe worktree home (NOT iCloud synced)
└── road-trip-builder/                   ← linked worktree (feature/road-trip-builder)
    ├── frontend/
    ├── app/
    └── ...
```

Both directories share the same `.git` history. Git tracks which `HEAD` (branch/commit) each worktree is pointing at.

---

## The Key Commands

### Create a worktree

```bash
# Ensure the safe base directory exists:
mkdir -p ~/worktrees/Travel_Planner

# From an existing branch:
git worktree add ~/worktrees/Travel_Planner/road-trip-builder feature/road-trip-builder

# Or create a new branch at the same time:
git worktree add -b feature/my-new-feature ~/worktrees/Travel_Planner/my-new-feature master
```

**What this does:**
1. Creates `.worktrees/road-trip-builder/` on disk
2. Checks out `feature/road-trip-builder` into that directory
3. Registers the worktree in `.git/worktrees/road-trip-builder/`

### List all worktrees

```bash
git worktree list
```

Example output:
```
/Users/you/Documents/playground/Travel_Planner           cdaea59d [master]
/Users/you/worktrees/Travel_Planner/road-trip-builder    f8e1b8e8 [feature/road-trip-builder]
```

### Remove a worktree

```bash
git worktree remove ~/worktrees/Travel_Planner/road-trip-builder
```

This deletes the directory and cleans up the `.git/worktrees/` metadata. The **branch itself is not deleted** — the commits are still there.

### Prune stale worktree metadata

If you manually deleted a worktree directory:
```bash
git worktree prune
```

---

## The Golden Rule

> **A branch can only be checked out in ONE worktree at a time.**

If `feature/road-trip-builder` is checked out in `.worktrees/road-trip-builder`, you cannot also `git checkout feature/road-trip-builder` in the main workspace. Git will refuse with:

```
fatal: 'feature/road-trip-builder' is already checked out at '.../.worktrees/road-trip-builder'
```

To switch the main workspace to that branch, you must first remove the worktree:

```bash
git worktree remove .worktrees/road-trip-builder
git checkout feature/road-trip-builder
```

---

## A Real Workflow: What Happened in This Project

### 1. Plan was written on `master`

The implementation plan (`docs/plans/2026-02-22-road-trip-builder-plan.md`) was committed to `master`. At this point only planning documents exist.

### 2. A worktree was created for implementation

```bash
mkdir -p ~/worktrees/Travel_Planner
git worktree add -b feature/road-trip-builder ~/worktrees/Travel_Planner/road-trip-builder master
```

This created `~/worktrees/Travel_Planner/road-trip-builder/` branching off `master` — outside iCloud's sync scope. An AI agent then implemented all 7 tasks inside that directory without touching the main workspace at all.

### 3. Main workspace stayed on `master`

While the feature was being built in `~/worktrees/Travel_Planner/road-trip-builder/`, the main workspace remained on `master` — the dev server there kept running the last known-good state.

### 4. Implementation complete → remove worktree, switch branch

Once all tasks were done and committed:
```bash
git worktree remove ~/worktrees/Travel_Planner/road-trip-builder
git checkout feature/road-trip-builder
```

Now the main workspace has the feature, and `master` still has the baseline.

### 5. Eventually: merge back to master

```bash
git checkout master
git merge feature/road-trip-builder
# or open a PR on GitHub
```

---

## Why `~/worktrees/Travel_Planner/` Is the Convention Here

Linked worktrees are kept at `~/worktrees/Travel_Planner/` — **outside the repo and outside iCloud Drive's sync scope**. This prevents macOS Finder from generating ` 2`/` 3`/` 4` duplicate files.

Git doesn't care where the worktree directory is — this location is purely a safety convention for this project.

---

## Worktrees vs. The Alternatives

| Approach | What you lose |
|----------|--------------|
| `git stash` + `checkout` | Your in-progress work is hidden; only one checkout at a time |
| Clone the repo twice | Two separate `.git/` databases; pushes to remote only from one; wastes disk |
| Worktree | Nothing — both branches live simultaneously; share history; each can run its own dev server |

---

## Running Two Dev Servers Simultaneously

Since each worktree is a full copy of the project files, you can run the frontend/backend in each:

```
Main workspace (master):
  cd ~/Documents/playground/Travel_Planner/frontend && npm run dev        # → localhost:3000

Linked worktree (feature/road-trip-builder):
  cd ~/worktrees/Travel_Planner/road-trip-builder/frontend && npm run dev -- --port 3001   # → localhost:3001
```

This lets you open both in the browser and compare them directly.

---

## Everyday Mental Model

Think of a worktree like opening the same project in two VS Code windows — except git tracks which branch each window is on, and changes you commit in one window are instantly visible to the other (since they share `.git/`).

```
Window A: master          ← stable, always runnable
Window B: feature/X       ← in-progress work
```

When feature/X is ready, you close Window B (remove worktree) and merge into Window A.

---

## Quick Reference

```bash
# Ensure safe base directory exists (do once)
mkdir -p ~/worktrees/Travel_Planner

# Create worktree from existing branch
git worktree add ~/worktrees/Travel_Planner/<name> <branch>

# Create worktree + new branch from master
git worktree add -b feature/<name> ~/worktrees/Travel_Planner/<name> master

# See all worktrees
git worktree list

# Remove worktree (keeps the branch)
git worktree remove ~/worktrees/Travel_Planner/<name>

# Clean up stale entries (after manual deletion)
git worktree prune

# Switch main workspace to a branch that was in a worktree
git worktree remove ~/worktrees/Travel_Planner/<name>
git checkout <branch>
```
