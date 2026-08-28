#!/bin/bash
set -e

echo "=== ⚔️ Crucible Game Server Startup ==="

BRANCH="${GIT_BRANCH:-main}"
REPO_URL="${GIT_ADDRESS:-https://github.com/Flurben/Crucible.git}"

echo "Working directory: $(pwd)"
echo "Current user: $(whoami 2>/dev/null || id -un 2>/dev/null || echo 'container')"

# Configure safe.directory for Git 2.35+
git config --global --add safe.directory "*" 2>/dev/null || true

# If package.json is missing or .git is missing/corrupt, perform a guaranteed clean setup
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
    echo "Directory clean or incomplete. Synchronizing fresh copy from ${REPO_URL} (branch: ${BRANCH})..."
    git init .
    git remote add origin "${REPO_URL}" 2>/dev/null || git remote set-url origin "${REPO_URL}"
    git fetch origin "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
else
    echo "Updating repository from origin/${BRANCH}..."
    git remote set-url origin "${REPO_URL}" 2>/dev/null || git remote add origin "${REPO_URL}" 2>/dev/null || true
    git fetch origin "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
    git clean -fd
fi

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json missing after git sync! Listing contents of $(pwd):"
    ls -la
    exit 1
fi

echo "Installing npm dependencies..."
npm install

echo "Building shared package..."
npm run build -w shared

echo "Building server package..."
npm run build -w server

echo "Starting Crucible Colyseus Server on port ${PORT:-${SERVER_PORT:-2567}}..."
npm run start -w server



