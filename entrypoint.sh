#!/bin/sh
set -e

# Change directory to container working directory
cd /home/container

echo "========================================="
echo "⚔️  Crucible Game Server Starting..."
echo "========================================="

# Auto-update from Git if repo configured
if [ -n "${GIT_ADDRESS}" ]; then
    echo "🔍 Checking for updates from Git repository: ${GIT_ADDRESS} (branch: ${GIT_BRANCH:-main})..."
    
    if [ ! -d ".git" ]; then
        echo "📥 Initializing fresh repository clone..."
        git init 2>/dev/null || true
        git remote add origin "${GIT_ADDRESS}" 2>/dev/null || true
        git fetch --all 2>/dev/null || true
        git checkout -b "${GIT_BRANCH:-main}" "origin/${GIT_BRANCH:-main}" 2>/dev/null || git checkout "${GIT_BRANCH:-main}" 2>/dev/null || true
        git reset --hard "origin/${GIT_BRANCH:-main}" 2>/dev/null || true
    else
        echo "🔄 Pulling latest changes from GitHub..."
        git config pull.rebase false 2>/dev/null || true
        git fetch --all 2>/dev/null || true
        git reset --hard "origin/${GIT_BRANCH:-main}" 2>/dev/null || true
    fi

    echo "📦 Installing / updating node dependencies..."
    npm install --production=false

    echo "🔨 Building shared library and game server..."
    npm run build -w shared
    npm run build -w server
fi

# Substitute environment variables in startup command if needed
MODIFIED_STARTUP=$(echo -n "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')

echo "🚀 Executing startup command: ${MODIFIED_STARTUP}"
exec eval "${MODIFIED_STARTUP}"

