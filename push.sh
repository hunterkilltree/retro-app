#!/bin/bash
set -e

# ── Config ────────────────────────────────────────────────────────────────────
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-testfeaturedev}"

BACKEND_IMAGE="$DOCKERHUB_USERNAME/retro-backend"
FRONTEND_IMAGE="$DOCKERHUB_USERNAME/retro-frontend"

# ── Login ─────────────────────────────────────────────────────────────────────
# Login only if DOCKERHUB_TOKEN is provided; otherwise assume Docker Desktop
# is already authenticated and skip the prompt.
if [ -n "$DOCKERHUB_TOKEN" ]; then
  echo "🔐 Logging in to Docker Hub..."
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
else
  echo "ℹ️  DOCKERHUB_TOKEN not set — skipping login (using existing Docker credentials)"
fi

# ── Build ─────────────────────────────────────────────────────────────────────
echo ""
echo "🔨 Building backend..."
docker build --platform linux/amd64 -t "$BACKEND_IMAGE:latest" ./retro-server

echo ""
echo "🔨 Building frontend..."
docker build --platform linux/amd64 -t "$FRONTEND_IMAGE:latest" ./retro-fe

# ── Push ──────────────────────────────────────────────────────────────────────
echo ""
echo "🚀 Pushing backend..."
docker push "$BACKEND_IMAGE:latest"

echo ""
echo "🚀 Pushing frontend..."
docker push "$FRONTEND_IMAGE:latest"

echo ""
echo "✅ Done! Images pushed:"
echo "   $BACKEND_IMAGE:latest"
echo "   $FRONTEND_IMAGE:latest"
