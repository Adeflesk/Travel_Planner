---
description: how to create a git worktree
---

# Create a Git Worktree

## Safe Worktree Base Directory

Create worktrees outside the repo to keep the working directory clean:

```
~/worktrees/Travel_Planner/
```

Create it once if it doesn't exist:

```bash
mkdir -p ~/worktrees/Travel_Planner
```

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
