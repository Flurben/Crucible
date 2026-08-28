#!/bin/bash
set -e

echo "=== ⚔️ Crucible Game Server Startup ==="

if [ -d ".git" ]; then
    echo "Updating repository from origin/${GIT_BRANCH:-main}..."
    git fetch --all
    git reset --hard origin/${GIT_BRANCH:-main}
elif [ -n "${GIT_ADDRESS}" ]; then
    echo "Cloning repository from ${GIT_ADDRESS} (branch: ${GIT_BRANCH:-main})..."
    git clone -b ${GIT_BRANCH:-main} ${GIT_ADDRESS} .
fi

echo "Installing npm dependencies..."
npm install

echo "Building shared package..."
npm run build -w shared

echo "Building server package..."
npm run build -w server

echo "Starting Crucible Colyseus Server on port ${PORT:-${SERVER_PORT:-2567}}..."
npm run start -w server
