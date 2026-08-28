#!/bin/bash
set -e

echo "=== ⚔️ Crucible Game Server Startup ==="

# Fix Git 2.35+ dubious ownership error when running as 'container' user on files cloned by 'root' during install
git config --global --add safe.directory "*" 2>/dev/null || true
git config --global --add safe.directory /home/container 2>/dev/null || true

BRANCH="${GIT_BRANCH:-main}"
REPO_URL="${GIT_ADDRESS:-https://github.com/Flurben/Crucible.git}"

echo "Working directory: $(pwd)"
echo "Current user: $(whoami 2>/dev/null || id -un 2>/dev/null || echo 'container')"

if [ -d ".git" ]; then
    echo "Updating repository from origin/${BRANCH}..."
    git config remote.origin.url "${REPO_URL}" 2>/dev/null || true
    git fetch origin "${BRANCH}" --prune || git fetch --all --prune || true
    git checkout -f "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}" || true
    git reset --hard "origin/${BRANCH}" || git reset --hard HEAD || true
    git clean -fd || true
else
    echo "Cloning repository from ${REPO_URL} (branch: ${BRANCH})..."
    git clone -b "${BRANCH}" "${REPO_URL}" .
fi

# Fallback safety check if package.json exists
if [ ! -f "package.json" ]; then
    echo "WARNING: package.json missing after git reset! Wiping directory and re-cloning clean..."
    rm -rf .git * .* 2>/dev/null || true
    git clone -b "${BRANCH}" "${REPO_URL}" .
fi

if [ ! -f "package.json" ]; then
    echo "ERROR: package.json still missing after clean clone! Directory contents:"
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


