#!/bin/bash
set -e

echo "=== ⚔️ Crucible Game Server Startup ==="

BRANCH="${GIT_BRANCH:-main}"
REPO_URL="${GIT_ADDRESS:-https://github.com/Flurben/Crucible.git}"

echo "Working directory: $(pwd)"

if [ -d ".git" ]; then
    echo "Updating repository from origin/${BRANCH}..."
    git config remote.origin.url "${REPO_URL}" 2>/dev/null || true
    git fetch --all --prune
    git checkout -B "${BRANCH}" "origin/${BRANCH}" || git checkout -f "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
    git clean -fd
else
    echo "Cloning repository from ${REPO_URL} (branch: ${BRANCH})..."
    git clone -b "${BRANCH}" "${REPO_URL}" .
fi

# Fallback safety check if package.json exists
if [ ! -f "package.json" ]; then
    echo "WARNING: package.json missing! Performing clean re-clone..."
    find . -mindepth 1 -delete 2>/dev/null || rm -rf * .git
    git clone -b "${BRANCH}" "${REPO_URL}" .
fi

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json still missing after clone! Directory contents:"
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

