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
        git init
        git remote add origin "${GIT_ADDRESS}"
        git fetch --all
        git checkout -b "${GIT_BRANCH:-main}" "origin/${GIT_BRANCH:-main}" || git checkout "${GIT_BRANCH:-main}"
        git reset --hard "origin/${GIT_BRANCH:-main}"
    else
        echo "🔄 Pulling latest changes from GitHub..."
        git config pull.rebase false || true
        git fetch --all
        git reset --hard "origin/${GIT_BRANCH:-main}"
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
