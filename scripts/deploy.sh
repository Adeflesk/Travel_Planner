#!/bin/bash
# scripts/deploy.sh - optimized deployment script for Fly.io
# This script creates a clean bundle of the backend to avoid IO timeouts 
# caused by large local directories like .git and node_modules.

set -e

# Configuration
APP_NAME="travel-planner-api-weathered-tree-9345"
DEPLOY_DIR="dist_deploy"

echo "🚀 Preparing clean deployment bundle for $APP_NAME..."

# 1. Clean up previous build
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 2. Sync essential backend files
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN: Preparation only, will not deploy."
fi

# We use rsync to efficiently copy only what's needed
echo "📦 Syncing backend files..."
rsync -av --progress \
    --exclude="__pycache__" \
    --exclude=".venv*" \
    --exclude="venv" \
    --exclude="node_modules" \
    --exclude="frontend" \
    --exclude=".git" \
    --exclude=".worktrees" \
    --exclude=".aider*" \
    --exclude=".pytest_cache" \
    --exclude="*.db" \
    --exclude="test-results" \
    . "$DEPLOY_DIR/"

# 3. Perform the deployment
echo "✈️  Starting Fly.io deployment..."
cd "$DEPLOY_DIR"

# Check if logged in
if [ "$DRY_RUN" = true ]; then
    echo "🔍 Dry run: Skipping fly deploy."
    echo "📂 Bundle ready in: $DEPLOY_DIR"
else
    fly deploy --remote-only --app "$APP_NAME"
fi

# 4. Success and cleanup
echo "✅ Deployment complete!"
cd ..
# Optionally keep the deploy dir for debugging, but let's clean up
# rm -rf "$DEPLOY_DIR"
